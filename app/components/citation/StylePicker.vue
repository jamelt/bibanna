<script setup lang="ts">
interface CitationStyle {
  id: string
  name: string
  shortName?: string
  category?: string
  fields?: string[]
  description?: string
  isDefault: boolean
}

const props = defineProps<{
  modelValue: string
  defaultStyleId?: string
  isSelectedDefault?: boolean
  savingDefault?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'select', value: string): void
  (e: 'setDefault'): void
}>()

const { data: styles, pending } = await useFetch('/api/citation/styles', {
  lazy: true,
})

const searchQuery = ref('')
const selectedCategory = ref<string | null>(null)
const showCustom = ref(false)

const categories = [
  { value: null, label: 'All' },
  { value: 'author-date', label: 'Author-Date' },
  { value: 'numeric', label: 'Numeric' },
  { value: 'note', label: 'Footnotes' },
]

const filteredStyles = computed(() => {
  if (!styles.value) return []

  let result = [
    ...(showCustom.value ? styles.value.customStyles : []),
    ...styles.value.defaultStyles,
  ]

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(
      (style) =>
        style.name.toLowerCase().includes(query) ||
        style.shortName?.toLowerCase().includes(query) ||
        style.description?.toLowerCase().includes(query) ||
        style.fields?.some((f: string) => f.includes(query)),
    )
  }

  if (selectedCategory.value) {
    result = result.filter((style) => style.category === selectedCategory.value)
  }

  return result
})

const selectedStyleLabel = computed(() => {
  if (!styles.value) return props.modelValue
  const all = [...styles.value.defaultStyles, ...styles.value.customStyles]
  const found = all.find((s) => s.id === props.modelValue)
  return found?.shortName || found?.name || props.modelValue
})

function selectStyle(styleId: string) {
  emit('update:modelValue', styleId)
  emit('select', styleId)
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'author-date': 'blue',
    numeric: 'green',
    note: 'purple',
    label: 'orange',
  }
  return colors[category] || 'gray'
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Search -->
    <div class="p-3 space-y-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
      <UInput
        v-model="searchQuery"
        icon="i-heroicons-magnifying-glass"
        placeholder="Search styles..."
        size="sm"
      />
      <div class="flex gap-1">
        <button
          v-for="cat in categories"
          :key="String(cat.value)"
          type="button"
          class="px-2 py-1 text-xs rounded-md transition-colors"
          :class="[
            selectedCategory === cat.value
              ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 font-medium'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300',
          ]"
          @click="selectedCategory = cat.value"
        >
          {{ cat.label }}
        </button>
      </div>
    </div>

    <!-- Selected style action bar -->
    <div
      class="mx-3 my-2 rounded-lg shrink-0 overflow-hidden"
      :class="
        props.isSelectedDefault
          ? 'bg-primary-50 dark:bg-primary-950/40 ring-1 ring-primary-200 dark:ring-primary-800'
          : 'bg-gray-50 dark:bg-gray-800 ring-1 ring-gray-200 dark:ring-gray-700'
      "
    >
      <div class="px-3 py-2.5 flex items-center justify-between gap-2">
        <div class="min-w-0">
          <p
            class="text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500 leading-none mb-1"
          >
            Selected
          </p>
          <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
            {{ selectedStyleLabel }}
          </p>
        </div>
        <UButton
          v-if="!props.isSelectedDefault"
          variant="soft"
          color="primary"
          size="xs"
          icon="i-heroicons-star"
          :loading="props.savingDefault"
          class="shrink-0"
          @click="emit('setDefault')"
        >
          Set Default
        </UButton>
        <span
          v-else
          class="inline-flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400 shrink-0"
        >
          <UIcon name="i-heroicons-star-solid" class="w-4 h-4" />
          Default
        </span>
      </div>
    </div>

    <!-- Toggle custom styles -->
    <div
      v-if="styles?.customStyles?.length"
      class="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 shrink-0"
    >
      <USwitch v-model="showCustom" size="sm" />
      <span class="text-xs text-gray-500"> Custom ({{ styles.customStyles.length }}) </span>
    </div>

    <!-- Loading state -->
    <div v-if="pending" class="flex justify-center py-8">
      <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-gray-400" />
    </div>

    <!-- Styles list -->
    <div v-else class="flex-1 overflow-y-auto min-h-0">
      <div class="py-1">
        <button
          v-for="style in filteredStyles"
          :key="style.id"
          type="button"
          class="w-full text-left px-3 py-2.5 transition-colors border-l-2"
          :class="[
            props.modelValue === style.id
              ? 'bg-primary-50 dark:bg-primary-900/20 border-l-primary-500'
              : 'border-l-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50',
          ]"
          @click="selectStyle(style.id)"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span
              class="text-sm truncate"
              :class="
                props.modelValue === style.id
                  ? 'font-medium text-primary-700 dark:text-primary-300'
                  : 'text-gray-700 dark:text-gray-300'
              "
            >
              {{ style.shortName || style.name }}
            </span>
            <UIcon
              v-if="props.modelValue === style.id"
              name="i-heroicons-check-circle-solid"
              class="w-4 h-4 text-primary-500 shrink-0"
            />
          </div>
          <div class="flex items-center gap-1.5 mt-0.5">
            <UBadge
              v-if="style.category"
              :color="getCategoryColor(style.category)"
              variant="subtle"
              size="xs"
            >
              {{ style.category }}
            </UBadge>
            <UBadge v-if="!style.isDefault" color="purple" variant="subtle" size="xs">
              Custom
            </UBadge>
            <UBadge
              v-if="props.defaultStyleId === style.id"
              color="primary"
              variant="subtle"
              size="xs"
            >
              Default
            </UBadge>
          </div>
        </button>

        <p v-if="filteredStyles.length === 0" class="text-center text-sm text-gray-500 py-8 px-3">
          No styles found
        </p>
      </div>
    </div>
  </div>
</template>
