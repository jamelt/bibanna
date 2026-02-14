import type { Author, EntryMetadata, EntryType } from '~/shared/types'
import type { EntrySuggestion, SearchRequest, SourceAdapter } from '../types'

const OPENLIBRARY_API = 'https://openlibrary.org'
const REQUEST_TIMEOUT = 8000
const SEARCH_FIELDS =
  'key,title,author_name,first_publish_year,isbn,publisher,number_of_pages_median,language,subject'

export const openLibraryAdapter: SourceAdapter = {
  name: 'openlibrary',
  supportedFields: ['any', 'title', 'author', 'subject'],

  async search(request: SearchRequest): Promise<EntrySuggestion[]> {
    const { query, field, maxResults, offset } = request

    const params = new URLSearchParams()
    params.set('limit', String(maxResults))
    params.set('offset', String(offset))
    params.set('fields', SEARCH_FIELDS)

    switch (field) {
      case 'author':
        params.set('author', query)
        break
      case 'title':
        params.set('title', query)
        break
      case 'subject':
        params.set('subject', query)
        break
      default:
        params.set('q', query)
        break
    }

    return fetchOpenLibrarySearch(params)
  },
}

async function fetchOpenLibrarySearch(params: URLSearchParams): Promise<EntrySuggestion[]> {
  try {
    const response = await fetch(`${OPENLIBRARY_API}/search.json?${params.toString()}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    })

    if (!response.ok) return []

    const data: any = await response.json()
    const docs: any[] = data?.docs ?? []

    return docs.filter((doc: any) => !!doc.title).map((doc: any) => openLibraryDocToSuggestion(doc))
  } catch {
    return []
  }
}

function openLibraryDocToSuggestion(doc: any): EntrySuggestion {
  const authors: Author[] = Array.isArray(doc.author_name)
    ? doc.author_name.map((name: string) => {
        const parts = name.trim().split(/\s+/)
        if (parts.length === 1) return { firstName: '', lastName: parts[0] || 'Unknown' }
        const lastName = parts[parts.length - 1] || ''
        const firstName = parts.slice(0, -1).join(' ')
        return { firstName, lastName }
      })
    : []

  const isbn = Array.isArray(doc.isbn) && doc.isbn.length > 0 ? doc.isbn[0] : undefined

  const metadata: EntryMetadata = {
    isbn,
    publisher: Array.isArray(doc.publisher) ? doc.publisher[0] : undefined,
    pages: doc.number_of_pages_median ? String(doc.number_of_pages_median) : undefined,
  }

  return {
    id: `ol-${doc.key || doc.title}`,
    source: 'openlibrary',
    title: doc.title as string,
    authors,
    year: doc.first_publish_year,
    entryType: 'book' as EntryType,
    metadata,
  }
}

export async function lookupByIsbn(isbn: string): Promise<EntrySuggestion | null> {
  const normalized = isbn.replace(/[-\s]/g, '')

  try {
    const response = await fetch(`${OPENLIBRARY_API}/isbn/${encodeURIComponent(normalized)}.json`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    })

    if (!response.ok) return null

    const data: any = await response.json()

    const title: string | undefined = data?.title
    if (!title) return null

    const authors: Author[] = Array.isArray(data?.authors)
      ? data.authors.map((a: any) => ({
          firstName: '',
          lastName: String(a.name ?? '').trim() || 'Unknown',
        }))
      : []

    const publishedYear: number | undefined = data?.publish_date
      ? parseYear(String(data.publish_date))
      : undefined

    const metadata: EntryMetadata = {
      isbn: normalized,
      publisher: Array.isArray(data?.publishers) ? data.publishers[0] : data?.publisher,
      pages: data?.number_of_pages ? String(data.number_of_pages) : undefined,
      language: Array.isArray(data?.languages) ? data.languages[0]?.key : undefined,
    }

    return {
      id: normalized,
      source: 'openlibrary',
      title,
      authors,
      year: publishedYear,
      entryType: 'book',
      metadata,
    }
  } catch {
    return null
  }
}

function parseYear(value: string): number | undefined {
  const match = value.match(/(\d{4})/)
  if (!match) return undefined
  const year = Number.parseInt(match[1], 10)
  return Number.isFinite(year) ? year : undefined
}
