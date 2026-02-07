import puppeteer from 'puppeteer'
import type { Entry } from '~/shared/types'
import { formatEntriesWithStyle } from '~/server/services/citation'

export interface PdfExportOptions {
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

const defaultPdfOptions: PdfExportOptions = {
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

export async function generatePdf(
  entries: Entry[],
  options: Partial<PdfExportOptions> = {},
): Promise<Buffer> {
  const opts = { ...defaultPdfOptions, ...options }

  const sortedEntries = sortEntries(entries, opts.sortBy)

  const html = await generateBibliographyHtml(sortedEntries, opts)

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const paperDimensions = {
      letter: { width: '8.5in', height: '11in' },
      a4: { width: '210mm', height: '297mm' },
      legal: { width: '8.5in', height: '14in' },
    }

    const pdf = await page.pdf({
      format: opts.paperSize === 'letter' ? 'Letter' : opts.paperSize === 'a4' ? 'A4' : 'Legal',
      margin: {
        top: `${opts.margins.top}in`,
        right: `${opts.margins.right}in`,
        bottom: `${opts.margins.bottom}in`,
        left: `${opts.margins.left}in`,
      },
      displayHeaderFooter: opts.pageNumbers,
      footerTemplate: opts.pageNumbers
        ? '<div style="text-align: center; width: 100%; font-size: 10px; margin-top: 10px;"><span class="pageNumber"></span></div>'
        : '',
      headerTemplate: '<div></div>',
      printBackground: true,
    })

    return Buffer.from(pdf)
  }
  finally {
    await browser.close()
  }
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

async function generateBibliographyHtml(entries: Entry[], opts: PdfExportOptions): Promise<string> {
  const lineHeight = opts.lineSpacing === 'single' ? 1.2 : opts.lineSpacing === 'oneAndHalf' ? 1.5 : 2

  const styleId = opts.citationStyleId || 'apa-7th'
  let cslMap: Record<string, string> = {}

  try {
    const result = await formatEntriesWithStyle(entries, styleId)
    for (const fc of result.entries) {
      cslMap[fc.entryId] = fc.bibliography
    }
  }
  catch {
    // CSL formatting failed — leave map empty, entries will use title fallback
  }

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: "${opts.font}", "Times New Roman", Times, serif;
      font-size: ${opts.fontSize}pt;
      line-height: ${lineHeight};
      color: #000;
    }
    
    .title-page {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      text-align: center;
      page-break-after: always;
    }
    
    .title-page h1 {
      font-size: ${opts.fontSize * 2}pt;
      font-weight: bold;
      margin-bottom: 2em;
    }
    
    .title-page .date {
      margin-top: 3em;
    }
    
    .bibliography-title {
      text-align: center;
      font-weight: bold;
      margin-bottom: 1em;
    }
    
    .entry {
      margin-bottom: ${opts.lineSpacing === 'double' ? '0' : '1em'};
      text-indent: -0.5in;
      padding-left: 0.5in;
    }
    
    .entry .citation {
      margin-bottom: ${opts.includeAnnotations ? '0.5em' : '0'};
    }
    
    .annotation {
      margin-top: 0.25em;
      margin-bottom: 1em;
      text-indent: 0;
    }
    
    .annotation-bullets {
      margin-left: 0.5in;
      list-style-type: disc;
    }
    
    .annotation-bullets li {
      margin-bottom: 0.25em;
    }
    
    a {
      color: #000;
      text-decoration: none;
    }
  </style>
</head>
<body>
`

  if (opts.includeTitlePage) {
    html += `
  <div class="title-page">
    <h1>${escapeHtml(opts.title)}</h1>
    <div class="date">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
  </div>
`
  }

  html += `
  <div class="bibliography">
    <h2 class="bibliography-title">${opts.includeAnnotations ? 'Annotated Bibliography' : 'Works Cited'}</h2>
`

  for (const entry of entries) {
    const citation = cslMap[entry.id] || escapeHtml(entry.title)

    html += `
    <div class="entry">
      <div class="citation">${citation}</div>
`

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
          const sentences = content.split(/(?<=[.!?])\s+/).filter(s => s.trim())
          html += `
      <ul class="annotation-bullets">
        ${sentences.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
      </ul>
`
        }
        else {
          html += `
      <div class="annotation">${escapeHtml(content)}</div>
`
        }
      }
    }

    html += `
    </div>
`
  }

  html += `
  </div>
</body>
</html>
`

  return html
}

function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#39;',
  }
  return text.replace(/[&<>"']/g, char => htmlEntities[char] || char)
}
