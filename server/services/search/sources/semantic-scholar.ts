import type { Author, EntryMetadata, EntryType } from '~/shared/types'
import type { EntrySuggestion, SearchRequest, SourceAdapter } from '../types'

const S2_API = 'https://api.semanticscholar.org/graph/v1'
const REQUEST_TIMEOUT = 8000
const PAPER_FIELDS =
  'paperId,title,authors,year,citationCount,venue,externalIds,publicationTypes,journal'

export const semanticScholarAdapter: SourceAdapter = {
  name: 'semantic_scholar',
  supportedFields: ['any', 'title', 'subject', 'year'],

  async search(request: SearchRequest): Promise<EntrySuggestion[]> {
    const { query, field, maxResults, offset } = request

    const params = new URLSearchParams()
    params.set('query', query)
    params.set('limit', String(maxResults))
    params.set('offset', String(offset))
    params.set('fields', PAPER_FIELDS)

    if (field === 'year') {
      const year = parseYear(query)
      if (year) {
        params.set('year', String(year))
        params.delete('query')
        params.set('query', '*')
      }
    }

    return fetchSemanticScholarPapers(params)
  },
}

async function fetchSemanticScholarPapers(params: URLSearchParams): Promise<EntrySuggestion[]> {
  try {
    const response = await fetch(`${S2_API}/paper/search?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    })

    if (!response.ok) return []

    const data: any = await response.json()
    const papers: any[] = data?.data ?? []

    return papers
      .map((paper) => s2PaperToSuggestion(paper))
      .filter((s): s is EntrySuggestion => !!s)
  } catch {
    return []
  }
}

function s2PaperToSuggestion(paper: any): EntrySuggestion | null {
  const title: string | undefined = paper.title
  if (!title) return null

  const authors: Author[] = Array.isArray(paper.authors)
    ? paper.authors.map((a: any) => {
        const name = String(a.name ?? '').trim()
        const parts = name.split(/\s+/)
        if (parts.length === 1) return { firstName: '', lastName: parts[0] || 'Unknown' }
        const lastName = parts[parts.length - 1] || ''
        const firstName = parts.slice(0, -1).join(' ')
        return { firstName, lastName }
      })
    : []

  const year: number | undefined = paper.year ?? undefined

  const doi: string | undefined = paper.externalIds?.DOI ?? undefined

  const pubTypes: string[] = paper.publicationTypes ?? []
  let entryType: EntryType = 'journal_article'
  if (pubTypes.includes('Book')) entryType = 'book'
  else if (pubTypes.includes('Conference')) entryType = 'conference_paper'
  else if (pubTypes.includes('Dataset')) entryType = 'dataset'
  else if (pubTypes.includes('Review')) entryType = 'journal_article'

  const metadata: EntryMetadata = {
    doi,
    url: paper.paperId ? `https://www.semanticscholar.org/paper/${paper.paperId}` : undefined,
    journal: paper.journal?.name ?? paper.venue ?? undefined,
    volume: paper.journal?.volume ?? undefined,
    pages: paper.journal?.pages ?? undefined,
    citationCount: typeof paper.citationCount === 'number' ? paper.citationCount : undefined,
  }

  return {
    id: paper.paperId || doi || title,
    source: 'semantic_scholar',
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
