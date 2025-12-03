<template>
  <div class="relative w-full add-url-root h-10">
    <transition name="slide">
      <div v-if="showAdd"
        class="add-panel absolute top-1/2 transform -translate-y-1/2 right-12 flex items-center gap-2 bg-white border border-gray-300 p-2 rounded-lg shadow-sm w-[360px] max-w-[calc(100%-35px)]">
        <input id="url" ref="inputRef" v-model="url" @keyup.enter="handleAdd" @keyup.esc="showAdd = false" type="text"
          placeholder="貼上商品網址，Enter送出"
          class="flex-1 px-2.5 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300 transition-all duration-200" />
        <BaseButton class="text-sm! px-3! py-1.5! font-semibold shrink-0" variant="primary" @click="handleAdd"
          :disabled="adding">
          送出
        </BaseButton>
      </div>
    </transition>

    <BaseButton
      class="add-toggle absolute right-0 top-1/2 transform -translate-y-1/2 w-10 h-10 p-0! text-lg font-semibold leading-none rounded-lg shadow-sm transition-all duration-200 hover:shadow-md"
      variant="default" @click="showAdd = !showAdd" :title="showAdd ? '關閉' : '新增商品'">
      {{ showAdd ? '×' : '+' }}
    </BaseButton>
  </div>

  <div v-if="errorMessage && showAdd && showError"
    class="mt-5  ml-auto text-red-600 text-m text-center bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-md shadow-sm w-[360px] max-w-[calc(100%-35px)]">
    {{ errorMessage }}
  </div>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue'
import BaseButton from './BaseButton.vue'

const props = defineProps({
  adding: {
    type: Boolean,
    default: false
  },
  errorMessage: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['add', 'update:url'])

const showAdd = ref(false)
const url = ref('')
const inputRef = ref(null)
const showError = ref(false)
let errorTimeout = null

// 監聽錯誤訊息，3秒後自動隱藏
watch(() => props.errorMessage, (newError) => {
  if (newError) {
    // 顯示錯誤訊息
    showError.value = true

    // 清除之前的計時器
    if (errorTimeout) {
      clearTimeout(errorTimeout)
    }

    // 設定3秒後自動隱藏錯誤訊息
    errorTimeout = setTimeout(() => {
      showError.value = false
      url.value = ''
    }, 1500)
  }
})

const handleAdd = () => {
  if (!url.value) return
  emit('add', url.value)
}

defineExpose({
  clear: () => {
    url.value = ''
    showAdd.value = false
  }
})
</script>

<style scoped>
/* 滑入動畫 */
.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.slide-enter-to {
  opacity: 1;
  transform: translateX(0);
}

.slide-leave-from {
  opacity: 1;
  transform: translateX(0);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* 新增：響應式面板和按鈕行為 */
.add-url-root {
  position: relative;
}

.add-url-root .add-panel {
  z-index: 40;
}

.add-url-root .add-toggle {
  z-index: 50;
}
</style>
