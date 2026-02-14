import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  PageNumber,
  Header,
  Footer,
  NumberFormat,
  type ISectionOptions,
} from 'docx'
import type { Entry, Author } from '~/shared/types'

export interface DocxExportOptions {
  paperSize: 'letter' | 'a4' | 'legal'
  margins: {
    top: number
    right: number
    bottom: number
    left: number
  }
  font: string
  fontSize: number
  lineSpacing: 'single' | 'oneAndHalf' | 'double'
  includeAnnotations: boolean
  annotationStyle: 'paragraph' | 'bullets'
  annotationMaxLength?: number
  includeTitlePage: boolean
  title: string
  pageNumbers: boolean
  sortBy: 'author' | 'title' | 'year' | 'custom'
  citationStyleId?: string
}

const defaultDocxOptions: DocxExportOptions = {
  paperSize: 'letter',
  margins: { top: 1, right: 1, bottom: 1, left: 1 },
  font: 'Times New Roman',
  fontSize: 12,
  lineSpacing: 'double',
  includeAnnotations: false,
  annotationStyle: 'paragraph',
  includeTitlePage: false,
  title: 'Bibliography',
  pageNumbers: true,
  sortBy: 'author',
}

const lineSpacingMap = {
  single: 240,
  oneAndHalf: 360,
  double: 480,
}

function inchesToTwip(inches: number): number {
  return Math.round(inches * 1440)
}

function halfPoints(pt: number): number {
  return pt * 2
}

export async function generateDocx(
  entries: Entry[],
  options: Partial<DocxExportOptions> = {},
): Promise<Buffer> {
  const opts = { ...defaultDocxOptions, ...options }
  const sortedEntries = sortEntries(entries, opts.sortBy)
  const spacing = lineSpacingMap[opts.lineSpacing]

  const pageSizes: Record<string, { width: number; height: number }> = {
    letter: { width: inchesToTwip(8.5), height: inchesToTwip(11) },
    a4: { width: inchesToTwip(8.27), height: inchesToTwip(11.69) },
    legal: { width: inchesToTwip(8.5), height: inchesToTwip(14) },
  }

  const pageSize = pageSizes[opts.paperSize] || pageSizes.letter!

  const sections: ISectionOptions[] = []

  if (opts.includeTitlePage) {
    sections.push({
      properties: {
        page: {
          size: pageSize,
          margin: {
            top: inchesToTwip(opts.margins.top),
            right: inchesToTwip(opts.margins.right),
            bottom: inchesToTwip(opts.margins.bottom),
            left: inchesToTwip(opts.margins.left),
          },
        },
      },
      children: [
        new Paragraph({ spacing: { before: 4800 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { line: spacing },
          children: [
            new TextRun({
              text: opts.title,
              font: opts.font,
              size: halfPoints(opts.fontSize * 2),
              bold: true,
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 600, line: spacing },
          children: [
            new TextRun({
              text: new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }),
              font: opts.font,
              size: halfPoints(opts.fontSize),
            }),
          ],
        }),
      ],
    })
  }

  const bibliographyChildren: Paragraph[] = []

  bibliographyChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: spacing, line: spacing },
      children: [
        new TextRun({
          text: opts.includeAnnotations ? 'Annotated Bibliography' : 'Works Cited',
          font: opts.font,
          size: halfPoints(opts.fontSize),
          bold: true,
        }),
      ],
    }),
  )

  for (const entry of sortedEntries) {
    const citationRuns = buildCitationRuns(entry, opts.font, opts.fontSize)

    bibliographyChildren.push(
      new Paragraph({
        spacing: {
          line: spacing,
          after: opts.includeAnnotations ? 0 : 120,
        },
        indent: {
          left: inchesToTwip(0.5),
          hanging: inchesToTwip(0.5),
        },
        children: citationRuns,
      }),
    )

    if (opts.includeAnnotations && entry.annotations?.length) {
      const sortedAnnotations = [...entry.annotations].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      )

      for (const annotation of sortedAnnotations) {
        let content = annotation.content
        if (opts.annotationMaxLength && content.length > opts.annotationMaxLength) {
          content = content.substring(0, opts.annotationMaxLength) + '...'
        }

        if (opts.annotationStyle === 'bullets') {
          const sentences = content.split(/(?<=[.!?])\s+/).filter((s) => s.trim())
          for (const sentence of sentences) {
            bibliographyChildren.push(
              new Paragraph({
                spacing: { line: spacing },
                indent: { left: inchesToTwip(1) },
                bullet: { level: 0 },
                children: [
                  new TextRun({
                    text: sentence,
                    font: opts.font,
                    size: halfPoints(opts.fontSize),
                  }),
                ],
              }),
            )
          }
        } else {
          bibliographyChildren.push(
            new Paragraph({
              spacing: { line: spacing, before: 60, after: 120 },
              indent: { left: inchesToTwip(0.5) },
              children: [
                new TextRun({
                  text: content,
                  font: opts.font,
                  size: halfPoints(opts.fontSize),
                }),
              ],
            }),
          )
        }
      }

      bibliographyChildren.push(new Paragraph({ spacing: { after: 120 } }))
    }
  }

  const footerChildren = opts.pageNumbers
    ? [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              children: [PageNumber.CURRENT],
              font: opts.font,
              size: halfPoints(10),
            }),
          ],
        }),
      ]
    : []

  sections.push({
    properties: {
      page: {
        size: pageSize,
        margin: {
          top: inchesToTwip(opts.margins.top),
          right: inchesToTwip(opts.margins.right),
          bottom: inchesToTwip(opts.margins.bottom),
          left: inchesToTwip(opts.margins.left),
        },
        pageNumbers: opts.pageNumbers ? { start: 1, formatType: NumberFormat.DECIMAL } : undefined,
      },
    },
    headers: {
      default: new Header({ children: [new Paragraph({})] }),
    },
    footers: {
      default: new Footer({ children: footerChildren }),
    },
    children: bibliographyChildren,
  })

  const doc = new Document({
    creator: 'AnnoBib',
    title: opts.title,
    description: 'Bibliography generated by AnnoBib',
    sections,
    numbering: {
      config: [
        {
          reference: 'annobib-bullets',
          levels: [
            {
              level: 0,
              format: NumberFormat.BULLET,
              text: '\u2022',
              alignment: AlignmentType.LEFT,
            },
          ],
        },
      ],
    },
  })

  const buffer = await Packer.toBuffer(doc)
  return Buffer.from(buffer)
}

function buildCitationRuns(entry: Entry, font: string, fontSize: number): TextRun[] {
  const runs: TextRun[] = []
  const size = halfPoints(fontSize)

  const authorText = formatAuthors(entry.authors || [])
  const year = entry.year ? `(${entry.year})` : ''

  switch (entry.entryType) {
    case 'book': {
      if (authorText) runs.push(new TextRun({ text: `${authorText} `, font, size }))
      if (year) runs.push(new TextRun({ text: `${year}. `, font, size }))
      runs.push(new TextRun({ text: `${entry.title}.`, font, size, italics: true }))
      if (entry.metadata?.publisher) {
        runs.push(new TextRun({ text: ` ${entry.metadata.publisher}.`, font, size }))
      }
      break
    }

    case 'journal_article': {
      if (authorText) runs.push(new TextRun({ text: `${authorText} `, font, size }))
      if (year) runs.push(new TextRun({ text: `${year}. `, font, size }))
      runs.push(new TextRun({ text: `${entry.title}.`, font, size }))
      if (entry.metadata?.journal) {
        const journalText = ` ${entry.metadata.journal}`
        runs.push(new TextRun({ text: journalText, font, size, italics: true }))
        let details = ''
        if (entry.metadata?.volume) {
          details += `, ${entry.metadata.volume}`
          if (entry.metadata?.issue) {
            details += `(${entry.metadata.issue})`
          }
        }
        if (entry.metadata?.pages) {
          details += `, ${entry.metadata.pages}`
        }
        details += '.'
        runs.push(new TextRun({ text: details, font, size }))
      }
      if (entry.metadata?.doi) {
        runs.push(new TextRun({ text: ` https://doi.org/${entry.metadata.doi}`, font, size }))
      }
      break
    }

    case 'website': {
      if (authorText) runs.push(new TextRun({ text: `${authorText} `, font, size }))
      if (year) runs.push(new TextRun({ text: `${year}. `, font, size }))
      runs.push(new TextRun({ text: `${entry.title}.`, font, size }))
      if (entry.metadata?.url) {
        runs.push(new TextRun({ text: ` Retrieved from ${entry.metadata.url}`, font, size }))
      }
      break
    }

    default: {
      if (authorText) runs.push(new TextRun({ text: `${authorText} `, font, size }))
      if (year) runs.push(new TextRun({ text: `${year}. `, font, size }))
      runs.push(new TextRun({ text: `${entry.title}.`, font, size, italics: true }))
      if (entry.metadata?.publisher) {
        runs.push(new TextRun({ text: ` ${entry.metadata.publisher}.`, font, size }))
      }
    }
  }

  return runs
}

function sortEntries(entries: Entry[], sortBy: string): Entry[] {
  const sorted = [...entries]

  switch (sortBy) {
    case 'author':
      sorted.sort((a, b) => {
        const aAuthor = a.authors?.[0]?.lastName || 'ZZZZ'
        const bAuthor = b.authors?.[0]?.lastName || 'ZZZZ'
        return aAuthor.localeCompare(bAuthor)
      })
      break
    case 'title':
      sorted.sort((a, b) => a.title.localeCompare(b.title))
      break
    case 'year':
      sorted.sort((a, b) => (b.year || 0) - (a.year || 0))
      break
  }

  return sorted
}

function formatAuthors(authors: Author[]): string {
  if (!authors || authors.length === 0) return ''

  if (authors.length === 1) {
    const first = authors[0]
    return first ? formatSingleAuthor(first) : ''
  }

  if (authors.length === 2) {
    const a0 = authors[0]
    const a1 = authors[1]
    return a0 && a1 ? `${formatSingleAuthor(a0)} & ${formatSingleAuthor(a1)}` : ''
  }

  const firstAuthors = authors.slice(0, -1).map(formatSingleAuthor).join(', ')
  const lastAuthor = authors[authors.length - 1]
  return lastAuthor ? `${firstAuthors}, & ${formatSingleAuthor(lastAuthor)}` : firstAuthors
}

function formatSingleAuthor(author: Author): string {
  let name = author.lastName
  if (author.firstName) {
    name += `, ${author.firstName.charAt(0)}.`
    if (author.middleName) {
      name += ` ${author.middleName.charAt(0)}.`
    }
  }
  return name
}
