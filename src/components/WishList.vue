<template>
  <div class="wishlist-container">
    <div class="header">
      <h1>駿河屋 願望清單</h1>
      <div v-if="selectedProducts.length > 0" class="toolbar">
        <span class="selected-count">{{ selectedProducts.length }}個が選択されています</span>
        <button @click="deleteSelected" class="btn-delete-selected">
          選択した商品を削除
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      読み込み中...
    </div>

    <div v-else-if="error" class="error">
      エラーが発生しました: {{ error }}
    </div>

    <div v-else class="product-grid">
      <ProductCard 
        v-for="product in products" 
        :key="product.id" 
        :product="product"
        :is-selected="selectedProducts.includes(product.id)"
        @toggle-select="toggleProductSelection"
        @delete="deleteProduct"
      />
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

const fetchProducts = async () => {
  try {
    loading.value = true
    const response = await fetch('https://surugaya.onrender.com/api/SurugayaDetails')

    if (!response.ok) {
      throw new Error('データの取得に失敗しました')
    }

    const data = await response.json()
    // 為每個商品添加 id（使用索引或其他唯一標識）
    products.value = data.map((item, index) => ({
      ...item,
      id: index + 1
    }))
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

.header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #333;
}

.header h1 {
  font-size: 24px;
  color: #333;
  margin: 0 0 10px 0;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-top: 10px;
  padding: 10px;
  background-color: #f0f0f0;
  border-radius: 4px;
}

.selected-count {
  font-size: 14px;
  color: #333;
  font-weight: bold;
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
  .product-grid {
    grid-template-columns: 1fr;
  }
}
</style>
