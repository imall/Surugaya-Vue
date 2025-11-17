<script setup>
import WishList from './components/WishList.vue'
</script>

<template>
  <div id="app">
    <WishList />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background-color: #f5f5f5;
  overflow-x: hidden;
}

#app {
  min-height: 100vh;
  width: 100%;
  overflow-x: hidden;
}
</style>
