export type EntryType =
  | 'book'
  | 'journal_article'
  | 'conference_paper'
  | 'thesis'
  | 'report'
  | 'website'
  | 'newspaper_article'
  | 'magazine_article'
  | 'video'
  | 'podcast'
  | 'interview'
  | 'legal_document'
  | 'patent'
  | 'dataset'
  | 'software'
  | 'custom'

export type AnnotationType =
  | 'descriptive'
  | 'evaluative'
  | 'reflective'
  | 'summary'
  | 'critical'
  | 'custom'

export type { SubscriptionTier } from '~/shared/subscriptions'

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete'

export type SharePermission = 'view' | 'comment' | 'edit' | 'admin'

export type VeritasLabel = 'exceptional' | 'high' | 'moderate' | 'limited' | 'low'

export type UserRole = 'user' | 'admin' | 'support'

export type FeedbackType = 'bug' | 'feature_request' | 'general' | 'complaint'

export type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export type AnnouncementType = 'info' | 'warning' | 'maintenance' | 'release'

export type FieldQualifier =
  | 'any'
  | 'author'
  | 'title'
  | 'publisher'
  | 'journal'
  | 'subject'
  | 'year'

export type SuggestionSource =
  | 'crossref'
  | 'openlibrary'
  | 'pubmed'
  | 'openalex'
  | 'semantic_scholar'
  | 'google_books'
  | 'loc'
  | 'url'

export interface Author {
  firstName: string
  lastName: string
  middleName?: string
  suffix?: string
  orcid?: string
}

export interface Entry {
  id: string
  userId: string
  entryType: EntryType
  title: string
  authors: Author[]
  year?: number
  metadata: EntryMetadata
  customFields: Record<string, string>
  notes?: string
  isFavorite: boolean
  createdAt: Date
  updatedAt: Date
  annotations?: Annotation[]
  tags?: Tag[]
  projects?: Project[]
  veritasScore?: VeritasScore
}

export interface EntryMetadata {
  doi?: string
  isbn?: string
  issn?: string
  url?: string
  abstract?: string
  publisher?: string
  journal?: string
  volume?: string
  issue?: string
  pages?: string
  edition?: string
  chapter?: string
  editor?: string
  series?: string
  language?: string
  accessDate?: string
  citationCount?: number
  container?: string
  [key: string]: unknown
}

export interface Annotation {
  id: string
  entryId: string
  userId: string
  content: string
  annotationType: AnnotationType
  highlights: Highlight[]
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface Highlight {
  page?: number
  text: string
  color?: string
  note?: string
}

export interface Project {
  id: string
  userId: string
  name: string
  description?: string
  color: string
  isArchived: boolean
  settings: ProjectSettings
  slug?: string
  createdAt: Date
  updatedAt: Date
  entries?: Entry[]
  entryCount?: number
}

export interface ProjectSettings {
  defaultCitationStyle?: string
  defaultAnnotationType?: string
  sortOrder?: 'title' | 'author' | 'year' | 'dateAdded'
}

export interface Tag {
  id: string
  userId: string
  name: string
  color: string
  description?: string
  createdAt: Date
  entryCount?: number
}

export interface User {
  id: string
  email: string
  name?: string
  avatarUrl?: string
  subscriptionTier: SubscriptionTier
  role: UserRole
  isBanned: boolean
  bannedAt?: Date
  bannedReason?: string
  preferences: UserPreferences
  createdAt: Date
  updatedAt: Date
}

export interface UserPreferences {
  defaultCitationStyle?: string
  defaultExportFormat?: string
  theme?: 'light' | 'dark' | 'system'
  emailNotifications?: boolean
}

export interface VeritasScore {
  id: string
  entryId: string
  overallScore: number
  confidence: number
  label: VeritasLabel
  factors: VeritasFactor[]
  dataSources: string[]
  calculatedAt: Date
  userOverride?: number
  userOverrideReason?: string
}

export interface VeritasFactor {
  name: string
  score: number
  weight: number
  evidence: string
  source: string
}

export interface Subscription {
  id: string
  userId: string
  stripeSubscriptionId: string
  tier: SubscriptionTier
  status: SubscriptionStatus
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
}

export interface CitationStyle {
  id: string
  userId?: string
  name: string
  description?: string
  cslXml: string
  isSystem: boolean
  isPublic: boolean
}

export interface ExcelColumnConfig {
  id: string
  field: string
  header: string
  width: number
  format: string
  enabled: boolean
  order: number
  customMapping?: string
}

export interface ExcelExportOptions {
  includeHeaderRow: boolean
  freezeHeaderRow: boolean
  autoFitColumns: boolean
  alternateRowColors: boolean
  enableWrapping: boolean
  headerStyle: {
    bold: boolean
    backgroundColor: string
    textColor: string
    fontSize: number
  }
  sortBy: Array<{ field: string; direction: 'asc' | 'desc' }>
  filters: Record<string, unknown>
  additionalSheets: {
    summary: boolean
    tagBreakdown: boolean
    sourceTypeDistribution: boolean
    veritasDistribution: boolean
    timelineChart: boolean
  }
}

export interface ExcelPreset {
  id: string
  userId: string
  name: string
  description?: string
  columns: ExcelColumnConfig[]
  options: ExcelExportOptions
  isSystem?: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ApiError {
  statusCode: number
  message: string
  data?: unknown
}

export const ENTRY_TYPE_LABELS: Record<EntryType, string> = {
  book: 'Book',
  journal_article: 'Journal Article',
  conference_paper: 'Conference Paper',
  thesis: 'Thesis/Dissertation',
  report: 'Report',
  website: 'Website',
  newspaper_article: 'Newspaper Article',
  magazine_article: 'Magazine Article',
  video: 'Video',
  podcast: 'Podcast',
  interview: 'Interview',
  legal_document: 'Legal Document',
  patent: 'Patent',
  dataset: 'Dataset',
  software: 'Software',
  custom: 'Custom',
}

export interface Feedback {
  id: string
  userId?: string
  userEmail?: string
  type: FeedbackType
  subject: string
  content: string
  status: FeedbackStatus
  adminNotes?: string
  resolvedById?: string
  createdAt: Date
  updatedAt: Date
}

export interface Announcement {
  id: string
  createdById?: string
  title: string
  content: string
  type: AnnouncementType
  isActive: boolean
  startAt: Date
  endAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface AdminAuditLog {
  id: string
  adminId: string
  action: string
  targetType: string
  targetId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  createdAt: Date
}

export const ANNOTATION_TYPE_LABELS: Record<AnnotationType, string> = {
  descriptive: 'Descriptive',
  evaluative: 'Evaluative',
  reflective: 'Reflective',
  summary: 'Summary',
  critical: 'Critical',
  custom: 'Custom',
}

export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  bug: 'Bug Report',
  feature_request: 'Feature Request',
  general: 'General',
  complaint: 'Complaint',
}

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
}
