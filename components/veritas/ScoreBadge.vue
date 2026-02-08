<script setup lang="ts">
interface Props {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  showLabel: true,
})

const scoreInfo = computed(() => {
  if (props.score >= 90) {
    return { label: 'Exceptional', color: 'emerald', icon: 'i-heroicons-shield-check' }
  }
  if (props.score >= 75) {
    return { label: 'High', color: 'blue', icon: 'i-heroicons-check-badge' }
  }
  if (props.score >= 60) {
    return { label: 'Moderate', color: 'yellow', icon: 'i-heroicons-exclamation-circle' }
  }
  if (props.score >= 40) {
    return { label: 'Limited', color: 'orange', icon: 'i-heroicons-exclamation-triangle' }
  }
  return { label: 'Low', color: 'red', icon: 'i-heroicons-x-circle' }
})

const sizeClasses = computed(() => ({
  sm: 'text-xs px-2 py-0.5 gap-1',
  md: 'text-sm px-2.5 py-1 gap-1.5',
  lg: 'text-base px-3 py-1.5 gap-2',
}[props.size]))

const iconSize = computed(() => ({
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
}[props.size]))

const colorClasses = computed(() => ({
  emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}[scoreInfo.value.color]))
</script>

<template>
  <div
    class="inline-flex items-center rounded-full font-medium"
    :class="[sizeClasses, colorClasses]"
  >
    <UIcon :name="scoreInfo.icon" :class="iconSize" />
    <span class="font-bold">{{ score }}</span>
    <span v-if="showLabel" class="opacity-80">{{ scoreInfo.label }}</span>
  </div>
</template>
