<script setup lang="ts">
import type { ExcelColumnConfig } from '~/shared/types'
import draggable from 'vuedraggable'

interface Props {
  modelValue: boolean
  projectId?: string
  entryIds?: string[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const isExporting = ref(false)
const selectedPresetId = ref('standard')

const { data: presets } = await useFetch('/api/export/presets')
const { data: userPresets, refresh: refreshUserPresets } = await useFetch(
  '/api/export/presets?type=user',
)

const allAvailableColumns: ExcelColumnConfig[] = [
  { id: 'title', header: 'Title', field: 'title', width: 40, enabled: true, order: 0 },
  {
    id: 'authors',
    header: 'Authors',
    field: 'authors',
    width: 30,
    enabled: true,
    order: 1,
    format: 'authors',
  },
  { id: 'year', header: 'Year', field: 'year', width: 8, enabled: true, order: 2 },
  {
    id: 'entryType',
    header: 'Type',
    field: 'entryType',
    width: 15,
    enabled: true,
    order: 3,
    format: 'entryType',
  },
  {
    id: 'journal',
    header: 'Journal',
    field: 'metadata.journal',
    width: 25,
    enabled: false,
    order: 4,
  },
  { id: 'volume', header: 'Volume', field: 'metadata.volume', width: 8, enabled: false, order: 5 },
  { id: 'issue', header: 'Issue', field: 'metadata.issue', width: 8, enabled: false, order: 6 },
  { id: 'pages', header: 'Pages', field: 'metadata.pages', width: 12, enabled: false, order: 7 },
  {
    id: 'doi',
    header: 'DOI',
    field: 'metadata.doi',
    width: 25,
    enabled: false,
    order: 8,
    format: 'hyperlink',
  },
  {
    id: 'url',
    header: 'URL',
    field: 'url',
    width: 30,
    enabled: false,
    order: 9,
    format: 'hyperlink',
  },
  {
    id: 'publisher',
    header: 'Publisher',
    field: 'metadata.publisher',
    width: 20,
    enabled: false,
    order: 10,
  },
  { id: 'isbn', header: 'ISBN', field: 'metadata.isbn', width: 15, enabled: false, order: 11 },
  {
    id: 'abstract',
    header: 'Abstract',
    field: 'metadata.abstract',
    width: 50,
    enabled: false,
    order: 12,
  },
  {
    id: 'tags',
    header: 'Tags',
    field: 'tags',
    width: 20,
    enabled: false,
    order: 13,
    format: 'tags',
  },
  { id: 'notes', header: 'Notes', field: 'notes', width: 30, enabled: false, order: 14 },
  {
    id: 'veritas',
    header: 'Veritas Score',
    field: 'veritasScore',
    width: 12,
    enabled: false,
    order: 15,
  },
  {
    id: 'createdAt',
    header: 'Added',
    field: 'createdAt',
    width: 12,
    enabled: false,
    order: 16,
    format: 'date',
  },
]

const columns = ref<ExcelColumnConfig[]>(JSON.parse(JSON.stringify(allAvailableColumns)))
const enabledColumns = computed(() =>
  columns.value.filter((c) => c.enabled).sort((a, b) => a.order - b.order),
)
const disabledColumns = computed(() => columns.value.filter((c) => !c.enabled))

const presetName = ref('')
const showSavePreset = ref(false)

function selectPreset(presetId: string) {
  selectedPresetId.value = presetId

  const preset = [...(presets.value || []), ...(userPresets.value || [])].find(
    (p) => p.id === presetId,
  )
  if (preset) {
    columns.value = JSON.parse(JSON.stringify(preset.columns))
  }
}

function toggleColumn(columnId: string) {
  const column = columns.value.find((c) => c.id === columnId)
  if (column) {
    column.enabled = !column.enabled
    if (column.enabled) {
      column.order = enabledColumns.value.length
    }
  }
}

function updateColumnOrder(event: any) {
  enabledColumns.value.forEach((col, index) => {
    col.order = index
  })
}

async function handleExport() {
  isExporting.value = true

  try {
    const response = await $fetch('/api/export/excel', {
      method: 'POST',
      body: {
        projectId: props.projectId,
        entryIds: props.entryIds,
        columns: enabledColumns.value,
      },
      responseType: 'blob',
    })

    const url = URL.createObjectURL(response as Blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bibliography-${Date.now()}.xlsx`
    a.click()
    URL.revokeObjectURL(url)

    isOpen.value = false
  } catch (error: any) {
    console.error('Export failed:', error)
  } finally {
    isExporting.value = false
  }
}

async function saveAsPreset() {
  if (!presetName.value.trim()) return

  try {
    await $fetch('/api/export/presets', {
      method: 'POST',
      body: {
        name: presetName.value,
        columns: columns.value,
      },
    })

    presetName.value = ''
    showSavePreset.value = false
    refreshUserPresets()
  } catch (error: any) {
    console.error('Save preset failed:', error)
  }
}
</script>

<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'sm:max-w-3xl' }">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">Export to Excel</h3>
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-heroicons-x-mark"
              @click="isOpen = false"
            />
          </div>
        </template>

        <div class="space-y-6">
          <!-- Preset selector -->
          <div>
            <label class="block text-sm font-medium mb-2">Preset</label>
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="preset in presets"
                :key="preset.id"
                size="sm"
                :variant="selectedPresetId === preset.id ? 'solid' : 'outline'"
                @click="selectPreset(preset.id)"
              >
                {{ preset.name }}
              </UButton>
              <UButton
                v-for="preset in userPresets"
                :key="preset.id"
                size="sm"
                :variant="selectedPresetId === preset.id ? 'solid' : 'outline'"
                @click="selectPreset(preset.id)"
              >
                {{ preset.name }}
                <UIcon name="i-heroicons-user" class="w-3 h-3 ml-1" />
              </UButton>
            </div>
          </div>

          <!-- Column configuration -->
          <div class="grid grid-cols-2 gap-6">
            <!-- Enabled columns -->
            <div>
              <label class="block text-sm font-medium mb-2">
                Included Columns (drag to reorder)
              </label>
              <draggable
                :list="enabledColumns"
                item-key="id"
                class="space-y-1 min-h-[200px] p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                @end="updateColumnOrder"
              >
                <template #item="{ element }">
                  <div
                    class="flex items-center gap-2 p-2 bg-white dark:bg-gray-700 rounded cursor-move"
                  >
                    <UIcon name="i-heroicons-bars-3" class="w-4 h-4 text-gray-400" />
                    <span class="flex-1 text-sm">{{ element.header }}</span>
                    <UButton
                      variant="ghost"
                      size="xs"
                      icon="i-heroicons-x-mark"
                      @click="toggleColumn(element.id)"
                    />
                  </div>
                </template>
              </draggable>
            </div>

            <!-- Available columns -->
            <div>
              <label class="block text-sm font-medium mb-2"> Available Columns </label>
              <div class="space-y-1 min-h-[200px] p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div
                  v-for="column in disabledColumns"
                  :key="column.id"
                  class="flex items-center gap-2 p-2 bg-white dark:bg-gray-700 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  @click="toggleColumn(column.id)"
                >
                  <UIcon name="i-heroicons-plus" class="w-4 h-4 text-gray-400" />
                  <span class="flex-1 text-sm">{{ column.header }}</span>
                </div>
                <div
                  v-if="disabledColumns.length === 0"
                  class="p-4 text-center text-sm text-gray-500"
                >
                  All columns are included
                </div>
              </div>
            </div>
          </div>

          <!-- Save as preset -->
          <div v-if="showSavePreset" class="flex gap-2">
            <UInput v-model="presetName" placeholder="Preset name" class="flex-1" />
            <UButton @click="saveAsPreset">Save</UButton>
            <UButton variant="outline" @click="showSavePreset = false">Cancel</UButton>
          </div>
          <UButton v-else variant="link" size="sm" @click="showSavePreset = true">
            Save current configuration as preset
          </UButton>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton variant="outline" @click="isOpen = false"> Cancel </UButton>
            <UButton
              color="primary"
              :loading="isExporting"
              :disabled="enabledColumns.length === 0"
              @click="handleExport"
            >
              Export Excel
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
