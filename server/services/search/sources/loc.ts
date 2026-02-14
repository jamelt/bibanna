import type { Author, EntryMetadata, EntryType } from '~/shared/types'
import type { EntrySuggestion, SearchRequest, SourceAdapter } from '../types'

const LOC_API = 'https://www.loc.gov'
const REQUEST_TIMEOUT = 8000

export const locAdapter: SourceAdapter = {
  name: 'loc',
  supportedFields: ['any', 'title', 'author', 'subject', 'year'],

  async search(request: SearchRequest): Promise<EntrySuggestion[]> {
    const { query, field, maxResults, offset } = request

    const params = new URLSearchParams()
    params.set('fo', 'json')
    params.set('c', String(Math.min(maxResults, 25)))

    const page = Math.floor(offset / Math.max(maxResults, 1)) + 1
    params.set('sp', String(page))

    const searchQuery = buildLocQuery(query, field)
    params.set('q', searchQuery)

    if (field === 'year') {
      const year = parseYear(query)
      if (year) {
        params.append('dates', `${year}/${year}`)
      }
    }

    return fetchLocResults(params)
  },
}

function buildLocQuery(query: string, field: string): string {
  switch (field) {
    case 'author':
      return `contributor:${query}`
    case 'subject':
      return `subject:${query}`
    case 'title':
      return `title:${query}`
    default:
      return query
  }
}

async function fetchLocResults(params: URLSearchParams): Promise<EntrySuggestion[]> {
  try {
    const response = await fetch(`${LOC_API}/search/?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    })

    if (!response.ok) return []

    const data: any = await response.json()
    const results: any[] = data?.results ?? []

    return results.map((item) => locItemToSuggestion(item)).filter((s): s is EntrySuggestion => !!s)
  } catch {
    return []
  }
}

function locItemToSuggestion(item: any): EntrySuggestion | null {
  const title =
    item.title || (Array.isArray(item.title_display) ? item.title_display[0] : item.title_display)
  if (!title) return null

  const contributorNames: string[] = Array.isArray(item.contributor) ? item.contributor : []

  const authors: Author[] = contributorNames.map((name: string) => {
    const cleaned = name.replace(/,?\s*\d{4}-\d{4}\.?$/, '').trim()
    const parts = cleaned.split(/,\s*/)
    if (parts.length >= 2) {
      return { firstName: parts[1].trim(), lastName: parts[0].trim() }
    }
    const spaceParts = cleaned.split(/\s+/)
    if (spaceParts.length === 1) return { firstName: '', lastName: spaceParts[0] || 'Unknown' }
    const lastName = spaceParts[spaceParts.length - 1] || ''
    const firstName = spaceParts.slice(0, -1).join(' ')
    return { firstName, lastName }
  })

  const dateStr = item.date || ''
  const year = parseYear(String(dateStr))

  const originalFormat = Array.isArray(item.original_format) ? item.original_format : []
  const entryType = mapLocFormat(originalFormat)

  const metadata: EntryMetadata = {
    url: item.url || item.id,
    publisher: Array.isArray(item.contributor) ? undefined : item.contributor,
    language: Array.isArray(item.language) ? item.language[0] : item.language,
  }

  return {
    id: `loc-${item.id || title}`,
    source: 'loc' as any,
    title: typeof title === 'string' ? title : String(title),
    authors,
    year,
    entryType,
    metadata,
  }
}

function mapLocFormat(formats: string[]): EntryType {
  const joined = formats.join(' ').toLowerCase()
  if (joined.includes('book') || joined.includes('text')) return 'book'
  if (joined.includes('map')) return 'custom'
  if (joined.includes('photo') || joined.includes('image')) return 'custom'
  if (joined.includes('film') || joined.includes('video')) return 'video'
  if (joined.includes('audio') || joined.includes('sound')) return 'podcast'
  if (joined.includes('software')) return 'software'
  if (joined.includes('manuscript')) return 'custom'
  if (joined.includes('newspaper')) return 'newspaper_article'
  return 'book'
}

function parseYear(value: string): number | undefined {
  const match = value.match(/(\d{4})/)
  if (!match) return undefined
  const year = Number.parseInt(match[1], 10)
  return Number.isFinite(year) ? year : undefined
}
