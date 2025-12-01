<template>
  <button :class="['base-button', variant]" :disabled="disabled" :title="title" @click="handleClick">
    <slot></slot>
  </button>
</template>

<script setup>
defineProps({
  variant: {
    type: String,
    default: 'default', // default, primary, danger
    validator: (value) => ['default', 'primary', 'danger'].includes(value)
  },
  disabled: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['click'])

const handleClick = () => {
  emit('click')
}
</script>

<style scoped>
.base-button {
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  outline: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-weight: 500;
  flex-shrink: 0;
}

/* 預設樣式 */
.base-button.default {
  background: linear-gradient(180deg, #ffffff 0%, #f7f7f7 100%);
  color: #666;
}

.base-button.default:hover:not(:disabled) {
  background: linear-gradient(180deg, #fafafa 0%, #f0f0f0 100%);
  border-color: #ccc;
  color: #333;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}


/* 主要按鈕樣式 */
.base-button.primary {
  background: linear-gradient(180deg, #F6A623 0%, #E89619 100%);
  color: #FFFFFF;
  border: 1px solid #E89619;
  box-shadow: 0 2px 8px rgba(246, 166, 35, 0.25);
}

.base-button.primary:hover:not(:disabled) {
  background: linear-gradient(180deg, #E89619 0%, #D98710 100%);
  box-shadow: 0 4px 14px rgba(246, 166, 35, 0.35);
  transform: translateY(-1px);
}

/* 危險按鈕樣式 */
.base-button.danger {
  background-color: #d32f2f;
  color: white;
  border: none;
}

.base-button.danger:hover:not(:disabled) {
  background-color: #b71c1c;
}

.base-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}
</style>
