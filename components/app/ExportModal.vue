<script setup lang="ts">
import type { ExcelColumnConfig, ExcelExportOptions } from '~/shared/types'
import type { SubscriptionTier } from '~/shared/subscriptions'

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

const exportFormat = ref<'excel' | 'pdf' | 'docx' | 'bibtex'>('excel')
const isExporting = ref(false)
const error = ref('')

const { data: presetsData, status: presetsStatus } = useFetch('/api/export/presets')
const { data: subscriptionData } = useFetch('/api/subscription')
const { data: citationStylesData } = useFetch('/api/citation/styles', { lazy: true })
const { defaultCitationStyle } = useUserPreferences()

const selectedCitationStyleId = ref(defaultCitationStyle.value)

watch(defaultCitationStyle, (val) => {
  if (!selectedCitationStyleId.value || selectedCitationStyleId.value === 'apa-7th') {
    selectedCitationStyleId.value = val
  }
})

const citationStyleOptions = computed(() => {
  if (!citationStylesData.value) return []
  return citationStylesData.value.defaultStyles.map((s: any) => ({
    value: s.id,
    label: s.shortName || s.name,
  }))
})

const userTier = computed<SubscriptionTier>(() => subscriptionData.value?.tier ?? 'free')
const isPaidUser = computed(() => userTier.value !== 'free')
const requiresPaidTier = computed(() => exportFormat.value === 'pdf' || exportFormat.value === 'docx')
const canExport = computed(() => !requiresPaidTier.value || isPaidUser.value)

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

async function extractErrorMessage(e: any): Promise<string> {
  if (e.data?.message) return e.data.message

  if (e.response?._data instanceof Blob) {
    try {
      const text = await e.response._data.text()
      const parsed = JSON.parse(text)
      if (parsed.message) return parsed.message
    }
    catch {}
  }

  if (typeof e.statusMessage === 'string' && e.statusMessage) {
    return e.statusMessage
  }

  return 'Export failed. Please try again.'
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
          citationStyleId: selectedCitationStyleId.value,
        }
        break

      case 'docx':
        endpoint = '/api/export/docx'
        body = {
          ...body,
          ...pdfOptions,
          citationStyleId: selectedCitationStyleId.value,
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

    const extensions = { excel: 'xlsx', pdf: 'pdf', docx: 'docx', bibtex: 'bib' }
    link.download = `bibliography-${Date.now()}.${extensions[exportFormat.value]}`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    isOpen.value = false
  }
  catch (e: any) {
    error.value = await extractErrorMessage(e)
  }
  finally {
    isExporting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'sm:max-w-2xl' }">
    <template #content>
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white" data-testid="export-modal-title">
            Export Bibliography
          </h2>
          <UButton
            icon="i-heroicons-x-mark"
            variant="ghost"
            color="neutral"
            data-testid="export-modal-close"
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
          data-testid="export-modal-error"
        />

        <!-- Format Selection -->
        <UFormField label="Export Format">
          <div class="grid grid-cols-4 gap-3" data-testid="export-format-selector">
            <UButton
              icon="i-heroicons-table-cells"
              :variant="exportFormat === 'excel' ? 'solid' : 'outline'"
              :color="exportFormat === 'excel' ? 'primary' : 'neutral'"
              block
              data-testid="export-format-excel"
              @click="exportFormat = 'excel'"
            >
              Excel
            </UButton>
            <UButton
              icon="i-heroicons-document"
              :variant="exportFormat === 'pdf' ? 'solid' : 'outline'"
              :color="exportFormat === 'pdf' ? 'primary' : 'neutral'"
              block
              data-testid="export-format-pdf"
              @click="exportFormat = 'pdf'"
            >
              <span class="flex items-center gap-1">
                PDF
                <UBadge v-if="!isPaidUser" variant="subtle" color="warning" size="xs">Pro</UBadge>
              </span>
            </UButton>
            <UButton
              icon="i-heroicons-document-text"
              :variant="exportFormat === 'docx' ? 'solid' : 'outline'"
              :color="exportFormat === 'docx' ? 'primary' : 'neutral'"
              block
              data-testid="export-format-docx"
              @click="exportFormat = 'docx'"
            >
              <span class="flex items-center gap-1">
                DOCX
                <UBadge v-if="!isPaidUser" variant="subtle" color="warning" size="xs">Pro</UBadge>
              </span>
            </UButton>
            <UButton
              icon="i-heroicons-code-bracket"
              :variant="exportFormat === 'bibtex' ? 'solid' : 'outline'"
              :color="exportFormat === 'bibtex' ? 'primary' : 'neutral'"
              block
              data-testid="export-format-bibtex"
              @click="exportFormat = 'bibtex'"
            >
              BibTeX
            </UButton>
          </div>
        </UFormField>

        <!-- Tier restriction alert -->
        <UAlert
          v-if="requiresPaidTier && !isPaidUser"
          color="warning"
          icon="i-heroicons-lock-closed"
          title="Paid plan required"
          description="PDF and DOCX exports require a Light or Pro subscription. Upgrade your plan to unlock this feature."
          data-testid="export-tier-warning"
        />

        <!-- Excel Options -->
        <template v-if="exportFormat === 'excel'">
          <div v-if="presetsStatus === 'pending'" class="flex items-center gap-2 text-sm text-gray-500">
            <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
            Loading presets...
          </div>
          <template v-else>
            <UFormField label="Preset">
              <USelectMenu
                v-model="selectedPresetId"
                :items="allPresets.map(p => ({ ...p, description: p.description ?? undefined }))"
                value-key="id"
                label-key="name"
                data-testid="export-excel-preset"
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
              data-testid="export-excel-customize-columns"
              @click="showColumnCustomizer = !showColumnCustomizer"
            >
              {{ showColumnCustomizer ? 'Hide' : 'Customize' }} Columns
            </UButton>

            <div v-if="showColumnCustomizer" class="border rounded-lg p-4 max-h-64 overflow-y-auto" data-testid="export-excel-column-customizer">
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
        </template>

        <!-- PDF / DOCX Options -->
        <template v-if="exportFormat === 'pdf' || exportFormat === 'docx'">
          <UFormField label="Citation Style" data-testid="export-citation-style">
            <USelectMenu
              v-model="selectedCitationStyleId"
              :items="citationStyleOptions"
              value-key="value"
              label-key="label"
              placeholder="Select citation style..."
            />
          </UFormField>

          <div class="grid grid-cols-2 gap-4" data-testid="export-pdf-options">
            <UFormField label="Paper Size">
              <USelectMenu
                v-model="pdfOptions.paperSize"
                :items="[
                  { value: 'letter', label: 'Letter (8.5 x 11)' },
                  { value: 'a4', label: 'A4 (210 x 297mm)' },
                  { value: 'legal', label: 'Legal (8.5 x 14)' },
                ]"
                value-key="value"
                data-testid="export-paper-size"
              />
            </UFormField>

            <UFormField label="Font Size">
              <USelectMenu
                v-model="pdfOptions.fontSize"
                :items="[10, 11, 12, 14].map(s => ({ value: s, label: `${s}pt` }))"
                value-key="value"
                data-testid="export-font-size"
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
                data-testid="export-line-spacing"
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
                data-testid="export-sort-by"
              />
            </UFormField>
          </div>

          <div class="space-y-3" data-testid="export-pdf-checkboxes">
            <UCheckbox v-model="pdfOptions.includeAnnotations" label="Include annotations" data-testid="export-include-annotations" />
            <UCheckbox v-model="pdfOptions.includeTitlePage" label="Include title page" data-testid="export-include-title-page" />
            <UCheckbox v-model="pdfOptions.pageNumbers" label="Include page numbers" data-testid="export-page-numbers" />
          </div>

          <UFormField v-if="pdfOptions.includeTitlePage" label="Title">
            <UInput v-model="pdfOptions.title" placeholder="Bibliography title" data-testid="export-title-input" />
          </UFormField>
        </template>

        <!-- BibTeX Options -->
        <template v-if="exportFormat === 'bibtex'">
          <UAlert
            color="info"
            icon="i-heroicons-information-circle"
            title="BibTeX Export"
            description="All selected entries will be exported in BibTeX format, compatible with LaTeX and most reference managers."
            data-testid="export-bibtex-info"
          />
        </template>
      </div>

      <template #footer>
        <div class="flex justify-between items-center">
          <span class="text-sm text-gray-500" data-testid="export-entry-count">
            {{ props.entryIds?.length ? `${props.entryIds.length} entries` : props.projectId ? 'All project entries' : 'All library entries' }} will be exported
          </span>
          <div class="flex gap-3">
            <UButton variant="outline" color="neutral" data-testid="export-cancel-btn" @click="isOpen = false">
              Cancel
            </UButton>
            <UButton
              color="primary"
              icon="i-heroicons-arrow-down-tray"
              :loading="isExporting"
              :disabled="!canExport"
              data-testid="export-submit-btn"
              @click="handleExport"
            >
              Export
            </UButton>
          </div>
        </div>
      </template>
    </UCard>
    </template>
  </UModal>
</template>
