<script setup lang="ts">
import type { Entry } from '~/shared/types'

interface Props {
  entry: Entry
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'delete'): void
  (e: 'favorite'): void
  (e: 'share'): void
}>()

const containerRef = ref<HTMLElement | null>(null)
const startX = ref(0)
const currentX = ref(0)
const isDragging = ref(false)
const swipeDirection = ref<'left' | 'right' | null>(null)

const SWIPE_THRESHOLD = 80
const MAX_SWIPE = 120

const transform = computed(() => {
  if (!isDragging.value) return 'translateX(0)'
  const clampedX = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, currentX.value))
  return `translateX(${clampedX}px)`
})

const leftActionOpacity = computed(() => {
  if (currentX.value <= 0) return 0
  return Math.min(currentX.value / SWIPE_THRESHOLD, 1)
})

const rightActionOpacity = computed(() => {
  if (currentX.value >= 0) return 0
  return Math.min(Math.abs(currentX.value) / SWIPE_THRESHOLD, 1)
})

function handleTouchStart(e: TouchEvent) {
  startX.value = e.touches[0].clientX
  isDragging.value = true
}

function handleTouchMove(e: TouchEvent) {
  if (!isDragging.value) return
  
  const diff = e.touches[0].clientX - startX.value
  currentX.value = diff
  
  if (diff > 20) {
    swipeDirection.value = 'right'
  } else if (diff < -20) {
    swipeDirection.value = 'left'
  }
}

function handleTouchEnd() {
  if (Math.abs(currentX.value) >= SWIPE_THRESHOLD) {
    if (swipeDirection.value === 'right') {
      emit('favorite')
    } else if (swipeDirection.value === 'left') {
      emit('delete')
    }
  }
  
  isDragging.value = false
  currentX.value = 0
  swipeDirection.value = null
}
</script>

<template>
  <div class="relative overflow-hidden">
    <!-- Left action (Favorite) -->
    <div
      class="absolute inset-y-0 left-0 flex items-center justify-start w-24 px-4 bg-yellow-500"
      :style="{ opacity: leftActionOpacity }"
    >
      <UIcon name="i-heroicons-star" class="w-6 h-6 text-white" />
    </div>

    <!-- Right action (Delete) -->
    <div
      class="absolute inset-y-0 right-0 flex items-center justify-end w-24 px-4 bg-red-500"
      :style="{ opacity: rightActionOpacity }"
    >
      <UIcon name="i-heroicons-trash" class="w-6 h-6 text-white" />
    </div>

    <!-- Entry content -->
    <div
      ref="containerRef"
      class="relative bg-white dark:bg-gray-800 transition-transform"
      :class="{ 'transition-none': isDragging }"
      :style="{ transform }"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <div class="p-4">
        <div class="flex items-start gap-3">
          <div class="flex-1 min-w-0">
            <h3 class="font-medium text-gray-900 dark:text-white truncate">
              {{ entry.title }}
            </h3>
            <p class="text-sm text-gray-500 truncate">
              {{ entry.authors?.map(a => `${a.firstName} ${a.lastName}`).join(', ') || 'Unknown author' }}
            </p>
            <p class="text-xs text-gray-400 mt-1">
              {{ entry.year }} · {{ entry.entryType.replace('_', ' ') }}
            </p>
          </div>
          <UIcon
            v-if="entry.isFavorite"
            name="i-heroicons-star-solid"
            class="w-5 h-5 text-yellow-400 shrink-0"
          />
        </div>
      </div>
    </div>
  </div>
</template>
