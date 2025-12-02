<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import ProductCard from './ProductCard.vue'
import RefreshButton from './common/RefreshButton.vue'
import AddUrlButton from './common/AddUrlButton.vue'
import BaseButton from './common/BaseButton.vue'
import { getCategoryIds, getCategoryRoute, getCategoryIdFromRoute, CATEGORY_ROUTES } from '@/utils/categoryMap'

const router = useRouter()
const route = useRoute()

const products = ref([])
const loading = ref(true)
const error = ref(null)
const selectedProducts = ref([])

// filters
const filterOnSale = ref(false)
const filterOutOfStock = ref(false)
const filterHidePhysicalStore = ref(false)
const filterPurchasedOnly = ref(false)
const filterHidePurchased = ref(false)

const selectedTab = computed(() => {
  return getCategoryIdFromRoute(route.params.category)
})

// 當標籤切換時清除選擇
watch(selectedTab, () => {
  selectedProducts.value = []
})

// 解析當前路由
const parseRoute = (path) => {
  const segments = path.split('/').filter(s => s)

  if (segments.length === 0) {
    return { category: null, search: '' }
  }

  const firstSegment = segments[0]
  const lastSegment = segments[segments.length - 1]

  // 判斷結構
  if (segments.length === 1) {
    // 只有一段
    if (CATEGORY_ROUTES.includes(firstSegment)) {
      return { category: getCategoryIdFromRoute(firstSegment), search: '' }
    } else {
      return { category: null, search: decodeURIComponent(firstSegment) }
    }
  } else {
    // 兩段: /category/search
    const category = CATEGORY_ROUTES.includes(firstSegment)
      ? getCategoryIdFromRoute(firstSegment)
      : null
    const search = decodeURIComponent(lastSegment)
    return { category, search }
  }
}

// 從路由計算狀態 (單一真相來源)
const currentRoute = computed(() => parseRoute(route.path))

// series filter with fuzzy search
const seriesSearchKeyword = ref('')

// 只監聽路由變化來更新搜尋關鍵字
watch(() => currentRoute.value.search, (newSearch) => {
  seriesSearchKeyword.value = newSearch
}, { immediate: true })

// 統一的導航函數
const navigateTo = ({ category = selectedTab.value, search = seriesSearchKeyword.value } = {}) => {
  const parts = []

  if (category !== null) {
    parts.push(getCategoryRoute(category))
  }

  if (search) {
    parts.push(encodeURIComponent(search))
  }

  const targetPath = '/' + (parts.length ? parts.join('/') : '')

  if (route.path !== targetPath) {
    router.push(targetPath)
  }
}

// 改變分類
const changeTab = (tabId) => {
  navigateTo({ category: tabId })
}

// 監聽搜尋關鍵字變化，即時更新路由
watch(seriesSearchKeyword, (newKeyword) => {
  navigateTo({ search: newKeyword })
})

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
const addUrlRef = ref(null)
const adding = ref(false)
const addError = ref('')
const API_URL = 'https://surugaya.onrender.com/api/SurugayaUrls'

// 快取相關常數和函數
const CACHE_KEY = 'surugaya_products_cache'
const CACHE_DURATION = 15 * 60 * 1000 // 15 分鐘（毫秒）

const clearCache = () => {
  localStorage.removeItem(CACHE_KEY)
  console.log('快取已清除')
}

const handleRefresh = async () => {
  clearCache()
  await fetchProducts()
}

const handleAddUrl = async (url) => {
  addError.value = ''

  // simple validation
  try {
    new URL(url)
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
      body: JSON.stringify({ productUrl: url })
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || 'API エラー')
    }

    // 成功: 清空輸入並重新載入列表
    addUrlRef.value?.clear()
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

  // 去除實體店家篩選
  if (filterHidePhysicalStore.value) {
    arr = arr.filter(p => !p.url || !p.url.includes('tenpo_cd'))
  }

  // 購買歷史篩選
  if (filterPurchasedOnly.value) {
    arr = arr.filter(p => p.purchaseHistory && p.purchaseHistory.length > 0)
  }

  if (filterHidePurchased.value) {
    arr = arr.filter(p => !p.purchaseHistory || p.purchaseHistory.length === 0)
  }

  if (!filterOnSale.value && !filterOutOfStock.value) return arr

  return arr.filter(p => {
    const isSale = p.salePrice && Number(p.salePrice) > 0
    const isOutOfStock = p.status === "申し訳ございません。品切れ中です。"
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
    if (cachedData) {
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

const addToCart = async () => {
  if (selectedProducts.value.length === 0) return

  // 準備購物車資料
  const cartItems = selectedProducts.value.map(url => {
    const product = products.value.find(p => p.url === url)
    if (!product) return null

    // 取得有效價格
    let unitPrice = '0'
    if (product.salePrice && Number(product.salePrice) > 0) {
      unitPrice = product.salePrice.toString().replace(/,/g, '')
    } else if (product.currentPrice && Number(product.currentPrice) > 0) {
      unitPrice = product.currentPrice.toString().replace(/,/g, '')
    }

    // 從 URL 提取 productId
    const match = product.url.match(/\/detail\/(\d+)/)
    const productId = match ? match[1] : ''

    return {
      url: product.url,
      productId: productId,
      title: product.title || '',
      unitPrice: unitPrice
    }
  }).filter(item => item !== null)

  if (cartItems.length === 0) {
    alert('カートに追加できる商品がありません')
    return
  }

  try {
    const response = await fetch('https://surugaya.onrender.com/api/LetaoCart/add', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cartItems)
    })

    let result
    try {
      result = await response.json()
    } catch (e) {
      // 如果無法解析 JSON,使用文字回應
      const text = await response.text()
      throw new Error(text || 'カートへの追加に失敗しました')
    }

    if (!response.ok || !result.allSuccess) {
      // 處理部分失敗或全部失敗的情況
      const failedItems = result.results?.filter(r => !r.success) || []

      if (failedItems.length > 0) {
        let errorMsg = `カートへの追加結果:\n成功: ${result.successCount || 0}個\n失敗: ${result.failedCount || 0}個\n\n`

        // 列出失敗的商品和原因
        errorMsg += '失敗した商品:\n'
        failedItems.forEach((item, index) => {
          errorMsg += `${index + 1}. ${item.title?.substring(0, 50) || 'Unknown'}...\n`
          errorMsg += `   理由: ${item.message || '不明なエラー'}\n\n`
        })

        alert(errorMsg)
      } else {
        throw new Error(result.message || 'カートへの追加に失敗しました')
      }

      // 如果有部分成功,仍然清除選擇
      if (result.successCount > 0) {
        selectedProducts.value = []
      }
    } else {
      // 全部成功
      alert(`${result.successCount || cartItems.length}個の商品をカートに追加しました`)
      selectedProducts.value = []
    }
  } catch (err) {
    alert('カートへの追加中にエラーが発生しました: ' + err.message)
    console.error('Error adding to cart:', err)
  }
}

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

// 回到頂部功能
const showScrollButton = ref(false)

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

// 當滾動超過 300px 時顯示按鈕
const handleScroll = () => {
  showScrollButton.value = window.scrollY > 300
}

onMounted(() => {
  fetchProducts()
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div class="wishlist-container">
    <!-- 回到頂部按鈕 (僅手機版顯示) -->
    <button v-show="showScrollButton" class="scroll-to-top-btn" @click="scrollToTop" aria-label="回到頂部">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="18 15 12 9 6 15"></polyline>
      </svg>
    </button>

    <div class="header">
      <div class="header-row">
        <div class="title-row">
          <h1>駿河屋 願望清單</h1>
          <RefreshButton :loading="loading" @refresh="handleRefresh" />
        </div>

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
                <span>特價中</span>
              </label>
              <label class="filter-label">
                <input type="checkbox" v-model="filterOutOfStock" />
                <span>無庫存</span>
              </label>
              <label class="filter-label">
                <input type="checkbox" v-model="filterHidePhysicalStore" />
                <span>隱藏實體店</span>
              </label>
              <label class="filter-label filter-purchased">
                <input type="checkbox" v-model="filterPurchasedOnly" />
                <span>✅ 只顯示已購買</span>
              </label>
              <label class="filter-label filter-purchased">
                <input type="checkbox" v-model="filterHidePurchased" />
                <span>🚫 隱藏已購買</span>
              </label>
            </div>
          </div>
          <div class="toolbar" :class="{ 'toolbar-empty': selectedProducts.length === 0 }">
            <span v-if="selectedProducts.length > 0" class="selected-count">{{ selectedProducts.length
            }}個が選択されています</span>
            <!-- 購物車標籤時顯示加入購物車按鈕 -->
            <BaseButton v-if="selectedTab === 3" variant="primary" class="btn-add-to-cart" @click="addToCart"
              :disabled="selectedProducts.length === 0">
              カートに入れる
            </BaseButton>
            <!-- 其他標籤時顯示刪除按鈕 -->
            <BaseButton v-else variant="danger" class="btn-delete-selected" @click="deleteSelected"
              :disabled="selectedProducts.length === 0">
              選択した商品を削除
            </BaseButton>
          </div>
          <AddUrlButton ref="addUrlRef" :adding="adding" :error-message="addError" @add="handleAddUrl" />
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
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  position: relative;
}

.header h1 {
  width: 100%;
  font-size: 24px;
  color: #333;
  margin: 10px 0;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  position: relative;
}

.title-row h1 {
  margin: 10px 0;
  flex: 1;
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
  padding: 8px 16px;
  font-size: 14px;
}

.btn-add-to-cart {
  padding: 8px 16px;
  font-size: 14px;
  background: linear-gradient(180deg, #F6A623 0%, #E89619 100%);
  color: #FFFFFF;
  border: 1px solid #E89619;
  box-shadow: 0 2px 8px rgba(246, 166, 35, 0.25);
}

.btn-add-to-cart:hover:not(:disabled) {
  background: linear-gradient(180deg, #E89619 0%, #D98710 100%);
  box-shadow: 0 4px 14px rgba(246, 166, 35, 0.35);
  transform: translateY(-1px);
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
  .header-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .title-row h1 {
    font-size: 20px;
  }

  /* 手機版隱藏重新整理按鈕 */
  .title-row :deep(.refresh-button) {
    display: none;
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

.filter-label.filter-purchased {
  border-left: 2px solid #4CAF50;
  padding-left: 12px;
  margin-left: 8px;
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

/* 回到頂部按鈕樣式 */
.scroll-to-top-btn {
  display: flex;
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 44px;
  height: 44px;
  background-color: #a3a9b0;
  color: white;
  border: none;
  outline: none;
  border-radius: 50%;
  cursor: pointer;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  padding: 0;
  align-items: center;
  justify-content: center;
}

.scroll-to-top-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.scroll-to-top-btn:active {
  transform: translateY(0);
}
</style>
