<template>
  <div class="add-wrapper">
    <BaseButton class="add-button" variant="default" @click="showAdd = !showAdd" :title="showAdd ? '關閉' : '新增商品'">
      +
    </BaseButton>
    <div v-if="showAdd" class="add-box">
      <input v-model="url" @keyup.enter="handleAdd" @keyup.esc="showAdd = false" type="text"
        placeholder="貼上商品網址，Enter送出" class="add-input" />
      <BaseButton class="add-submit" variant="primary" @click="handleAdd" :disabled="adding">
        送出
      </BaseButton>
      <div class="add-msg" v-if="errorMessage">{{ errorMessage }}</div>
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
.add-wrapper {
  position: absolute;
  top: 130px;
  right: 12px;
  z-index: 80;
}

.add-button {
  width: 48px;
  height: 36px;
  font-size: 20px;
  font-weight: 600;
  line-height: 1;
  border-radius: 10px;
  box-shadow: 0 6px 18px rgba(30, 30, 30, 0.06);
}

.add-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(30, 30, 30, 0.08);
}

.add-box {
  position: absolute;
  top: 54px;
  right: 0;
  margin-top: 0;
  background: #fff;
  border: 1px solid #e6e6e6;
  padding: 10px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 320px;
  max-width: 520px;
  z-index: 90;
  transform-origin: top right;
  animation: pop .12s ease;
}

@keyframes pop {
  from {
    opacity: 0;
    transform: scale(.98);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

.add-input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.add-submit {
  padding: 8px 12px;
  font-weight: 600;
}

.add-msg {
  color: #d32f2f;
  font-size: 12px;
  margin-left: 8px;
}


@media (max-width: 768px) {
  .add-wrapper {
    top: 145px;
  }
}
</style>
