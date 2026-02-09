<script setup lang="ts">
import type { Tag } from '~/shared/types'

const props = defineProps<{
  open: boolean
  tag?: Tag
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  created: [tag: Tag]
  updated: [tag: Tag]
}>()

const { tags: allTags, updateTag, createTag: createNewTag, TAG_COLORS } = useTags()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

const isEditing = computed(() => !!props.tag)

const form = reactive({
  name: '',
  description: '',
  color: '#6B7280',
  groupName: '',
})

const isSubmitting = ref(false)
const error = ref('')

const existingGroups = computed(() => {
  const groups = new Set<string>()
  for (const t of allTags.value) {
    if (t.groupName) groups.add(t.groupName)
  }
  return [...groups].sort()
})

watch(() => props.tag, (tag) => {
  if (tag) {
    form.name = tag.name
    form.description = tag.description || ''
    form.color = tag.color
    form.groupName = tag.groupName || ''
  }
}, { immediate: true })

function resetForm() {
  form.name = ''
  form.description = ''
  form.color = '#6B7280'
  form.groupName = ''
  error.value = ''
}

async function handleSubmit() {
  error.value = ''

  if (!form.name.trim()) {
    error.value = 'Tag name is required'
    return
  }

  isSubmitting.value = true

  try {
    if (isEditing.value) {
      const updated = await updateTag(props.tag!.id, {
        name: form.name,
        description: form.description || undefined,
        color: form.color,
        groupName: form.groupName || undefined,
      })
      emit('updated', updated)
    }
    else {
      const created = await createNewTag(form.name, form.color, {
        description: form.description || undefined,
        groupName: form.groupName || undefined,
      })
      emit('created', created)
    }

    isOpen.value = false
    resetForm()
  }
  catch (e: any) {
    error.value = e.data?.message || 'An error occurred'
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ isEditing ? 'Edit Tag' : 'Create Tag' }}
            </h2>
            <UButton
              icon="i-heroicons-x-mark"
              variant="ghost"
              color="neutral"
              @click="isOpen = false"
            />
          </div>
        </template>

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <UAlert
            v-if="error"
            color="error"
            icon="i-heroicons-exclamation-triangle"
            :title="error"
          />

          <UFormField label="Name" required>
            <UInput
              v-model="form.name"
              placeholder="Enter tag name"
              autofocus
              class="w-full"
            />
          </UFormField>

          <UFormField label="Description">
            <UTextarea
              v-model="form.description"
              :rows="3"
              placeholder="Optional description"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Group">
            <UInput
              v-model="form.groupName"
              placeholder="e.g., Discipline, Methodology, Status"
              class="w-full"
            />
            <div v-if="existingGroups.length" class="mt-2 flex flex-wrap gap-1.5">
              <button
                v-for="group in existingGroups"
                :key="group"
                type="button"
                class="text-xs px-2 py-1 rounded-md transition-colors"
                :class="form.groupName === group
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'"
                @click="form.groupName = form.groupName === group ? '' : group"
              >
                {{ group }}
              </button>
            </div>
          </UFormField>

          <UFormField label="Color">
            <div class="flex flex-wrap gap-2.5">
              <button
                v-for="color in TAG_COLORS"
                :key="color"
                type="button"
                class="w-9 h-9 rounded-lg transition-transform hover:scale-110"
                :class="form.color === color ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white' : ''"
                :style="{ backgroundColor: color }"
                @click="form.color = color"
              />
            </div>
            <div class="mt-3 flex items-center gap-2">
              <span
                class="w-9 h-9 rounded-lg shrink-0 border border-gray-200 dark:border-gray-700"
                :style="{ backgroundColor: form.color }"
              />
              <UInput
                v-model="form.color"
                placeholder="#000000"
                class="flex-1 font-mono"
                maxlength="7"
              />
            </div>
          </UFormField>
        </form>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton
              variant="outline"
              color="neutral"
              @click="isOpen = false"
            >
              Cancel
            </UButton>
            <UButton
              color="primary"
              :loading="isSubmitting"
              @click="handleSubmit"
            >
              {{ isEditing ? 'Save Changes' : 'Create Tag' }}
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
