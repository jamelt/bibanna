<script setup lang="ts">
import type { Tag } from '~/shared/types'

const props = withDefaults(
  defineProps<{
    modelValue: string[]
    size?: 'xs' | 'sm' | 'md'
    placeholder?: string
    showCreateHint?: boolean
  }>(),
  {
    size: 'sm',
    placeholder: 'Add tags...',
    showCreateHint: true,
  },
)

const emit = defineEmits<{
  'update:modelValue': [ids: string[]]
  'tag-created': [tag: Tag]
}>()

const { tags, fetchTags, createTag, searchTags } = useTags()

const inputValue = ref('')
const isOpen = ref(false)
const inputRef = ref<HTMLInputElement | null>()
const isCreating = ref(false)

onMounted(() => {
  fetchTags()
})

const filteredTags = computed(() => {
  const results = searchTags(inputValue.value)
  return results.map((tag) => ({
    ...tag,
    selected: props.modelValue.includes(tag.id),
  }))
})

const selectedTags = computed(() => {
  return props.modelValue.map((id) => tags.value.find((t) => t.id === id)).filter(Boolean) as Tag[]
})

const showCreateOption = computed(() => {
  if (!inputValue.value.trim()) return false
  const lower = inputValue.value.trim().toLowerCase()
  return !tags.value.some((t) => t.name.toLowerCase() === lower)
})

function toggleTag(tagId: string) {
  const current = [...props.modelValue]
  const idx = current.indexOf(tagId)
  if (idx >= 0) {
    current.splice(idx, 1)
  } else {
    current.push(tagId)
  }
  emit('update:modelValue', current)
}

function removeTag(tagId: string) {
  emit(
    'update:modelValue',
    props.modelValue.filter((id) => id !== tagId),
  )
}

async function handleCreateTag() {
  const value = inputValue.value.trim()
  if (!value || isCreating.value) return

  isCreating.value = true
  try {
    const parts = value.includes(',')
      ? value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [value]

    const newIds = [...props.modelValue]
    for (const name of parts) {
      const tag = await createTag(name)
      if (!newIds.includes(tag.id)) {
        newIds.push(tag.id)
      }
      emit('tag-created', tag)
    }
    emit('update:modelValue', newIds)
    inputValue.value = ''
  } finally {
    isCreating.value = false
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    if (showCreateOption.value) {
      handleCreateTag()
    } else if (inputValue.value.trim()) {
      const match = filteredTags.value.find(
        (t) => t.name.toLowerCase() === inputValue.value.trim().toLowerCase(),
      )
      if (match) {
        toggleTag(match.id)
        inputValue.value = ''
      }
    }
  } else if (e.key === ',' && inputValue.value.trim()) {
    e.preventDefault()
    handleCreateTag()
  } else if (e.key === 'Backspace' && !inputValue.value && props.modelValue.length > 0) {
    removeTag(props.modelValue[props.modelValue.length - 1])
  } else if (e.key === 'Escape') {
    isOpen.value = false
    inputRef.value?.blur()
  }
}

function focusInput() {
  inputRef.value?.focus()
}

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'xs':
      return { badge: 'text-[10px] px-1 py-0', input: 'text-xs', gap: 'gap-0.5' }
    case 'sm':
      return { badge: 'text-xs px-1.5 py-0.5', input: 'text-sm', gap: 'gap-1' }
    case 'md':
      return { badge: 'text-sm px-2 py-0.5', input: 'text-sm', gap: 'gap-1.5' }
    default:
      return { badge: 'text-xs px-1.5 py-0.5', input: 'text-sm', gap: 'gap-1' }
  }
})
</script>

<template>
  <div class="relative">
    <div
      class="flex flex-wrap items-center border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900 cursor-text transition-colors focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500"
      :class="sizeClasses.gap"
      @click="focusInput"
    >
      <TransitionGroup
        enter-active-class="transition-all duration-150"
        enter-from-class="opacity-0 scale-90"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition-all duration-100"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-90"
      >
        <span
          v-for="tag in selectedTags"
          :key="tag.id"
          class="inline-flex items-center rounded-full shrink-0"
          :class="sizeClasses.badge"
          :style="{ backgroundColor: `${tag.color}20`, color: tag.color }"
        >
          {{ tag.name }}
          <button
            type="button"
            class="ml-0.5 hover:opacity-70 transition-opacity"
            @click.stop="removeTag(tag.id)"
          >
            <UIcon name="i-heroicons-x-mark" class="w-3 h-3" />
          </button>
        </span>
      </TransitionGroup>

      <input
        ref="inputRef"
        v-model="inputValue"
        type="text"
        :placeholder="selectedTags.length === 0 ? placeholder : ''"
        :class="[
          sizeClasses.input,
          'flex-1 min-w-[80px] bg-transparent border-none outline-none placeholder-gray-400 dark:placeholder-gray-500',
        ]"
        @focus="isOpen = true"
        @blur="
          () => {
            setTimeout(() => (isOpen = false), 150)
          }
        "
        @keydown="handleKeydown"
      />
    </div>

    <Transition
      enter-active-class="transition-all duration-150"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-100"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div
        v-if="isOpen && (filteredTags.length > 0 || showCreateOption)"
        class="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg"
      >
        <button
          v-if="showCreateOption"
          type="button"
          class="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors"
          :class="{ 'opacity-60': isCreating }"
          @mousedown.prevent="handleCreateTag"
        >
          <UIcon name="i-heroicons-plus-circle" class="w-4 h-4 text-primary-500 shrink-0" />
          <span>
            Create
            <strong class="font-medium text-gray-900 dark:text-white"
              >"{{ inputValue.trim() }}"</strong
            >
          </span>
          <span v-if="inputValue.includes(',')" class="text-xs text-gray-400 ml-auto">
            {{ inputValue.split(',').filter((s) => s.trim()).length }} tags
          </span>
          <UIcon
            v-if="isCreating"
            name="i-heroicons-arrow-path"
            class="w-3.5 h-3.5 animate-spin ml-auto"
          />
        </button>

        <div
          v-if="showCreateOption && filteredTags.length > 0"
          class="border-t border-gray-100 dark:border-gray-800"
        />

        <button
          v-for="tag in filteredTags"
          :key="tag.id"
          type="button"
          class="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors"
          @mousedown.prevent="toggleTag(tag.id)"
        >
          <span class="w-3 h-3 rounded-full shrink-0" :style="{ backgroundColor: tag.color }" />
          <span
            class="flex-1 truncate"
            :class="
              tag.selected
                ? 'font-medium text-gray-900 dark:text-white'
                : 'text-gray-700 dark:text-gray-300'
            "
          >
            {{ tag.name }}
          </span>
          <UIcon
            v-if="tag.selected"
            name="i-heroicons-check"
            class="w-4 h-4 text-primary-500 shrink-0"
          />
        </button>

        <div
          v-if="filteredTags.length === 0 && !showCreateOption"
          class="px-3 py-4 text-center text-sm text-gray-400"
        >
          No tags found
        </div>

        <div
          v-if="showCreateHint && !showCreateOption && filteredTags.length > 0"
          class="border-t border-gray-100 dark:border-gray-800 px-3 py-1.5 text-[10px] text-gray-400"
        >
          Type to create new tags &middot; Use commas for multiple
        </div>
      </div>
    </Transition>
  </div>
</template>
