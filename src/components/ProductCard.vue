<template>
  <div class="product-card" :class="{ selected: isSelected }">
    <button @click="handleDelete" class="btn-delete" title="削除">×</button>

    <div class="product-content">
      <div class="product-image" @click="handleToggleSelect">
        <img :src="product.imageUrl" :alt="product.title" />
        <div v-if="isSelected" class="selected-overlay"></div>
      </div>

      <div class="product-info">
        <div class="category">タペストリー</div>
        <a :href="product.url" target="_blank" class="product-title">
          {{ product.title }}
        </a>

        <div class="price-section">
          <template v-if="product.salePrice">
            <div class="price-row">
              <span class="label sale-label">販売価格</span>
              <span class="original-price">¥{{ product.currentPrice.toLocaleString() }}</span>
            </div>
            <div class="price-row">
              <span class="label">セール価格</span>
              <span class="sale-price">¥{{ product.salePrice.toLocaleString() }}(税込)</span>
              <span class="badge">◎</span>
            </div>
          </template>
          <template v-else-if="product.currentPrice > 0">
            <div class="price-row">
              <span class="label">販売価格</span>
              <span class="current-price">¥{{ product.currentPrice.toLocaleString() }}(税込)</span>
              <span class="badge">◎</span>
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
  </div>
</template>

<script setup>
const props = defineProps({
  product: {
    type: Object,
    required: true
  },
  isSelected: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle-select', 'delete'])

const handleToggleSelect = () => {
  emit('toggle-select', props.product.id)
}

const handleDelete = () => {
  emit('delete', props.product.id)
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toISOString().split('T')[0]
}
</script>

<style scoped>
.product-card {
  display: flex;
  gap: 8px;
  padding: 12px;
  border: 2px solid #e0e0e0;
  background-color: white;
  border-radius: 4px;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  transition: all 0.3s ease;
  position: relative;
}

.product-card.selected {
  border-color: #0066cc;
  box-shadow: 0 0 8px rgba(0, 102, 204, 0.3);
}

.btn-delete {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: rgb(227, 65, 65);
  color: white;
  border: none;
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10;
  padding: 0;
}

.btn-delete:hover {
  background-color: #b71c1c;
  transform: scale(1.15);
  opacity: 1;
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
  margin-top: 5px;
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

.sale-label {
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
}
</style>
