<template>
  <BaseButton
    class="w-9 h-9 p-0! text-xl transition-all duration-200 active:translate-x-0.5 active:translate-y-0.5 active:shadow-sm disabled:opacity-50 shrink-0"
    variant="default" :disabled="loading" :title="loading ? '読み込み中...' : 'データを再読み込み'" @click="handleClick">
    <span class="inline-block transition-transform duration-300" :class="{ 'animate-spin': loading }">↻</span>
  </BaseButton>
</template>

<script setup>
import BaseButton from './BaseButton.vue'

defineProps({
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['refresh'])

const handleClick = () => {
  emit('refresh')
}
</script>
