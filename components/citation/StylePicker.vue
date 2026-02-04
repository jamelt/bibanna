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
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const { data: styles, pending } = await useFetch('/api/citation/styles', {
  lazy: true,
})

const searchQuery = ref('')
const selectedCategory = ref<string | null>(null)
const showCustom = ref(false)

const categories = [
  { value: null, label: 'All Styles' },
  { value: 'author-date', label: 'Author-Date' },
  { value: 'numeric', label: 'Numeric' },
  { value: 'note', label: 'Notes/Footnotes' },
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
      style =>
        style.name.toLowerCase().includes(query)
        || style.shortName?.toLowerCase().includes(query)
        || style.description?.toLowerCase().includes(query)
        || style.fields?.some((f: string) => f.includes(query)),
    )
  }

  if (selectedCategory.value) {
    result = result.filter(style => style.category === selectedCategory.value)
  }

  return result
})

const selectedStyle = computed(() => {
  if (!styles.value) return null
  return (
    styles.value.defaultStyles.find(s => s.id === props.modelValue)
    || styles.value.customStyles.find(s => s.id === props.modelValue)
  )
})

function selectStyle(styleId: string) {
  emit('update:modelValue', styleId)
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    'author-date': 'blue',
    'numeric': 'green',
    'note': 'purple',
    'label': 'orange',
  }
  return colors[category] || 'gray'
}
</script>

<template>
  <div class="space-y-4">
    <!-- Search and filters -->
    <div class="flex gap-3">
      <UInput
        v-model="searchQuery"
        icon="i-heroicons-magnifying-glass"
        placeholder="Search citation styles..."
        class="flex-1"
      />
      <USelectMenu
        v-model="selectedCategory"
        :options="categories"
        value-attribute="value"
        option-attribute="label"
        placeholder="Category"
        class="w-40"
      />
    </div>

    <!-- Toggle custom styles -->
    <div v-if="styles?.customStyles?.length" class="flex items-center gap-2">
      <UToggle v-model="showCustom" />
      <span class="text-sm text-gray-600 dark:text-gray-400">
        Show my custom styles ({{ styles.customStyles.length }})
      </span>
    </div>

    <!-- Loading state -->
    <div v-if="pending" class="flex justify-center py-8">
      <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-gray-400" />
    </div>

    <!-- Styles list -->
    <div v-else class="grid gap-2 max-h-96 overflow-y-auto">
      <button
        v-for="style in filteredStyles"
        :key="style.id"
        type="button"
        class="w-full text-left p-3 rounded-lg border transition-colors"
        :class="[
          props.modelValue === style.id
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
        ]"
        @click="selectStyle(style.id)"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-medium text-gray-900 dark:text-white truncate">
                {{ style.shortName || style.name }}
              </span>
              <UBadge
                v-if="style.category"
                :color="getCategoryColor(style.category)"
                variant="subtle"
                size="xs"
              >
                {{ style.category }}
              </UBadge>
              <UBadge
                v-if="!style.isDefault"
                color="purple"
                variant="subtle"
                size="xs"
              >
                Custom
              </UBadge>
            </div>
            <p v-if="style.description" class="text-sm text-gray-500 mt-0.5 truncate">
              {{ style.description }}
            </p>
            <div v-if="style.fields?.length" class="flex flex-wrap gap-1 mt-1">
              <span
                v-for="field in style.fields.slice(0, 3)"
                :key="field"
                class="text-xs text-gray-400"
              >
                {{ field }}{{ style.fields.indexOf(field) < Math.min(style.fields.length, 3) - 1 ? ',' : '' }}
              </span>
            </div>
          </div>
          <UIcon
            v-if="props.modelValue === style.id"
            name="i-heroicons-check-circle-solid"
            class="w-5 h-5 text-primary-500 flex-shrink-0"
          />
        </div>
      </button>

      <p
        v-if="filteredStyles.length === 0"
        class="text-center text-gray-500 py-8"
      >
        No styles found matching your criteria
      </p>
    </div>

    <!-- Selected style info -->
    <div v-if="selectedStyle" class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <p class="text-sm text-gray-600 dark:text-gray-400">
        Selected: <span class="font-medium text-gray-900 dark:text-white">{{ selectedStyle.name }}</span>
      </p>
    </div>
  </div>
</template>
