<script setup lang="ts">
import type { ExcelColumnConfig, ExcelExportOptions } from '~/shared/types'

const props = defineProps<{
  open: boolean
  entryIds?: string[]
  projectId?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

const exportFormat = ref<'excel' | 'pdf' | 'bibtex'>('excel')
const isExporting = ref(false)
const error = ref('')

const { data: presetsData } = await useFetch('/api/export/presets')

const systemPresets = computed(() => presetsData.value?.systemPresets || [])
const userPresets = computed(() => presetsData.value?.userPresets || [])
const availableColumns = computed(() => presetsData.value?.availableColumns || [])

const selectedPresetId = ref('standard')
const customColumns = ref<ExcelColumnConfig[]>([])
const showColumnCustomizer = ref(false)

const pdfOptions = reactive({
  paperSize: 'letter' as const,
  margins: { top: 1, right: 1, bottom: 1, left: 1 },
  font: 'Times New Roman',
  fontSize: 12,
  lineSpacing: 'double' as const,
  includeAnnotations: false,
  annotationStyle: 'paragraph' as const,
  includeTitlePage: false,
  title: 'Bibliography',
  pageNumbers: true,
  sortBy: 'author' as const,
})

const allPresets = computed(() => [...systemPresets.value, ...userPresets.value])

const selectedPreset = computed(() =>
  allPresets.value.find(p => p.id === selectedPresetId.value),
)

watch(selectedPreset, (preset) => {
  if (preset) {
    customColumns.value = [...preset.columns]
  }
}, { immediate: true })

function toggleColumn(columnId: string) {
  const column = customColumns.value.find(c => c.id === columnId)
  if (column) {
    column.enabled = !column.enabled
  }
}

function moveColumn(index: number, direction: 'up' | 'down') {
  const newIndex = direction === 'up' ? index - 1 : index + 1
  if (newIndex < 0 || newIndex >= customColumns.value.length) return

  const temp = customColumns.value[index]
  const newVal = customColumns.value[newIndex]
  if (temp === undefined || newVal === undefined) return

  customColumns.value[index] = newVal
  customColumns.value[newIndex] = temp

  customColumns.value.forEach((col, i) => {
    col.order = i
  })
}

async function handleExport() {
  error.value = ''
  isExporting.value = true

  try {
    let endpoint = ''
    let body: Record<string, unknown> = {
      entryIds: props.entryIds,
      projectId: props.projectId,
    }

    switch (exportFormat.value) {
      case 'excel':
        endpoint = '/api/export/excel'
        body = {
          ...body,
          presetId: selectedPresetId.value,
          customColumns: showColumnCustomizer.value ? customColumns.value : undefined,
        }
        break

      case 'pdf':
        endpoint = '/api/export/pdf'
        body = {
          ...body,
          ...pdfOptions,
        }
        break

      case 'bibtex':
        endpoint = '/api/export/bibtex'
        break
    }

    const response = await $fetch(endpoint, {
      method: 'POST',
      body,
      responseType: 'blob',
    })

    const blob = new Blob([response as BlobPart])
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url

    const extensions = { excel: 'xlsx', pdf: 'pdf', bibtex: 'bib' }
    link.download = `bibliography-${Date.now()}.${extensions[exportFormat.value]}`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    isOpen.value = false
  }
  catch (e: any) {
    error.value = e.data?.message || 'Export failed. Please try again.'
  }
  finally {
    isExporting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'sm:max-w-2xl' }">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            Export Bibliography
          </h2>
          <UButton
            icon="i-heroicons-x-mark"
            variant="ghost"
            color="neutral"
            @click="isOpen = false"
          />
        </div>
      </template>

      <div class="space-y-6">
        <UAlert
          v-if="error"
          color="error"
          icon="i-heroicons-exclamation-triangle"
          :title="error"
        />

        <!-- Format Selection -->
        <UFormField label="Export Format">
          <div class="grid grid-cols-3 gap-3">
            <UButton
              icon="i-heroicons-table-cells"
              :variant="exportFormat === 'excel' ? 'solid' : 'outline'"
              :color="exportFormat === 'excel' ? 'primary' : 'neutral'"
              block
              @click="exportFormat = 'excel'"
            >
              Excel
            </UButton>
            <UButton
              icon="i-heroicons-document"
              :variant="exportFormat === 'pdf' ? 'solid' : 'outline'"
              :color="exportFormat === 'pdf' ? 'primary' : 'neutral'"
              block
              @click="exportFormat = 'pdf'"
            >
              PDF
            </UButton>
            <UButton
              icon="i-heroicons-code-bracket"
              :variant="exportFormat === 'bibtex' ? 'solid' : 'outline'"
              :color="exportFormat === 'bibtex' ? 'primary' : 'neutral'"
              block
              @click="exportFormat = 'bibtex'"
            >
              BibTeX
            </UButton>
          </div>
        </UFormField>

        <!-- Excel Options -->
        <template v-if="exportFormat === 'excel'">
          <UFormField label="Preset">
            <USelectMenu
              v-model="selectedPresetId"
              :items="allPresets.map(p => ({ ...p, description: p.description ?? undefined }))"
              value-key="id"
              label-key="name"
            >
              <template #item-label="{ item }">
                <span class="font-medium">{{ item.name }}</span>
                <span v-if="item.isSystem" class="ml-2 text-xs text-muted">(System)</span>
              </template>
              <template #item-description="{ item }">
                <p class="text-xs text-muted">{{ item.description ?? '' }}</p>
              </template>
            </USelectMenu>
          </UFormField>

          <UButton
            icon="i-heroicons-adjustments-horizontal"
            variant="ghost"
            color="neutral"
            size="sm"
            @click="showColumnCustomizer = !showColumnCustomizer"
          >
            {{ showColumnCustomizer ? 'Hide' : 'Customize' }} Columns
          </UButton>

          <div v-if="showColumnCustomizer" class="border rounded-lg p-4 max-h-64 overflow-y-auto">
            <div class="space-y-2">
              <div
                v-for="(column, index) in customColumns"
                :key="column.id"
                class="flex items-center gap-2 p-2 rounded-lg"
                :class="column.enabled ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-gray-50 dark:bg-gray-800'"
              >
                <UCheckbox
                  :model-value="column.enabled"
                  @update:model-value="toggleColumn(column.id)"
                />
                <span class="flex-1" :class="column.enabled ? '' : 'text-gray-400'">
                  {{ column.header }}
                </span>
                <div class="flex gap-1">
                  <UButton
                    icon="i-heroicons-chevron-up"
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    :disabled="index === 0"
                    @click="moveColumn(index, 'up')"
                  />
                  <UButton
                    icon="i-heroicons-chevron-down"
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    :disabled="index === customColumns.length - 1"
                    @click="moveColumn(index, 'down')"
                  />
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- PDF Options -->
        <template v-if="exportFormat === 'pdf'">
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Paper Size">
              <USelectMenu
                v-model="pdfOptions.paperSize"
                :items="[
                  { value: 'letter', label: 'Letter (8.5 x 11)' },
                  { value: 'a4', label: 'A4 (210 x 297mm)' },
                  { value: 'legal', label: 'Legal (8.5 x 14)' },
                ]"
                value-key="value"
              />
            </UFormField>

            <UFormField label="Font Size">
              <USelectMenu
                v-model="pdfOptions.fontSize"
                :items="[10, 11, 12, 14].map(s => ({ value: s, label: `${s}pt` }))"
                value-key="value"
              />
            </UFormField>

            <UFormField label="Line Spacing">
              <USelectMenu
                v-model="pdfOptions.lineSpacing"
                :items="[
                  { value: 'single', label: 'Single' },
                  { value: 'oneAndHalf', label: '1.5 Lines' },
                  { value: 'double', label: 'Double' },
                ]"
                value-key="value"
              />
            </UFormField>

            <UFormField label="Sort By">
              <USelectMenu
                v-model="pdfOptions.sortBy"
                :items="[
                  { value: 'author', label: 'Author' },
                  { value: 'title', label: 'Title' },
                  { value: 'year', label: 'Year' },
                ]"
                value-key="value"
              />
            </UFormField>
          </div>

          <div class="space-y-3">
            <UCheckbox v-model="pdfOptions.includeAnnotations" label="Include annotations" />
            <UCheckbox v-model="pdfOptions.includeTitlePage" label="Include title page" />
            <UCheckbox v-model="pdfOptions.pageNumbers" label="Include page numbers" />
          </div>

          <UFormField v-if="pdfOptions.includeTitlePage" label="Title">
            <UInput v-model="pdfOptions.title" placeholder="Bibliography title" />
          </UFormField>
        </template>

        <!-- BibTeX Options -->
        <template v-if="exportFormat === 'bibtex'">
          <UAlert
            color="info"
            icon="i-heroicons-information-circle"
            title="BibTeX Export"
            description="All selected entries will be exported in BibTeX format, compatible with LaTeX and most reference managers."
          />
        </template>
      </div>

      <template #footer>
        <div class="flex justify-between items-center">
          <span class="text-sm text-gray-500">
            {{ props.entryIds?.length || 'All' }} entries will be exported
          </span>
          <div class="flex gap-3">
            <UButton variant="outline" color="neutral" @click="isOpen = false">
              Cancel
            </UButton>
            <UButton
              color="primary"
              icon="i-heroicons-arrow-down-tray"
              :loading="isExporting"
              @click="handleExport"
            >
              Export
            </UButton>
          </div>
        </div>
      </template>
    </UCard>
  </UModal>
</template>
