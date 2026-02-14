import type { Author, EntryMetadata, EntryType } from '~/shared/types'
import type { EntrySuggestion, SearchRequest, SourceAdapter } from '../types'

const OPENALEX_API = 'https://api.openalex.org'
const REQUEST_TIMEOUT = 8000
const USER_AGENT = 'AnnoBib/1.0 (mailto:support@annobib.dev)'

export const openAlexAdapter: SourceAdapter = {
  name: 'openalex',
  supportedFields: ['any', 'title', 'author', 'publisher', 'journal', 'subject', 'year'],

  async search(request: SearchRequest): Promise<EntrySuggestion[]> {
    const { query, field, maxResults, offset } = request

    const params = new URLSearchParams()
    params.set('per_page', String(maxResults))

    // OpenAlex uses cursor for deep pagination, but for offset-based
    // compatibility we use page numbers derived from offset
    const page = Math.floor(offset / maxResults) + 1
    params.set('page', String(page))

    const filter = buildFilter(query, field)
    if (filter) {
      params.set('filter', filter)
    }

    if (field === 'any' || field === 'title') {
      params.set('search', query)
    }

    return fetchOpenAlexWorks(params)
  },
}

function buildFilter(query: string, field: string): string | undefined {
  switch (field) {
    case 'author':
      return `authorships.author.display_name.search:${query}`
    case 'publisher':
      return `primary_location.source.host_organization_name.search:${query}`
    case 'journal':
      return `primary_location.source.display_name.search:${query}`
    case 'subject':
      return `keywords.keyword.search:${query}`
    case 'year': {
      const year = parseYear(query)
      if (year) return `publication_year:${year}`
      return undefined
    }
    case 'title':
      return `title.search:${query}`
    default:
      return undefined
  }
}

async function fetchOpenAlexWorks(params: URLSearchParams): Promise<EntrySuggestion[]> {
  try {
    const response = await fetch(`${OPENALEX_API}/works?${params.toString()}`, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    })

    if (!response.ok) return []

    const data: any = await response.json()
    const results: any[] = data?.results ?? []

    return results
      .map((work) => openAlexWorkToSuggestion(work))
      .filter((s): s is EntrySuggestion => !!s)
  } catch {
    return []
  }
}

function openAlexWorkToSuggestion(work: any): EntrySuggestion | null {
  const title: string | undefined = work.title
  if (!title) return null

  const authors: Author[] = Array.isArray(work.authorships)
    ? work.authorships.map((authorship: any) => {
        const displayName = String(authorship?.author?.display_name ?? '').trim()
        const parts = displayName.split(/\s+/)
        if (parts.length === 1) return { firstName: '', lastName: parts[0] || 'Unknown' }
        const lastName = parts[parts.length - 1] || ''
        const firstName = parts.slice(0, -1).join(' ')
        return { firstName, lastName }
      })
    : []

  const year: number | undefined = work.publication_year

  const doi: string | undefined = work.doi
    ? String(work.doi).replace('https://doi.org/', '')
    : undefined

  const primaryLocation = work.primary_location
  const source = primaryLocation?.source

  const journal: string | undefined = source?.display_name
  const publisher: string | undefined = source?.host_organization_name ?? undefined

  const type = String(work.type ?? '').toLowerCase()
  let entryType: EntryType = 'journal_article'
  if (type.includes('book')) entryType = 'book'
  else if (type.includes('dataset')) entryType = 'dataset'
  else if (type.includes('proceedings') || type.includes('conference') || type === 'paratext')
    entryType = 'conference_paper'
  else if (type.includes('report')) entryType = 'report'
  else if (type.includes('dissertation') || type.includes('thesis')) entryType = 'thesis'

  const metadata: EntryMetadata = {
    doi,
    url: work.primary_location?.landing_page_url ?? undefined,
    journal,
    publisher,
    citationCount: typeof work.cited_by_count === 'number' ? work.cited_by_count : undefined,
    language: work.language ?? undefined,
  }

  return {
    id: work.id || doi || title,
    source: 'openalex',
    title,
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
