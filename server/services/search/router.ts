import type {
  SearchRequest,
  SearchResult,
  SourceAdapter,
  EntrySuggestion,
  FieldQualifier,
} from './types'
import { rankAndDedupe } from './ranker'
import { crossrefAdapter } from './sources/crossref'
import { openLibraryAdapter } from './sources/openlibrary'
import { pubmedAdapter } from './sources/pubmed'
import { openAlexAdapter } from './sources/openalex'
import { semanticScholarAdapter } from './sources/semantic-scholar'
import { googleBooksAdapter } from './sources/google-books'
import { locAdapter } from './sources/loc'

const allAdapters: SourceAdapter[] = [
  crossrefAdapter,
  openLibraryAdapter,
  pubmedAdapter,
  openAlexAdapter,
  semanticScholarAdapter,
  googleBooksAdapter,
  locAdapter,
]

export async function searchAllSources(request: SearchRequest): Promise<SearchResult> {
  const adapters = selectAdapters(request.field)

  const perSourceLimit = Math.ceil(request.maxResults * 1.5)
  const perSourceRequest: SearchRequest = {
    ...request,
    maxResults: perSourceLimit,
  }

  const results = await Promise.allSettled(
    adapters.map((adapter) => adapter.search(perSourceRequest)),
  )

  const allSuggestions: EntrySuggestion[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allSuggestions.push(...result.value)
    }
  }

  const ranked = rankAndDedupe(request.query, allSuggestions, request.field)

  const start = 0
  const page = ranked.slice(start, request.maxResults)
  const hasMore = ranked.length > request.maxResults

  const total = estimateTotal(ranked.length, adapters.length, request)

  return {
    suggestions: page,
    total,
    hasMore,
  }
}

function selectAdapters(field: FieldQualifier): SourceAdapter[] {
  return allAdapters.filter((adapter) => adapter.supportedFields.includes(field))
}

function estimateTotal(rankedCount: number, adapterCount: number, request: SearchRequest): number {
  const perSourceLimit = Math.ceil(request.maxResults * 1.5)
  const maxPossibleFromSources = perSourceLimit * adapterCount

  if (rankedCount >= maxPossibleFromSources * 0.5) {
    return rankedCount * 3
  }

  return rankedCount
}
