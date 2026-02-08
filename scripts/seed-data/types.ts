export interface SeedAuthor {
  firstName: string
  lastName: string
  middleName?: string
}

export interface SeedVeritasScore {
  overallScore: number
  confidence: number
  label: 'exceptional' | 'high' | 'moderate' | 'limited' | 'low'
  factors: Array<{
    name: string
    score: number
    weight: number
    evidence: string
    source: string
  }>
  dataSources: string[]
  userOverride?: number
  userOverrideReason?: string
}

export interface SeedEntry {
  entryType: 'book' | 'journal_article' | 'report' | 'website'
  title: string
  authors: SeedAuthor[]
  year?: number
  metadata: Record<string, unknown>
  notes?: string
  customFields?: Record<string, string>
  isFavorite?: boolean
  tagKey: string
  extraProjectKeys?: string[]
  annotation: {
    content: string
    type: 'summary' | 'critical' | 'evaluative' | 'reflective'
  }
  veritasScore?: SeedVeritasScore
}

export interface SeedTag {
  key: string
  name: string
  color: string
  description: string
}

export interface SeedProject {
  key: string
  name: string
  description: string
  color: string
  isStarred?: boolean
  isArchived?: boolean
}

export interface SeedProjectConfig {
  projects: SeedProject[]
  tags: SeedTag[]
  entries: SeedEntry[]
}
