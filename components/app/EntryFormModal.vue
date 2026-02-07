<script setup lang="ts">
import type { EntryType, Author } from '~/shared/types'
import { ENTRY_TYPE_LABELS } from '~/shared/types'

const props = defineProps<{
  open: boolean
  entry?: any
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  created: [entry: any]
  updated: [entry: any]
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

const isEditing = computed(() => !!props.entry)

const { data: projects } = await useFetch('/api/projects')
const { data: tags } = await useFetch('/api/tags')

const form = reactive({
  entryType: 'book' as EntryType,
  title: '',
  authors: [] as Author[],
  year: undefined as number | undefined,
  metadata: {
    doi: '',
    isbn: '',
    url: '',
    abstract: '',
    publisher: '',
    journal: '',
    volume: '',
    issue: '',
    pages: '',
  },
  notes: '',
  isFavorite: false,
  projectIds: [] as string[],
  tagIds: [] as string[],
})

const newAuthor = reactive({
  firstName: '',
  lastName: '',
  middleName: '',
})

const isSubmitting = ref(false)
const errors = ref<Record<string, string>>({})
const scrollContainer = ref<HTMLElement | null>(null)
const showScrollIndicator = ref(true)

function handleScroll(event: Event) {
  const target = event.target as HTMLElement
  const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50
  showScrollIndicator.value = !isAtBottom
}

const entryTypeOptions = Object.entries(ENTRY_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}))

watch(() => props.entry, (entry) => {
  if (entry) {
    Object.assign(form, {
      entryType: entry.entryType,
      title: entry.title,
      authors: entry.authors || [],
      year: entry.year,
      metadata: { ...entry.metadata },
      notes: entry.notes || '',
      isFavorite: entry.isFavorite,
      projectIds: entry.projects?.map((p: any) => p.id) || [],
      tagIds: entry.tags?.map((t: any) => t.id) || [],
    })
  }
}, { immediate: true })

function addAuthor() {
  if (newAuthor.lastName && newAuthor.firstName) {
    form.authors.push({ ...newAuthor })
    newAuthor.firstName = ''
    newAuthor.lastName = ''
    newAuthor.middleName = ''
  }
}

function removeAuthor(index: number) {
  form.authors.splice(index, 1)
}

function resetForm() {
  Object.assign(form, {
    entryType: 'book',
    title: '',
    authors: [],
    year: undefined,
    metadata: {
      doi: '',
      isbn: '',
      url: '',
      abstract: '',
      publisher: '',
      journal: '',
      volume: '',
      issue: '',
      pages: '',
    },
    notes: '',
    isFavorite: false,
    projectIds: [],
    tagIds: [],
  })
  errors.value = {}
}

async function handleSubmit() {
  errors.value = {}

  if (!form.title) {
    errors.value.title = 'Title is required'
    return
  }

  isSubmitting.value = true

  try {
    const payload = {
      ...form,
      metadata: Object.fromEntries(
        Object.entries(form.metadata).filter(([_, v]) => v),
      ),
    }

    if (isEditing.value) {
      const updated = await $fetch(`/api/entries/${props.entry.id}`, {
        method: 'PUT',
        body: payload,
      })
      emit('updated', updated)
    }
    else {
      const created = await $fetch('/api/entries', {
        method: 'POST',
        body: payload,
      })
      emit('created', created)
    }

    isOpen.value = false
    resetForm()
  }
  catch (error: any) {
    if (error.data?.data?.fieldErrors) {
      errors.value = error.data.data.fieldErrors
    }
    else {
      errors.value.general = error.data?.message || 'An error occurred'
    }
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :ui="{
      container: 'items-start sm:items-center',
      content: 'sm:max-w-3xl w-full max-h-[90vh]',
    }"
  >
    <template #content>
      <div class="flex flex-col max-h-[90vh] bg-white dark:bg-gray-900 rounded-lg ring ring-gray-200 dark:ring-gray-800 shadow-lg divide-y divide-gray-200 dark:divide-gray-800">
        <div class="flex items-center justify-between px-6 py-4 shrink-0">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            {{ isEditing ? 'Edit Entry' : 'Add Entry' }}
          </h2>
          <UButton
            icon="i-heroicons-x-mark"
            variant="ghost"
            color="neutral"
            size="lg"
            @click="isOpen = false"
          />
        </div>

        <div 
          ref="scrollContainer"
          class="flex-1 overflow-y-scroll px-6 py-4 min-h-0 scroll-smooth scrollbar-visible"
          @scroll="handleScroll"
        >
          <form class="space-y-5 pb-2" @submit.prevent="handleSubmit">
            <UAlert
              v-if="errors.general"
              color="error"
              icon="i-heroicons-exclamation-triangle"
              :title="errors.general"
            />

            <!-- Entry Type -->
            <UFormField label="Type" required>
              <USelectMenu
                v-model="form.entryType"
                :items="entryTypeOptions"
                value-key="value"
                size="lg"
                :ui="{ trigger: 'w-full' }"
              />
            </UFormField>

            <!-- Title -->
            <UFormField label="Title" required :error="errors.title">
              <UInput
                v-model="form.title"
                placeholder="Enter the title"
                size="lg"
                class="w-full"
                autofocus
              />
            </UFormField>

          <!-- Authors -->
          <UFormField label="Authors">
            <div class="space-y-2">
              <div
                v-for="(author, index) in form.authors"
                :key="index"
                class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <span class="flex-1">
                  {{ author.lastName }}, {{ author.firstName }}
                  {{ author.middleName ? ` ${author.middleName}` : '' }}
                </span>
                <UButton
                  icon="i-heroicons-x-mark"
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  @click="removeAuthor(index)"
                />
              </div>

              <div class="flex gap-2">
                <UInput
                  v-model="newAuthor.firstName"
                  placeholder="First name"
                  size="md"
                  class="flex-1"
                  @keyup.enter.prevent="addAuthor"
                />
                <UInput
                  v-model="newAuthor.middleName"
                  placeholder="Middle"
                  size="md"
                  class="w-24"
                  @keyup.enter.prevent="addAuthor"
                />
                <UInput
                  v-model="newAuthor.lastName"
                  placeholder="Last name"
                  size="md"
                  class="flex-1"
                  @keyup.enter.prevent="addAuthor"
                />
                <UButton
                  icon="i-heroicons-plus"
                  variant="outline"
                  color="neutral"
                  size="md"
                  @click="addAuthor"
                />
              </div>
            </div>
          </UFormField>

          <!-- Year -->
          <UFormField label="Year">
            <UInput
              v-model.number="form.year"
              type="number"
              :min="1"
              :max="9999"
              size="md"
              placeholder="Publication year"
              class="w-full"
            />
          </UFormField>

          <!-- Projects -->
          <UFormField label="Projects" help="Assign this entry to projects">
            <USelectMenu
              v-model="form.projectIds"
              :items="(projects || []).map(p => ({ ...p, description: p.description ?? undefined }))"
              multiple
              placeholder="Select projects..."
              value-key="id"
              label-key="name"
              size="md"
              :ui="{ trigger: 'w-full' }"
            />
          </UFormField>

          <!-- Tags -->
          <UFormField label="Tags" help="Organize your entry with tags">
            <div class="space-y-3">
              <USelectMenu
                v-model="form.tagIds"
                :items="(tags || []).map(t => ({ ...t, description: t.description ?? undefined }))"
                multiple
                placeholder="Select tags..."
                value-key="id"
                label-key="name"
                size="md"
                :ui="{ trigger: 'w-full' }"
              >
                <template #item-leading="{ item }">
                  <span
                    class="w-3 h-3 rounded-full shrink-0"
                    :style="{ backgroundColor: item.color ?? 'transparent' }"
                  />
                </template>
              </USelectMenu>
              
              <div v-if="form.tagIds.length > 0" class="flex flex-wrap gap-2">
                <span
                  v-for="tagId in form.tagIds"
                  :key="tagId"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                >
                  <span
                    class="w-2.5 h-2.5 rounded-full shrink-0"
                    :style="{ backgroundColor: tags?.find(t => t.id === tagId)?.color ?? '#6B7280' }"
                  />
                  {{ tags?.find(t => t.id === tagId)?.name }}
                </span>
              </div>
            </div>
          </UFormField>

          <!-- Type-specific metadata -->
          <div v-if="['book', 'thesis', 'report'].includes(form.entryType)" class="grid grid-cols-2 gap-4">
            <UFormField label="Publisher">
              <UInput v-model="form.metadata.publisher" placeholder="Publisher name" size="md" class="w-full" />
            </UFormField>
            <UFormField label="ISBN">
              <UInput v-model="form.metadata.isbn" placeholder="ISBN" size="md" class="w-full" />
            </UFormField>
          </div>

          <div v-if="form.entryType === 'journal_article'" class="grid grid-cols-2 gap-4">
            <UFormField label="Journal" class="col-span-2">
              <UInput v-model="form.metadata.journal" placeholder="Journal name" size="md" class="w-full" />
            </UFormField>
            <UFormField label="Volume">
              <UInput v-model="form.metadata.volume" placeholder="Volume" size="md" class="w-full" />
            </UFormField>
            <UFormField label="Issue">
              <UInput v-model="form.metadata.issue" placeholder="Issue" size="md" class="w-full" />
            </UFormField>
            <UFormField label="Pages">
              <UInput v-model="form.metadata.pages" placeholder="e.g., 123-145" size="md" class="w-full" />
            </UFormField>
            <UFormField label="DOI">
              <UInput v-model="form.metadata.doi" placeholder="DOI" size="md" class="w-full" />
            </UFormField>
          </div>

          <div v-if="form.entryType === 'website'" class="space-y-4">
            <UFormField label="URL">
              <UInput v-model="form.metadata.url" type="url" placeholder="https://..." size="md" class="w-full" />
            </UFormField>
          </div>

          <!-- Abstract -->
          <UFormField label="Abstract">
            <UTextarea
              v-model="form.metadata.abstract"
              :rows="3"
              size="md"
              placeholder="Enter the abstract..."
              class="w-full"
            />
          </UFormField>

          <!-- Notes -->
            <UFormField label="Notes">
              <UTextarea
                v-model="form.notes"
                :rows="2"
                size="md"
                placeholder="Personal notes..."
                class="w-full"
              />
            </UFormField>

            <!-- Favorite -->
            <UCheckbox v-model="form.isFavorite" label="Mark as favorite" />
          </form>
        </div>

        <Transition
          enter-active-class="transition-opacity duration-200"
          leave-active-class="transition-opacity duration-200"
          enter-from-class="opacity-0"
          leave-to-class="opacity-0"
        >
          <div
            v-if="showScrollIndicator"
            class="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-none z-10"
          >
            <div class="flex items-center gap-2 px-4 py-2 bg-gray-900/80 dark:bg-gray-100/80 text-white dark:text-gray-900 rounded-full text-sm font-medium shadow-lg backdrop-blur-sm">
              <UIcon name="i-heroicons-chevron-down" class="w-4 h-4 animate-bounce" />
              <span>Scroll for more fields</span>
            </div>
          </div>
        </Transition>

        <div class="flex justify-end gap-3 px-6 py-4 shrink-0">
          <UButton
            variant="outline"
            color="neutral"
            size="lg"
            @click="isOpen = false"
          >
            Cancel
          </UButton>
          <UButton
            color="primary"
            size="lg"
            :loading="isSubmitting"
            @click="handleSubmit"
          >
            {{ isEditing ? 'Save Changes' : 'Add Entry' }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.scrollbar-visible {
  scrollbar-width: thin;
  scrollbar-color: rgb(156 163 175) transparent;
}

.scrollbar-visible::-webkit-scrollbar {
  width: 12px;
}

.scrollbar-visible::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-visible::-webkit-scrollbar-thumb {
  background-color: rgb(156 163 175);
  border-radius: 6px;
  border: 3px solid transparent;
  background-clip: content-box;
}

.scrollbar-visible::-webkit-scrollbar-thumb:hover {
  background-color: rgb(107 114 128);
}

.dark .scrollbar-visible {
  scrollbar-color: rgb(75 85 99) transparent;
}

.dark .scrollbar-visible::-webkit-scrollbar-thumb {
  background-color: rgb(75 85 99);
}

.dark .scrollbar-visible::-webkit-scrollbar-thumb:hover {
  background-color: rgb(107 114 128);
}
</style>
