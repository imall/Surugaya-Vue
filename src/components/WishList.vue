<template>
  <div class="wishlist-container">
    <div class="header">
      <div class="header-row">
        <h1>駿河屋 願望清單</h1>

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
        :is-selected="selectedProducts.includes(product.id)" @toggle-select="toggleProductSelection"
        @delete="deleteProduct" />
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

const sortedProducts = computed(() => {
  if (!products.value) return []
  const arr = [...products.value]

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
    const response = await fetch(`https://surugaya.onrender.com/api/Surugaya/${productId}`, {
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
    fetch(`https://surugaya.onrender.com/api/Surugaya/${id}`, {
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
</script>

<style scoped>
.wishlist-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 10px;
  font-family: "メイリオ", Meiryo, "ヒラギノ角ゴ Pro W3", "Hiragino Kaku Gothic Pro", sans-serif;
  width: 100%;
  box-sizing: border-box;
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
  font-size: 24px;
  color: #333;
  margin: 0 0 10px 0;
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
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  background-color: white;
  padding: 15px;
}

@media (max-width: 1024px) {
  .product-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
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
  .label-name {
    display: none;
  }
}
</style>
