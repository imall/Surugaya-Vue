<script setup>
</script>

<template>
  <div id="app">
    <router-view />
  </div>
</template>

<style>
body {
  background: linear-gradient(to bottom right, rgb(240 249 255), rgb(255 255 255), rgb(250 245 255));
  overflow-x: hidden;
  font-family: "メイリオ", Meiryo, "ヒラギノ角ゴ Pro W3", "Hiragino Kaku Gothic Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

#app {
  min-height: 100vh;
  width: 100%;
  overflow-x: hidden;
}
</style>
