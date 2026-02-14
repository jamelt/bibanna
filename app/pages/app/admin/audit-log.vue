<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: 'admin',
})

const route = useRoute()

const page = ref(1)
const actionFilter = ref('all')
const targetIdFilter = ref<string>((route.query.targetId as string) || '')

const queryParams = computed(() => ({
  action: actionFilter.value === 'all' ? undefined : actionFilter.value,
  targetId: targetIdFilter.value || undefined,
  page: page.value,
  pageSize: 50,
}))

const { data: logsData, pending } = useFetch('/api/admin/audit-logs', {
  query: queryParams,
  watch: [queryParams],
})

function formatAction(action: string) {
  return action.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
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
  'feedback.update': 'info',
  'announcement.create': 'success',
  'announcement.update': 'info',
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Audit Log</h1>
      <span class="text-sm text-gray-500 dark:text-gray-400"
        >{{ logsData?.total ?? 0 }} entries</span
      >
    </div>

    <div v-if="targetIdFilter" class="flex items-center gap-2">
      <UBadge color="info" variant="subtle">
        Filtered by user: {{ targetIdFilter.slice(0, 8) }}...
      </UBadge>
      <UButton
        icon="i-heroicons-x-mark"
        variant="ghost"
        color="neutral"
        size="xs"
        @click="targetIdFilter = ''"
      />
    </div>

    <USelect
      v-model="actionFilter"
      :items="[
        { label: 'All Actions', value: 'all' },
        { label: 'User Update', value: 'user.update' },
        { label: 'User Ban', value: 'user.ban' },
        { label: 'User Unban', value: 'user.unban' },
        { label: 'Grant Tier', value: 'user.grant_tier' },
        { label: 'Promote Admin', value: 'user.promote_admin' },
        { label: 'Impersonate', value: 'user.impersonate' },
        { label: 'Stop Impersonate', value: 'user.stop_impersonate' },
        { label: 'Sync Stripe', value: 'user.sync_stripe' },
        { label: 'Export Data', value: 'user.export_data' },
        { label: 'Delete User', value: 'user.hard_delete' },
        { label: 'Feedback Update', value: 'feedback.update' },
        { label: 'Announcement Create', value: 'announcement.create' },
        { label: 'Announcement Update', value: 'announcement.update' },
      ]"
      class="w-48"
    />

    <UCard>
      <div v-if="pending" class="space-y-3">
        <USkeleton v-for="i in 10" :key="i" class="h-12 rounded" />
      </div>

      <div v-else class="space-y-0 divide-y divide-gray-200 dark:divide-gray-700">
        <div v-for="log in logsData?.data" :key="log.id" class="flex items-center gap-4 py-3">
          <div class="shrink-0">
            <UBadge
              :color="(actionColors[log.action] || 'neutral') as any"
              variant="subtle"
              size="sm"
            >
              {{ formatAction(log.action) }}
            </UBadge>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-gray-900 dark:text-white">
              <span class="font-medium">{{ log.adminName || log.adminEmail }}</span>
              performed <span class="font-medium">{{ log.action }}</span> on {{ log.targetType }}
              <span v-if="log.targetId" class="text-gray-500"
                >{{ log.targetId.slice(0, 8) }}...</span
              >
            </p>
            <p
              v-if="log.details && Object.keys(log.details).length"
              class="text-xs text-gray-500 mt-0.5"
            >
              {{ JSON.stringify(log.details) }}
            </p>
          </div>
          <div class="shrink-0 text-right">
            <p class="text-xs text-gray-500">{{ new Date(log.createdAt).toLocaleString() }}</p>
            <p v-if="log.ipAddress" class="text-xs text-gray-400 dark:text-gray-600">
              {{ log.ipAddress }}
            </p>
          </div>
        </div>

        <div v-if="!logsData?.data?.length" class="text-center py-12 text-gray-500">
          No audit log entries found.
        </div>
      </div>

      <!-- Pagination -->
      <div
        v-if="logsData && logsData.totalPages > 1"
        class="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
      >
        <span class="text-sm text-gray-500 dark:text-gray-400"
          >Page {{ logsData.page }} of {{ logsData.totalPages }}</span
        >
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
            :disabled="page >= logsData.totalPages"
            @click="page++"
          />
        </div>
      </div>
    </UCard>
  </div>
</template>
