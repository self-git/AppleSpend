import { createRouter, createWebHistory } from 'vue-router'
import ImportPage from '@/features/import/ImportPage.vue'
import DashboardPage from '@/features/dashboard/DashboardPage.vue'
import LedgerPage from '@/features/ledger/LedgerPage.vue'
import AssetsPage from '@/features/assets/AssetsPage.vue'
import SubscriptionsPage from '@/features/subscriptions/SubscriptionsPage.vue'
import StoreCreditPage from '@/features/store-credit/StoreCreditPage.vue'
import ReportsPage from '@/features/reports/ReportsPage.vue'
import DataQualityPage from '@/features/data-quality/DataQualityPage.vue'
import RulesPage from '@/features/rules/RulesPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/dashboard' },
    { path: '/import', name: 'import', component: ImportPage },
    { path: '/dashboard', name: 'dashboard', component: DashboardPage },
    { path: '/ledger', name: 'ledger', component: LedgerPage },
    { path: '/assets', name: 'assets', component: AssetsPage },
    { path: '/subscriptions', name: 'subscriptions', component: SubscriptionsPage },
    { path: '/store-credit', name: 'store-credit', component: StoreCreditPage },
    { path: '/reports', name: 'reports', component: ReportsPage },
    { path: '/data-quality', name: 'data-quality', component: DataQualityPage },
    { path: '/settings/rules', name: 'rules', component: RulesPage },
  ],
})
