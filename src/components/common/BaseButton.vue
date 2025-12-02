<template>
  <button :class="buttonClasses" :disabled="disabled" :title="title" @click="handleClick">
    <slot></slot>
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'default',
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

// 使用 Tailwind 類別，避免硬編碼樣式
const buttonClasses = computed(() => {
  // 基礎樣式 - 所有按鈕共用
  const baseClasses = [
    'rounded-lg',
    'border',
    'outline-none',
    'cursor-pointer',
    'inline-flex',
    'items-center',
    'justify-center',
    'font-medium',
    'px-4',      // 默認水平內距
    'py-1.5',      // 默認垂直內距
  ]

  // 變體樣式 - 使用語義化的 Tailwind 類別
  const variantClasses = {
    default: [
      'bg-gray-100',
      'text-gray-700',
      'border-gray-300',
      'hover:bg-gray-200',
    ],
    primary: [
      'bg-orange-400',
      'text-white',
      'border-orange-400',
      'hover:bg-orange-500',
    ],
    danger: [
      'bg-red-400',
      'text-white',
      'border-red-400',
      'hover:bg-red-500',
    ],
  }

  // 禁用狀態樣式
  const disabledClasses = props.disabled
    ? ['opacity-50', 'cursor-not-allowed', '!transform-none', '!shadow-none']
    : []

  // 合併所有樣式
  return [
    ...baseClasses,
    ...variantClasses[props.variant],
    ...disabledClasses
  ].join(' ')
})
</script>

<style scoped>
/* 
  此組件完全使用 Tailwind 類別
  無需額外 CSS
*/
</style>
