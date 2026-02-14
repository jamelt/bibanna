<script setup lang="ts">
definePageMeta({
  layout: 'app',
  middleware: 'admin',
})

const { data: announcementsData, pending, refresh } = useFetch('/api/admin/announcements')

const isCreateOpen = ref(false)
const isEditOpen = ref(false)
const selectedAnnouncement = ref<any>(null)

const form = ref({
  title: '',
  content: '',
  type: 'info' as 'info' | 'warning' | 'maintenance' | 'release',
  endAt: '',
})

function resetForm() {
  form.value = { title: '', content: '', type: 'info', endAt: '' }
}

async function createAnnouncement() {
  await $fetch('/api/admin/announcements', {
    method: 'POST',
    body: {
      title: form.value.title,
      content: form.value.content,
      type: form.value.type,
      endAt: form.value.endAt || undefined,
    },
  })
  isCreateOpen.value = false
  resetForm()
  refresh()
}

function openEdit(announcement: any) {
  selectedAnnouncement.value = announcement
  form.value = {
    title: announcement.title,
    content: announcement.content,
    type: announcement.type,
    endAt: announcement.endAt ? new Date(announcement.endAt).toISOString().slice(0, 16) : '',
  }
  isEditOpen.value = true
}

async function updateAnnouncement() {
  if (!selectedAnnouncement.value) return
  await $fetch(`/api/admin/announcements/${selectedAnnouncement.value.id}`, {
    method: 'PATCH',
    body: {
      title: form.value.title,
      content: form.value.content,
      type: form.value.type,
      endAt: form.value.endAt ? new Date(form.value.endAt).toISOString() : null,
    },
  })
  isEditOpen.value = false
  resetForm()
  refresh()
}

async function toggleActive(announcement: any) {
  await $fetch(`/api/admin/announcements/${announcement.id}`, {
    method: 'PATCH',
    body: { isActive: !announcement.isActive },
  })
  refresh()
}

const typeIcons: Record<string, string> = {
  info: 'i-heroicons-information-circle',
  warning: 'i-heroicons-exclamation-triangle',
  maintenance: 'i-heroicons-wrench-screwdriver',
  release: 'i-heroicons-rocket-launch',
}

const typeColors: Record<string, string> = {
  info: 'info',
  warning: 'warning',
  maintenance: 'neutral',
  release: 'success',
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Announcements</h1>
      <UButton
        icon="i-heroicons-plus"
        label="New Announcement"
        color="primary"
        @click="
          resetForm()
          isCreateOpen = true
        "
      />
    </div>

    <div v-if="pending" class="space-y-3">
      <USkeleton v-for="i in 3" :key="i" class="h-24 rounded-lg" />
    </div>

    <div v-else class="space-y-3">
      <UCard v-for="a in announcementsData" :key="a.id">
        <div class="flex items-start gap-4">
          <div class="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0">
            <UIcon
              :name="typeIcons[a.type] || 'i-heroicons-information-circle'"
              class="w-5 h-5 text-gray-500 dark:text-gray-400"
            />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="font-medium text-gray-900 dark:text-white">{{ a.title }}</h3>
              <UBadge :color="typeColors[a.type] as any" variant="subtle" size="sm">{{
                a.type
              }}</UBadge>
              <UBadge :color="a.isActive ? 'success' : 'neutral'" variant="subtle" size="sm">
                {{ a.isActive ? 'Active' : 'Inactive' }}
              </UBadge>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{{ a.content }}</p>
            <div class="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
              <span>Created {{ new Date(a.createdAt).toLocaleDateString() }}</span>
              <span v-if="a.endAt">&middot; Ends {{ new Date(a.endAt).toLocaleDateString() }}</span>
            </div>
          </div>
          <div class="flex gap-1 shrink-0">
            <UButton
              :icon="a.isActive ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
              variant="ghost"
              color="neutral"
              size="xs"
              @click="toggleActive(a)"
            />
            <UButton
              icon="i-heroicons-pencil"
              variant="ghost"
              color="neutral"
              size="xs"
              @click="openEdit(a)"
            />
          </div>
        </div>
      </UCard>

      <div v-if="!announcementsData?.length" class="text-center py-12 text-gray-500">
        No announcements yet.
      </div>
    </div>

    <!-- Create Modal -->
    <UModal v-model:open="isCreateOpen">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold">New Announcement</h3>
          <UInput v-model="form.title" placeholder="Title" />
          <UTextarea v-model="form.content" placeholder="Announcement content..." :rows="4" />
          <div class="grid grid-cols-2 gap-3">
            <USelect
              v-model="form.type"
              :items="[
                { label: 'Info', value: 'info' },
                { label: 'Warning', value: 'warning' },
                { label: 'Maintenance', value: 'maintenance' },
                { label: 'Release', value: 'release' },
              ]"
            />
            <UInput v-model="form.endAt" type="datetime-local" placeholder="End date (optional)" />
          </div>
          <div class="flex gap-2 justify-end">
            <UButton label="Cancel" variant="ghost" color="neutral" @click="isCreateOpen = false" />
            <UButton
              label="Publish"
              color="primary"
              :disabled="!form.title || !form.content"
              @click="createAnnouncement"
            />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Edit Modal -->
    <UModal v-model:open="isEditOpen">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold">Edit Announcement</h3>
          <UInput v-model="form.title" placeholder="Title" />
          <UTextarea v-model="form.content" placeholder="Announcement content..." :rows="4" />
          <div class="grid grid-cols-2 gap-3">
            <USelect
              v-model="form.type"
              :items="[
                { label: 'Info', value: 'info' },
                { label: 'Warning', value: 'warning' },
                { label: 'Maintenance', value: 'maintenance' },
                { label: 'Release', value: 'release' },
              ]"
            />
            <UInput v-model="form.endAt" type="datetime-local" placeholder="End date (optional)" />
          </div>
          <div class="flex gap-2 justify-end">
            <UButton label="Cancel" variant="ghost" color="neutral" @click="isEditOpen = false" />
            <UButton
              label="Save Changes"
              color="primary"
              :disabled="!form.title || !form.content"
              @click="updateAnnouncement"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
