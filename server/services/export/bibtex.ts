import type { Entry, Author, EntryType } from '~/shared/types'

const ENTRY_TYPE_MAP: Record<EntryType, string> = {
  book: 'book',
  journal_article: 'article',
  conference_paper: 'inproceedings',
  thesis: 'phdthesis',
  report: 'techreport',
  website: 'misc',
  newspaper_article: 'article',
  magazine_article: 'article',
  video: 'misc',
  podcast: 'misc',
  interview: 'misc',
  legal_document: 'misc',
  patent: 'misc',
  dataset: 'misc',
  software: 'software',
  custom: 'misc',
}

export function generateBibtex(entries: Entry[]): string {
  return entries.map(entryToBibtex).join('\n\n')
}

function entryToBibtex(entry: Entry): string {
  const bibtexType = ENTRY_TYPE_MAP[entry.entryType] || 'misc'
  const citeKey = generateCiteKey(entry)

  const fields: string[] = []

  if (entry.authors && entry.authors.length > 0) {
    fields.push(`  author = {${formatAuthors(entry.authors)}}`)
  }

  fields.push(`  title = {${escapeBibtex(entry.title)}}`)

  if (entry.year) {
    fields.push(`  year = {${entry.year}}`)
  }

  if (entry.metadata) {
    if (entry.metadata.publisher) {
      fields.push(`  publisher = {${escapeBibtex(entry.metadata.publisher)}}`)
    }

    if (entry.metadata.journal) {
      fields.push(`  journal = {${escapeBibtex(entry.metadata.journal)}}`)
    }

    if (entry.metadata.volume) {
      fields.push(`  volume = {${entry.metadata.volume}}`)
    }

    if (entry.metadata.issue) {
      fields.push(`  number = {${entry.metadata.issue}}`)
    }

    if (entry.metadata.pages) {
      fields.push(`  pages = {${entry.metadata.pages.replace('-', '--')}}`)
    }

    if (entry.metadata.doi) {
      fields.push(`  doi = {${entry.metadata.doi}}`)
    }

    if (entry.metadata.isbn) {
      fields.push(`  isbn = {${entry.metadata.isbn}}`)
    }

    if (entry.metadata.issn) {
      fields.push(`  issn = {${entry.metadata.issn}}`)
    }

    if (entry.metadata.url) {
      fields.push(`  url = {${entry.metadata.url}}`)
    }

    if (entry.metadata.abstract) {
      fields.push(`  abstract = {${escapeBibtex(entry.metadata.abstract)}}`)
    }

    if (entry.metadata.edition) {
      fields.push(`  edition = {${escapeBibtex(entry.metadata.edition)}}`)
    }

    if (entry.metadata.editor) {
      fields.push(`  editor = {${escapeBibtex(entry.metadata.editor)}}`)
    }

    if (entry.metadata.series) {
      fields.push(`  series = {${escapeBibtex(entry.metadata.series)}}`)
    }

    if (entry.metadata.chapter) {
      fields.push(`  chapter = {${entry.metadata.chapter}}`)
    }
  }

  if (entry.entryType === 'conference_paper' && entry.metadata?.container) {
    fields.push(`  booktitle = {${escapeBibtex(entry.metadata.container)}}`)
  }

  if (entry.entryType === 'thesis') {
    fields.push(`  type = {PhD Thesis}`)
    if (entry.metadata?.publisher) {
      fields.push(`  school = {${escapeBibtex(entry.metadata.publisher)}}`)
    }
  }

  return `@${bibtexType}{${citeKey},\n${fields.join(',\n')}\n}`
}

function generateCiteKey(entry: Entry): string {
  const authorPart = entry.authors?.[0]?.lastName
    ? entry.authors[0].lastName.toLowerCase().replace(/[^a-z]/g, '')
    : 'unknown'

  const yearPart = entry.year?.toString() || 'nd'

  const titleWords = entry.title
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(w => !['the', 'a', 'an', 'of', 'in', 'on', 'for', 'and', 'or'].includes(w))

  const titlePart = titleWords[0] || 'untitled'

  return `${authorPart}${yearPart}${titlePart}`
}

function formatAuthors(authors: Author[]): string {
  return authors
    .map((a) => {
      let name = a.lastName
      if (a.firstName) {
        name += `, ${a.firstName}`
        if (a.middleName) {
          name += ` ${a.middleName}`
        }
      }
      return name
    })
    .join(' and ')
}

function escapeBibtex(text: string): string {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[{}]/g, '\\$&')
    .replace(/%/g, '\\%')
    .replace(/&/g, '\\&')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\$/g, '\\$')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/~/g, '\\textasciitilde{}')
}

export function parseBibtex(bibtex: string): Partial<Entry>[] {
  const entries: Partial<Entry>[] = []
  const entryRegex = /@(\w+)\s*\{([^,]+),([^@]*)\}/g

  let match
  while ((match = entryRegex.exec(bibtex)) !== null) {
    const [, type, , fieldsStr] = match
    if (!type || !fieldsStr) continue

    const entry: Partial<Entry> = {
      entryType: mapBibtexType(type),
      metadata: {},
    }

    const fieldRegex = /(\w+)\s*=\s*\{([^}]*)\}/g
    let fieldMatch

    while ((fieldMatch = fieldRegex.exec(fieldsStr)) !== null) {
      const [, field, value] = fieldMatch
      if (!field || value === undefined) continue
      const cleanValue = value.trim()

      switch (field.toLowerCase()) {
        case 'author':
          entry.authors = parseAuthors(cleanValue)
          break
        case 'title':
          entry.title = unescapeBibtex(cleanValue)
          break
        case 'year':
          entry.year = parseInt(cleanValue, 10) || undefined
          break
        case 'publisher':
        case 'school':
          entry.metadata!.publisher = unescapeBibtex(cleanValue)
          break
        case 'journal':
          entry.metadata!.journal = unescapeBibtex(cleanValue)
          break
        case 'volume':
          entry.metadata!.volume = cleanValue
          break
        case 'number':
          entry.metadata!.issue = cleanValue
          break
        case 'pages':
          entry.metadata!.pages = cleanValue.replace('--', '-')
          break
        case 'doi':
          entry.metadata!.doi = cleanValue
          break
        case 'isbn':
          entry.metadata!.isbn = cleanValue
          break
        case 'issn':
          entry.metadata!.issn = cleanValue
          break
        case 'url':
          entry.metadata!.url = cleanValue
          break
        case 'abstract':
          entry.metadata!.abstract = unescapeBibtex(cleanValue)
          break
        case 'booktitle':
          entry.metadata!.container = unescapeBibtex(cleanValue)
          break
      }
    }

    if (entry.title) {
      entries.push(entry)
    }
  }

  return entries
}

function mapBibtexType(bibtexType: string): EntryType {
  const typeMap: Record<string, EntryType> = {
    article: 'journal_article',
    book: 'book',
    inproceedings: 'conference_paper',
    conference: 'conference_paper',
    phdthesis: 'thesis',
    mastersthesis: 'thesis',
    techreport: 'report',
    misc: 'website',
    software: 'software',
    online: 'website',
  }

  return typeMap[bibtexType.toLowerCase()] || 'custom'
}

function parseAuthors(authorsStr: string): Author[] {
  return authorsStr.split(' and ').map((authorStr) => {
    const parts = authorStr.trim().split(',').map(p => p.trim())

    if (parts.length >= 2) {
      const part0 = parts[0] ?? ''
      const part1 = parts[1] ?? ''
      const nameParts = part1.split(/\s+/)
      const firstName = nameParts[0] ?? ''
      return {
        lastName: unescapeBibtex(part0),
        firstName: unescapeBibtex(firstName),
        middleName: nameParts.slice(1).join(' ') || undefined,
      }
    }
    else {
      const nameParts = authorStr.trim().split(/\s+/)
      const lastName = nameParts[nameParts.length - 1] ?? ''
      const firstName = nameParts[0] ?? ''
      return {
        lastName: unescapeBibtex(lastName),
        firstName: unescapeBibtex(firstName),
        middleName: nameParts.slice(1, -1).join(' ') || undefined,
      }
    }
  })
}

function unescapeBibtex(text: string): string {
  return text
    .replace(/\\textbackslash\{\}/g, '\\')
    .replace(/\\([{}%&#_$])/g, '$1')
    .replace(/\\textasciicircum\{\}/g, '^')
    .replace(/\\textasciitilde\{\}/g, '~')
    .replace(/\{([^}]*)\}/g, '$1')
}
