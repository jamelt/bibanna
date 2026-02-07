<script setup lang="ts">
import type { Tag } from '~/shared/types'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const router = useRouter()
const toast = useToast()

const isCreateModalOpen = ref(false)
const isEditModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const selectedTag = ref<Tag | undefined>()
const isDeleting = ref(false)

const { data: tags, pending, refresh } = await useFetch<Tag[]>('/api/tags')

async function handleTagCreated() {
  isCreateModalOpen.value = false
  await refresh()
}

async function handleTagUpdated() {
  isEditModalOpen.value = false
  selectedTag.value = undefined
  await refresh()
}

function openEditModal(tag: Tag) {
  selectedTag.value = tag
  isEditModalOpen.value = true
}

function openDeleteModal(tag: Tag) {
  selectedTag.value = tag
  isDeleteModalOpen.value = true
}

function viewEntries(tag: Tag) {
  router.push({
    path: '/app/library',
    query: { tagIds: tag.id },
  })
}

async function deleteTag() {
  if (!selectedTag.value) return

  isDeleting.value = true
  try {
    await $fetch(`/api/tags/${selectedTag.value.id}`, {
      method: 'DELETE',
    })
    toast.add({
      title: 'Tag deleted',
      color: 'success',
    })
    isDeleteModalOpen.value = false
    selectedTag.value = undefined
    await refresh()
  }
  catch (e: any) {
    toast.add({
      title: 'Failed to delete tag',
      description: e.data?.message || 'An error occurred',
      color: 'error',
    })
  }
  finally {
    isDeleting.value = false
  }
}

function getDropdownItems(tag: Tag) {
  return [
    [
      { label: 'Edit', icon: 'i-heroicons-pencil', onSelect: () => openEditModal(tag) },
      { label: 'View entries', icon: 'i-heroicons-book-open', onSelect: () => viewEntries(tag) },
    ],
    [
      { label: 'Delete', icon: 'i-heroicons-trash', color: 'error' as const, onSelect: () => openDeleteModal(tag) },
    ],
  ]
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Tags
        </h1>
        <p class="text-gray-500 dark:text-gray-400">
          Organize entries with labels
        </p>
      </div>

      <UButton
        icon="i-heroicons-plus"
        label="New Tag"
        color="primary"
        @click="isCreateModalOpen = true"
      />
    </div>

    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <UCard v-else-if="!tags?.length" class="text-center py-12">
      <UIcon name="i-heroicons-tag" class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
      <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">
        No tags yet
      </h3>
      <p class="mt-2 text-gray-500 dark:text-gray-400">
        Create your first tag to start organizing your library
      </p>
      <UButton
        icon="i-heroicons-plus"
        label="Create Tag"
        color="primary"
        class="mt-4"
        @click="isCreateModalOpen = true"
      />
    </UCard>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <UCard
        v-for="tag in tags"
        :key="tag.id"
        class="p-4 hover:ring-2 hover:ring-primary-500/50 transition-all cursor-pointer group"
        @click="viewEntries(tag)"
      >
        <div class="flex items-start gap-3">
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            :style="{ backgroundColor: tag.color + '20' }"
          >
            <UIcon
              name="i-heroicons-tag"
              class="w-5 h-5"
              :style="{ color: tag.color }"
            />
          </div>
          <div class="flex-1 min-w-0">
            <h3 class="font-medium text-gray-900 dark:text-white truncate">
              {{ tag.name }}
            </h3>
            <p v-if="tag.description" class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
              {{ tag.description }}
            </p>
            <p class="text-sm text-gray-400 dark:text-gray-500 mt-2">
              {{ tag.entryCount ?? 0 }} {{ (tag.entryCount ?? 0) === 1 ? 'entry' : 'entries' }}
            </p>
          </div>
          <UDropdownMenu
            :items="getDropdownItems(tag)"
            :content="{ side: 'bottom', align: 'end' }"
          >
            <UButton
              icon="i-heroicons-ellipsis-vertical"
              variant="ghost"
              color="neutral"
              size="sm"
              class="opacity-0 group-hover:opacity-100 transition-opacity"
              @click.stop
            />
          </UDropdownMenu>
        </div>
      </UCard>
    </div>

    <LazyAppTagFormModal
      v-model:open="isCreateModalOpen"
      @created="handleTagCreated"
    />

    <LazyAppTagFormModal
      v-model:open="isEditModalOpen"
      :tag="selectedTag"
      @updated="handleTagUpdated"
    />

    <UModal v-model:open="isDeleteModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                Delete Tag
              </h2>
            </div>
          </template>

          <p class="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete <strong class="text-gray-900 dark:text-white">{{ selectedTag?.name }}</strong>?
            This will remove the tag from all entries but will not delete the entries themselves.
          </p>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                variant="outline"
                color="neutral"
                @click="isDeleteModalOpen = false"
              >
                Cancel
              </UButton>
              <UButton
                color="error"
                :loading="isDeleting"
                @click="deleteTag"
              >
                Delete Tag
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
