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
const addingToCart = ref(false)
const API_URL = 'https://surugaya.onrender.com/api/SurugayaUrls'

// 快取相關常數和函數
const CACHE_KEY = 'surugaya_products_cache'
const CACHE_DURATION = 15 * 60 * 1000 // 15 分鐘（毫秒）

const clearCache = () => {
  localStorage.removeItem(CACHE_KEY)
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
      const err = await response.json()
      throw new Error(err.message || 'API エラー')
    }

    // 成功: 清空輸入並重新載入列表
    addUrlRef.value?.clear()
    clearCache() // 清除快取
    await fetchProducts()
  } catch (err) {
    addError.value = err.message || String(err)
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

      const { data, timestamp } = JSON.parse(cachedData)
      const now = Date.now()

      // 檢查快取是否在有效期內
      if (now - timestamp < CACHE_DURATION) {
        products.value = data
        loading.value = false
        return
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
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        localStorage.removeItem(CACHE_KEY)
      }
    }

    // 直接使用 API 回傳的資料（包含 id）
    products.value = data
  } catch (err) {
    error.value = err.message
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
  }
}

const addToCart = async () => {
  if (selectedProducts.value.length === 0) return

  addingToCart.value = true

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
    addingToCart.value = false
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
  } finally {
    addingToCart.value = false
  }
}

const handleUpdated = (payload) => {

  const idx = products.value.findIndex(p => {
    return p.url === payload.url
  })
  if (idx === -1) {
    return
  }


  // 使用 Object.assign 或創建新物件來確保響應式更新
  const updatedProduct = { ...products.value[idx] }

  if (payload.seriesName !== undefined) updatedProduct.seriesName = payload.seriesName
  if (payload.purposeCategoryId !== undefined) updatedProduct.purposeCategoryId = payload.purposeCategoryId
  if (payload.purposeCategory !== undefined) updatedProduct.purposeCategory = payload.purposeCategory
  if (payload.purchaseHistory !== undefined) updatedProduct.purchaseHistory = payload.purchaseHistory

  // 替換整個物件以觸發響應式更新
  products.value[idx] = updatedProduct


  // 清除快取，因為資料已更新
  clearCache()
}

// 回到頂部功能
const showScrollButton = ref(false)
const showFilters = ref(true) // 控制篩選區顯示

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

const toggleFilters = () => {
  showFilters.value = !showFilters.value
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
    <button v-show="showScrollButton" class="scroll-to-top-btn" @click="scrollToTop" aria-label="回到頂部">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="18 15 12 9 6 15"></polyline>
      </svg>
    </button>

    <div class="bg-white rounded-xl shadow-sm mb-5 p-5">
      <div class="flex items-center justify-between gap-4">
        <h1 class="text-3xl font-semibold text-gray-800 flex items-center gap-3 m-0">
          📦 願望清單
        </h1>
        <RefreshButton :loading="loading" @refresh="handleRefresh" />
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm mb-5 p-4">
      <div class="flex gap-2.5 flex-wrap">
        <button :class="[
          'px-4 py-2.5 rounded-lg font-medium text-sm flex items-center  cursor-pointer',
          selectedTab === null
            ? 'bg-blue-400 text-white'
            : 'bg-sky-50 text-sky-700  hover:bg-sky-100'
        ]" @click="changeTab(null)">
          全部 <span class="px-2 py-0.5 rounded-full text-xs font-bold">{{ tabCounts.all }}</span>
        </button>
        <button :class="[
          'px-4 py-2.5 rounded-lg font-medium text-sm flex items-center  cursor-pointer',
          selectedTab === 0
            ? 'bg-blue-400 text-white'
            : 'bg-sky-50 text-sky-700  hover:bg-sky-100'
        ]" @click="changeTab(0)">
          未分類 <span class="px-2 py-0.5 rounded-full text-xs font-bold">{{ tabCounts[0] }}</span>
        </button>
        <button :class="[
          'px-4 py-2.5 rounded-lg font-medium text-sm flex items-center  cursor-pointer',
          selectedTab === 1
            ? 'bg-blue-400 text-white'
            : 'bg-sky-50 text-sky-700  hover:bg-sky-100'
        ]" @click="changeTab(1)">
          購買 <span class="px-2 py-0.5 rounded-full text-xs font-bold">{{ tabCounts[1] }}</span>
        </button>
        <button :class="[
          'px-4 py-2.5 rounded-lg font-medium text-sm flex items-center  cursor-pointer',
          selectedTab === 2
            ? 'bg-blue-400 text-white'
            : 'bg-sky-50 text-sky-700  hover:bg-sky-100'
        ]" @click="changeTab(2)">
          考慮 <span class="px-2 py-0.5 rounded-full text-xs font-bold">{{ tabCounts[2] }}</span>
        </button>
        <button :class="[
          'px-4 py-2.5 rounded-lg font-medium text-sm flex items-center  cursor-pointer',
          selectedTab === 3
            ? 'bg-blue-400 text-white'
            : 'bg-sky-50 text-sky-700  hover:bg-sky-100'
        ]" @click="changeTab(3)">
          購物車 <span class="px-2 py-0.5 rounded-full text-xs font-bold">{{ tabCounts[3] }}</span>
        </button>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm mb-5 p-5 relative overflow-visible">
      <button @click="toggleFilters"
        class="md:hidden w-full flex items-center justify-between text-sm font-medium text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
        <span>篩選與排序</span>
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" :class="{ 'rotate-180': showFilters }" fill="none"
          viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div :class="[
        'pt-3',
        showFilters ? 'block' : 'hidden max-md:hidden'
      ]">
        <div class="flex gap-5 mb-4 flex-wrap max-md:flex-col">
          <div class="flex items-center gap-3 flex-1 min-w-[200px] max-md:w-full max-md:gap-2.5">
            <label for="sort-select" class="text-sm font-medium text-gray-600 whitespace-nowrap w-18">並び替え:</label>
            <select id="sort-select" v-model="sortOption"
              class="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 cursor-pointer focus:outline-none focus:border-sky-400 focus:bg-white">
              <option value="default">デフォルト</option>
              <option value="price-asc">価格: 安い順</option>
              <option value="price-desc">価格: 高い順</option>
              <option value="name-asc">名前: A→Z</option>
              <option value="name-desc">名前: Z→A</option>
            </select>
          </div>
          <div class="flex items-center gap-3 flex-1 min-w-[200px] max-md:w-full max-md:gap-2.5">
            <label for="series-search" class="text-sm font-medium text-gray-600 whitespace-nowrap w-18">作品で絞る:</label>
            <input id="series-search" v-model="seriesSearchKeyword" type="text" placeholder="作品名を入力して検索..."
              class="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-sky-400 focus:bg-white" />
          </div>
        </div>

        <div class="flex gap-5 p-4 bg-gray-50 rounded-lg  flex-wrap">
          <div class="flex items-center flex-wrap">
            <label
              class="inline-flex items-center gap-1.5 text-sm cursor-pointer select-none px-3 py-1.5 rounded-md hover:bg-gray-100">
              <input type="checkbox" v-model="filterOnSale" class="cursor-pointer w-4 h-4" />
              <span>特價中</span>
            </label>
            <label
              class="inline-flex items-center gap-1.5 text-sm cursor-pointer select-none px-3 py-1.5 rounded-md hover:bg-gray-100">
              <input type="checkbox" v-model="filterOutOfStock" class="cursor-pointer w-4 h-4" />
              <span>無庫存</span>
            </label>
            <label
              class="inline-flex items-center gap-1.5 text-sm cursor-pointer select-none px-3 py-1.5 rounded-md hover:bg-gray-100">
              <input type="checkbox" v-model="filterHidePhysicalStore" class="cursor-pointer w-4 h-4" />
              <span>隱藏實體店</span>
            </label>
          </div>
          <div
            class="flex items-center gap-4 flex-wrap border-l-3 border-sky-400 pl-5 ml-2.5 max-md:border-l-0 max-md:pl-0 max-md:ml-0 max-md:pt-2 max-md:border-t max-md:border-sky-400 max-md:w-full">
            <label
              class="inline-flex items-center gap-1.5 text-sm cursor-pointer select-none px-3 py-1.5 rounded-md hover:bg-gray-100">
              <input type="checkbox" v-model="filterPurchasedOnly" class="cursor-pointer w-4 h-4" />
              <span> 📦 只顯示已購買</span>
            </label>
            <label
              class="inline-flex items-center gap-1.5 text-sm cursor-pointer select-none px-3 py-1.5 rounded-md hover:bg-gray-100">
              <input type="checkbox" v-model="filterHidePurchased" class="cursor-pointer w-4 h-4" />
              <span>🚫 隱藏已購買</span>
            </label>
          </div>
        </div>

        <div :class="[
          'flex items-center rounded-lg pt-4',
          { 'opacity-50 pointer-events-none': loading.value }
        ]">
          <div v-if="selectedProducts.length === 0" class="w-full">
            <AddUrlButton ref="addUrlRef" :adding="adding" :error-message="addError" @add="handleAddUrl" />
          </div>

          <div v-else class="flex items-center justify-end gap-4 w-full">
            <span class="text-sm font-semibold text-sky-600 whitespace-nowrap flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clip-rule="evenodd" />
              </svg>
              {{ selectedProducts.length }}個選択中
            </span>
            <BaseButton v-if="selectedTab === 3" 
                        variant="primary" 
                        class="h-10 whitespace-nowrap" 
                        :disabled="addingToCart"
                        @click="addToCart">
              <template v-if="addingToCart">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                処理中...
              </template>
              <template v-else>
                カートに入れる
              </template>
            </BaseButton>
            <BaseButton v-else variant="danger" class="h-10 whitespace-nowrap max-md:text-xs max-md:px-2"
              @click="deleteSelected">
              <span class="max-md:hidden">選択した商品を削除</span>
              <span class="md:hidden">選択を削除</span>
            </BaseButton>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="text-center py-15 px-5 text-base bg-white rounded-xl my-5">
      読み込み中...
    </div>

    <div v-else-if="error"
      class="text-center py-15 px-5 text-base text-red-500 border-2 border-red-200 bg-red-50 rounded-xl my-5">
      エラーが発生しました: {{ error }}
    </div>

    <div v-else-if="sortedProducts.length !== 0" class="product-grid">
      <ProductCard v-for="product in sortedProducts" :key="product.url" :product="product"
        :is-selected="selectedProducts.includes(product.url)" @toggle-select="toggleProductSelection"
        @delete="deleteProduct" @updated="handleUpdated" />
    </div>

    <div v-else class="text-center py-15 px-5 text-base bg-white rounded-xl my-5">
      商品が見つかりませんでした。
    </div>
  </div>
</template>

<style scoped>
/* ===================================
   容器與基礎樣式
   =================================== */
.wishlist-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  font-family: "メイリオ", Meiryo, "ヒラギノ角ゴ Pro W3", "Hiragino Kaku Gothic Pro", sans-serif;
  width: 100%;
  box-sizing: border-box;
  position: relative;
}

/* ===================================
   商品網格
   =================================== */
.product-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 20px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

/* ===================================
   響應式佈局
   =================================== */
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
  .wishlist-container {
    padding: 10px;
  }

  .product-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    padding: 10px;
  }

  /* 手機版優化：縮小 header 間距 */
  .bg-white.rounded-xl.shadow-sm {
    margin-bottom: 10px !important;
    padding: 12px !important;
  }

  /* 手機版：縮小標題字體 */
  .text-3xl {
    font-size: 1.25rem !important;
  }

  /* 手機版：標籤更緊湊 */
  .flex.gap-2\.5.flex-wrap button {
    padding: 6px 10px !important;
    font-size: 12px !important;
  }

  /* 手機版：篩選區域更緊湊 */
  .flex.gap-5.p-4 {
    padding: 10px !important;
    gap: 8px !important;
    font-size: 13px !important;
  }

  /* 手機版：排序控制更緊湊 */
  .flex.gap-5.mb-4 {
    gap: 10px !important;
    margin-bottom: 10px !important;
  }

  /* 手機版：label 文字縮小 */
  .text-sm.font-medium {
    font-size: 12px !important;
  }

  /* 手機版：input 和 select 更小 */
  .flex-1.px-3.py-2 {
    padding: 6px 8px !important;
    font-size: 12px !important;
  }
}

@media (max-width: 480px) {
  .product-grid {
    grid-template-columns: repeat(2, 1fr);
    /* 從 1 欄改為 2 欄 */
    gap: 10px;
  }

  .wishlist-container {
    padding: 8px;
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
  background-color: #6b7280;
  color: white;
  border: none;
  outline: none;
  border-radius: 50%;
  cursor: pointer;
  z-index: 1000;
  padding: 0;
  align-items: center;
  justify-content: center;
}

.scroll-to-top-btn:hover {
  background-color: #4b5563;
}
</style>
