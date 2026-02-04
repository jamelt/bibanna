import ExcelJS from 'exceljs'
import type { Entry, ExcelColumnConfig, ExcelExportOptions, Author } from '~/shared/types'
import { ENTRY_TYPE_LABELS } from '~/shared/types'
import { systemPresets, type ExcelExportPreset } from './excel-presets'

export async function generateExcel(
  entries: Entry[],
  preset: ExcelExportPreset,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Bibanna'
  workbook.created = new Date()

  const mainSheet = workbook.addWorksheet('Bibliography', {
    views: preset.options.freezeHeaderRow
      ? [{ state: 'frozen', ySplit: 1 }]
      : [],
  })

  const enabledColumns = preset.columns
    .filter(c => c.enabled)
    .sort((a, b) => a.order - b.order)

  mainSheet.columns = enabledColumns.map(col => ({
    header: col.header,
    key: col.id,
    width: col.width,
  }))

  if (preset.options.includeHeaderRow) {
    const headerRow = mainSheet.getRow(1)
    headerRow.font = {
      bold: preset.options.headerStyle.bold,
      color: { argb: preset.options.headerStyle.textColor.replace('#', 'FF') },
      size: preset.options.headerStyle.fontSize,
    }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: preset.options.headerStyle.backgroundColor.replace('#', 'FF') },
    }
    headerRow.alignment = { vertical: 'middle' }

    mainSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: enabledColumns.length },
    }
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    if (!entry) continue

    const rowData: Record<string, unknown> = {}

    for (const col of enabledColumns) {
      rowData[col.id] = formatCellValue(
        getNestedValue(entry as unknown as Record<string, unknown>, col.field),
        col.format,
        entry,
      )
    }

    const row = mainSheet.addRow(rowData)

    if (preset.options.alternateRowColors && i % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF3F4F6' },
      }
    }

    if (preset.options.enableWrapping) {
      row.alignment = { wrapText: true, vertical: 'top' }
    }

    for (const col of enabledColumns) {
      if (col.format === 'hyperlink') {
        const cellValue = getNestedValue(entry as unknown as Record<string, unknown>, col.field)
        if (cellValue && typeof cellValue === 'string') {
          const cell = row.getCell(col.id)
          const url = cellValue.startsWith('10.') ? `https://doi.org/${cellValue}` : cellValue
          cell.value = { text: cellValue, hyperlink: url }
          cell.font = { color: { argb: 'FF0000EE' }, underline: true }
        }
      }
    }
  }

  if (preset.options.autoFitColumns) {
    mainSheet.columns.forEach((column) => {
      let maxLength = 10
      column.eachCell?.({ includeEmpty: false }, (cell) => {
        const cellLength = cell.value?.toString().length || 0
        maxLength = Math.min(Math.max(maxLength, cellLength), 100)
      })
      column.width = Math.max(column.width || 10, maxLength + 2)
    })
  }

  if (preset.options.additionalSheets.summary) {
    addSummarySheet(workbook, entries)
  }
  if (preset.options.additionalSheets.tagBreakdown) {
    addTagBreakdownSheet(workbook, entries)
  }
  if (preset.options.additionalSheets.sourceTypeDistribution) {
    addSourceTypeSheet(workbook, entries)
  }
  if (preset.options.additionalSheets.veritasDistribution) {
    addVeritasDistributionSheet(workbook, entries)
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let value: unknown = obj

  for (const part of parts) {
    if (value === null || value === undefined) return undefined

    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/)
    if (arrayMatch) {
      const key = arrayMatch[1]
      const indexStr = arrayMatch[2]
      if (!key || indexStr === undefined) return undefined
      const index = parseInt(indexStr, 10)
      value = (value as Record<string, unknown>)[key]
      if (Array.isArray(value)) {
        value = value[index]
      }
      else {
        return undefined
      }
    }
    else {
      value = (value as Record<string, unknown>)[part]
    }
  }

  return value
}

function formatCellValue(value: unknown, format: string, entry: Entry): unknown {
  if (value === null || value === undefined) return ''

  switch (format) {
    case 'author_format':
      if (Array.isArray(value)) {
        return (value as Author[])
          .map(a => `${a.lastName}, ${a.firstName}${a.middleName ? ` ${a.middleName.charAt(0)}.` : ''}`)
          .join('; ')
      }
      return value

    case 'comma_separated':
      if (Array.isArray(value)) {
        return value.map((t: { name?: string }) => (typeof t === 'object' ? t.name : t)).join(', ')
      }
      return value

    case 'veritas_score':
      if (typeof value === 'number') {
        const label = getVeritasLabel(value)
        return `${value} (${label})`
      }
      return value

    case 'date':
      if (value instanceof Date) {
        return value.toLocaleDateString()
      }
      if (typeof value === 'string') {
        return new Date(value).toLocaleDateString()
      }
      return value

    case 'date_time':
      if (value instanceof Date) {
        return value.toLocaleString()
      }
      if (typeof value === 'string') {
        return new Date(value).toLocaleString()
      }
      return value

    case 'boolean':
      return value ? 'Yes' : 'No'

    case 'text':
      if (typeof value === 'object') {
        return JSON.stringify(value)
      }
      if (format === 'text' && entry.entryType && value === entry.entryType) {
        return ENTRY_TYPE_LABELS[value as keyof typeof ENTRY_TYPE_LABELS] || value
      }
      return value

    default:
      return value
  }
}

function getVeritasLabel(score: number): string {
  if (score >= 90) return 'Exceptional'
  if (score >= 75) return 'High'
  if (score >= 60) return 'Moderate'
  if (score >= 40) return 'Limited'
  return 'Low'
}

function addSummarySheet(workbook: ExcelJS.Workbook, entries: Entry[]) {
  const sheet = workbook.addWorksheet('Summary')

  sheet.addRow(['Bibliography Summary'])
  sheet.getRow(1).font = { bold: true, size: 14 }
  sheet.addRow([])

  const years = entries.map(e => e.year).filter((y): y is number => y !== undefined && y !== null)
  const minYear = years.length > 0 ? Math.min(...years) : 'N/A'
  const maxYear = years.length > 0 ? Math.max(...years) : 'N/A'

  sheet.addRow(['Total Entries', entries.length])
  sheet.addRow(['Date Range', `${minYear} - ${maxYear}`])

  const uniqueAuthors = new Set(
    entries.flatMap(e => e.authors?.map(a => `${a.lastName}, ${a.firstName}`) || []),
  )
  sheet.addRow(['Unique Authors', uniqueAuthors.size])

  const uniqueTags = new Set(
    entries.flatMap(e => e.tags?.map(t => t.name) || []),
  )
  sheet.addRow(['Unique Tags', uniqueTags.size])

  const entriesWithVeritas = entries.filter(e => e.veritasScore?.overallScore)
  if (entriesWithVeritas.length > 0) {
    const avgVeritas = entriesWithVeritas.reduce((sum, e) => sum + (e.veritasScore?.overallScore || 0), 0) / entriesWithVeritas.length
    sheet.addRow(['Average Veritas Score', avgVeritas.toFixed(1)])
  }
  else {
    sheet.addRow(['Average Veritas Score', 'N/A'])
  }

  sheet.addRow([])
  sheet.addRow(['Generated', new Date().toLocaleString()])

  sheet.getColumn(1).width = 20
  sheet.getColumn(2).width = 30
}

function addTagBreakdownSheet(workbook: ExcelJS.Workbook, entries: Entry[]) {
  const sheet = workbook.addWorksheet('Tags')

  const tagCounts = new Map<string, number>()
  entries.forEach((e) => {
    e.tags?.forEach((t) => {
      const name = typeof t === 'object' ? t.name : t
      tagCounts.set(name, (tagCounts.get(name) || 0) + 1)
    })
  })

  sheet.addRow(['Tag', 'Count', 'Percentage'])
  sheet.getRow(1).font = { bold: true }

  const sorted = [...tagCounts.entries()].sort((a, b) => b[1] - a[1])
  sorted.forEach(([tag, count]) => {
    sheet.addRow([tag, count, `${((count / entries.length) * 100).toFixed(1)}%`])
  })

  sheet.getColumn(1).width = 30
  sheet.getColumn(2).width = 10
  sheet.getColumn(3).width = 12
}

function addSourceTypeSheet(workbook: ExcelJS.Workbook, entries: Entry[]) {
  const sheet = workbook.addWorksheet('Source Types')

  const typeCounts = new Map<string, number>()
  entries.forEach((e) => {
    const type = ENTRY_TYPE_LABELS[e.entryType as keyof typeof ENTRY_TYPE_LABELS] || e.entryType
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1)
  })

  sheet.addRow(['Source Type', 'Count', 'Percentage'])
  sheet.getRow(1).font = { bold: true }

  const sorted = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])
  sorted.forEach(([type, count]) => {
    sheet.addRow([type, count, `${((count / entries.length) * 100).toFixed(1)}%`])
  })

  sheet.getColumn(1).width = 25
  sheet.getColumn(2).width = 10
  sheet.getColumn(3).width = 12
}

function addVeritasDistributionSheet(workbook: ExcelJS.Workbook, entries: Entry[]) {
  const sheet = workbook.addWorksheet('Veritas Distribution')

  const ranges = [
    { label: 'Exceptional (90-100)', min: 90, max: 100 },
    { label: 'High (75-89)', min: 75, max: 89 },
    { label: 'Moderate (60-74)', min: 60, max: 74 },
    { label: 'Limited (40-59)', min: 40, max: 59 },
    { label: 'Low (0-39)', min: 0, max: 39 },
    { label: 'Not Scored', min: -1, max: -1 },
  ]

  sheet.addRow(['Veritas Score Range', 'Count', 'Percentage'])
  sheet.getRow(1).font = { bold: true }

  ranges.forEach((range) => {
    let count: number
    if (range.min === -1) {
      count = entries.filter(e => !e.veritasScore?.overallScore).length
    }
    else {
      count = entries.filter((e) => {
        const score = e.veritasScore?.overallScore
        return score !== undefined && score >= range.min && score <= range.max
      }).length
    }
    sheet.addRow([range.label, count, `${((count / entries.length) * 100).toFixed(1)}%`])
  })

  sheet.getColumn(1).width = 25
  sheet.getColumn(2).width = 10
  sheet.getColumn(3).width = 12
}

export { systemPresets, type ExcelExportPreset }
