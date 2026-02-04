import type { Entry, VeritasFactor } from '~/shared/types'
import { getPublisherScore, getJournalScore } from './publishers'
import {
  getSemanticScholarData,
  getOpenAlexData,
  getCrossRefData,
  calculateCitationScore,
  calculateAuthorScore,
} from './external-apis'

export interface VeritasScore {
  overall: number
  confidence: number
  label: 'exceptional' | 'high' | 'moderate' | 'limited' | 'low'
  factors: VeritasFactor[]
  dataSources: string[]
  calculatedAt: Date
}

const FACTOR_WEIGHTS = {
  publisher: 0.25,
  peerReview: 0.20,
  venueQuality: 0.15,
  authorCredentials: 0.15,
  citationImpact: 0.10,
  currency: 0.05,
  transparency: 0.05,
  retractionStatus: 0.05,
}

export async function calculateVeritasScore(entry: Entry): Promise<VeritasScore> {
  const [semanticScholar, openAlex, crossRef] = await Promise.allSettled([
    getSemanticScholarData(entry),
    getOpenAlexData(entry),
    getCrossRefData(entry),
  ])

  const ssData = semanticScholar.status === 'fulfilled' ? semanticScholar.value : null
  const oaData = openAlex.status === 'fulfilled' ? openAlex.value : null
  const crData = crossRef.status === 'fulfilled' ? crossRef.value : null

  const dataSources: string[] = []
  if (ssData) dataSources.push('Semantic Scholar')
  if (oaData) dataSources.push('OpenAlex')
  if (crData) dataSources.push('CrossRef')

  const factors: VeritasFactor[] = []

  const publisherResult = getPublisherScore(entry.metadata?.publisher || crData?.publisher)
  factors.push({
    name: 'Publisher Reputation',
    score: publisherResult?.score ?? 50,
    weight: FACTOR_WEIGHTS.publisher,
    evidence: publisherResult?.evidence ?? 'Publisher not recognized in database',
    source: crData ? 'CrossRef' : 'Manual entry',
  })

  const peerReviewScore = calculatePeerReviewScore(entry, ssData, oaData, crData)
  factors.push({
    name: 'Peer Review Status',
    score: peerReviewScore.score,
    weight: FACTOR_WEIGHTS.peerReview,
    evidence: peerReviewScore.evidence,
    source: peerReviewScore.source,
  })

  const journalResult = getJournalScore(entry.metadata?.journal || ssData?.venue)
  const venueScore = journalResult?.score ?? calculateVenueScore(entry, ssData, oaData)
  factors.push({
    name: 'Journal/Venue Quality',
    score: venueScore,
    weight: FACTOR_WEIGHTS.venueQuality,
    evidence: journalResult?.evidence ?? 'Based on publication venue analysis',
    source: ssData?.venue ? 'Semantic Scholar' : 'Manual entry',
  })

  const authorScore = calculateAuthorCredentialsScore(ssData, oaData)
  factors.push({
    name: 'Author Credentials',
    score: authorScore.score,
    weight: FACTOR_WEIGHTS.authorCredentials,
    evidence: authorScore.evidence,
    source: authorScore.source,
  })

  const citationCount = ssData?.citationCount ?? oaData?.cited_by_count ?? 0
  const citationScore = calculateCitationScore(
    citationCount,
    ssData?.influentialCitationCount,
    entry.year,
  )
  factors.push({
    name: 'Citation Impact',
    score: citationScore,
    weight: FACTOR_WEIGHTS.citationImpact,
    evidence: `${citationCount} citations${ssData?.influentialCitationCount ? `, ${ssData.influentialCitationCount} influential` : ''}`,
    source: ssData ? 'Semantic Scholar' : oaData ? 'OpenAlex' : 'Not available',
  })

  const currencyScore = calculateCurrencyScore(entry.year)
  factors.push({
    name: 'Source Currency',
    score: currencyScore.score,
    weight: FACTOR_WEIGHTS.currency,
    evidence: currencyScore.evidence,
    source: 'Publication year',
  })

  const transparencyScore = calculateTransparencyScore(entry, ssData, oaData)
  factors.push({
    name: 'Data Transparency',
    score: transparencyScore.score,
    weight: FACTOR_WEIGHTS.transparency,
    evidence: transparencyScore.evidence,
    source: transparencyScore.source,
  })

  const retractionScore = calculateRetractionScore(oaData)
  factors.push({
    name: 'Retraction Status',
    score: retractionScore.score,
    weight: FACTOR_WEIGHTS.retractionStatus,
    evidence: retractionScore.evidence,
    source: oaData ? 'OpenAlex' : 'Not checked',
  })

  const overall = Math.round(
    factors.reduce((sum, f) => sum + f.score * f.weight, 0),
  )

  const confidence = dataSources.length / 3

  const label = getVeritasLabel(overall)

  return {
    overall,
    confidence,
    label,
    factors,
    dataSources,
    calculatedAt: new Date(),
  }
}

function calculatePeerReviewScore(
  entry: Entry,
  ssData: Awaited<ReturnType<typeof getSemanticScholarData>>,
  oaData: Awaited<ReturnType<typeof getOpenAlexData>>,
  crData: Awaited<ReturnType<typeof getCrossRefData>>,
): { score: number; evidence: string; source: string } {
  const peerReviewedTypes = ['journal_article', 'conference_paper']

  if (peerReviewedTypes.includes(entry.entryType)) {
    if (oaData?.primary_location?.source?.is_in_doaj) {
      return { score: 90, evidence: 'Listed in DOAJ (verified peer review)', source: 'OpenAlex' }
    }

    if (ssData?.publicationTypes?.includes('JournalArticle')) {
      return { score: 85, evidence: 'Published in peer-reviewed journal', source: 'Semantic Scholar' }
    }

    return { score: 75, evidence: 'Journal article (likely peer-reviewed)', source: 'Entry type' }
  }

  if (entry.entryType === 'book') {
    const publisherScore = getPublisherScore(entry.metadata?.publisher)
    if (publisherScore && publisherScore.score >= 75) {
      return { score: 80, evidence: 'Academic publisher with editorial review', source: 'Publisher database' }
    }
    return { score: 60, evidence: 'Book (editorial review)', source: 'Entry type' }
  }

  if (entry.entryType === 'thesis') {
    return { score: 70, evidence: 'Thesis/dissertation (committee review)', source: 'Entry type' }
  }

  if (entry.entryType === 'website') {
    return { score: 30, evidence: 'Website (no formal peer review)', source: 'Entry type' }
  }

  return { score: 50, evidence: 'Peer review status unknown', source: 'Default' }
}

function calculateVenueScore(
  entry: Entry,
  ssData: Awaited<ReturnType<typeof getSemanticScholarData>>,
  oaData: Awaited<ReturnType<typeof getOpenAlexData>>,
): number {
  if (oaData?.primary_location?.source) {
    if (oaData.primary_location.source.type === 'journal') {
      if (oaData.primary_location.source.is_in_doaj) return 80
      return 70
    }
    if (oaData.primary_location.source.type === 'repository') return 50
    if (oaData.primary_location.source.type === 'conference') return 75
  }

  if (ssData?.venue) {
    return 65
  }

  return 50
}

function calculateAuthorCredentialsScore(
  ssData: Awaited<ReturnType<typeof getSemanticScholarData>>,
  oaData: Awaited<ReturnType<typeof getOpenAlexData>>,
): { score: number; evidence: string; source: string } {
  if (ssData?.authors && ssData.authors.length > 0) {
    const hIndices = ssData.authors
      .map(a => a.hIndex)
      .filter((h): h is number => h !== undefined)

    if (hIndices.length > 0) {
      const score = calculateAuthorScore(ssData.authors)
      const maxHIndex = Math.max(...hIndices)
      return {
        score,
        evidence: `Authors with h-index up to ${maxHIndex}`,
        source: 'Semantic Scholar',
      }
    }
  }

  if (oaData?.authorships && oaData.authorships.length > 0) {
    const hasInstitutions = oaData.authorships.some(a => a.institutions.length > 0)
    const institutions = oaData.authorships.flatMap(a => a.institutions)

    if (hasInstitutions) {
      const score = calculateAuthorScore([], institutions)
      const instTypes = [...new Set(institutions.map(i => i.type))]
      return {
        score,
        evidence: `Authors affiliated with ${instTypes.join(', ')} institutions`,
        source: 'OpenAlex',
      }
    }
  }

  return { score: 50, evidence: 'Author credentials not verified', source: 'Not available' }
}

function calculateCurrencyScore(year: number | undefined): { score: number; evidence: string } {
  if (!year) return { score: 50, evidence: 'Publication year unknown' }

  const currentYear = new Date().getFullYear()
  const age = currentYear - year

  if (age <= 2) return { score: 100, evidence: `Published ${age} year(s) ago (very current)` }
  if (age <= 5) return { score: 90, evidence: `Published ${age} years ago (current)` }
  if (age <= 10) return { score: 75, evidence: `Published ${age} years ago (recent)` }
  if (age <= 20) return { score: 60, evidence: `Published ${age} years ago (older)` }
  return { score: 40, evidence: `Published ${age} years ago (historical)` }
}

function calculateTransparencyScore(
  entry: Entry,
  ssData: Awaited<ReturnType<typeof getSemanticScholarData>>,
  oaData: Awaited<ReturnType<typeof getOpenAlexData>>,
): { score: number; evidence: string; source: string } {
  let score = 50
  const indicators: string[] = []

  if (entry.metadata?.doi) {
    score += 15
    indicators.push('Has DOI')
  }

  if (ssData?.isOpenAccess || oaData?.primary_location?.source?.is_in_doaj) {
    score += 20
    indicators.push('Open access')
  }

  if (entry.metadata?.abstract) {
    score += 10
    indicators.push('Abstract available')
  }

  return {
    score: Math.min(100, score),
    evidence: indicators.length > 0 ? indicators.join(', ') : 'Limited transparency indicators',
    source: ssData || oaData ? 'Multiple sources' : 'Manual entry',
  }
}

function calculateRetractionScore(
  oaData: Awaited<ReturnType<typeof getOpenAlexData>>,
): { score: number; evidence: string } {
  if (!oaData) {
    return { score: 75, evidence: 'Retraction status not checked' }
  }

  if (oaData.is_retracted) {
    return { score: 0, evidence: 'THIS WORK HAS BEEN RETRACTED' }
  }

  return { score: 100, evidence: 'No retraction found' }
}

export function getVeritasLabel(score: number): 'exceptional' | 'high' | 'moderate' | 'limited' | 'low' {
  if (score >= 90) return 'exceptional'
  if (score >= 75) return 'high'
  if (score >= 60) return 'moderate'
  if (score >= 40) return 'limited'
  return 'low'
}

export { getPublisherScore, getJournalScore } from './publishers'
