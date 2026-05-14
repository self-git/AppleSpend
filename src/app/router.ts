import { createRouter, createWebHistory } from 'vue-router'
import ImportPage from '@/features/import/ImportPage.vue'
import DashboardPage from '@/features/dashboard/DashboardPage.vue'
import LedgerPage from '@/features/ledger/LedgerPage.vue'
import AssetsPage from '@/features/assets/AssetsPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/import', name: 'import', component: ImportPage },
    { path: '/dashboard', name: 'dashboard', component: DashboardPage },
    { path: '/ledger', name: 'ledger', component: LedgerPage },
    { path: '/assets', name: 'assets', component: AssetsPage },
  ],
})
