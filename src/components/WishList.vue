<template>
  <div class="wishlist-container">
    <div class="header">
      <h1>駿河屋 願望清單</h1>
    </div>

    <div v-if="loading" class="loading">
      読み込み中...
    </div>

    <div v-else-if="error" class="error">
      エラーが発生しました: {{ error }}
    </div>

    <div v-else class="product-grid">
      <ProductCard v-for="product in products" :key="product.url" :product="product" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import ProductCard from './ProductCard.vue'

const products = ref([])
const loading = ref(true)
const error = ref(null)

const fetchProducts = async () => {
  try {
    loading.value = true
    const response = await fetch('https://surugaya.onrender.com/api/SurugayaDetails')

    if (!response.ok) {
      throw new Error('データの取得に失敗しました')
    }

    const data = await response.json()
    products.value = data
  } catch (err) {
    error.value = err.message
    console.error('Error fetching products:', err)
  } finally {
    loading.value = false
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
  margin: 0;
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
