import type { Author, EntryMetadata, EntryType } from '~/shared/types'
import type { EntrySuggestion, SearchRequest, SourceAdapter } from '../types'

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes'
const REQUEST_TIMEOUT = 8000

export const googleBooksAdapter: SourceAdapter = {
  name: 'google_books',
  supportedFields: ['any', 'title', 'author', 'publisher', 'subject'],

  async search(request: SearchRequest): Promise<EntrySuggestion[]> {
    const { query, field, maxResults, offset } = request

    const q = buildGoogleBooksQuery(query, field)
    if (!q) return []

    const params = new URLSearchParams()
    params.set('q', q)
    params.set('maxResults', String(Math.min(maxResults, 40)))
    params.set('startIndex', String(offset))
    params.set('printType', 'all')
    params.set('orderBy', 'relevance')

    const config = useRuntimeConfig()
    if (config.googleBooksApiKey) {
      params.set('key', config.googleBooksApiKey)
    }

    return fetchGoogleBooks(params)
  },
}

function buildGoogleBooksQuery(query: string, field: string): string {
  switch (field) {
    case 'author':
      return `inauthor:${query}`
    case 'title':
      return `intitle:${query}`
    case 'publisher':
      return `inpublisher:${query}`
    case 'subject':
      return `subject:${query}`
    default:
      return query
  }
}

async function fetchGoogleBooks(params: URLSearchParams): Promise<EntrySuggestion[]> {
  try {
    const response = await fetch(`${GOOGLE_BOOKS_API}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    })

    if (!response.ok) return []

    const data: any = await response.json()
    const items: any[] = data?.items ?? []

    return items
      .map((item) => googleVolumeToSuggestion(item))
      .filter((s): s is EntrySuggestion => !!s)
  } catch {
    return []
  }
}

function googleVolumeToSuggestion(item: any): EntrySuggestion | null {
  const info = item.volumeInfo
  if (!info?.title) return null

  const authors: Author[] = Array.isArray(info.authors)
    ? info.authors.map((name: string) => {
        const parts = name.trim().split(/\s+/)
        if (parts.length === 1) return { firstName: '', lastName: parts[0] || 'Unknown' }
        const lastName = parts[parts.length - 1] || ''
        const firstName = parts.slice(0, -1).join(' ')
        return { firstName, lastName }
      })
    : []

  const year = info.publishedDate ? parseYear(String(info.publishedDate)) : undefined

  const identifiers: any[] = info.industryIdentifiers ?? []
  const isbn13 = identifiers.find((id: any) => id.type === 'ISBN_13')?.identifier
  const isbn10 = identifiers.find((id: any) => id.type === 'ISBN_10')?.identifier
  const isbn = isbn13 || isbn10

  let entryType: EntryType = 'book'
  if (info.printType === 'MAGAZINE') entryType = 'magazine_article'

  const metadata: EntryMetadata = {
    isbn,
    publisher: info.publisher,
    pages: info.pageCount ? String(info.pageCount) : undefined,
    language: info.language,
    url: info.infoLink ?? info.canonicalVolumeLink,
    abstract: info.description ? info.description.slice(0, 500) : undefined,
  }

  return {
    id: `gbooks-${item.id || info.title}`,
    source: 'google_books' as any,
    title: info.title + (info.subtitle ? `: ${info.subtitle}` : ''),
    authors,
    year,
    entryType,
    metadata,
  }
}

function parseYear(value: string): number | undefined {
  const match = value.match(/(\d{4})/)
  if (!match) return undefined
  const year = Number.parseInt(match[1], 10)
  return Number.isFinite(year) ? year : undefined
}
