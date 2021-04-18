import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    redirect: '/run'
  },
  {
    path: '/',
    name: 'Main',
    component: () => import('@/views/Main'),
    children: [
      {
        path: 'run',
        name: 'Run',
        component: () => import('@/views/run/index')
      },
      {
        path: 'setting',
        name: 'Setting',
        component: () => import('@/views/setting/index')
      }
    ]
  }
]

const router = new VueRouter({
  mode: 'hash',
  base: process.env.BASE_URL,
  routes
})

export default router
