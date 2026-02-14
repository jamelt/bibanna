<script setup lang="ts">
import type { Tag } from '~/shared/types'

const props = defineProps<{
  entryId: string
  entryTags: Tag[]
}>()

const emit = defineEmits<{
  'tag-click': [tagId: string]
  updated: []
}>()

const toast = useToast()
const isPopoverOpen = ref(false)

const tagIds = computed(() => props.entryTags.map((t) => t.id))

async function handleTagsChange(newTagIds: string[]) {
  try {
    await $fetch(`/api/entries/${props.entryId}`, {
      method: 'PUT',
      body: { tagIds: newTagIds },
    })
    emit('updated')
  } catch {
    toast.add({ title: 'Failed to update tags', color: 'error' })
  }
  isPopoverOpen.value = false
}
</script>

<template>
  <div class="flex items-center gap-1 flex-wrap" @click.stop>
    <button
      v-for="tag in entryTags.slice(0, 3)"
      :key="tag.id"
      class="inline-flex items-center text-xs px-1.5 py-0.5 rounded-full transition-opacity hover:opacity-80"
      :style="{
        backgroundColor: `${tag.color ?? '#6b7280'}20`,
        color: tag.color ?? '#6b7280',
      }"
      @click.stop="emit('tag-click', tag.id)"
    >
      {{ tag.name }}
    </button>

    <span v-if="entryTags.length > 3" class="text-xs text-gray-400">
      +{{ entryTags.length - 3 }}
    </span>

    <span v-if="entryTags.length === 0" class="text-xs text-gray-400">—</span>

    <UPopover v-model:open="isPopoverOpen" :content="{ align: 'start', side: 'bottom' }">
      <UButton
        icon="i-heroicons-plus"
        variant="ghost"
        color="neutral"
        size="2xs"
        class="sm:opacity-0 sm:group-hover/row:opacity-100 transition-opacity"
        @click.stop
      />
      <template #content>
        <div class="w-64 p-2" @click.stop>
          <AppInlineTagInput
            :model-value="tagIds"
            size="xs"
            placeholder="Add or create tags..."
            @update:model-value="handleTagsChange"
          />
        </div>
      </template>
    </UPopover>
  </div>
</template>
