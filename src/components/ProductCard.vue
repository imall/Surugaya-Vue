<template>
  <div class="product-card" :class="{ selected: isSelected }">
    <button @click="handleDelete" class="btn-delete" title="削除">×</button>

    <!-- purpose badge (top-left) -->
    <div v-if="showPurpose" class="card-purpose-badge">
      <span class="purpose-badge">{{ (product.purposeCategory && String(product.purposeCategory).toLowerCase() !==
        'none') ? product.purposeCategory : '未分類' }}</span>
    </div>

    <div class="product-content">
      <div class="product-image" @click="handleToggleSelect">
        <img :src="product.imageUrl" :alt="product.title" />
        <div v-if="isSelected" class="selected-overlay"></div>
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
            <select v-model="localPurpose" class="purpose-select">
              <option value="none">未分類</option>
              <option value="購買">購買</option>
              <option value="販售">販售</option>
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

<script setup>
import { ref } from 'vue'

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

const handleToggleSelect = () => {
  emit('toggle-select', props.product.id)
}

const handleDelete = () => {
  emit('delete', props.product.id)
}

const formatDate = (dateString) => {
  return dateString.split('T')[0];
}

// modal edit state
const showEditModal = ref(false)
const localSeriesName = ref(props.product.seriesName || '')
const uiValueOfBackend = (v) => {
  if (!v) return 'none'
  const s = String(v).toLowerCase()
  if (s === 'none') return 'none'
  return v
}
const backendValueForSend = (uiVal) => {
  if (!uiVal) return 'None'
  if (String(uiVal).toLowerCase() === 'none') return 'None'
  return uiVal
}
// default to 'none' (UI) when backend has none/None
const localPurpose = ref(uiValueOfBackend(props.product.purposeCategory))
const saving = ref(false)
const longPressTimer = ref(null)
const touchSupported = (typeof window !== 'undefined') && (('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0))

const API_Details = 'https://surugaya.onrender.com/api/SurugayaDetails'
const API_Category = 'https://surugaya.onrender.com/api/SurugayaCategory'

const openEditModal = () => {
  localSeriesName.value = props.product.seriesName || ''
  localPurpose.value = uiValueOfBackend(props.product.purposeCategory)
  showEditModal.value = true
}

const closeModal = () => {
  showEditModal.value = false
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
  const newPurpose = (localPurpose.value || '').toString()
  if (newPurpose !== 'none' && newPurpose !== '購買' && newPurpose !== '販售') {
    alert('用途請選擇「購買」或「販售」或「未分類」')
    return
  }

  saving.value = true
  try {
    const oldPurposeUI = uiValueOfBackend(props.product.purposeCategory)
    if (oldPurposeUI === newPurpose) {
      saving.value = false
      showEditModal.value = false
      return
    }

    const sendPurpose = backendValueForSend(newPurpose)
    const maybeSeries = (localSeriesName.value || '').trim()
    const qs = maybeSeries ? `?purposeCategory=${encodeURIComponent(sendPurpose)}&seriesName=${encodeURIComponent(maybeSeries)}` : `?purposeCategory=${encodeURIComponent(sendPurpose)}`

    const res = await fetch(`${API_Category}/${props.product.id}/purposeCategory${qs}`, { method: 'PATCH', headers: { 'Accept': 'application/json' } })
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(txt || '用途の更新に失敗しました')
    }
    emit('updated', { id: props.product.id, purposeCategory: sendPurpose })
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
  const newPurpose = (localPurpose.value || '').toString()

  if (!newSeries) {
    if (!confirm('作品名為空，確定要清空嗎？')) return
  }

  saving.value = true
  try {
    const sendPurpose = backendValueForSend(newPurpose)
    const qs = `?seriesName=${encodeURIComponent(newSeries)}&purposeCategory=${encodeURIComponent(sendPurpose)}`
    const res = await fetch(`${API_Category}/${props.product.id}/seriesName${qs}`, { method: 'PATCH', headers: { 'Accept': 'application/json' } })
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(txt || 'シリーズ名の更新に失敗しました')
    }
    emit('updated', { id: props.product.id, seriesName: newSeries })
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
  const newPurpose = (localPurpose.value || '').toString()

  if (newPurpose !== 'none' && newPurpose !== '購買' && newPurpose !== '販售') {
    alert('用途請選擇「購買」或「販售」或「未分類」')
    return
  }

  if (!newSeries) {
    if (!confirm('作品名為空，確定要清空嗎？')) return
  }

  saving.value = true
  try {
    const qs = `?purposeCategory=${encodeURIComponent(newPurpose)}&seriesName=${encodeURIComponent(newSeries)}`
    const res1 = await fetch(`${API_Category}/${props.product.id}/purposeAndSeries${qs}`, { method: 'PATCH', headers: { 'Accept': 'application/json' } })
    if (!res1.ok) {
      const txt = await res1.text()
      throw new Error(txt || '用途の更新に失敗しました')
    }
    emit('updated', { id: props.product.id, purposeCategory: newPurpose, seriesName: newSeries })

    showEditModal.value = false
  } catch (err) {
    alert('全部儲存時發生錯誤: ' + parseErrorMessage(err))
    console.error(err)
  } finally {
    saving.value = false
  }
}


</script>

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
  top: 8px;
  left: 8px;
  z-index: 12;
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
