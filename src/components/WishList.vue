
<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import ProductCard from './ProductCard.vue'
import { getCategoryIds, getCategoryRoute, getCategoryIdFromRoute } from '@/utils/categoryMap'

const router = useRouter()
const route = useRoute()

const products = ref([])
const loading = ref(true)
const error = ref(null)
const selectedProducts = ref([])

// filters
const filterOnSale = ref(false)
const filterOutOfStock = ref(false)

const selectedTab = computed(() => {
  return getCategoryIdFromRoute(route.params.category)
})

const changeTab = (tabId) => {
  if (tabId === null) {
    router.push(`/`)
    return
  }
  const categoryPath = getCategoryRoute(tabId)
  router.push(`/${categoryPath}`)
}

// series filter with fuzzy search
const seriesSearchKeyword = ref('')

const tabCounts = computed(() => {
  if (!products.value) {
    const defaultCounts = { all: 0 }
    getCategoryIds().forEach(id => {
      defaultCounts[id] = 0
    })
    return defaultCounts
  }

  const counts = { all: products.value.length }

  getCategoryIds().forEach(id => {
    counts[id] = products.value.filter(p => p.purposeCategoryId === id).length
  })

  return counts
})

// add URL panel
const showAdd = ref(false)
const newUrl = ref('')
const adding = ref(false)
const addError = ref('')
const API_URL = 'https://surugaya.onrender.com/api/SurugayaUrls'

// 快取相關常數和函數
const CACHE_KEY = 'surugaya_products_cache'
const CACHE_DURATION = 6 * 60 * 60 * 1000 // 6 小時（毫秒）

const clearCache = () => {
  localStorage.removeItem(CACHE_KEY)
  console.log('快取已清除')
}

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
    clearCache() // 清除快取
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

  let arr = [...products.value]

  // 根據 purposeCategoryId 篩選
  if (selectedTab.value !== null) {
    arr = arr.filter(p => p.purposeCategoryId === selectedTab.value)
  }

  // Apply series search filter with fuzzy matching
  const keyword = seriesSearchKeyword.value.trim().toLowerCase()
  if (keyword) {
    arr = arr.filter(p => {
      const seriesName = (p.seriesName || '').toString().toLowerCase()
      return seriesName.includes(keyword)
    })
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
    
    // 檢查 localStorage 快取
    const cachedData = localStorage.getItem(CACHE_KEY)
    if (false) {
      try {
        const { data, timestamp } = JSON.parse(cachedData)
        const now = Date.now()
        
        // 檢查快取是否在有效期內
        if (now - timestamp < CACHE_DURATION) {
          console.log('使用快取資料')
          products.value = data
          loading.value = false
          return
        } else {
          console.log('快取已過期，重新載入')
        }
      } catch (e) {
        console.error('快取資料解析失敗:', e)
      }
    }
    
    // 快取不存在或已過期，從 API 取得資料
    const response = await fetch('https://surugaya.onrender.com/api/SurugayaDetails')

    if (!response.ok) {
      throw new Error('データの取得に失敗しました')
    }

    const data = await response.json()
    
    // 儲存到 localStorage
    try {
      const cacheObject = {
        data: data,
        timestamp: Date.now()
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObject))
      console.log('資料已快取')
    } catch (e) {
      console.error('無法儲存快取:', e)
      // 如果 localStorage 滿了，清除舊快取
      if (e.name === 'QuotaExceededError') {
        localStorage.removeItem(CACHE_KEY)
      }
    }
    
    // 直接使用 API 回傳的資料（包含 id）
    products.value = data
  } catch (err) {
    error.value = err.message
    console.error('Error fetching products:', err)
  } finally {
    loading.value = false
  }
}

const toggleProductSelection = (url) => {
  const index = selectedProducts.value.indexOf(url)
  if (index > -1) {
    selectedProducts.value.splice(index, 1)
  } else {
    selectedProducts.value.push(url)
  }
}

const deleteProduct = async (url) => {
  if (!confirm('この商品を削除してもよろしいですか？')) {
    return
  }

  try {
    const response = await fetch(`https://surugaya.onrender.com/api/SurugayaUrls/${encodeURIComponent(url)}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      throw new Error('削除に失敗しました')
    }

    // 成功したらリスト從 URL 比對刪除
    products.value = products.value.filter(p => p.url !== url)
    // 從已選擇列表移除
    const index = selectedProducts.value.indexOf(url)
    if (index > -1) {
      selectedProducts.value.splice(index, 1)
    }
    clearCache() // 清除快取
  } catch (err) {
    alert('エラーが発生しました: ' + err.message)
    console.error('Error deleting product:', err)
  }
}

const deleteSelected = async () => {
  if (!confirm(`選択した${selectedProducts.value.length}個の商品を削除してもよろしいですか？`)) {
    return
  }

  const deletePromises = selectedProducts.value.map(url =>
    fetch(`https://surugaya.onrender.com/api/SurugayaUrls/${encodeURIComponent(url)}`, {
      method: 'DELETE'
    })
  )

  try {
    await Promise.all(deletePromises)
    // 成功したら選択された商品をリストから削除（以 URL 為 key）
    products.value = products.value.filter(p => !selectedProducts.value.includes(p.url))
    selectedProducts.value = []
    clearCache() // 清除快取
  } catch (err) {
    alert('削除中にエラーが発生しました: ' + err.message)
    console.error('Error deleting products:', err)
  }
}

onMounted(() => {
  fetchProducts()
})

const handleUpdated = (payload) => {
  const idx = products.value.findIndex(p => {
    return p.url === payload.url
  })
  if (idx === -1) return
  const target = products.value[idx]
  if (payload.seriesName !== undefined) target.seriesName = payload.seriesName
  if (payload.purposeCategoryId !== undefined) target.purposeCategoryId = payload.purposeCategoryId
  if (payload.purposeCategory !== undefined) target.purposeCategory = payload.purposeCategory
  
  // 清除快取，因為資料已更新
  clearCache()
}
</script>

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
          <button :class="['tab', { active: selectedTab === null }]" @click="changeTab(null)">全部 ({{
            tabCounts.all }})</button>
          <button :class="['tab', { active: selectedTab === 0 }]" @click="changeTab(0)">未分類 ({{
            tabCounts[0] }})</button>
          <button :class="['tab', { active: selectedTab === 1 }]" @click="changeTab(1)">購買 ({{
            tabCounts[1] }})</button>
          <button :class="['tab', { active: selectedTab === 2 }]" @click="changeTab(2)">考慮 ({{
            tabCounts[2] }})</button>
          <button :class="['tab', { active: selectedTab === 3 }]" @click="changeTab(3)">購物車 ({{
            tabCounts[3] }})</button>
        </div>

        <div class="header-actions">
          <div class="controls-wrap">
            <div class="controls">
              <label for="sort-select" class="label-name">並び替え:</label>
              <select id="sort-select" v-model="sortOption">
                <option value="default">デフォルト</option>
                <option value="price-asc">価格: 安い順</option>
                <option value="price-desc">価格: 高い順</option>
                <option value="name-asc">名前: A→Z</option>
                <option value="name-desc">名前: Z→A</option>
              </select>
            </div>
            <div class="controls">
              <label for="series-search" class="label-name">作品で絞る:</label>
              <input id="series-search" v-model="seriesSearchKeyword" type="text" placeholder="作品名を入力して検索..."
                class="series-search-input" />
            </div>
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

    <div v-else-if="sortedProducts.length !== 0" class="product-grid">
      <ProductCard v-for="product in sortedProducts" :key="product.url" :product="product"
        :is-selected="selectedProducts.includes(product.url)" @toggle-select="toggleProductSelection"
        @delete="deleteProduct" @updated="handleUpdated" />
    </div>

    <div v-else class="loading">
      商品が見つかりませんでした。
    </div>
  </div>
</template>


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

.series-search-input {
  padding: 6px 8px;
  font-size: 13px;
  border-radius: 4px;
  border: 1px solid #ccc;
  min-width: 180px;
  transition: border-color 0.2s ease;
}

.series-search-input:focus {
  outline: none;
  border-color: #0066cc;
  box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.2);
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
  top: 130px;
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

  .label-name {
    display: none;
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
  .add-wrapper {
    top: 145px;
  }

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

  .product-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {}

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

.controls-wrap {
  display: flex;
  gap: 8px;
}

@media (max-width: 600px) {

  .controls-wrap {
    width: 80%;
  }

  .controls-wrap :last-child {
    width: 100%;
  }

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
