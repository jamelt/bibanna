import type { Entry } from '~/shared/types'

const SEMANTIC_SCHOLAR_API = 'https://api.semanticscholar.org/graph/v1'
const OPENALEX_API = 'https://api.openalex.org'
const CROSSREF_API = 'https://api.crossref.org'

export interface SemanticScholarData {
  paperId: string
  title: string
  citationCount: number
  influentialCitationCount: number
  authors: Array<{
    authorId: string
    name: string
    hIndex?: number
  }>
  venue?: string
  year?: number
  isOpenAccess?: boolean
  fieldsOfStudy?: string[]
  publicationTypes?: string[]
}

export interface OpenAlexData {
  id: string
  cited_by_count: number
  authorships: Array<{
    author: {
      id: string
      display_name: string
      orcid?: string
    }
    institutions: Array<{
      id: string
      display_name: string
      type: string
    }>
  }>
  primary_location?: {
    source?: {
      id: string
      display_name: string
      type: string
      is_in_doaj: boolean
    }
  }
  is_retracted: boolean
  is_paratext: boolean
}

export interface CrossRefData {
  DOI: string
  title: string[]
  publisher: string
  type: string
  'is-referenced-by-count': number
  references?: Array<{ DOI?: string }>
  author?: Array<{ given: string; family: string; ORCID?: string }>
}

export async function getSemanticScholarData(entry: Entry): Promise<SemanticScholarData | null> {
  try {
    let url: string

    if (entry.metadata?.doi) {
      url = `${SEMANTIC_SCHOLAR_API}/paper/DOI:${entry.metadata.doi}?fields=paperId,title,citationCount,influentialCitationCount,authors.hIndex,venue,year,isOpenAccess,fieldsOfStudy,publicationTypes`
    }
    else {
      const searchUrl = `${SEMANTIC_SCHOLAR_API}/paper/search?query=${encodeURIComponent(entry.title)}&limit=1&fields=paperId,title,citationCount,influentialCitationCount,authors.hIndex,venue,year,isOpenAccess,fieldsOfStudy`
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!searchResponse.ok) return null

      const searchData = await searchResponse.json()
      if (!searchData.data?.[0]) return null

      return searchData.data[0]
    }

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) return null

    return response.json()
  }
  catch (error) {
    console.error('Semantic Scholar API error:', error)
    return null
  }
}

export async function getOpenAlexData(entry: Entry): Promise<OpenAlexData | null> {
  try {
    let url: string

    if (entry.metadata?.doi) {
      url = `${OPENALEX_API}/works/doi:${entry.metadata.doi}`
    }
    else {
      url = `${OPENALEX_API}/works?filter=title.search:${encodeURIComponent(entry.title)}&per_page=1`
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Bibanna/1.0 (mailto:support@bibanna.dev)',
        'Accept': 'application/json',
      },
    })

    if (!response.ok) return null

    const data = await response.json()

    if (entry.metadata?.doi) {
      return data
    }
    else {
      return data.results?.[0] || null
    }
  }
  catch (error) {
    console.error('OpenAlex API error:', error)
    return null
  }
}

export async function getCrossRefData(entry: Entry): Promise<CrossRefData | null> {
  try {
    if (!entry.metadata?.doi) return null

    const url = `${CROSSREF_API}/works/${entry.metadata.doi}`
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Bibanna/1.0 (mailto:support@bibanna.dev)',
        'Accept': 'application/json',
      },
    })

    if (!response.ok) return null

    const data = await response.json()
    return data.message
  }
  catch (error) {
    console.error('CrossRef API error:', error)
    return null
  }
}

export function calculateCitationScore(
  citationCount: number,
  influentialCitations?: number,
  yearPublished?: number,
): number {
  const currentYear = new Date().getFullYear()
  const age = yearPublished ? currentYear - yearPublished : 5

  if (citationCount >= 1000) return 100
  if (citationCount >= 500) return 95
  if (citationCount >= 200) return 90
  if (citationCount >= 100) return 85
  if (citationCount >= 50) return 80
  if (citationCount >= 20) return 75
  if (citationCount >= 10) return 70
  if (citationCount >= 5) return 65
  if (citationCount >= 1) return 60

  if (age <= 2) return 50
  return 40
}

export function calculateAuthorScore(
  authors: Array<{ hIndex?: number }>,
  institutions?: Array<{ type: string }>,
): number {
  if (!authors || authors.length === 0) return 50

  const hIndices = authors
    .map(a => a.hIndex)
    .filter((h): h is number => h !== undefined)

  if (hIndices.length === 0) return 50

  const avgHIndex = hIndices.reduce((a, b) => a + b, 0) / hIndices.length
  const maxHIndex = Math.max(...hIndices)

  let score = 50

  if (maxHIndex >= 50) score = 100
  else if (maxHIndex >= 30) score = 90
  else if (maxHIndex >= 20) score = 80
  else if (maxHIndex >= 10) score = 70
  else if (maxHIndex >= 5) score = 60

  if (institutions) {
    const hasEducation = institutions.some(i => i.type === 'education')
    const hasHealthcare = institutions.some(i => i.type === 'healthcare')
    if (hasEducation || hasHealthcare) {
      score = Math.min(100, score + 5)
    }
  }

  return score
}
