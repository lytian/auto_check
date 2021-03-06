import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/run'
  },
  {
    path: '/run',
    name: 'Run',
    component: () => import('@/views/run/index')
  },
  {
    path: '/setting',
    name: 'Setting',
    component: () => import('@/views/setting/index')
  }
]

const router = createRouter({
  history: createWebHashHistory(process.env.BASE_URL),
  routes
})

export default router
