<script setup>
import { ref } from 'vue'

defineProps({
  msg: String,
})

const count = ref(0)
</script>

<template>
  <h1>{{ msg }}</h1>

  <div class="card">
    <button type="button" @click="count++">計數器：{{ count }}</button>
    <p>
      編輯
      <code>src/components/HelloWorld.vue</code> 來測試 HMR
    </p>
  </div>

  <p>
    查看
    <a href="https://vuejs.org/" target="_blank">Vue 文件</a>
    和
    <a href="https://vitejs.dev/guide/features.html" target="_blank">Vite 文件</a>
    以了解更多資訊。
  </p>
  <p class="read-the-docs">點擊 Vue 和 Vite 標誌了解更多</p>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
