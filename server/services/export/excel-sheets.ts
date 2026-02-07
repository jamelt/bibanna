import ExcelJS from 'exceljs'
import type { Entry } from '~/shared/types'
import { ENTRY_TYPE_LABELS } from '~/shared/types'

export function addSummarySheet(
  workbook: ExcelJS.Workbook,
  entries: Entry[],
): void {
  const sheet = workbook.addWorksheet('Summary', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  sheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 },
  ]

  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' },
  }
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }

  const yearRange = entries
    .map(e => e.year)
    .filter((y): y is number => y !== null && y !== undefined)
  
  const minYear = yearRange.length > 0 ? Math.min(...yearRange) : 'N/A'
  const maxYear = yearRange.length > 0 ? Math.max(...yearRange) : 'N/A'

  const entriesWithVeritas = entries.filter(e => e.veritasScore)
  const avgVeritas = entriesWithVeritas.length > 0
    ? entriesWithVeritas.reduce((acc, e) => acc + (e.veritasScore?.overallScore || 0), 0) / entriesWithVeritas.length
    : 0

  const summaryData = [
    { metric: 'Total Entries', value: entries.length },
    { metric: 'Year Range', value: `${minYear} - ${maxYear}` },
    { metric: 'Unique Authors', value: countUniqueAuthors(entries) },
    { metric: 'With DOI', value: entries.filter(e => e.metadata?.doi).length },
    { metric: 'With Abstract', value: entries.filter(e => e.metadata?.abstract).length },
    { metric: 'Favorited', value: entries.filter(e => e.isFavorite).length },
    { metric: 'Average Veritas Score', value: avgVeritas ? avgVeritas.toFixed(1) : 'N/A' },
    { metric: 'Export Date', value: new Date().toLocaleDateString() },
  ]

  summaryData.forEach(data => sheet.addRow(data))
}

export function addTypeBreakdownSheet(
  workbook: ExcelJS.Workbook,
  entries: Entry[],
): void {
  const sheet = workbook.addWorksheet('By Type', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  sheet.columns = [
    { header: 'Entry Type', key: 'type', width: 25 },
    { header: 'Count', key: 'count', width: 10 },
    { header: 'Percentage', key: 'percentage', width: 12 },
  ]

  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' },
  }

  const typeCounts = entries.reduce((acc, entry) => {
    acc[entry.entryType] = (acc[entry.entryType] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      sheet.addRow({
        type: ENTRY_TYPE_LABELS[type as keyof typeof ENTRY_TYPE_LABELS] || type,
        count,
        percentage: `${((count / entries.length) * 100).toFixed(1)}%`,
      })
    })

  sheet.addRow({})
  sheet.addRow({ type: 'Total', count: entries.length, percentage: '100%' })
  
  const lastRow = sheet.lastRow
  if (lastRow) {
    lastRow.font = { bold: true }
  }
}

export function addYearBreakdownSheet(
  workbook: ExcelJS.Workbook,
  entries: Entry[],
): void {
  const sheet = workbook.addWorksheet('By Year', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  sheet.columns = [
    { header: 'Year', key: 'year', width: 10 },
    { header: 'Count', key: 'count', width: 10 },
    { header: 'Cumulative', key: 'cumulative', width: 12 },
  ]

  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' },
  }

  const yearCounts = entries.reduce((acc, entry) => {
    const year = entry.year || 'Unknown'
    acc[year] = (acc[year] || 0) + 1
    return acc
  }, {} as Record<string | number, number>)

  let cumulative = 0
  Object.entries(yearCounts)
    .sort((a, b) => {
      if (a[0] === 'Unknown') return 1
      if (b[0] === 'Unknown') return -1
      return Number(b[0]) - Number(a[0])
    })
    .forEach(([year, count]) => {
      cumulative += count
      sheet.addRow({
        year,
        count,
        cumulative,
      })
    })
}

export function addAuthorBreakdownSheet(
  workbook: ExcelJS.Workbook,
  entries: Entry[],
): void {
  const sheet = workbook.addWorksheet('By Author', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  sheet.columns = [
    { header: 'Author', key: 'author', width: 30 },
    { header: 'Entry Count', key: 'count', width: 12 },
    { header: 'Titles', key: 'titles', width: 60 },
  ]

  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' },
  }

  const authorEntries: Record<string, { count: number; titles: string[] }> = {}

  entries.forEach(entry => {
    const authors = entry.authors || []
    authors.forEach(author => {
      const name = `${author.lastName}, ${author.firstName}`
      if (!authorEntries[name]) {
        authorEntries[name] = { count: 0, titles: [] }
      }
      authorEntries[name].count++
      authorEntries[name].titles.push(entry.title)
    })
  })

  Object.entries(authorEntries)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 50)
    .forEach(([author, data]) => {
      const row = sheet.addRow({
        author,
        count: data.count,
        titles: data.titles.slice(0, 3).join('; ') + (data.titles.length > 3 ? '...' : ''),
      })
      row.getCell('titles').alignment = { wrapText: true }
    })
}

export function addJournalBreakdownSheet(
  workbook: ExcelJS.Workbook,
  entries: Entry[],
): void {
  const sheet = workbook.addWorksheet('By Journal', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  sheet.columns = [
    { header: 'Journal', key: 'journal', width: 40 },
    { header: 'Article Count', key: 'count', width: 12 },
    { header: 'Year Range', key: 'yearRange', width: 15 },
  ]

  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' },
  }

  const journalEntries: Record<string, { count: number; years: number[] }> = {}

  entries
    .filter(e => e.metadata?.journal)
    .forEach(entry => {
      const journal = entry.metadata?.journal as string
      if (!journalEntries[journal]) {
        journalEntries[journal] = { count: 0, years: [] }
      }
      journalEntries[journal].count++
      if (entry.year) {
        journalEntries[journal].years.push(entry.year)
      }
    })

  Object.entries(journalEntries)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([journal, data]) => {
      const minYear = data.years.length > 0 ? Math.min(...data.years) : null
      const maxYear = data.years.length > 0 ? Math.max(...data.years) : null
      
      sheet.addRow({
        journal,
        count: data.count,
        yearRange: minYear && maxYear 
          ? (minYear === maxYear ? String(minYear) : `${minYear}-${maxYear}`)
          : 'N/A',
      })
    })
}

export function addVeritasBreakdownSheet(
  workbook: ExcelJS.Workbook,
  entries: Entry[],
): void {
  const sheet = workbook.addWorksheet('Veritas Scores', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  sheet.columns = [
    { header: 'Title', key: 'title', width: 40 },
    { header: 'Overall Score', key: 'score', width: 12 },
    { header: 'Confidence', key: 'confidence', width: 12 },
    { header: 'Label', key: 'label', width: 12 },
    { header: 'Data Sources', key: 'sources', width: 25 },
  ]

  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' },
  }

  entries
    .filter(e => e.veritasScore)
    .sort((a, b) => (b.veritasScore?.overallScore || 0) - (a.veritasScore?.overallScore || 0))
    .forEach(entry => {
      const vs = entry.veritasScore!
      const row = sheet.addRow({
        title: entry.title,
        score: vs.overallScore,
        confidence: `${Math.round(vs.confidence * 100)}%`,
        label: vs.label,
        sources: vs.dataSources?.join(', ') || 'N/A',
      })

      const scoreCell = row.getCell('score')
      if (vs.overallScore >= 90) {
        scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } }
      } else if (vs.overallScore >= 75) {
        scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } }
      } else if (vs.overallScore >= 60) {
        scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAB308' } }
      } else if (vs.overallScore >= 40) {
        scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF97316' } }
      } else {
        scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } }
      }
    })
}

function countUniqueAuthors(entries: Entry[]): number {
  const authors = new Set<string>()
  entries.forEach(entry => {
    (entry.authors || []).forEach(author => {
      authors.add(`${author.lastName}, ${author.firstName}`.toLowerCase())
    })
  })
  return authors.size
}

export function addAllSummarySheets(
  workbook: ExcelJS.Workbook,
  entries: Entry[],
  options: {
    includeSummary?: boolean
    includeTypeBreakdown?: boolean
    includeYearBreakdown?: boolean
    includeAuthorBreakdown?: boolean
    includeJournalBreakdown?: boolean
    includeVeritasBreakdown?: boolean
  } = {},
): void {
  const {
    includeSummary = true,
    includeTypeBreakdown = true,
    includeYearBreakdown = true,
    includeAuthorBreakdown = true,
    includeJournalBreakdown = true,
    includeVeritasBreakdown = true,
  } = options

  if (includeSummary) addSummarySheet(workbook, entries)
  if (includeTypeBreakdown) addTypeBreakdownSheet(workbook, entries)
  if (includeYearBreakdown) addYearBreakdownSheet(workbook, entries)
  if (includeAuthorBreakdown) addAuthorBreakdownSheet(workbook, entries)
  if (includeJournalBreakdown) addJournalBreakdownSheet(workbook, entries)
  if (includeVeritasBreakdown && entries.some(e => e.veritasScore)) {
    addVeritasBreakdownSheet(workbook, entries)
  }
}
