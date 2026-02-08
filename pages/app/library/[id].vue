<script setup lang="ts">
import type { Entry, Annotation } from '~/shared/types'
import { ENTRY_TYPE_LABELS, ANNOTATION_TYPE_LABELS } from '~/shared/types'

definePageMeta({
  layout: 'app',
  middleware: 'auth',
})

const route = useRoute()
const router = useRouter()

const entryId = computed(() => route.params.id as string)

const { data: entry, pending, refresh } = await useFetch<Entry>(`/api/entries/${entryId.value}`)

const isEditModalOpen = ref(false)
const isAddAnnotationOpen = ref(false)
const isDeleteModalOpen = ref(false)
const editingAnnotation = ref<Annotation | undefined>(undefined)

function openAddAnnotation() {
  editingAnnotation.value = undefined
  isAddAnnotationOpen.value = true
}

function openEditAnnotation(annotation: Annotation) {
  editingAnnotation.value = annotation
  isAddAnnotationOpen.value = true
}

function formatAuthors(authors: any[]) {
  if (!authors || authors.length === 0) return 'Unknown Author'
  return authors.map(a => `${a.lastName}, ${a.firstName}${a.middleName ? ` ${a.middleName}` : ''}`).join('; ')
}

async function toggleFavorite() {
  if (!entry.value) return

  await $fetch(`/api/entries/${entryId.value}`, {
    method: 'PUT',
    body: { isFavorite: !entry.value.isFavorite },
  })
  await refresh()
}

async function handleDelete() {
  await $fetch(`/api/entries/${entryId.value}`, {
    method: 'DELETE',
  })
  await router.push('/app/library')
}

async function handleEntryUpdated() {
  isEditModalOpen.value = false
  await refresh()
}

const toast = useToast()
const isCopying = ref(false)
const { defaultCitationStyle } = useUserPreferences()

const { data: citationStyles } = await useFetch('/api/citation/styles', { lazy: true })

const defaultStyleName = computed(() => {
  const style = citationStyles.value?.defaultStyles?.find(
    (s: any) => s.id === defaultCitationStyle.value,
  )
  return style?.shortName || style?.name || defaultCitationStyle.value
})

async function copyCitation() {
  if (!entry.value) return

  isCopying.value = true
  try {
    const result = await $fetch<{
      entries: Array<{ bibliography: string; inText: string }>
    }>('/api/citation/format', {
      method: 'POST',
      body: {
        entryIds: [entryId.value],
        styleId: defaultCitationStyle.value,
      },
    })

    const citation = result.entries?.[0]
    if (!citation?.bibliography) {
      throw new Error('No citation returned')
    }

    const htmlText = citation.bibliography
    const plainText = htmlText.replace(/<[^>]*>/g, '').trim()

    if (navigator.clipboard?.write) {
      const blob = new Blob([htmlText], { type: 'text/html' })
      const textBlob = new Blob([plainText], { type: 'text/plain' })
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blob,
          'text/plain': textBlob,
        }),
      ])
    }
    else {
      await navigator.clipboard.writeText(plainText)
    }

    toast.add({
      title: 'Citation copied',
      description: `${defaultStyleName.value} format`,
      color: 'success',
    })
  }
  catch (err: any) {
    toast.add({
      title: 'Failed to copy citation',
      description: err.data?.message || err.message || 'Please try again.',
      color: 'error',
    })
  }
  finally {
    isCopying.value = false
  }
}

async function handleAnnotationCreated() {
  isAddAnnotationOpen.value = false
  await refresh()
}
</script>

<template>
  <div>
    <!-- Loading state -->
    <div v-if="pending" class="flex justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-gray-400" />
    </div>

    <!-- Not found -->
    <UCard v-else-if="!entry" class="text-center py-12">
      <UIcon name="i-heroicons-exclamation-triangle" class="w-16 h-16 mx-auto text-gray-300" />
      <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">
        Entry not found
      </h3>
      <UButton to="/app/library" class="mt-4">
        Back to Library
      </UButton>
    </UCard>

    <!-- Entry detail -->
    <div v-else class="space-y-6">
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-2 text-sm text-gray-500">
        <NuxtLink to="/app/library" class="hover:text-gray-700 dark:hover:text-gray-300">
          Library
        </NuxtLink>
        <UIcon name="i-heroicons-chevron-right" class="w-4 h-4" />
        <span class="text-gray-900 dark:text-white truncate">{{ entry.title }}</span>
      </nav>

      <!-- Header -->
      <div class="flex flex-col lg:flex-row lg:items-start gap-4">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-2">
            <UBadge variant="subtle">
              {{ ENTRY_TYPE_LABELS[entry.entryType as keyof typeof ENTRY_TYPE_LABELS] }}
            </UBadge>
            <UButton
              :icon="entry.isFavorite ? 'i-heroicons-star-solid' : 'i-heroicons-star'"
              :color="entry.isFavorite ? 'warning' : 'neutral'"
              variant="ghost"
              size="xs"
              @click="toggleFavorite"
            />
          </div>
          <h1 class="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            {{ entry.title }}
          </h1>
          <p class="text-lg text-gray-600 dark:text-gray-400 mt-2">
            {{ formatAuthors(entry.authors) }}
          </p>
          <p v-if="entry.year" class="text-gray-500 dark:text-gray-500">
            {{ entry.year }}
          </p>
        </div>

        <div class="flex gap-2">
          <UButton
            icon="i-heroicons-pencil"
            variant="outline"
            color="neutral"
            @click="isEditModalOpen = true"
          >
            Edit
          </UButton>
          <UDropdownMenu
            :items="[
              [
                { label: 'Copy citation', icon: 'i-heroicons-clipboard-document', onSelect: copyCitation },
              ],
              [
                { label: 'Delete', icon: 'i-heroicons-trash', onSelect: () => isDeleteModalOpen = true },
              ],
            ]"
          >
            <UButton
              icon="i-heroicons-ellipsis-vertical"
              variant="outline"
              color="neutral"
            />
          </UDropdownMenu>
        </div>
      </div>

      <!-- Veritas Score (Pro feature) -->
      <AppUpgradePrompt feature="veritasScore" required-tier="pro">
        Get AI-powered credibility assessments for your sources with the Pro plan.
        <template #content>
          <VeritasVeritasScoreDetail :entry-id="entryId" />
        </template>
      </AppUpgradePrompt>

      <div class="grid lg:grid-cols-3 gap-6">
        <!-- Metadata -->
        <UCard class="lg:col-span-2">
          <template #header>
            <h2 class="font-semibold text-gray-900 dark:text-white">Details</h2>
          </template>

          <dl class="grid grid-cols-2 gap-4">
            <div v-if="entry.metadata?.publisher">
              <dt class="text-sm text-gray-500 dark:text-gray-400">Publisher</dt>
              <dd class="text-gray-900 dark:text-white">{{ entry.metadata.publisher }}</dd>
            </div>
            <div v-if="entry.metadata?.journal">
              <dt class="text-sm text-gray-500 dark:text-gray-400">Journal</dt>
              <dd class="text-gray-900 dark:text-white">{{ entry.metadata.journal }}</dd>
            </div>
            <div v-if="entry.metadata?.volume || entry.metadata?.issue">
              <dt class="text-sm text-gray-500 dark:text-gray-400">Volume/Issue</dt>
              <dd class="text-gray-900 dark:text-white">
                {{ entry.metadata.volume }}{{ entry.metadata.issue ? `(${entry.metadata.issue})` : '' }}
              </dd>
            </div>
            <div v-if="entry.metadata?.pages">
              <dt class="text-sm text-gray-500 dark:text-gray-400">Pages</dt>
              <dd class="text-gray-900 dark:text-white">{{ entry.metadata.pages }}</dd>
            </div>
            <div v-if="entry.metadata?.doi">
              <dt class="text-sm text-gray-500 dark:text-gray-400">DOI</dt>
              <dd>
                <a
                  :href="`https://doi.org/${entry.metadata.doi}`"
                  target="_blank"
                  class="text-primary-500 hover:underline"
                >
                  {{ entry.metadata.doi }}
                </a>
              </dd>
            </div>
            <div v-if="entry.metadata?.isbn">
              <dt class="text-sm text-gray-500 dark:text-gray-400">ISBN</dt>
              <dd class="text-gray-900 dark:text-white">{{ entry.metadata.isbn }}</dd>
            </div>
            <div v-if="entry.metadata?.url" class="col-span-2">
              <dt class="text-sm text-gray-500 dark:text-gray-400">URL</dt>
              <dd>
                <a
                  :href="entry.metadata.url"
                  target="_blank"
                  class="text-primary-500 hover:underline truncate block"
                >
                  {{ entry.metadata.url }}
                </a>
              </dd>
            </div>
          </dl>

          <div v-if="entry.metadata?.abstract" class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 class="font-medium text-gray-900 dark:text-white mb-2">Abstract</h3>
            <p class="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {{ entry.metadata.abstract }}
            </p>
          </div>
        </UCard>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Projects -->
          <UCard>
            <template #header>
              <h2 class="font-semibold text-gray-900 dark:text-white">Projects</h2>
            </template>

            <div v-if="entry.projects?.length" class="space-y-2">
              <NuxtLink
                v-for="project in entry.projects"
                :key="project.id"
                :to="`/app/projects/${project.slug || project.id}`"
                class="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div
                  class="w-3 h-3 rounded-full"
                  :style="{ backgroundColor: project.color }"
                />
                <span class="text-gray-900 dark:text-white">{{ project.name }}</span>
              </NuxtLink>
            </div>
            <p v-else class="text-gray-500 dark:text-gray-400 text-sm">
              Not in any projects
            </p>
          </UCard>

          <!-- Tags -->
          <UCard>
            <template #header>
              <h2 class="font-semibold text-gray-900 dark:text-white">Tags</h2>
            </template>

            <div v-if="entry.tags?.length" class="flex flex-wrap gap-2">
              <span
                v-for="tag in entry.tags"
                :key="tag.id"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm"
                :style="{ backgroundColor: `${tag.color}20`, color: tag.color }"
              >
                {{ tag.name }}
              </span>
            </div>
            <p v-else class="text-gray-500 dark:text-gray-400 text-sm">
              No tags
            </p>
          </UCard>
        </div>
      </div>

      <!-- Annotations -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-semibold text-gray-900 dark:text-white">
              Annotations ({{ entry.annotations?.length || 0 }})
            </h2>
            <UButton
              icon="i-heroicons-plus"
              size="sm"
              @click="openAddAnnotation"
            >
              Add Annotation
            </UButton>
          </div>
        </template>

        <div v-if="entry.annotations?.length" class="space-y-4">
          <div
            v-for="annotation in entry.annotations"
            :key="annotation.id"
            class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <UBadge variant="subtle" size="xs">
                  {{ ANNOTATION_TYPE_LABELS[annotation.annotationType as keyof typeof ANNOTATION_TYPE_LABELS] }}
                </UBadge>
                <span class="text-xs text-gray-400">
                  {{ new Date(annotation.createdAt).toLocaleDateString() }}
                </span>
              </div>
              <UButton
                variant="ghost"
                icon="i-heroicons-pencil"
                color="neutral"
                size="xs"
                @click="openEditAnnotation(annotation)"
              />
            </div>
            <div class="text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {{ annotation.content }}
            </div>
          </div>
        </div>
        <p v-else class="text-gray-500 dark:text-gray-400 text-center py-8">
          No annotations yet. Add one to record your thoughts about this source.
        </p>
      </UCard>
    </div>

    <!-- Annotation Editor Modal -->
    <LazyAppAnnotationEditorModal
      v-model:open="isAddAnnotationOpen"
      :entry-id="entryId"
      :annotation="editingAnnotation"
      @saved="handleAnnotationCreated"
    />

    <!-- Edit Modal -->
    <LazyAppEntryFormModal
      v-model:open="isEditModalOpen"
      :entry="entry"
      @updated="handleEntryUpdated"
    />

    <!-- Delete Confirmation -->
    <UModal v-model:open="isDeleteModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              Delete Entry
            </h2>
          </template>

          <p class="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete "{{ entry?.title }}"? This action cannot be undone.
          </p>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton variant="outline" color="neutral" @click="isDeleteModalOpen = false">
                Cancel
              </UButton>
              <UButton color="error" @click="handleDelete">
                Delete
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
