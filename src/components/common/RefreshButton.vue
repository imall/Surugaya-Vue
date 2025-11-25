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
  width: 36px;
  height: 36px;
  font-size: 20px;
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
