<script setup>
import { ref, watch, computed } from 'vue'
import { getCategoryText, isValidCategoryId, getCategoryIds } from '@/utils/categoryMap'

const props = defineProps({
  product: {
    type: Object,
    required: true
  },
  isSelected: {
    type: Boolean,
    default: false
  },
  showPurpose: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['toggle-select', 'delete', 'updated'])

// 偵測是否為實體店家商品
const isPhysicalStore = computed(() => {
  return props.product.url && props.product.url.includes('tenpo_cd')
})

// 購買歷史相關
const hasPurchaseHistory = computed(() => {
  return props.product.purchaseHistory && props.product.purchaseHistory.length > 0
})

const purchaseCount = computed(() => {
  return props.product.purchaseHistory?.length || 0
})

const formatPurchaseDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

const handleToggleSelect = () => {
  // use full URL (lowercase `url`) as the key for selection to avoid ambiguity across marketplaces
  emit('toggle-select', props.product.url)
}

const handleDelete = () => {
  // emit URL so parent can delete by url key
  emit('delete', props.product.url)
}

const formatDate = (dateString) => {
  return dateString.split('T')[0];
}

// modal edit state
const showEditModal = ref(false)
const localSeriesName = ref(props.product.seriesName || '')
const localPurposeCategoryId = ref(props.product.purposeCategoryId ?? 0)
const saving = ref(false)

// 快速分類選單
const quickCategoryId = ref(props.product.purposeCategoryId ?? 0)
const quickSaving = ref(false)

// 監聽 product.purposeCategoryId 變化，同步更新 quickCategoryId
watch(() => props.product.purposeCategoryId, (newId) => {
  quickCategoryId.value = newId ?? 0
})

const API_Category = 'https://surugaya.onrender.com/api/SurugayaCategory'

const openEditModal = () => {
  localSeriesName.value = props.product.seriesName || ''
  localPurposeCategoryId.value = props.product.purposeCategoryId ?? 0
  showEditModal.value = true
}

const closeModal = () => {
  showEditModal.value = false
}

// 快速更新分類
const quickUpdateCategory = async () => {
  const newCategoryId = quickCategoryId.value

  if (!isValidCategoryId(newCategoryId)) {
    alert('用途選擇無效')
    quickCategoryId.value = props.product.purposeCategoryId ?? 0
    return
  }

  if (props.product.purposeCategoryId === newCategoryId) {
    return
  }

  quickSaving.value = true
  try {
    const res = await fetch(`${API_Category}/purposeCategory/${newCategoryId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(props.product.url)
    })

    if (!res.ok) {
      const txt = await res.text()
      throw new Error(txt || '用途の更新に失敗しました')
    }

    const updatedData = await res.json()
    emit('updated', {
      id: props.product.id,
      url: props.product.url,
      purposeCategoryId: updatedData.purposeCategoryId,
      purposeCategory: updatedData.purposeCategory
    })
  } catch (err) {
    alert('更新用途時發生錯誤: ' + parseErrorMessage(err))
    console.error(err)
    // 恢復原值
    quickCategoryId.value = props.product.purposeCategoryId ?? 0
  } finally {
    quickSaving.value = false
  }
}

const parseErrorMessage = (err) => {
  let msg = err && err.message ? err.message : String(err)
  try {
    const parsed = JSON.parse(msg)
    if (parsed && parsed.errors) {
      const parts = []
      for (const k in parsed.errors) {
        if (Array.isArray(parsed.errors[k])) parts.push(parsed.errors[k].join('; '))
        else parts.push(String(parsed.errors[k]))
      }
      msg = parts.join(' | ')
    } else if (parsed && parsed.title) {
      msg = parsed.title
    }
  } catch (e) {
    // not JSON
  }
  return msg
}

const savePurposeOnly = async () => {
  const newPurposeCategoryId = localPurposeCategoryId.value

  // 驗證 ID 範圍
  if (!isValidCategoryId(newPurposeCategoryId)) {
    alert('用途選擇無效')
    return
  }

  saving.value = true
  try {
    // 檢查是否有變更
    if (props.product.purposeCategoryId === newPurposeCategoryId) {
      saving.value = false
      showEditModal.value = false
      return
    }


    const res = await fetch(`${API_Category}/purposeCategory/${newPurposeCategoryId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(props.product.url)
    })

    if (!res.ok) {
      const txt = await res.text()
      throw new Error(txt || '用途の更新に失敗しました')
    }

    // 從回應中取得更新後的資料
    const updatedData = await res.json()
    emit('updated', {
      id: props.product.id,
      url: props.product.url,
      purposeCategoryId: updatedData.purposeCategoryId,
      purposeCategory: updatedData.purposeCategory
    })

    showEditModal.value = false
  } catch (err) {
    alert('更新用途時發生錯誤: ' + parseErrorMessage(err))
    console.error(err)
  } finally {
    saving.value = false
  }
}

const saveSeriesOnly = async () => {
  const newSeries = (localSeriesName.value || '').trim()

  if (!newSeries) {
    if (!confirm('作品名為空，確定要清空嗎？')) return
  }

  saving.value = true
  try {
    const res = await fetch(`${API_Category}/seriesName/${encodeURIComponent(newSeries)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(props.product.url)
    })

    if (!res.ok) {
      const txt = await res.text()
      throw new Error(txt || 'シリーズ名の更新に失敗しました')
    }

    emit('updated', { id: props.product.id, url: props.product.url, seriesName: newSeries })
    showEditModal.value = false
  } catch (err) {
    alert('更新作品名時發生錯誤: ' + parseErrorMessage(err))
    console.error(err)
  } finally {
    saving.value = false
  }
}

const saveAll = async () => {
  const newSeries = (localSeriesName.value || '').trim()
  const newPurposeCategoryId = localPurposeCategoryId.value

  // 驗證 ID 範圍
  if (!isValidCategoryId(newPurposeCategoryId)) {
    alert('用途選擇無效')
    return
  }

  if (!newSeries) {
    if (!confirm('作品名為空，確定要清空嗎？')) return
  }

  saving.value = true
  try {
    const res = await fetch(`${API_Category}/purposeAndSeries/${newPurposeCategoryId}/${encodeURIComponent(newSeries)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(props.product.url)
      })

    if (!res.ok) {
      const txt = await res.text()
      throw new Error(txt || '更新に失敗しました')
    }

    // 從回應中取得更新後的資料
    const updatedData = await res.json()
    emit('updated', {
      id: props.product.id,
      url: props.product.url,
      purposeCategoryId: updatedData.purposeCategoryId,
      purposeCategory: updatedData.purposeCategory,
      seriesName: newSeries
    })

    showEditModal.value = false
  } catch (err) {
    alert('全部儲存時發生錯誤: ' + parseErrorMessage(err))
    console.error(err)
  } finally {
    saving.value = false
  }
}


</script>

<template>
  <div class="product-card" :class="{ selected: isSelected, purchased: hasPurchaseHistory }">
    <button @click="handleDelete" class="btn-delete" title="削除">×</button>

    <!-- 購買歷史徽章 (右上角) -->
    <div v-if="hasPurchaseHistory" class="purchase-badge" :title="`購入済 ${purchaseCount}回`">
      ✓ 購入済
      <span v-if="purchaseCount > 1" class="count">×{{ purchaseCount }}</span>
    </div>

    <!-- purpose category dropdown (top-left) -->
    <div class="card-purpose-badge">
      <select v-model="quickCategoryId" @change="quickUpdateCategory" class="quick-category-select"
        :disabled="quickSaving" :id="`category-select-${product.id}`" :name="`category-${product.id}`"
        aria-label="選擇商品分類">
        <option v-for="id in getCategoryIds()" :key="id" :value="id">
          {{ getCategoryText(id) }}
        </option>
      </select>
    </div>

    <div class="product-content">
      <div class="product-image" @click="handleToggleSelect">
        <img :src="product.imageUrl" :alt="product.title" />
        <div v-if="isSelected" class="selected-overlay"></div>
        <!-- 實體店家標記 -->
        <div v-if="isPhysicalStore" class="store-badge" title="実店舗">🏪</div>
      </div>

      <div class="product-info">
        <a :href="product.url" target="_blank" class="product-title">
          {{ product.title }}
        </a>
        <button class="ellipsis-button" @click.stop="openEditModal" aria-label="編輯項目">⋯</button>

        <div class="series-text">{{ product.seriesName }}</div>


        <div class="price-section">
          <template v-if="product.salePrice">
            <div class="price-row">
              <span class="label ">販売価格</span>
              <span class="original-price">¥{{ product.currentPrice.toLocaleString() }}</span>
            </div>
            <div class="price-row">
              <span class="label sale-label">セール価格</span>
              <span class="sale-price">¥{{ product.salePrice.toLocaleString() }}(税込)</span>
            </div>
          </template>
          <template v-else-if="product.currentPrice > 0">
            <div class="price-row">
              <span class="label">販売価格</span>
              <span class="current-price">¥{{ product.currentPrice.toLocaleString() }}(税込)</span>
            </div>
          </template>
          <template v-else>
            <div class="price-row">
              <span class="label">販売価格</span>
              <span class="out-of-stock">品切れ中</span>
            </div>
          </template>
        </div>

        <div class="date-info">
          リストに追加された日: {{ formatDate(product.lastUpdated) }}
        </div>

      </div>
    </div>

    <!-- Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-box" role="dialog" aria-modal="true">
        <h3>編輯項目</h3>
        <div class="modal-row field-with-action">
          <label class="small-label">用途</label>
          <div class="field-action-row">
            <select v-model="localPurposeCategoryId" class="purpose-select">
              <option v-for="id in getCategoryIds()" :key="id" :value="id">
                {{ getCategoryText(id) }}
              </option>
            </select>
            <button class="btn-inline btn-purpose" @click="savePurposeOnly" :disabled="saving">儲存</button>
          </div>
        </div>

        <div class="modal-row field-with-action">
          <label class="small-label">作品名</label>
          <div class="field-action-row">
            <input v-model="localSeriesName" class="series-input" />
            <button class="btn-inline btn-series" @click="saveSeriesOnly" :disabled="saving">儲存</button>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn-save-all" @click="saveAll" :disabled="saving">全部儲存</button>
          <button class="btn-cancel" @click="closeModal" :disabled="saving">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.product-card {
  display: flex;
  gap: 8px;
  padding: 12px;
  border: 1px solid #e6eef6;
  background-color: #fcfeff;
  border-radius: 6px;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  transition: all 0.18s ease;
  position: relative;
}

.product-card.selected {
  border-color: #7fb3d5;
  box-shadow: 0 4px 14px rgba(127, 179, 213, 0.12);
}

/* 已購買商品的樣式 */
.product-card.purchased {
  border-color: #81C784;
  background: linear-gradient(135deg, #F1F8F4 0%, #FAFFFE 100%);
}

.product-card.purchased.selected {
  border-color: #66BB6A;
  box-shadow: 0 4px 14px rgba(102, 187, 106, 0.2);
}

/* 購買徽章 */
.purchase-badge {
  position: absolute;
  top: 6px;
  right: 30px;
  background: linear-gradient(135deg, #66BB6A 0%, #4CAF50 100%);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: bold;
  box-shadow: 0 2px 6px rgba(76, 175, 80, 0.3);
  z-index: 11;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: default;
  transition: all 0.2s ease;
  pointer-events: none;
}

.purchase-badge .count {
  background: rgba(255, 255, 255, 0.3);
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 10px;
}

/* 其他樣式保持不變 */
.btn-delete {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: #f26b6b;
  color: white;
  border: none;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s, box-shadow 0.15s;
  z-index: 10;
  padding: 0;
}

.btn-delete:hover {
  transform: scale(1.06);
  box-shadow: 0 4px 10px rgba(242, 107, 107, 0.12);
}

.product-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.product-image {
  flex-shrink: 0;
  text-align: center;
  width: 100%;
  position: relative;
  cursor: pointer;
  user-select: none;
}

.product-image:hover img {
  opacity: 0.8;
}

.product-image img {
  width: 100%;
  max-width: 150px;
  height: auto;
  object-fit: contain;
  border: 1px solid #e0e0e0;
  transition: opacity 0.2s ease;
  vertical-align: middle;
}

.selected-overlay {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 150px;
  height: 100%;
  background-color: rgba(0, 102, 204, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

/* 實體店家標記 */
.store-badge {
  position: absolute;
  bottom: 0px;
  right: 0px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 4px;
  padding: 2px 4px;
  font-size: 16px;
  line-height: 1;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  pointer-events: none;
}

.product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  align-items: start;
}


.small-label {
  font-size: 14px;
  color: #666;
  white-space: nowrap;
}

.purpose-select {
  padding: 6px 8px;
  font-size: 13px;
  border-radius: 6px;
  border: 1px solid #d6eaf5;
  background: white;
  width: auto;
}

.series-text {
  width: 100%;
  text-align: start;
  font-size: 13px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}


.purpose-badge {
  display: inline-block;
  background: #eef6fb;
  color: #07516a;
  border: 1px solid #d6eaf5;
  padding: 2px 4px;
  border-radius: 8px;
  font-size: 10px;
}

.series-input {
  padding: 6px 8px;
  font-size: 13px;
  border-radius: 6px;
  border: 1px solid #d6eaf5;
  background: white;
  width: auto;
}

.btn-link {
  background: none;
  border: none;
  color: #0066cc;
  cursor: pointer;
  font-size: 13px;
  padding: 2px 6px;
}

.btn-save {
  background-color: #2e7d32;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-inline {
  padding: 6px 10px;
  font-size: 13px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  box-shadow: none;
}

.btn-purpose {
  background: linear-gradient(180deg, #e6f7ff 0%, #d0f1ff 100%);
  color: #07516a;
  border: 1px solid #c6eaf6;
}

.card-purpose-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 12;
}

.quick-category-select {
  background: rgba(230, 247, 255, 0.95);
  color: #07516a;
  border: 1px solid #cfeffb;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
  /* 隱藏下拉箭頭 */
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  /* 確保文字完整顯示 */
  min-width: fit-content;
  white-space: nowrap;
  /* 移除 IE 的箭頭 */
  background-image: none;
  /* 文字置中 */
  text-align-last: center;
}



/* 移除 IE 10+ 的箭頭 */
.quick-category-select::-ms-expand {
  display: none;
}

.quick-category-select:hover:not(:disabled) {
  background: rgba(230, 247, 255, 1);
  border-color: #b8e5f7;
  box-shadow: 0 2px 8px rgba(7, 81, 106, 0.15);
}

.quick-category-select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.quick-category-select:focus {
  border-color: #7fb3d5;
  box-shadow: 0 0 0 2px rgba(127, 179, 213, 0.2);
}

.purpose-badge {
  display: inline-block;
  background: rgba(230, 247, 255, 0.95);
  color: #07516a;
  border: 1px solid #cfeffb;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
}

.btn-save-all {
  background: linear-gradient(180deg, #fbf2ff 0%, #f1e6fb 100%);
  color: #4a2b66;
  border: 1px solid #ecdff5;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.btn-cancel {
  background-color: #9e9e9e;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.ellipsis-button {
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 6px;
  font-size: 16px;
  line-height: 1;
  padding: 4px 8px;
  color: #4f5b62;
  opacity: 0.95;
  cursor: pointer;
  align-self: stretch;
}

.ellipsis-button:focus,
.ellipsis-button:hover {
  outline: none;
  background: rgba(0, 0, 0, 0.03);
}

/* layout for field + action */
.field-with-action .field-action-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

/* modal label width to align fields */
.modal-row .small-label {
  width: 72px;
  flex: 0 0 72px;
  text-align: right;
  padding-right: 8px;
  color: #56707a;
}

.modal-row .field-action-row {
  flex: 1 1 auto;
}

/* make input/select and inline button layout consistent: fields equal width */
.field-action-row .purpose-select,
.field-action-row .series-input {
  flex: 1 1 0;
  min-width: 0;
  /* allow shrinking in narrow containers */
}

.btn-inline {
  flex: 0 0 auto;
  /* keep button its natural size */
}

.modal-box h3 {
  text-align: center;
  margin: 0 0 8px 0;
  color: #263238;
}

.modal-box {
  background: linear-gradient(180deg, #ffffff 0%, #fbfbfd 100%);
  border: 1px solid rgba(38, 50, 56, 0.06);
}


/* modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.modal-box {
  background: white;
  padding: 18px;
  border-radius: 10px;
  width: 420px;
  max-width: calc(100% - 32px);
  box-shadow: 0 10px 30px rgba(23, 43, 51, 0.08);
  border: 1px solid #e6eef6;
}

.modal-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 10px 0;
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 30px;
}

.category {
  font-size: 12px;
  color: #666;
}

.product-title {
  color: #0066cc;
  text-decoration: none;
  font-size: 12px;
  line-height: 1.4;
  display: block;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.product-title:hover {
  text-decoration: underline;
}

.price-section {
  margin-top: auto;
}

.price-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
  font-size: 13px;
}

.label {
  background-color: #f0f0f0;
  padding: 2px 8px;
  font-size: 11px;
  white-space: nowrap;
}

.label.sale-label {
  background-color: #ff9800;
  color: white;
}

.original-price {
  text-decoration: line-through;
  color: #666;
  font-size: 12px;
}

.current-price {
  color: #000;
  font-weight: bold;
}

.sale-price {
  color: #d32f2f;
  font-weight: bold;
}

.out-of-stock {
  color: #d32f2f;
  font-weight: bold;
}

.badge {
  color: #0066cc;
  font-size: 16px;
}

.date-info {
  font-size: 12px;
  color: #666;
}

@media (max-width: 768px) {
  .product-content {
    flex-direction: column;
  }

  .price-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
