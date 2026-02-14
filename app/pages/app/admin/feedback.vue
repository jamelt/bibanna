<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: 'admin',
})

const statusFilter = ref('all')
const typeFilter = ref('all')
const page = ref(1)

const queryParams = computed(() => ({
  status: statusFilter.value === 'all' ? undefined : statusFilter.value,
  type: typeFilter.value === 'all' ? undefined : typeFilter.value,
  page: page.value,
  pageSize: 20,
}))

const {
  data: feedbackData,
  pending,
  refresh,
} = useFetch('/api/admin/feedback', {
  query: queryParams,
  watch: [queryParams],
})

const selectedFeedback = ref<any>(null)
const isDetailOpen = ref(false)
const adminNotes = ref('')

function openDetail(item: any) {
  selectedFeedback.value = item
  adminNotes.value = item.adminNotes || ''
  isDetailOpen.value = true
}

async function updateStatus(status: string) {
  if (!selectedFeedback.value) return
  await $fetch(`/api/admin/feedback/${selectedFeedback.value.id}`, {
    method: 'PATCH',
    body: { status, adminNotes: adminNotes.value },
  })
  isDetailOpen.value = false
  refresh()
}

const typeIcons: Record<string, string> = {
  bug: 'i-heroicons-bug-ant',
  feature_request: 'i-heroicons-light-bulb',
  general: 'i-heroicons-chat-bubble-left',
  complaint: 'i-heroicons-exclamation-triangle',
}

const statusColors: Record<string, string> = {
  open: 'warning',
  in_progress: 'info',
  resolved: 'success',
  closed: 'neutral',
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Feedback Inbox</h1>
      <span class="text-sm text-gray-500 dark:text-gray-400"
        >{{ feedbackData?.total ?? 0 }} items</span
      >
    </div>

    <div class="flex gap-3">
      <USelect
        v-model="statusFilter"
        :items="[
          { label: 'All Status', value: 'all' },
          { label: 'Open', value: 'open' },
          { label: 'In Progress', value: 'in_progress' },
          { label: 'Resolved', value: 'resolved' },
          { label: 'Closed', value: 'closed' },
        ]"
        class="w-40"
      />
      <USelect
        v-model="typeFilter"
        :items="[
          { label: 'All Types', value: 'all' },
          { label: 'Bug', value: 'bug' },
          { label: 'Feature Request', value: 'feature_request' },
          { label: 'General', value: 'general' },
          { label: 'Complaint', value: 'complaint' },
        ]"
        class="w-48"
      />
    </div>

    <div v-if="pending" class="space-y-3">
      <USkeleton v-for="i in 5" :key="i" class="h-20 rounded-lg" />
    </div>

    <div v-else class="space-y-3">
      <UCard
        v-for="item in feedbackData?.data"
        :key="item.id"
        class="cursor-pointer hover:ring-1 hover:ring-gray-300 dark:hover:ring-gray-600 transition-all"
        @click="openDetail(item)"
      >
        <div class="flex items-start gap-4">
          <div class="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0">
            <UIcon
              :name="typeIcons[item.type] || 'i-heroicons-chat-bubble-left'"
              class="w-5 h-5 text-gray-500 dark:text-gray-400"
            />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="font-medium text-gray-900 dark:text-white truncate">{{ item.subject }}</h3>
              <UBadge :color="statusColors[item.status] as any" variant="subtle" size="sm">
                {{ item.status.replace('_', ' ') }}
              </UBadge>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{{ item.content }}</p>
            <div class="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
              <span>{{ item.userName || item.userEmail || 'Anonymous' }}</span>
              <span>&middot;</span>
              <span>{{ new Date(item.createdAt).toLocaleDateString() }}</span>
            </div>
          </div>
        </div>
      </UCard>

      <div v-if="!feedbackData?.data?.length" class="text-center py-12 text-gray-500">
        No feedback items found.
      </div>
    </div>

    <!-- Pagination -->
    <div
      v-if="feedbackData && feedbackData.totalPages > 1"
      class="flex items-center justify-between"
    >
      <span class="text-sm text-gray-500 dark:text-gray-400"
        >Page {{ feedbackData.page }} of {{ feedbackData.totalPages }}</span
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
          :disabled="page >= feedbackData.totalPages"
          @click="page++"
        />
      </div>
    </div>

    <!-- Detail Slideover -->
    <USlideover v-model:open="isDetailOpen" :title="selectedFeedback?.subject || 'Feedback Detail'">
      <template #body>
        <div v-if="selectedFeedback" class="space-y-6">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <UBadge :color="statusColors[selectedFeedback.status] as any" variant="subtle">
                {{ selectedFeedback.status.replace('_', ' ') }}
              </UBadge>
              <UBadge variant="subtle" color="neutral">
                {{ selectedFeedback.type.replace('_', ' ') }}
              </UBadge>
            </div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ selectedFeedback.subject }}
            </h3>
          </div>

          <div>
            <p class="text-xs text-gray-500 mb-1">From</p>
            <p class="text-sm text-gray-900 dark:text-white">
              {{ selectedFeedback.userName || selectedFeedback.userEmail || 'Anonymous' }}
            </p>
          </div>

          <div>
            <p class="text-xs text-gray-500 mb-1">Submitted</p>
            <p class="text-sm text-gray-900 dark:text-white">
              {{ new Date(selectedFeedback.createdAt).toLocaleString() }}
            </p>
          </div>

          <div>
            <p class="text-xs text-gray-500 mb-2">Content</p>
            <div
              class="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap"
            >
              {{ selectedFeedback.content }}
            </div>
          </div>

          <hr class="border-gray-200 dark:border-gray-700" />

          <div>
            <p class="text-xs text-gray-500 mb-2">Admin Notes</p>
            <UTextarea v-model="adminNotes" placeholder="Add internal notes..." :rows="3" />
          </div>

          <div class="flex flex-wrap gap-2">
            <UButton
              v-if="selectedFeedback.status === 'open'"
              label="Mark In Progress"
              color="info"
              variant="outline"
              size="sm"
              @click="updateStatus('in_progress')"
            />
            <UButton
              v-if="selectedFeedback.status !== 'resolved'"
              label="Resolve"
              color="success"
              variant="outline"
              size="sm"
              @click="updateStatus('resolved')"
            />
            <UButton
              v-if="selectedFeedback.status !== 'closed'"
              label="Close"
              color="neutral"
              variant="outline"
              size="sm"
              @click="updateStatus('closed')"
            />
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>
