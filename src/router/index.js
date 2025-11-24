import { createRouter, createWebHistory } from 'vue-router'
import WishList from '../components/WishList.vue'

const routes = [
  {
    path: '/:category?',
    name: 'wishlist',
    component: WishList,
    props: route => ({
      initialCategory: route.params.category || 'all'
    })
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
