<script setup lang="ts">
import type { Project } from '~/shared/types'

const props = defineProps<{
  open: boolean
  project?: Project
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  created: [project: Project]
  updated: [project: Project]
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

const isEditing = computed(() => !!props.project)

const form = reactive({
  name: '',
  description: '',
  color: '#4F46E5',
})

const colors = [
  '#4F46E5', // Indigo
  '#7C3AED', // Violet
  '#EC4899', // Pink
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6B7280', // Gray
]

const isSubmitting = ref(false)
const error = ref('')

watch(
  () => props.project,
  (project) => {
    if (project) {
      form.name = project.name
      form.description = project.description || ''
      form.color = project.color
    }
  },
  { immediate: true },
)

function resetForm() {
  form.name = ''
  form.description = ''
  form.color = '#4F46E5'
  error.value = ''
}

async function handleSubmit() {
  error.value = ''

  if (!form.name.trim()) {
    error.value = 'Project name is required'
    return
  }

  isSubmitting.value = true

  try {
    if (isEditing.value) {
      const updated = await $fetch<Project>(`/api/projects/${props.project!.id}`, {
        method: 'PUT',
        body: form,
      })
      emit('updated', updated)
    } else {
      const created = await $fetch<Project>('/api/projects', {
        method: 'POST',
        body: form,
      })
      emit('created', created)
    }

    isOpen.value = false
    resetForm()
  } catch (e: any) {
    error.value = e.data?.message || 'An error occurred'
  } finally {
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
              {{ isEditing ? 'Edit Project' : 'Create Project' }}
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
              placeholder="Enter project name"
              data-testid="project-modal-name"
              autofocus
              class="w-full"
            />
          </UFormField>

          <UFormField label="Description">
            <UTextarea
              v-model="form.description"
              :rows="3"
              placeholder="What is this project about?"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Color">
            <div class="flex flex-wrap gap-2">
              <button
                v-for="color in colors"
                :key="color"
                type="button"
                class="w-8 h-8 rounded-lg transition-transform hover:scale-110"
                :class="
                  form.color === color ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white' : ''
                "
                :style="{ backgroundColor: color }"
                @click="form.color = color"
              />
            </div>
          </UFormField>
        </form>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton variant="outline" color="neutral" @click="isOpen = false"> Cancel </UButton>
            <UButton
              color="primary"
              :loading="isSubmitting"
              data-testid="project-modal-submit"
              @click="handleSubmit"
            >
              {{ isEditing ? 'Save Changes' : 'Create Project' }}
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
