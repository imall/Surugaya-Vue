<template>
  <BaseButton class="refresh-button" variant="default" :disabled="loading" :title="loading ? '読み込み中...' : 'データを再読み込み'"
    @click="handleClick">
    <span class="refresh-icon" :class="{ spinning: loading }">↻</span>
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

<style scoped>
.refresh-button {
  position: absolute;
  inset: 0 0 0 auto;
  margin: auto;
  width: 36px;
  height: 36px;
  font-size: 20px;
  transition: box-shadow 0.2s ease, background-color 0.2s ease, transform 0.1s ease;
}

.refresh-button:active:not(:disabled) {
  transform: translate(2px, 2px);
  box-shadow: 0 2px 8px rgba(30, 30, 30, 0.1);
}

.refresh-icon {
  display: inline-block;
  transition: transform 0.3s ease;
}

.refresh-icon.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
