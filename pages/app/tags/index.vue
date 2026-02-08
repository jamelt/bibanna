<script setup lang="ts">
import type { Tag } from '~/shared/types'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const router = useRouter()
const toast = useToast()
const { tags, fetchTags, createTag, deleteTag: removeTag, mergeTags, TAG_COLORS } = useTags()

const isEditModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const isMergeModalOpen = ref(false)
const selectedTag = ref<Tag | undefined>()
const isDeleting = ref(false)
const isMerging = ref(false)

const quickCreateInput = ref('')
const isQuickCreating = ref(false)

const mergeSourceIds = ref<string[]>([])
const mergeTargetId = ref<string | null>(null)

const searchQuery = ref('')

await fetchTags(true)

const filteredTags = computed(() => {
  if (!searchQuery.value.trim()) return tags.value
  const q = searchQuery.value.trim().toLowerCase()
  return tags.value.filter(t => t.name.toLowerCase().includes(q))
})

async function handleQuickCreate() {
  const value = quickCreateInput.value.trim()
  if (!value || isQuickCreating.value) return

  isQuickCreating.value = true
  try {
    const names = value.includes(',')
      ? value.split(',').map(s => s.trim()).filter(Boolean)
      : [value]

    let created = 0
    for (const name of names) {
      try {
        await createTag(name)
        created++
      } catch (e: any) {
        if (!e.data?.message?.includes('already exists')) {
          toast.add({ title: `Failed to create "${name}"`, color: 'error' })
        }
      }
    }

    if (created > 0) {
      toast.add({
        title: created === 1 ? 'Tag created' : `${created} tags created`,
        color: 'success',
      })
    }
    quickCreateInput.value = ''
  } finally {
    isQuickCreating.value = false
  }
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

async function handleDeleteTag() {
  if (!selectedTag.value) return

  isDeleting.value = true
  try {
    await removeTag(selectedTag.value.id)
    toast.add({ title: 'Tag deleted', color: 'success' })
    isDeleteModalOpen.value = false
    selectedTag.value = undefined
  } catch (e: any) {
    toast.add({
      title: 'Failed to delete tag',
      description: e.data?.message || 'An error occurred',
      color: 'error',
    })
  } finally {
    isDeleting.value = false
  }
}

function openMergeModal() {
  mergeSourceIds.value = []
  mergeTargetId.value = null
  isMergeModalOpen.value = true
}

async function handleMerge() {
  if (mergeSourceIds.value.length === 0 || !mergeTargetId.value) return

  isMerging.value = true
  try {
    await mergeTags(mergeSourceIds.value, mergeTargetId.value)
    toast.add({
      title: 'Tags merged',
      description: `${mergeSourceIds.value.length} tag(s) merged into target.`,
      color: 'success',
    })
    isMergeModalOpen.value = false
  } catch (e: any) {
    toast.add({
      title: 'Failed to merge tags',
      description: e.data?.message || 'An error occurred',
      color: 'error',
    })
  } finally {
    isMerging.value = false
  }
}

function handleTagUpdated() {
  isEditModalOpen.value = false
  selectedTag.value = undefined
  fetchTags(true)
}

function handleTagCreated() {
  fetchTags(true)
}

const mergeTargetOptions = computed(() => {
  return tags.value.filter(t => !mergeSourceIds.value.includes(t.id))
})

const mergeSourceOptions = computed(() => {
  return tags.value.filter(t => t.id !== mergeTargetId.value)
})

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
          {{ tags.length }} {{ tags.length === 1 ? 'tag' : 'tags' }}
        </p>
      </div>

      <div class="flex gap-2">
        <UButton
          v-if="tags.length >= 2"
          icon="i-heroicons-arrows-pointing-in"
          label="Merge Tags"
          variant="outline"
          color="neutral"
          @click="openMergeModal"
        />
      </div>
    </div>

    <!-- Quick create -->
    <UCard class="p-4">
      <form class="flex gap-2" @submit.prevent="handleQuickCreate">
        <UInput
          v-model="quickCreateInput"
          icon="i-heroicons-tag"
          placeholder="Create tags quickly - use commas for multiple"
          class="flex-1"
          :disabled="isQuickCreating"
          @keydown.enter.prevent="handleQuickCreate"
        />
        <UButton
          type="submit"
          icon="i-heroicons-plus"
          color="primary"
          :loading="isQuickCreating"
          :disabled="!quickCreateInput.trim()"
        >
          Add
        </UButton>
      </form>
    </UCard>

    <!-- Search -->
    <div v-if="tags.length > 5">
      <UInput
        v-model="searchQuery"
        icon="i-heroicons-magnifying-glass"
        placeholder="Search tags..."
      />
    </div>

    <div v-if="!tags.length" class="text-center py-12">
      <UIcon name="i-heroicons-tag" class="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600" />
      <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">
        No tags yet
      </h3>
      <p class="mt-2 text-gray-500 dark:text-gray-400">
        Type tag names above to create them instantly
      </p>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <UCard
        v-for="tag in filteredTags"
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

    <!-- Edit Tag Modal -->
    <LazyAppTagFormModal
      v-model:open="isEditModalOpen"
      :tag="selectedTag"
      @updated="handleTagUpdated"
      @created="handleTagCreated"
    />

    <!-- Delete confirmation -->
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
            This will remove the tag from {{ selectedTag?.entryCount ?? 0 }} {{ (selectedTag?.entryCount ?? 0) === 1 ? 'entry' : 'entries' }}.
            The entries themselves will not be deleted.
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
                @click="handleDeleteTag"
              >
                Delete Tag
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Merge Tags Modal -->
    <UModal v-model:open="isMergeModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <UIcon name="i-heroicons-arrows-pointing-in" class="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                  Merge Tags
                </h2>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Combine tags into one, reassigning all entries
                </p>
              </div>
            </div>
          </template>

          <div class="space-y-4">
            <UFormField label="Merge these tags (will be deleted)">
              <USelectMenu
                v-model="mergeSourceIds"
                :items="mergeSourceOptions"
                multiple
                placeholder="Select tags to merge..."
                value-key="id"
                label-key="name"
              >
                <template #item-leading="{ item }">
                  <span
                    class="w-3 h-3 rounded-full shrink-0"
                    :style="{ backgroundColor: (item as Tag).color }"
                  />
                </template>
              </USelectMenu>
            </UFormField>

            <div class="flex justify-center">
              <UIcon name="i-heroicons-arrow-down" class="w-5 h-5 text-gray-400" />
            </div>

            <UFormField label="Into this tag (will be kept)">
              <USelectMenu
                v-model="mergeTargetId"
                :items="mergeTargetOptions"
                placeholder="Select target tag..."
                value-key="id"
                label-key="name"
              >
                <template #item-leading="{ item }">
                  <span
                    class="w-3 h-3 rounded-full shrink-0"
                    :style="{ backgroundColor: (item as Tag).color }"
                  />
                </template>
              </USelectMenu>
            </UFormField>

            <UAlert
              v-if="mergeSourceIds.length > 0 && mergeTargetId"
              icon="i-heroicons-information-circle"
              color="info"
              :title="`${mergeSourceIds.length} tag(s) will be deleted and their entries will be reassigned to the target tag.`"
            />
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                variant="outline"
                color="neutral"
                @click="isMergeModalOpen = false"
              >
                Cancel
              </UButton>
              <UButton
                color="primary"
                :loading="isMerging"
                :disabled="mergeSourceIds.length === 0 || !mergeTargetId"
                @click="handleMerge"
              >
                Merge Tags
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
