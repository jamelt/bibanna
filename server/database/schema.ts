import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  real,
  pgEnum,
  customType,
  date,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const entryTypeEnum = pgEnum('entry_type', [
  'book',
  'journal_article',
  'conference_paper',
  'thesis',
  'report',
  'website',
  'newspaper_article',
  'magazine_article',
  'video',
  'podcast',
  'interview',
  'legal_document',
  'patent',
  'dataset',
  'software',
  'custom',
])

export const annotationTypeEnum = pgEnum('annotation_type', [
  'descriptive',
  'evaluative',
  'reflective',
  'summary',
  'critical',
  'custom',
])

// subscription_tier and subscription_status use plain text columns
// instead of pgEnum for flexibility. Validation is handled at the
// application layer via Zod schemas derived from shared/subscriptions/.

export const sharePermissionEnum = pgEnum('share_permission', ['view', 'comment', 'edit', 'admin'])

export const veritasLabelEnum = pgEnum('veritas_label', [
  'exceptional',
  'high',
  'moderate',
  'limited',
  'low',
])

export const userRoleEnum = pgEnum('user_role', ['user', 'admin', 'support'])

export const feedbackTypeEnum = pgEnum('feedback_type', [
  'bug',
  'feature_request',
  'general',
  'complaint',
])

export const feedbackStatusEnum = pgEnum('feedback_status', [
  'open',
  'in_progress',
  'resolved',
  'closed',
])

export const announcementTypeEnum = pgEnum('announcement_type', [
  'info',
  'warning',
  'maintenance',
  'release',
])

const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)'
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`
  },
  fromDriver(value: string): number[] {
    return value.slice(1, -1).split(',').map(Number)
  },
})

// Users
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    name: text('name'),
    avatarUrl: text('avatar_url'),
    auth0Id: text('auth0_id').unique(),
    stripeCustomerId: text('stripe_customer_id').unique(),
    subscriptionTier: text('subscription_tier').notNull().default('free'),
    role: userRoleEnum('role').default('user').notNull(),
    isBanned: boolean('is_banned').default(false).notNull(),
    bannedAt: timestamp('banned_at'),
    bannedReason: text('banned_reason'),
    preferences: jsonb('preferences').$type<UserPreferences>().default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
    auth0Idx: index('users_auth0_idx').on(table.auth0Id),
  }),
)

// Subscriptions
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
    tier: text('tier').notNull(),
    status: text('status').notNull(),
    currentPeriodStart: timestamp('current_period_start').notNull(),
    currentPeriodEnd: timestamp('current_period_end').notNull(),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
    graceEndsAt: timestamp('grace_ends_at'),
    lastPaymentError: text('last_payment_error'),
    stripePriceId: text('stripe_price_id'),
    unitAmount: integer('unit_amount'),
    billingInterval: text('billing_interval'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('subscriptions_user_idx').on(table.userId),
    stripeIdx: uniqueIndex('subscriptions_stripe_idx').on(table.stripeSubscriptionId),
  }),
)

// Projects
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    description: text('description'),
    color: text('color').default('#4F46E5'),
    isArchived: boolean('is_archived').default(false),
    isStarred: boolean('is_starred').default(false),
    settings: jsonb('settings').$type<ProjectSettings>().default({}),
    slug: text('slug'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('projects_user_idx').on(table.userId),
  }),
)

// Tags
export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    color: text('color').default('#6B7280'),
    description: text('description'),
    groupName: text('group_name'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userNameIdx: uniqueIndex('tags_user_name_idx').on(table.userId, table.name),
  }),
)

// Entries (bibliography items)
export const entries = pgTable(
  'entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    entryType: entryTypeEnum('entry_type').notNull(),
    title: text('title').notNull(),
    authors: jsonb('authors').$type<Author[]>().default([]),
    year: integer('year'),
    metadata: jsonb('metadata').$type<EntryMetadata>().default({}),
    customFields: jsonb('custom_fields').$type<Record<string, string>>().default({}),
    notes: text('notes'),
    isFavorite: boolean('is_favorite').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('entries_user_idx').on(table.userId),
    titleIdx: index('entries_title_idx').on(table.title),
    yearIdx: index('entries_year_idx').on(table.year),
  }),
)

// Entry-Project junction
export const entryProjects = pgTable(
  'entry_projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entryId: uuid('entry_id')
      .references(() => entries.id, { onDelete: 'cascade' })
      .notNull(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    addedAt: timestamp('added_at').defaultNow().notNull(),
  },
  (table) => ({
    entryProjectIdx: uniqueIndex('entry_projects_idx').on(table.entryId, table.projectId),
  }),
)

// Entry-Tag junction
export const entryTags = pgTable(
  'entry_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entryId: uuid('entry_id')
      .references(() => entries.id, { onDelete: 'cascade' })
      .notNull(),
    tagId: uuid('tag_id')
      .references(() => tags.id, { onDelete: 'cascade' })
      .notNull(),
  },
  (table) => ({
    entryTagIdx: uniqueIndex('entry_tags_idx').on(table.entryId, table.tagId),
  }),
)

// Annotations
export const annotations = pgTable(
  'annotations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entryId: uuid('entry_id')
      .references(() => entries.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    content: text('content').notNull(),
    annotationType: annotationTypeEnum('annotation_type').default('descriptive').notNull(),
    highlights: jsonb('highlights').$type<Highlight[]>().default([]),
    sortOrder: integer('sort_order').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    entryIdx: index('annotations_entry_idx').on(table.entryId),
    userIdx: index('annotations_user_idx').on(table.userId),
  }),
)

// Veritas Scores
export const veritasScores = pgTable(
  'veritas_scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entryId: uuid('entry_id')
      .references(() => entries.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    overallScore: integer('overall_score').notNull(),
    confidence: real('confidence').notNull(),
    label: veritasLabelEnum('label').notNull(),
    factors: jsonb('factors').$type<VeritasFactor[]>().notNull(),
    dataSources: text('data_sources').array(),
    externalData: jsonb('external_data'),
    calculatedAt: timestamp('calculated_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at'),
    userOverride: integer('user_override'),
    userOverrideReason: text('user_override_reason'),
  },
  (table) => ({
    entryIdx: uniqueIndex('veritas_scores_entry_idx').on(table.entryId),
  }),
)

// Citation Styles
export const citationStyles = pgTable(
  'citation_styles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    cslXml: text('csl_xml').notNull(),
    isSystem: boolean('is_system').default(false),
    isPublic: boolean('is_public').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('citation_styles_user_idx').on(table.userId),
  }),
)

// Project Shares
export const projectShares = pgTable(
  'project_shares',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    sharedWithUserId: uuid('shared_with_user_id').references(() => users.id, {
      onDelete: 'cascade',
    }),
    sharedWithEmail: text('shared_with_email'),
    permission: sharePermissionEnum('permission').default('view').notNull(),
    isPublicLink: boolean('is_public_link').default(false),
    publicLinkToken: text('public_link_token').unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index('project_shares_project_idx').on(table.projectId),
    userIdx: index('project_shares_user_idx').on(table.sharedWithUserId),
  }),
)

// Excel Export Presets
export const excelPresets = pgTable(
  'excel_presets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    description: text('description'),
    columns: jsonb('columns').$type<ExcelColumnConfig[]>().notNull(),
    options: jsonb('options').$type<ExcelExportOptions>().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('excel_presets_user_idx').on(table.userId),
  }),
)

// Document Chunks for RAG
export const documentChunks = pgTable(
  'document_chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    entryId: uuid('entry_id').references(() => entries.id, { onDelete: 'cascade' }),
    annotationId: uuid('annotation_id').references(() => annotations.id, { onDelete: 'cascade' }),
    uploadId: uuid('upload_id').references(() => projectUploads.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    embedding: vector('embedding'),
    chunkIndex: integer('chunk_index').notNull(),
    tokenCount: integer('token_count').notNull(),
    metadata: jsonb('metadata').$type<ChunkMetadata>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index('document_chunks_project_idx').on(table.projectId),
    entryIdx: index('document_chunks_entry_idx').on(table.entryId),
  }),
)

// Project Uploads
export const projectUploads = pgTable(
  'project_uploads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    filename: text('filename').notNull(),
    mimeType: text('mime_type').notNull(),
    fileSize: integer('file_size').notNull(),
    storagePath: text('storage_path').notNull(),
    status: text('status')
      .$type<'pending' | 'processing' | 'ready' | 'failed'>()
      .default('pending'),
    chunkCount: integer('chunk_count'),
    errorMessage: text('error_message'),
    extractedTitle: text('extracted_title'),
    extractedAuthors: text('extracted_authors').array(),
    pageCount: integer('page_count'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    processedAt: timestamp('processed_at'),
  },
  (table) => ({
    projectIdx: index('project_uploads_project_idx').on(table.projectId),
  }),
)

// Research Personas
export const researchPersonas = pgTable(
  'research_personas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    title: text('title'),
    expertise: text('expertise').array(),
    personality: text('personality'),
    dominantTopics: text('dominant_topics').array(),
    timeRange: jsonb('time_range').$type<{ start: number; end: number }>(),
    sourceCount: integer('source_count'),
    identifiedGaps: text('identified_gaps').array(),
    customInstructions: text('custom_instructions'),
    systemPrompt: text('system_prompt').notNull(),
    generatedAt: timestamp('generated_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: uniqueIndex('research_personas_project_idx').on(table.projectId),
  }),
)

// Companion Conversations
export const companionConversations = pgTable(
  'companion_conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    title: text('title'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    projectIdx: index('companion_conversations_project_idx').on(table.projectId),
  }),
)

// Companion Messages
export const companionMessages = pgTable(
  'companion_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .references(() => companionConversations.id, { onDelete: 'cascade' })
      .notNull(),
    role: text('role').$type<'user' | 'assistant'>().notNull(),
    content: text('content').notNull(),
    citedSources: jsonb('cited_sources').$type<CitedSource[]>(),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    conversationIdx: index('companion_messages_conversation_idx').on(table.conversationId),
  }),
)

// Database Migrations Tracking
export const migrations = pgTable('migrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  appliedAt: timestamp('applied_at').defaultNow().notNull(),
  checksum: text('checksum'),
})

// Feedback
export const feedback = pgTable(
  'feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    userEmail: text('user_email'),
    type: feedbackTypeEnum('type').default('general').notNull(),
    subject: text('subject').notNull(),
    content: text('content').notNull(),
    status: feedbackStatusEnum('status').default('open').notNull(),
    adminNotes: text('admin_notes'),
    resolvedById: uuid('resolved_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('feedback_user_idx').on(table.userId),
    statusIdx: index('feedback_status_idx').on(table.status),
  }),
)

// Announcements
export const announcements = pgTable('announcements', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  type: announcementTypeEnum('type').default('info').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  startAt: timestamp('start_at').defaultNow().notNull(),
  endAt: timestamp('end_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Admin Audit Logs
export const adminAuditLogs = pgTable(
  'admin_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    adminId: uuid('admin_id')
      .references(() => users.id, { onDelete: 'set null' })
      .notNull(),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id'),
    details: jsonb('details').$type<Record<string, unknown>>(),
    ipAddress: text('ip_address'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    adminIdx: index('audit_logs_admin_idx').on(table.adminId),
    actionIdx: index('audit_logs_action_idx').on(table.action),
    targetIdx: index('audit_logs_target_idx').on(table.targetType, table.targetId),
    createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
  }),
)

// API Usage Tracking
export const apiUsageDaily = pgTable(
  'api_usage_daily',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    date: date('date').notNull(),
    requestCount: integer('request_count').default(0).notNull(),
    endpointCounts: jsonb('endpoint_counts').$type<Record<string, number>>().default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userDateIdx: uniqueIndex('api_usage_user_date_idx').on(table.userId, table.date),
    dateIdx: index('api_usage_date_idx').on(table.date),
  }),
)

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  projects: many(projects),
  entries: many(entries),
  tags: many(tags),
  annotations: many(annotations),
  subscription: one(subscriptions),
  citationStyles: many(citationStyles),
  excelPresets: many(excelPresets),
  feedback: many(feedback),
}))

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  entryProjects: many(entryProjects),
  shares: many(projectShares),
  uploads: many(projectUploads),
  persona: one(researchPersonas),
  conversations: many(companionConversations),
}))

export const entriesRelations = relations(entries, ({ one, many }) => ({
  user: one(users, {
    fields: [entries.userId],
    references: [users.id],
  }),
  annotations: many(annotations),
  entryProjects: many(entryProjects),
  entryTags: many(entryTags),
  veritasScore: one(veritasScores),
}))

export const annotationsRelations = relations(annotations, ({ one }) => ({
  entry: one(entries, {
    fields: [annotations.entryId],
    references: [entries.id],
  }),
  user: one(users, {
    fields: [annotations.userId],
    references: [users.id],
  }),
}))

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, {
    fields: [tags.userId],
    references: [users.id],
  }),
  entryTags: many(entryTags),
}))

export const feedbackRelations = relations(feedback, ({ one }) => ({
  user: one(users, {
    fields: [feedback.userId],
    references: [users.id],
  }),
  resolvedBy: one(users, {
    fields: [feedback.resolvedById],
    references: [users.id],
  }),
}))

// Type definitions
export interface Author {
  firstName: string
  lastName: string
  middleName?: string
  suffix?: string
  orcid?: string
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

export interface UserPreferences {
  defaultCitationStyle?: string
  defaultExportFormat?: string
  theme?: 'light' | 'dark' | 'system'
  emailNotifications?: boolean
}

export interface ProjectSettings {
  defaultCitationStyle?: string
  defaultAnnotationType?: string
  sortOrder?: 'title' | 'author' | 'year' | 'dateAdded'
}

export interface Highlight {
  page?: number
  text: string
  color?: string
  note?: string
}

export interface VeritasFactor {
  name: string
  score: number
  weight: number
  evidence: string
  source: string
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

export interface ChunkMetadata {
  sourceType: 'entry' | 'annotation' | 'upload' | 'note'
  title?: string
  authors?: string
  pageNumber?: number
  section?: string
}

export interface CitedSource {
  chunkId: string
  entryId?: string
  uploadId?: string
  title: string
  authors?: string
  excerpt: string
  relevanceScore: number
}
