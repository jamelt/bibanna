<script setup lang="ts">
import {
  getAllPlansForDisplay,
  type SubscriptionTier,
  SUBSCRIPTION_PLANS,
} from '~/shared/subscriptions'

definePageMeta({
  layout: 'app',
  middleware: 'admin',
})

const allPlans = getAllPlansForDisplay()

const search = ref('')
const tierFilter = ref('all')
const roleFilter = ref('all')
const bannedFilter = ref('all')
const page = ref(1)
const pageSize = 20

const queryParams = computed(() => ({
  q: search.value || undefined,
  tier: tierFilter.value === 'all' ? undefined : tierFilter.value,
  role: roleFilter.value === 'all' ? undefined : roleFilter.value,
  banned: bannedFilter.value === 'all' ? undefined : bannedFilter.value,
  page: page.value,
  pageSize,
}))

const {
  data: usersData,
  pending,
  refresh,
} = useFetch('/api/admin/users', {
  query: queryParams,
  watch: [queryParams],
})

const selectedUser = ref<any>(null)
const isDetailOpen = ref(false)
const isGrantTierOpen = ref(false)
const isBanDialogOpen = ref(false)
const isDeleteDialogOpen = ref(false)
const banReason = ref('')
const grantTier = ref<SubscriptionTier>('pro')
const deleteReason = ref('')
const deleteConfirmEmail = ref('')
const syncingStripe = ref(false)
const syncResult = ref<string | null>(null)
const isResetPasswordOpen = ref(false)
const resetPasswordResult = ref<string | null>(null)
const resettingPassword = ref(false)

const userSubscription = ref<any>(null)
const userAuditLogs = ref<any[]>([])
const userUsage = ref<any>(null)
const loadingDetail = ref(false)
const migratingPrice = ref(false)

const isGrandfathered = computed(() => {
  const sub = userSubscription.value?.subscription
  if (!sub?.unitAmount || !sub?.tier || !sub?.billingInterval) return false
  const plan = SUBSCRIPTION_PLANS[sub.tier as SubscriptionTier]
  if (!plan?.pricing) return false
  const listPrice = sub.billingInterval === 'year' ? plan.pricing.yearly : plan.pricing.monthly
  return sub.unitAmount < listPrice
})

const currentListPrice = computed(() => {
  const sub = userSubscription.value?.subscription
  if (!sub?.tier || !sub?.billingInterval) return '?'
  const plan = SUBSCRIPTION_PLANS[sub.tier as SubscriptionTier]
  if (!plan?.pricing) return '?'
  const listPrice = sub.billingInterval === 'year' ? plan.pricing.yearly : plan.pricing.monthly
  return (listPrice / 100).toFixed(2)
})

async function openUserDetail(user: any) {
  selectedUser.value = user
  isDetailOpen.value = true
  syncResult.value = null
  loadingDetail.value = true

  try {
    const [subData, logsData, usageData] = await Promise.all([
      $fetch(`/api/subscription/admin/${user.id}`).catch(() => null),
      $fetch<{ data: any[] }>('/api/admin/audit-logs', {
        params: { targetId: user.id, targetType: 'user', pageSize: 10 },
      }).catch(() => ({ data: [] })),
      $fetch<any>(`/api/admin/users/${user.id}/usage`, {
        params: { days: 7 },
      }).catch(() => null),
    ])
    userSubscription.value = subData
    userAuditLogs.value = logsData.data ?? []
    userUsage.value = usageData
  } catch {
    userSubscription.value = null
    userAuditLogs.value = []
    userUsage.value = null
  } finally {
    loadingDetail.value = false
  }
}

async function handleBan() {
  if (!selectedUser.value || !banReason.value) return
  await $fetch(`/api/admin/users/${selectedUser.value.id}/ban`, {
    method: 'POST',
    body: { reason: banReason.value },
  })
  isBanDialogOpen.value = false
  banReason.value = ''
  isDetailOpen.value = false
  refresh()
}

async function handleUnban(userId: string) {
  await $fetch(`/api/admin/users/${userId}/unban`, { method: 'POST' })
  isDetailOpen.value = false
  refresh()
}

async function handleGrantTier() {
  if (!selectedUser.value) return
  await $fetch(`/api/admin/users/${selectedUser.value.id}/grant-tier`, {
    method: 'POST',
    body: { tier: grantTier.value },
  })
  isGrantTierOpen.value = false
  isDetailOpen.value = false
  refresh()
}

async function handleImpersonate() {
  if (!selectedUser.value) return
  await $fetch(`/api/admin/users/${selectedUser.value.id}/impersonate`, { method: 'POST' })
  window.location.href = '/app'
}

async function handleSyncStripe() {
  if (!selectedUser.value) return
  syncingStripe.value = true
  syncResult.value = null
  try {
    const result = await $fetch<{ message: string }>(
      `/api/admin/users/${selectedUser.value.id}/sync-stripe`,
      { method: 'POST' },
    )
    syncResult.value = result.message
    refresh()
  } catch (e: any) {
    syncResult.value = e.data?.message || 'Sync failed'
  } finally {
    syncingStripe.value = false
  }
}

async function handleExportData() {
  if (!selectedUser.value) return
  const data = await $fetch(`/api/admin/users/${selectedUser.value.id}/export-data`)
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `user-export-${selectedUser.value.email}-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

async function handleMigratePrice() {
  if (!selectedUser.value || !userSubscription.value?.subscription) return
  migratingPrice.value = true
  try {
    const interval = userSubscription.value.subscription.billingInterval || 'month'
    await $fetch(`/api/admin/users/${selectedUser.value.id}/migrate-price`, {
      method: 'POST',
      body: { interval },
    })
    await openUserDetail(selectedUser.value)
  } catch {
    /* ignored */
  } finally {
    migratingPrice.value = false
  }
}

async function handleResetPassword() {
  if (!selectedUser.value) return
  resettingPassword.value = true
  resetPasswordResult.value = null
  try {
    const result = await $fetch<{ temporaryPassword: string }>(
      `/api/admin/users/${selectedUser.value.id}/reset-password`,
      { method: 'POST' },
    )
    resetPasswordResult.value = result.temporaryPassword
  } catch {
    resetPasswordResult.value = null
  } finally {
    resettingPassword.value = false
  }
}

async function handleDelete() {
  if (!selectedUser.value || !deleteReason.value || !deleteConfirmEmail.value) return
  await $fetch(`/api/admin/users/${selectedUser.value.id}/delete`, {
    method: 'POST',
    body: { reason: deleteReason.value, confirmEmail: deleteConfirmEmail.value },
  })
  isDeleteDialogOpen.value = false
  isDetailOpen.value = false
  deleteReason.value = ''
  deleteConfirmEmail.value = ''
  refresh()
}

const tierColors: Record<string, string> = Object.fromEntries(
  allPlans.map((plan) => [plan.id, plan.ui.badgeColor]),
)

const roleColors: Record<string, string> = {
  user: 'neutral',
  admin: 'error',
  support: 'info',
}

const actionColors: Record<string, string> = {
  'user.ban': 'error',
  'user.unban': 'success',
  'user.update': 'info',
  'user.grant_tier': 'warning',
  'user.promote_admin': 'error',
  'user.impersonate': 'warning',
  'user.stop_impersonate': 'info',
  'user.sync_stripe': 'info',
  'user.export_data': 'neutral',
  'user.hard_delete': 'error',
  'user.reset_password': 'warning',
}

function resetFilters() {
  search.value = ''
  tierFilter.value = 'all'
  roleFilter.value = 'all'
  bannedFilter.value = 'all'
  page.value = 1
}

watch(search, () => {
  page.value = 1
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
      <span class="text-sm text-gray-500 dark:text-gray-400"
        >{{ usersData?.total ?? 0 }} users total</span
      >
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3 items-end">
      <UInput
        v-model="search"
        icon="i-heroicons-magnifying-glass"
        placeholder="Search by email or name..."
        class="w-64"
      />
      <USelect
        v-model="tierFilter"
        :items="[
          { label: 'All Tiers', value: 'all' },
          ...allPlans.map((p) => ({ label: p.name, value: p.id })),
        ]"
        class="w-36"
      />
      <USelect
        v-model="roleFilter"
        :items="[
          { label: 'All Roles', value: 'all' },
          { label: 'User', value: 'user' },
          { label: 'Admin', value: 'admin' },
          { label: 'Support', value: 'support' },
        ]"
        class="w-36"
      />
      <USelect
        v-model="bannedFilter"
        :items="[
          { label: 'All Status', value: 'all' },
          { label: 'Active', value: 'false' },
          { label: 'Banned', value: 'true' },
        ]"
        class="w-36"
      />
      <UButton
        icon="i-heroicons-x-mark"
        variant="ghost"
        color="neutral"
        size="sm"
        @click="resetFilters"
      />
    </div>

    <!-- Users Table -->
    <UCard>
      <div v-if="pending" class="space-y-3">
        <USkeleton v-for="i in 5" :key="i" class="h-12 rounded" />
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr
              class="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700"
            >
              <th class="pb-3 font-medium">User</th>
              <th class="pb-3 font-medium">Tier</th>
              <th class="pb-3 font-medium">Role</th>
              <th class="pb-3 font-medium">Status</th>
              <th class="pb-3 font-medium">Joined</th>
              <th class="pb-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="u in usersData?.data"
              :key="u.id"
              class="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors"
              @click="openUserDetail(u)"
            >
              <td class="py-3">
                <div class="flex items-center gap-3">
                  <UAvatar :text="u.email?.slice(0, 2).toUpperCase()" size="sm" />
                  <div>
                    <p class="font-medium text-gray-900 dark:text-white">
                      {{ u.name || 'No name' }}
                    </p>
                    <p class="text-xs text-gray-500">{{ u.email }}</p>
                  </div>
                </div>
              </td>
              <td class="py-3">
                <UBadge :color="tierColors[u.subscriptionTier] as any" variant="subtle" size="sm">
                  {{ u.subscriptionTier }}
                </UBadge>
              </td>
              <td class="py-3">
                <UBadge :color="roleColors[u.role] as any" variant="subtle" size="sm">
                  {{ u.role }}
                </UBadge>
              </td>
              <td class="py-3">
                <UBadge v-if="u.isBanned" color="error" variant="subtle" size="sm">Banned</UBadge>
                <UBadge v-else color="success" variant="subtle" size="sm">Active</UBadge>
              </td>
              <td class="py-3 text-gray-500 dark:text-gray-400">
                {{ new Date(u.createdAt).toLocaleDateString() }}
              </td>
              <td class="py-3 text-right">
                <UButton
                  icon="i-heroicons-eye"
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  @click.stop="openUserDetail(u)"
                />
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="!usersData?.data?.length" class="text-center py-8 text-gray-500">
          No users found matching your filters.
        </div>
      </div>

      <!-- Pagination -->
      <div
        v-if="usersData && usersData.totalPages > 1"
        class="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
      >
        <span class="text-sm text-gray-500 dark:text-gray-400">
          Page {{ usersData.page }} of {{ usersData.totalPages }}
        </span>
        <div class="flex gap-2">
          <UButton
            icon="i-heroicons-chevron-left"
            variant="ghost"
            color="neutral"
            size="sm"
            :disabled="page <= 1"
            @click="page--"
          />
          <UButton
            icon="i-heroicons-chevron-right"
            variant="ghost"
            color="neutral"
            size="sm"
            :disabled="page >= usersData.totalPages"
            @click="page++"
          />
        </div>
      </div>
    </UCard>

    <!-- User Detail Slideover -->
    <USlideover
      v-model:open="isDetailOpen"
      :title="selectedUser?.name || selectedUser?.email || 'User Detail'"
    >
      <template #body>
        <div v-if="selectedUser" class="space-y-6">
          <div class="flex items-center gap-4">
            <UAvatar :text="selectedUser.email?.slice(0, 2).toUpperCase()" size="lg" />
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ selectedUser.name || 'No name' }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ selectedUser.email }}</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-xs text-gray-500 mb-1">Subscription Tier</p>
              <UBadge :color="tierColors[selectedUser.subscriptionTier] as any" variant="subtle">
                {{ selectedUser.subscriptionTier }}
              </UBadge>
            </div>
            <div>
              <p class="text-xs text-gray-500 mb-1">Role</p>
              <UBadge :color="roleColors[selectedUser.role] as any" variant="subtle">
                {{ selectedUser.role }}
              </UBadge>
            </div>
            <div>
              <p class="text-xs text-gray-500 mb-1">Status</p>
              <UBadge :color="selectedUser.isBanned ? 'error' : 'success'" variant="subtle">
                {{ selectedUser.isBanned ? 'Banned' : 'Active' }}
              </UBadge>
            </div>
            <div>
              <p class="text-xs text-gray-500 mb-1">Joined</p>
              <p class="text-sm text-gray-900 dark:text-white">
                {{ new Date(selectedUser.createdAt).toLocaleDateString() }}
              </p>
            </div>
          </div>

          <div>
            <p class="text-xs text-gray-500 mb-1">User ID</p>
            <code
              class="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded"
              >{{ selectedUser.id }}</code
            >
          </div>

          <!-- Stripe Subscription Info -->
          <div v-if="loadingDetail" class="space-y-2">
            <USkeleton class="h-16 rounded" />
          </div>
          <div v-else-if="userSubscription" class="space-y-3">
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
              Stripe Subscription
            </h4>
            <div
              v-if="userSubscription.subscription"
              class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2 text-sm"
            >
              <div class="flex justify-between">
                <span class="text-gray-500">Status</span>
                <UBadge
                  :color="
                    userSubscription.subscription.status === 'active'
                      ? 'success'
                      : userSubscription.subscription.status === 'past_due'
                        ? 'warning'
                        : 'neutral'
                  "
                  variant="subtle"
                  size="sm"
                >
                  {{ userSubscription.subscription.status }}
                </UBadge>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Stripe Tier</span>
                <span class="text-gray-900 dark:text-white">{{
                  userSubscription.subscription.tier
                }}</span>
              </div>
              <div
                v-if="userSubscription.subscription.unitAmount != null"
                class="flex justify-between"
              >
                <span class="text-gray-500">Price</span>
                <div class="flex items-center gap-1.5">
                  <span class="text-gray-900 dark:text-white">
                    ${{ (userSubscription.subscription.unitAmount / 100).toFixed(2) }}/{{
                      userSubscription.subscription.billingInterval || 'mo'
                    }}
                  </span>
                  <UBadge v-if="isGrandfathered" color="info" variant="subtle" size="sm">
                    Grandfathered
                  </UBadge>
                </div>
              </div>
              <div v-if="isGrandfathered" class="flex justify-between">
                <span class="text-gray-500">Current List Price</span>
                <span class="text-gray-400 line-through">${{ currentListPrice }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Period End</span>
                <span class="text-gray-900 dark:text-white">{{
                  new Date(userSubscription.subscription.currentPeriodEnd).toLocaleDateString()
                }}</span>
              </div>
              <div
                v-if="userSubscription.subscription.cancelAtPeriodEnd"
                class="flex justify-between"
              >
                <span class="text-gray-500">Cancels At</span>
                <UBadge color="warning" variant="subtle" size="sm">End of period</UBadge>
              </div>
              <!-- Grace Period Info -->
              <div v-if="userSubscription.subscription.graceEndsAt" class="flex justify-between">
                <span class="text-gray-500">Grace Ends</span>
                <UBadge color="warning" variant="subtle" size="sm">
                  {{ new Date(userSubscription.subscription.graceEndsAt).toLocaleDateString() }}
                </UBadge>
              </div>
              <div
                v-if="userSubscription.subscription.lastPaymentError"
                class="flex justify-between"
              >
                <span class="text-gray-500">Payment Error</span>
                <span class="text-red-500 text-xs max-w-[200px] text-right">{{
                  userSubscription.subscription.lastPaymentError
                }}</span>
              </div>
              <a
                v-if="userSubscription.stripeCustomerId"
                :href="`https://dashboard.stripe.com/customers/${userSubscription.stripeCustomerId}`"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline text-xs mt-1"
              >
                <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3 h-3" />
                View in Stripe Dashboard
              </a>
              <UButton
                v-if="isGrandfathered"
                icon="i-heroicons-arrow-path"
                label="Migrate to Current Price"
                variant="outline"
                color="neutral"
                size="sm"
                block
                class="justify-start mt-2"
                :loading="migratingPrice"
                @click="handleMigratePrice"
              />
            </div>
            <div v-else class="text-sm text-gray-500">
              No Stripe subscription on record.
              <span v-if="userSubscription.stripeCustomerId">
                <a
                  :href="`https://dashboard.stripe.com/customers/${userSubscription.stripeCustomerId}`"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary-600 dark:text-primary-400 hover:underline"
                >
                  View customer in Stripe
                </a>
              </span>
            </div>
          </div>

          <!-- API Usage -->
          <div v-if="userUsage" class="space-y-3">
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">API Usage (7 days)</h4>
            <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">Total Requests</span>
                <span class="font-mono text-gray-900 dark:text-white">{{
                  userUsage.totalRequests.toLocaleString()
                }}</span>
              </div>
              <div v-if="userUsage.daily?.length" class="flex items-end gap-0.5 h-8">
                <div
                  v-for="day in userUsage.daily.slice().reverse()"
                  :key="day.date"
                  class="flex-1 bg-primary-500 dark:bg-primary-400 rounded-t min-h-[2px]"
                  :style="{
                    height: `${Math.max(5, (day.requestCount / Math.max(...userUsage.daily.map((d: any) => d.requestCount), 1)) * 100)}%`,
                  }"
                  :title="`${day.date}: ${day.requestCount} requests`"
                />
              </div>
              <div
                v-if="userUsage.topEndpoints?.length"
                class="pt-1 border-t border-gray-200 dark:border-gray-700"
              >
                <p class="text-xs text-gray-400 mb-1">Top Endpoints</p>
                <div
                  v-for="ep in userUsage.topEndpoints.slice(0, 3)"
                  :key="ep.endpoint"
                  class="flex justify-between text-xs"
                >
                  <span class="text-gray-500 truncate max-w-[200px]">{{ ep.endpoint }}</span>
                  <span class="text-gray-700 dark:text-gray-300 font-mono">{{ ep.count }}</span>
                </div>
              </div>
            </div>
          </div>

          <hr class="border-gray-200 dark:border-gray-700" />

          <div class="space-y-2">
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">Subscription</h4>

            <UButton
              icon="i-heroicons-arrow-path"
              label="Change Tier"
              variant="outline"
              color="neutral"
              block
              class="justify-start"
              @click="isGrantTierOpen = true"
            />
            <UButton
              icon="i-heroicons-arrow-path-rounded-square"
              label="Sync from Stripe"
              variant="outline"
              color="neutral"
              block
              class="justify-start"
              :loading="syncingStripe"
              @click="handleSyncStripe"
            />
            <p v-if="syncResult" class="text-xs text-gray-500 dark:text-gray-400 px-1">
              {{ syncResult }}
            </p>
          </div>

          <div class="space-y-2">
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">Account</h4>

            <UButton
              icon="i-heroicons-key"
              label="Reset Password"
              variant="outline"
              color="warning"
              block
              class="justify-start"
              :loading="resettingPassword"
              @click="isResetPasswordOpen = true"
            />

            <UButton
              icon="i-heroicons-eye"
              label="Impersonate (Login As)"
              variant="outline"
              color="warning"
              block
              class="justify-start"
              @click="handleImpersonate"
            />

            <UButton
              v-if="!selectedUser.isBanned"
              icon="i-heroicons-no-symbol"
              label="Ban User"
              variant="outline"
              color="error"
              block
              class="justify-start"
              @click="isBanDialogOpen = true"
            />
            <UButton
              v-else
              icon="i-heroicons-check-circle"
              label="Unban User"
              variant="outline"
              color="success"
              block
              class="justify-start"
              @click="handleUnban(selectedUser.id)"
            />
          </div>

          <div class="space-y-2">
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">Data & Compliance</h4>

            <UButton
              icon="i-heroicons-arrow-down-tray"
              label="Export User Data (GDPR)"
              variant="outline"
              color="neutral"
              block
              class="justify-start"
              @click="handleExportData"
            />
            <UButton
              icon="i-heroicons-trash"
              label="Delete User & All Data"
              variant="outline"
              color="error"
              block
              class="justify-start"
              @click="isDeleteDialogOpen = true"
            />
          </div>

          <!-- Recent Audit Log -->
          <hr class="border-gray-200 dark:border-gray-700" />
          <div class="space-y-2">
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">Recent Activity</h4>
            <div v-if="loadingDetail" class="space-y-2">
              <USkeleton v-for="i in 3" :key="i" class="h-8 rounded" />
            </div>
            <div v-else-if="userAuditLogs.length" class="space-y-2">
              <div
                v-for="log in userAuditLogs"
                :key="log.id"
                class="flex items-start gap-2 text-xs"
              >
                <UBadge
                  :color="(actionColors[log.action] || 'neutral') as any"
                  variant="subtle"
                  size="sm"
                  class="shrink-0 mt-0.5"
                >
                  {{ log.action.split('.').pop() }}
                </UBadge>
                <div class="min-w-0 flex-1">
                  <span class="text-gray-700 dark:text-gray-300"
                    >by {{ log.adminName || log.adminEmail }}</span
                  >
                  <span class="text-gray-400 dark:text-gray-500 ml-1">{{
                    new Date(log.createdAt).toLocaleDateString()
                  }}</span>
                </div>
              </div>
              <NuxtLink
                :to="`/app/admin/audit-log?targetId=${selectedUser.id}`"
                class="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                @click="isDetailOpen = false"
              >
                View full audit log
              </NuxtLink>
            </div>
            <p v-else class="text-xs text-gray-500">No admin actions recorded for this user.</p>
          </div>
        </div>
      </template>
    </USlideover>

    <!-- Grant Tier Dialog -->
    <UModal v-model:open="isGrantTierOpen">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold">Change Subscription Tier</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Override the subscription tier for <strong>{{ selectedUser?.email }}</strong
            >. This bypasses Stripe and takes effect immediately.
          </p>
          <USelect
            v-model="grantTier"
            :items="allPlans.map((p) => ({ label: p.name, value: p.id }))"
          />
          <div class="flex gap-2 justify-end">
            <UButton
              label="Cancel"
              variant="ghost"
              color="neutral"
              @click="isGrantTierOpen = false"
            />
            <UButton label="Apply Change" color="primary" @click="handleGrantTier" />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Ban Dialog -->
    <UModal v-model:open="isBanDialogOpen">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold text-red-600 dark:text-red-400">Ban User</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            This will immediately prevent <strong>{{ selectedUser?.email }}</strong> from accessing
            the application.
          </p>
          <UTextarea v-model="banReason" placeholder="Reason for banning this user..." :rows="3" />
          <div class="flex gap-2 justify-end">
            <UButton
              label="Cancel"
              variant="ghost"
              color="neutral"
              @click="isBanDialogOpen = false"
            />
            <UButton label="Ban User" color="error" :disabled="!banReason" @click="handleBan" />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Delete Dialog -->
    <UModal v-model:open="isDeleteDialogOpen">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold text-red-600 dark:text-red-400">
            Permanently Delete User
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            This will permanently delete <strong>{{ selectedUser?.email }}</strong> and all
            associated data (entries, projects, annotations, tags, uploads). This action
            <strong>cannot be undone</strong>.
          </p>
          <UInput v-model="deleteReason" placeholder="Reason for deletion (e.g., GDPR request)" />
          <UInput
            v-model="deleteConfirmEmail"
            :placeholder="`Type '${selectedUser?.email}' to confirm`"
          />
          <div class="flex gap-2 justify-end">
            <UButton
              label="Cancel"
              variant="ghost"
              color="neutral"
              @click="isDeleteDialogOpen = false"
            />
            <UButton
              label="Permanently Delete"
              color="error"
              :disabled="
                !deleteReason ||
                deleteConfirmEmail.toLowerCase() !== selectedUser?.email?.toLowerCase()
              "
              @click="handleDelete"
            />
          </div>
        </div>
      </template>
    </UModal>
    <!-- Reset Password Dialog -->
    <UModal v-model:open="isResetPasswordOpen">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold text-amber-600 dark:text-amber-400">Reset Password</h3>
          <template v-if="!resetPasswordResult">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Generate a new temporary password for <strong>{{ selectedUser?.email }}</strong
              >. The current password will be invalidated immediately.
            </p>
            <div class="flex gap-2 justify-end">
              <UButton
                label="Cancel"
                variant="ghost"
                color="neutral"
                @click="isResetPasswordOpen = false"
              />
              <UButton
                label="Generate New Password"
                color="warning"
                :loading="resettingPassword"
                @click="handleResetPassword"
              />
            </div>
          </template>
          <template v-else>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              The password has been reset. Share this temporary password with the user securely. It
              will only be shown once.
            </p>
            <div class="flex items-center gap-2">
              <code
                class="flex-1 text-sm bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded font-mono select-all"
                >{{ resetPasswordResult }}</code
              >
              <UButton
                icon="i-heroicons-clipboard"
                variant="ghost"
                color="neutral"
                @click="navigator.clipboard.writeText(resetPasswordResult!)"
              />
            </div>
            <div class="flex justify-end">
              <UButton
                label="Done"
                color="primary"
                @click="isResetPasswordOpen = false; resetPasswordResult = null"
              />
            </div>
          </template>
        </div>
      </template>
    </UModal>
  </div>
</template>
