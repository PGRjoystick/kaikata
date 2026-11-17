import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'

export const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', component: HomeView, meta: { nav: true } },
    { path: '/review', component: () => import('./views/ReviewView.vue'), meta: { nav: true } },
    { path: '/words', component: () => import('./views/WordsView.vue'), meta: { nav: true } },
    { path: '/profile', component: () => import('./views/ProfileView.vue'), meta: { nav: true } },
    { path: '/licenses', component: () => import('./views/LicensesView.vue') },
    { path: '/lesson/:id', component: () => import('./views/LessonView.vue') },
    { path: '/session/:mode/:id?', component: () => import('./views/SessionView.vue') },
    { path: '/:rest(.*)*', redirect: '/' },
  ],
})
