<template>
  <div class="flex justify-end mt-4">
    <div class="relative">
      <BaseButton 
        class="w-12 h-9 p-0! text-xl font-semibold leading-none rounded-[10px] shadow-md transition-all duration-200 hover:shadow-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-sm" 
        variant="default" 
        @click="showAdd = !showAdd" 
        :title="showAdd ? '關閉' : '新增商品'"
      >
        +
      </BaseButton>
      
      <transition name="pop">
        <div 
          v-if="showAdd" 
          class="add-box absolute top-0 right-[60px] bg-white border border-neutral-200 p-2.5 rounded-lg flex items-center gap-2 w-[360px] md:w-[360px] max-md:top-[53px]! max-md:right-0! max-md:w-[calc(100vw-40px)]! shadow-lg z-10"
        >
          <input 
            id="url" 
            v-model="url" 
            @keyup.enter="handleAdd" 
            @keyup.esc="showAdd = false" 
            type="text"
            placeholder="貼上商品網址，Enter送出" 
            class="flex-1 px-2 py-1.5 border border-neutral-300 rounded h-[30px] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
          />
          <BaseButton 
            class="text-sm! h-[30px]! px-3! py-1! font-semibold" 
            variant="primary" 
            @click="handleAdd" 
            :disabled="adding"
          >
            送出
          </BaseButton>
        </div>
      </transition>
      <div v-if="errorMessage && showAdd" class="absolute top-[45px] right-0 text-danger-600 text-xs bg-red-50 border border-red-200 px-2 py-1 rounded mt-1 max-md:top-[98px]!">
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import BaseButton from './BaseButton.vue'

defineProps({
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
/* 彈出動畫 */
.add-box {
  transform-origin: bottom right;
}

@media (max-width: 768px) {
  .add-box {
    transform-origin: top right;
  }
}

/* Vue Transition 動畫 */
.pop-enter-active,
.pop-leave-active {
  transition: all 0.12s ease;
}

.pop-enter-from {
  opacity: 0;
  transform: scale(0.98);
}

.pop-enter-to {
  opacity: 1;
  transform: scale(1);
}

.pop-leave-from {
  opacity: 1;
  transform: scale(1);
}

.pop-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
</style>
