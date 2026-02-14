<script setup lang="ts">
import {
  getAllPlansForDisplay,
  getTierUI,
  getTierDisplayName,
  type SubscriptionTier,
} from '~/shared/subscriptions'

definePageMeta({
  layout: 'app',
  middleware: 'admin',
})

const { data: stats, pending } = useFetch('/api/admin/stats')
const { data: health } = useFetch('/api/health', {
  default: () => null,
})
const { data: usageStats } = useFetch('/api/admin/usage-stats', {
  params: { days: 7, limit: 5 },
  default: () => null,
})

const statCards = computed(() => {
  if (!stats.value) return []
  return [
    {
      label: 'Total Users',
      value: stats.value.users.total,
      icon: 'i-heroicons-users',
      color: 'text-blue-500',
    },
    {
      label: 'New This Week',
      value: stats.value.users.newThisWeek,
      icon: 'i-heroicons-user-plus',
      color: 'text-green-500',
    },
    {
      label: 'New This Month',
      value: stats.value.users.newThisMonth,
      icon: 'i-heroicons-calendar',
      color: 'text-purple-500',
    },
    {
      label: 'Active Subscriptions',
      value: stats.value.subscriptions.active,
      icon: 'i-heroicons-credit-card',
      color: 'text-amber-500',
    },
    {
      label: 'Total Entries',
      value: stats.value.content.totalEntries,
      icon: 'i-heroicons-book-open',
      color: 'text-cyan-500',
    },
    {
      label: 'Total Projects',
      value: stats.value.content.totalProjects,
      icon: 'i-heroicons-folder',
      color: 'text-indigo-500',
    },
    {
      label: 'Open Feedback',
      value: stats.value.feedback.open,
      icon: 'i-heroicons-inbox',
      color: 'text-rose-500',
    },
    {
      label: 'MRR',
      value: `$${(stats.value.subscriptions.mrr ?? 0).toLocaleString()}`,
      icon: 'i-heroicons-banknotes',
      color: 'text-emerald-500',
    },
  ]
})

const allPlans = getAllPlansForDisplay()

const tierData = computed(() => {
  if (!stats.value) return []
  const tiers = stats.value.subscriptions.byTier as Record<string, number>
  return allPlans.map((plan) => ({
    label: plan.name,
    value: tiers[plan.id] ?? 0,
    color: plan.ui.chartClass,
  }))
})

const totalTierUsers = computed(() => tierData.value.reduce((sum, t) => sum + t.value, 0) || 1)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
      <div class="flex items-center gap-2">
        <span
          class="inline-flex items-center gap-1.5 text-sm"
          :class="health?.status === 'healthy' ? 'text-green-500' : 'text-red-500'"
        >
          <span
            class="w-2 h-2 rounded-full"
            :class="health?.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'"
          />
          {{ health?.status === 'healthy' ? 'System Healthy' : 'System Issue' }}
        </span>
      </div>
    </div>

    <div v-if="pending" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <USkeleton v-for="i in 7" :key="i" class="h-24 rounded-lg" />
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <UCard v-for="stat in statCards" :key="stat.label">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
            <UIcon :name="stat.icon" class="w-5 h-5" :class="stat.color" />
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ stat.label }}</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ stat.value?.toLocaleString() }}
            </p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Subscription tier breakdown -->
    <UCard>
      <template #header>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          Subscription Distribution
        </h2>
      </template>

      <div class="space-y-4">
        <div class="flex h-4 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-800">
          <div
            v-for="tier in tierData"
            :key="tier.label"
            :class="tier.color"
            :style="{ width: `${(tier.value / totalTierUsers) * 100}%` }"
            class="transition-all duration-500"
          />
        </div>
        <div class="flex gap-6">
          <div v-for="tier in tierData" :key="tier.label" class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full" :class="tier.color" />
            <span class="text-sm text-gray-500 dark:text-gray-400"
              >{{ tier.label }}: {{ tier.value }}</span
            >
          </div>
        </div>
      </div>
    </UCard>

    <!-- Quick links -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UCard>
        <template #header>
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
        </template>
        <div class="space-y-2">
          <UButton
            to="/app/admin/users"
            label="Manage Users"
            icon="i-heroicons-users"
            variant="ghost"
            color="neutral"
            block
            class="justify-start"
          />
          <UButton
            to="/app/admin/feedback"
            label="View Feedback"
            icon="i-heroicons-inbox"
            variant="ghost"
            color="neutral"
            block
            class="justify-start"
          />
          <UButton
            to="/app/admin/announcements"
            label="Post Announcement"
            icon="i-heroicons-megaphone"
            variant="ghost"
            color="neutral"
            block
            class="justify-start"
          />
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">System Health</h3>
        </template>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">Database</span>
            <UBadge
              :color="health?.checks?.database?.status === 'healthy' ? 'success' : 'error'"
              variant="subtle"
              size="sm"
            >
              {{ health?.checks?.database?.status || 'unknown' }}
            </UBadge>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">DB Latency</span>
            <span class="text-sm text-gray-900 dark:text-white"
              >{{ health?.checks?.database?.latency ?? '...' }}ms</span
            >
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">Uptime</span>
            <span class="text-sm text-gray-900 dark:text-white">{{
              health?.uptime ? Math.floor(health.uptime / 3600) + 'h' : '...'
            }}</span>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">Stripe</h3>
        </template>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">Status</span>
            <UBadge
              :color="
                health?.checks?.stripe?.status === 'healthy'
                  ? 'success'
                  : health?.checks?.stripe?.status === 'unconfigured'
                    ? 'warning'
                    : 'error'
              "
              variant="subtle"
              size="sm"
            >
              {{ health?.checks?.stripe?.status || 'unknown' }}
            </UBadge>
          </div>
          <div v-if="health?.checks?.stripe?.latency" class="flex items-center justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">Latency</span>
            <span class="text-sm text-gray-900 dark:text-white"
              >{{ health.checks.stripe.latency }}ms</span
            >
          </div>
          <div v-if="health?.checks?.stripe?.error" class="flex items-center justify-between">
            <span class="text-sm text-gray-500 dark:text-gray-400">Note</span>
            <span class="text-xs text-gray-500 truncate max-w-[180px]">{{
              health.checks.stripe.error
            }}</span>
          </div>
        </div>
      </UCard>
    </div>
    <!-- API Usage -->
    <UCard v-if="usageStats?.users?.length">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">
            Top API Users (7 days)
          </h3>
          <span class="text-xs text-gray-400">Avg: {{ usageStats.globalAvgDaily }} req/day</span>
        </div>
      </template>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr
              class="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700"
            >
              <th class="pb-2 font-medium">User</th>
              <th class="pb-2 font-medium text-right">Total</th>
              <th class="pb-2 font-medium text-right">Avg/Day</th>
              <th class="pb-2 font-medium text-right">Days Active</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="u in usageStats.users"
              :key="u.userId"
              class="border-b border-gray-100 dark:border-gray-800/50"
            >
              <td class="py-2">
                <p class="font-medium text-gray-900 dark:text-white text-xs">
                  {{ u.name || u.email }}
                </p>
                <p v-if="u.name" class="text-xs text-gray-400">{{ u.email }}</p>
              </td>
              <td class="py-2 text-right font-mono">
                <span
                  :class="
                    u.avgDaily > (usageStats.globalAvgDaily || 1) * 2
                      ? 'text-red-500 font-bold'
                      : 'text-gray-900 dark:text-white'
                  "
                >
                  {{ u.totalRequests.toLocaleString() }}
                </span>
              </td>
              <td class="py-2 text-right text-gray-500 dark:text-gray-400">{{ u.avgDaily }}</td>
              <td class="py-2 text-right text-gray-500 dark:text-gray-400">{{ u.activeDays }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </div>
</template>
