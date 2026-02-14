import type { Author, EntryMetadata } from '~/shared/types'
import type { EntrySuggestion, SearchRequest, SourceAdapter } from '../types'

const EUTILS_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const REQUEST_TIMEOUT = 8000

export const pubmedAdapter: SourceAdapter = {
  name: 'pubmed',
  supportedFields: ['any', 'title', 'author', 'journal', 'subject', 'year'],

  async search(request: SearchRequest): Promise<EntrySuggestion[]> {
    const { query, field, maxResults, offset } = request
    const term = buildPubmedTerm(query, field)
    return searchPubmed(term, maxResults, offset)
  },
}

function buildPubmedTerm(query: string, field: string): string {
  switch (field) {
    case 'author':
      return `${query}[AU]`
    case 'title':
      return `${query}[TI]`
    case 'journal':
      return `${query}[TA]`
    case 'subject':
      return `${query}[MH]`
    case 'year':
      return `${query}[DP]`
    default:
      return query
  }
}

async function searchPubmed(
  term: string,
  maxResults: number,
  offset: number,
): Promise<EntrySuggestion[]> {
  try {
    const searchParams = new URLSearchParams({
      db: 'pubmed',
      term,
      retmax: String(maxResults),
      retstart: String(offset),
      retmode: 'json',
      sort: 'relevance',
    })

    const searchResponse = await fetch(`${EUTILS_BASE}/esearch.fcgi?${searchParams.toString()}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    })

    if (!searchResponse.ok) return []

    const searchData: any = await searchResponse.json()
    const idList: string[] = searchData?.esearchresult?.idlist ?? []

    if (idList.length === 0) return []

    return fetchPubmedSummaries(idList)
  } catch {
    return []
  }
}

async function fetchPubmedSummaries(pmids: string[]): Promise<EntrySuggestion[]> {
  try {
    const summaryParams = new URLSearchParams({
      db: 'pubmed',
      id: pmids.join(','),
      retmode: 'json',
    })

    const response = await fetch(`${EUTILS_BASE}/esummary.fcgi?${summaryParams.toString()}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    })

    if (!response.ok) return []

    const data: any = await response.json()
    const result = data?.result
    if (!result) return []

    const suggestions: EntrySuggestion[] = []
    for (const pmid of pmids) {
      const record = result[pmid]
      if (!record || record.error) continue

      const suggestion = pubmedRecordToSuggestion(pmid, record)
      if (suggestion) suggestions.push(suggestion)
    }

    return suggestions
  } catch {
    return []
  }
}

function pubmedRecordToSuggestion(pmid: string, record: any): EntrySuggestion | null {
  const title: string | undefined = record.title?.replace(/<[^>]*>/g, '').replace(/\.$/, '')
  if (!title) return null

  const authors: Author[] = Array.isArray(record.authors)
    ? record.authors.map((a: any) => {
        const name = String(a.name ?? '').trim()
        const parts = name.split(' ')
        const lastName = parts[0] || 'Unknown'
        const firstName = parts.slice(1).join(' ')
        return { firstName, lastName }
      })
    : []

  const pubDate = String(record.pubdate ?? '')
  const year = parseYear(pubDate)

  const doi: string | undefined = Array.isArray(record.articleids)
    ? record.articleids.find((id: any) => id.idtype === 'doi')?.value
    : undefined

  const metadata: EntryMetadata = {
    doi,
    url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    journal: record.fulljournalname || record.source,
    volume: record.volume || undefined,
    issue: record.issue || undefined,
    pages: record.pages || undefined,
    language: record.lang?.[0] || undefined,
  }

  return {
    id: `pmid-${pmid}`,
    source: 'pubmed',
    title,
    authors,
    year,
    entryType: 'journal_article',
    metadata,
  }
}

export async function lookupByPmid(pmid: string): Promise<EntrySuggestion | null> {
  const results = await fetchPubmedSummaries([pmid])
  return results[0] ?? null
}

function parseYear(value: string): number | undefined {
  const match = value.match(/(\d{4})/)
  if (!match) return undefined
  const year = Number.parseInt(match[1], 10)
  return Number.isFinite(year) ? year : undefined
}
