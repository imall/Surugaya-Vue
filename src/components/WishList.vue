<template>
  <div class="wishlist-container">
    <div class="add-wrapper">
      <button class="add-button" @click="showAdd = !showAdd" :aria-expanded="showAdd">+</button>
      <div v-if="showAdd" class="add-box">
        <input v-model="newUrl" @keyup.enter="addUrl" @keyup.esc="showAdd = false" type="text"
          placeholder="貼上商品網址，Enter送出" class="add-input" />
        <button class="add-submit" @click="addUrl" :disabled="adding">送出</button>
        <div class="add-msg" v-if="addError">{{ addError }}</div>
      </div>
    </div>
    <div class="header">
      <div class="header-row">
        <h1>駿河屋 願望清單</h1>

        <div class="tabs">
          <button :class="['tab', { active: selectedTab === 'all' }]" @click="selectedTab = 'all'">全部 ({{ tabCounts.all
          }})</button>
          <button :class="['tab', { active: selectedTab === 'uncategorized' }]"
            @click="selectedTab = 'uncategorized'">未分類
            ({{ tabCounts.uncategorized }})</button>
          <button :class="['tab', { active: selectedTab === 'purchase' }]" @click="selectedTab = 'purchase'">購買 ({{
            tabCounts.purchase }})</button>
          <button :class="['tab', { active: selectedTab === 'sell' }]" @click="selectedTab = 'sell'">販售 ({{
            tabCounts.sell
            }})</button>
        </div>

        <div class="header-actions">
          
          <div class="controls">
            <label for="sort-select" class="label-name">並び替え:</label>
            <select id="sort-select" v-model="sortOption">
              <option value="default">デフォルト</option>
              <option value="price-asc">価格: 低い順</option>
              <option value="price-desc">価格: 高い順</option>
              <option value="name-asc">名前: A→Z</option>
              <option value="name-desc">名前: Z→A</option>
            </select>
          </div>

          <div class="controls">
            <label for="series-select" class="label-name">作品で絞る:</label>
            <select id="series-select" v-model="selectedSeries">
              <option value="all">全部</option>
              <option v-for="s in seriesOptions" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>

          <div class="controls-and-filters">
            <div class="filters">
              <label class="filter-label">
                <input type="checkbox" v-model="filterOnSale" />
                <span>特價中の商品のみ</span>
              </label>
              <label class="filter-label">
                <input type="checkbox" v-model="filterOutOfStock" />
                <span>無庫存の商品のみ</span>
              </label>
            </div>
          </div>

          <div class="toolbar" :class="{ 'toolbar-empty': selectedProducts.length === 0 }">
            <span v-if="selectedProducts.length > 0" class="selected-count">{{ selectedProducts.length
            }}個が選択されています</span>
            <button @click="deleteSelected" class="btn-delete-selected" :disabled="selectedProducts.length === 0">
              選択した商品を削除
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading">
      読み込み中...
    </div>

    <div v-else-if="error" class="error">
      エラーが発生しました: {{ error }}
    </div>

    <div v-else class="product-grid">
      <ProductCard v-for="product in sortedProducts" :key="product.id" :product="product"
        :is-selected="selectedProducts.includes(product.id)" :show-purpose="selectedTab === 'all'"
        @toggle-select="toggleProductSelection" @delete="deleteProduct" @updated="handleUpdated" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import ProductCard from './ProductCard.vue'

const products = ref([])
const loading = ref(true)
const error = ref(null)
const selectedProducts = ref([])

// filters
const filterOnSale = ref(false)
const filterOutOfStock = ref(false)

// tabs: all | uncategorized | purchase | sell
const selectedTab = ref('all')

// series filter
const selectedSeries = ref('all')
const seriesOptions = computed(() => {
  const set = new Set()
  if (!products.value) return []
  products.value.forEach(p => {
    const s = (p.seriesName || '').toString().trim()
    if (s) set.add(s)
  })
  return Array.from(set).sort((a, b) => a.localeCompare(b))
})

const tabCounts = computed(() => {
  const all = products.value ? products.value.length : 0
  const uncategorized = products.value ? products.value.filter(p => !p.purposeCategory || String(p.purposeCategory).toLowerCase() === 'none').length : 0
  const purchase = products.value ? products.value.filter(p => String(p.purposeCategory) === '購買').length : 0
  const sell = products.value ? products.value.filter(p => String(p.purposeCategory) === '販售').length : 0
  return { all, uncategorized, purchase, sell }
})

// add URL panel
const showAdd = ref(false)
const newUrl = ref('')
const adding = ref(false)
const addError = ref('')
const API_URL = 'https://surugaya.onrender.com/api/SurugayaUrls'

const addUrl = async () => {
  if (!newUrl.value || adding.value) return
  addError.value = ''
  // simple validation
  try {
    new URL(newUrl.value)
  } catch (e) {
    addError.value = '無効な URL です'
    return
  }

  adding.value = true
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ productUrl: newUrl.value })
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || 'API エラー')
    }

    // 成功: 清空輸入並重新載入列表
    newUrl.value = ''
    showAdd.value = false
    await fetchProducts()
  } catch (err) {
    addError.value = err.message || String(err)
    console.error('Error adding URL:', err)
  } finally {
    adding.value = false
  }
}

// sorting
const sortOption = ref('default')

const isAvailable = (p) => {
  const sale = p.salePrice
  const cur = p.currentPrice
  return (sale && Number(sale) > 0) || (cur && Number(cur) > 0)
}

const getEffectivePrice = (p) => {
  const sale = p.salePrice
  const cur = p.currentPrice
  if (sale && Number(sale) > 0) return Number(sale)
  if (cur && Number(cur) > 0) return Number(cur)
  return 0
}

const filteredProducts = computed(() => {
  if (!products.value) return []

  // start from products and apply tab filter
  let arr = [...products.value]
  switch (selectedTab.value) {
    case 'uncategorized':
      arr = arr.filter(p => !p.purposeCategory || String(p.purposeCategory).toLowerCase() === 'none')
      break
    case 'purchase':
      arr = arr.filter(p => String(p.purposeCategory) === '購買')
      break
    case 'sell':
      arr = arr.filter(p => String(p.purposeCategory) === '販售')
      break
    default:
      break
  }

  // apply other filters (sale / out of stock)
  // apply series filter
  if (selectedSeries.value && selectedSeries.value !== 'all') {
    arr = arr.filter(p => (p.seriesName || '').toString().trim() === selectedSeries.value)
  }

  if (!filterOnSale.value && !filterOutOfStock.value) return arr

  return arr.filter(p => {
    const isSale = p.salePrice && Number(p.salePrice) > 0
    const isOutOfStock = !(p.currentPrice && Number(p.currentPrice) > 0)
    return (filterOnSale.value && isSale) || (filterOutOfStock.value && isOutOfStock)
  })
})

const sortedProducts = computed(() => {
  const arr = [...filteredProducts.value]

  switch (sortOption.value) {
    case 'price-asc': {
      const available = arr.filter(isAvailable).sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b))
      const unavailable = arr.filter(p => !isAvailable(p))
      return [...available, ...unavailable]
    }
    case 'price-desc': {
      const available = arr.filter(isAvailable).sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a))
      const unavailable = arr.filter(p => !isAvailable(p))
      return [...available, ...unavailable]
    }
    case 'name-asc':
      return arr.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
    case 'name-desc':
      return arr.sort((a, b) => (b.title || '').localeCompare(a.title || ''))
    default:
      return arr
  }
})

const fetchProducts = async () => {
  try {
    loading.value = true
    const response = await fetch('https://surugaya.onrender.com/api/SurugayaDetails')

    if (!response.ok) {
      throw new Error('データの取得に失敗しました')
    }

    const data = await response.json()
    // 直接使用 API 回傳的資料（包含 id）
    products.value = data
  } catch (err) {
    error.value = err.message
    console.error('Error fetching products:', err)
  } finally {
    loading.value = false
  }
}

const toggleProductSelection = (productId) => {
  const index = selectedProducts.value.indexOf(productId)
  if (index > -1) {
    selectedProducts.value.splice(index, 1)
  } else {
    selectedProducts.value.push(productId)
  }
}

const deleteProduct = async (productId) => {
  if (!confirm('この商品を削除してもよろしいですか？')) {
    return
  }

  try {
    const response = await fetch(`https://surugaya.onrender.com/api/SurugayaUrls/${productId}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      throw new Error('削除に失敗しました')
    }

    // 成功したらリストから削除
    products.value = products.value.filter(p => p.id !== productId)
    // 選択リストからも削除
    const index = selectedProducts.value.indexOf(productId)
    if (index > -1) {
      selectedProducts.value.splice(index, 1)
    }
  } catch (err) {
    alert('エラーが発生しました: ' + err.message)
    console.error('Error deleting product:', err)
  }
}

const deleteSelected = async () => {
  if (!confirm(`選択した${selectedProducts.value.length}個の商品を削除してもよろしいですか？`)) {
    return
  }

  const deletePromises = selectedProducts.value.map(id =>
    fetch(`https://surugaya.onrender.com/api/SurugayaUrls/${id}`, {
      method: 'DELETE'
    })
  )

  try {
    await Promise.all(deletePromises)
    // 成功したら選択された商品をリストから削除
    products.value = products.value.filter(p => !selectedProducts.value.includes(p.id))
    selectedProducts.value = []
  } catch (err) {
    alert('削除中にエラーが発生しました: ' + err.message)
    console.error('Error deleting products:', err)
  }
}

onMounted(() => {
  fetchProducts()
})

const handleUpdated = (payload) => {
  // payload: { id, seriesName?, purposeCategory? }
  const idx = products.value.findIndex(p => p.id === payload.id)
  if (idx === -1) return
  const target = products.value[idx]
  if (payload.seriesName !== undefined) target.seriesName = payload.seriesName
  if (payload.purposeCategory !== undefined) target.purposeCategory = payload.purposeCategory
}
</script>

<style scoped>
.wishlist-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 10px;
  font-family: "メイリオ", Meiryo, "ヒラギノ角ゴ Pro W3", "Hiragino Kaku Gothic Pro", sans-serif;
  width: 100%;
  box-sizing: border-box;
  position: relative;
}

.header-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.header h1 {
  width: 100%;
  font-size: 24px;
  color: #333;
  margin: 10px 0;
}

.controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.controls label {
  font-size: 14px;
  color: #333;
}

.controls select {
  padding: 6px 8px;
  font-size: 13px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-top: 0;
  padding: 10px;
  background-color: #f0f0f0;
  border-radius: 4px;
  min-height: 44px;
}

.toolbar-empty {
  visibility: hidden;
  opacity: 0;
  pointer-events: none;
}

.selected-count {
  font-size: 14px;
  color: #333;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: calc(100% - 140px);
}

.btn-delete-selected {
  background-color: #d32f2f;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background-color 0.2s;
  flex-shrink: 0;
}

.btn-delete-selected:hover {
  background-color: #b71c1c;
}

.add-wrapper {
  position: absolute;
  top: 140px;
  right: 12px;
  z-index: 80;
}

.add-button {
  width: 48px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid #e6e6e6;
  background: linear-gradient(180deg, #ffffff 0%, #f7f7f7 100%);
  color: #333;
  font-size: 20px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 18px rgba(30, 30, 30, 0.06);
  transition: transform .12s ease, box-shadow .12s ease, background .12s, opacity .12s;
}

.add-button:hover {
  transform: translateY(-2px);
  background: #f4f6f8;
  box-shadow: 0 10px 24px rgba(30, 30, 30, 0.08);
}

.add-button:focus {
  outline: none;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.12);
}

.add-box {
  position: absolute;
  top: 54px;
  right: 0;
  margin-top: 0;
  background: #fff;
  border: 1px solid #e6e6e6;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
  padding: 10px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 320px;
  max-width: 520px;
  z-index: 90;
  transform-origin: top right;
  animation: pop .12s ease;
}

@keyframes pop {
  from {
    opacity: 0;
    transform: scale(.98);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

.add-input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.add-submit {
  background: linear-gradient(180deg, #5a5a5a 0%, #3b3b3b 100%);
  color: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.10);
  transition: transform .12s ease, box-shadow .12s ease, opacity .12s;
}

.add-submit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.add-submit:hover:enabled {
  transform: translateY(-2px);
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.12);
}

.add-msg {
  color: #d32f2f;
  font-size: 12px;
  margin-left: 8px;
}

.loading,
.error {
  text-align: center;
  padding: 40px;
  font-size: 16px;
}

.error {
  color: #d32f2f;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 15px;
  background-color: white;
  padding: 15px;
}

@media (max-width: 1024px) {
  .product-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
}

@media (max-width: 768px) {
  .product-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .product-grid {
    grid-template-columns: repeat(1, 1fr);
    gap: 10px;
  }
}

@media (max-width: 768px) {
  .header-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .toolbar {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 768px) {
  .product-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .label-name {
    display: none;
  }
}

/* Responsive layout for filters */
.controls-and-filters {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filters {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  writing-mode: horizontal-tb;
  /* force horizontal text */
  font-size: 14px;
}

.tabs {
  display: flex;
  gap: 8px;
  margin: 8px 0;
}

.tab {
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.tab.active {
  background: #0066cc;
  color: white;
  border-color: #005bb5;
}

@media (max-width: 600px) {
  .header-actions {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .controls-and-filters {
    width: 100%;
    justify-content: flex-start;
    gap: 8px;
  }

  .filters {
    gap: 10px;
  }
}
</style>
