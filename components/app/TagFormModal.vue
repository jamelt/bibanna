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

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

const isEditing = computed(() => !!props.tag)

const form = reactive({
  name: '',
  description: '',
  color: '#6B7280',
})

const colors = [
  '#4F46E5',
  '#7C3AED',
  '#EC4899',
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#14B8A6',
  '#06B6D4',
  '#3B82F6',
  '#6B7280',
]

const isSubmitting = ref(false)
const error = ref('')

watch(() => props.tag, (tag) => {
  if (tag) {
    form.name = tag.name
    form.description = tag.description || ''
    form.color = tag.color
  }
}, { immediate: true })

function resetForm() {
  form.name = ''
  form.description = ''
  form.color = '#6B7280'
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
      const updated = await $fetch<Tag>(`/api/tags/${props.tag!.id}`, {
        method: 'PUT',
        body: form,
      })
      emit('updated', updated)
    }
    else {
      const created = await $fetch<Tag>('/api/tags', {
        method: 'POST',
        body: form,
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
            />
          </UFormField>

          <UFormField label="Description">
            <UTextarea
              v-model="form.description"
              :rows="3"
              placeholder="Optional description"
            />
          </UFormField>

          <UFormField label="Color">
            <div class="flex flex-wrap gap-2">
              <button
                v-for="color in colors"
                :key="color"
                type="button"
                class="w-8 h-8 rounded-lg transition-transform hover:scale-110"
                :class="form.color === color ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white' : ''"
                :style="{ backgroundColor: color }"
                @click="form.color = color"
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
