import { createRouter, createWebHistory } from 'vue-router'
import WishList from '../components/WishList.vue'

const routes = [
  {
    path: '/:category?/:search?',
    name: 'wishlist',
    component: WishList,
    props: route => ({
      initialCategory: route.params.category || 'all',
      initialSearch: route.params.search || ''
    })
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
