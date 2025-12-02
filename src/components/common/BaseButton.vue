<template>
  <button 
    :class="buttonClasses" 
    :disabled="disabled" 
    :title="title" 
    @click="handleClick"
  >
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
    'shadow-sm',
    'outline-none',
    'cursor-pointer',
    'inline-flex',
    'items-center',
    'justify-center',
    'transition-all',
    'duration-200',
    'font-medium',
    'px-4',      // 默認水平內距
    'py-2',      // 默認垂直內距
  ]

  // 變體樣式 - 使用語義化的 Tailwind 類別
  const variantClasses = {
    default: [
      'bg-gradient-to-b',
      'from-white',
      'to-neutral-50',
      'text-neutral-600',
      'border-neutral-300',
      'hover:from-neutral-50',
      'hover:to-neutral-100',
      'hover:border-neutral-400',
      'hover:text-neutral-800',
      'hover:shadow-md',
    ],
    primary: [
      'bg-gradient-to-b',
      'from-warning-500',
      'to-warning-600',
      'text-white',
      'border-warning-600',
      'shadow-[0_2px_8px_rgba(246,166,35,0.25)]',
      'hover:from-warning-600',
      'hover:to-warning-700',
      'hover:shadow-[0_4px_14px_rgba(246,166,35,0.35)]',
      'hover:-translate-y-0.5',
    ],
    danger: [
      'bg-danger-600',
      'text-white',
      'border-danger-600',
      'hover:bg-danger-700',
      'hover:shadow-md',
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
