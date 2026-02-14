<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import type { EditorToolbarItem } from '@nuxt/ui'
import type { AnnotationType, Annotation } from '~/shared/types'
import { ANNOTATION_TYPE_LABELS } from '~/shared/types'
import { DialogTitle, DialogDescription, VisuallyHidden } from 'reka-ui'

const isMobile = useMediaQuery('(max-width: 640px)')

const props = defineProps<{
  open: boolean
  entryId: string
  annotation?: Annotation
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: []
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

const toast = useToast()

const content = ref('')
const annotationType = ref<AnnotationType>('descriptive')
const isSaving = ref(false)

const isEditing = computed(() => !!props.annotation)

const annotationTypeOptions = Object.entries(ANNOTATION_TYPE_LABELS).map(([value, label]) => ({
  label,
  value,
}))

const toolbarItems: EditorToolbarItem[][] = [
  [
    { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold' },
    { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic' },
    { kind: 'mark', mark: 'underline', icon: 'i-lucide-underline' },
    { kind: 'mark', mark: 'strike', icon: 'i-lucide-strikethrough' },
  ],
  [
    {
      icon: 'i-lucide-heading',
      content: { align: 'start' },
      items: [
        { kind: 'heading', level: 2, icon: 'i-lucide-heading-2', label: 'Heading 2' },
        { kind: 'heading', level: 3, icon: 'i-lucide-heading-3', label: 'Heading 3' },
      ],
    },
  ],
  [
    { kind: 'bulletList', icon: 'i-lucide-list' },
    { kind: 'orderedList', icon: 'i-lucide-list-ordered' },
    { kind: 'blockquote', icon: 'i-lucide-text-quote' },
  ],
  [{ kind: 'link', icon: 'i-lucide-link' }],
]

watch(
  () => props.open,
  (open) => {
    if (open && props.annotation) {
      content.value = props.annotation.content
      annotationType.value = props.annotation.annotationType as AnnotationType
    } else if (open) {
      content.value = ''
      annotationType.value = 'descriptive'
    }
  },
)

async function handleSave() {
  if (!content.value.trim()) return

  isSaving.value = true

  try {
    if (isEditing.value && props.annotation) {
      await $fetch(`/api/entries/${props.entryId}/annotations/${props.annotation.id}`, {
        method: 'PUT',
        body: {
          content: content.value,
          annotationType: annotationType.value,
        },
      })

      toast.add({
        title: 'Annotation updated',
        color: 'success',
      })
    } else {
      await $fetch(`/api/entries/${props.entryId}/annotations`, {
        method: 'POST',
        body: {
          content: content.value,
          annotationType: annotationType.value,
        },
      })

      toast.add({
        title: 'Annotation added',
        color: 'success',
      })
    }

    emit('saved')
    isOpen.value = false
    content.value = ''
    annotationType.value = 'descriptive'
  } catch (err: any) {
    toast.add({
      title: 'Failed to save annotation',
      description: err.data?.message || 'Please try again.',
      color: 'error',
    })
  } finally {
    isSaving.value = false
  }
}

function handleCancel() {
  isOpen.value = false
  content.value = ''
  annotationType.value = 'descriptive'
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :fullscreen="isMobile"
    :ui="{
      content: isMobile
        ? 'w-full h-full max-w-full max-h-full rounded-none'
        : 'sm:max-w-3xl w-full max-h-[min(90vh,50rem)]',
    }"
  >
    <template #content>
      <div
        class="flex flex-col bg-white dark:bg-gray-900 overflow-hidden"
        :class="isMobile ? 'h-full w-full' : 'max-h-[min(90vh,50rem)] rounded-lg'"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700"
        >
          <DialogTitle class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ isEditing ? 'Edit Annotation' : 'Add Annotation' }}
          </DialogTitle>
          <VisuallyHidden>
            <DialogDescription>
              {{ isEditing ? 'Edit an existing annotation' : 'Add a new annotation to this entry' }}
            </DialogDescription>
          </VisuallyHidden>
          <UButton
            variant="ghost"
            icon="i-heroicons-x-mark"
            color="neutral"
            size="sm"
            @click="handleCancel"
          />
        </div>

        <!-- Annotation type -->
        <div class="px-5 pt-4 pb-2">
          <UFormField label="Annotation Type">
            <USelectMenu
              v-model="annotationType"
              :items="annotationTypeOptions"
              value-key="value"
              label-key="label"
              :ui="{ trigger: 'w-full sm:w-64' }"
            />
          </UFormField>
        </div>

        <!-- Editor -->
        <div class="flex-1 px-5 py-3 overflow-hidden flex flex-col">
          <ClientOnly>
            <UEditor
              v-slot="{ editor }"
              v-model="content"
              content-type="markdown"
              placeholder="Write your annotation... Use markdown for formatting."
              class="w-full flex-1 min-h-[360px] sm:min-h-[420px] border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden flex flex-col"
              :ui="{
                base: 'flex-1 p-4 overflow-y-auto prose prose-sm dark:prose-invert max-w-none',
              }"
            >
              <UEditorToolbar
                :editor="editor"
                :items="toolbarItems"
                class="border-b border-gray-200 dark:border-gray-700 py-1.5 px-3 shrink-0"
              />
            </UEditor>
            <template #fallback>
              <div
                class="w-full min-h-[360px] sm:min-h-[420px] border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center"
              >
                <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
              </div>
            </template>
          </ClientOnly>
        </div>

        <!-- Footer -->
        <div
          class="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3"
        >
          <p class="text-xs text-gray-400 dark:text-gray-500">Markdown supported</p>
          <div class="flex gap-2">
            <UButton variant="outline" color="neutral" @click="handleCancel"> Cancel </UButton>
            <UButton
              color="primary"
              :loading="isSaving"
              :disabled="!content.trim()"
              @click="handleSave"
            >
              {{ isEditing ? 'Update' : 'Add Annotation' }}
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
