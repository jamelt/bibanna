import { z } from 'zod'

export const authorSchema = z.object({
  firstName: z.string().default(''),
  lastName: z.string().min(1),
  middleName: z.string().nullish(),
  suffix: z.string().nullish(),
  orcid: z.string().nullish(),
})

export const entryTypeSchema = z.enum([
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

export const annotationTypeSchema = z.enum([
  'descriptive',
  'evaluative',
  'reflective',
  'summary',
  'critical',
  'custom',
])

export const entryMetadataSchema = z
  .object({
    doi: z.string().optional(),
    isbn: z.string().optional(),
    issn: z.string().optional(),
    url: z.string().url().nullish().or(z.literal('')),
    abstract: z.string().optional(),
    publisher: z.string().optional(),
    journal: z.string().optional(),
    volume: z.string().optional(),
    issue: z.string().optional(),
    pages: z.string().optional(),
    edition: z.string().optional(),
    chapter: z.string().optional(),
    editor: z.string().optional(),
    series: z.string().optional(),
    language: z.string().optional(),
    accessDate: z.string().optional(),
    citationCount: z.number().int().optional(),
    container: z.string().optional(),
  })
  .passthrough()

export const createEntrySchema = z.object({
  entryType: entryTypeSchema,
  title: z.string().min(1, 'Title is required'),
  authors: z.array(authorSchema).default([]),
  year: z.number().int().min(1).max(9999).nullish(),
  metadata: entryMetadataSchema.optional().default({}),
  customFields: z.record(z.string()).optional().default({}),
  notes: z.string().nullish(),
  isFavorite: z.boolean().optional().default(false),
  projectIds: z.array(z.string().uuid()).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
})

export const updateEntrySchema = createEntrySchema.partial()

export const createAnnotationSchema = z.object({
  content: z.string().min(1, 'Annotation content is required'),
  annotationType: annotationTypeSchema.optional().default('descriptive'),
  highlights: z
    .array(
      z.object({
        page: z.number().int().optional(),
        text: z.string(),
        color: z.string().optional(),
        note: z.string().optional(),
      }),
    )
    .optional()
    .default([]),
  sortOrder: z.number().int().optional().default(0),
})

export const updateAnnotationSchema = createAnnotationSchema.partial()

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .default('#4F46E5'),
  settings: z
    .object({
      defaultCitationStyle: z.string().optional(),
      defaultAnnotationType: annotationTypeSchema.optional(),
      sortOrder: z.enum(['title', 'author', 'year', 'dateAdded']).optional(),
    })
    .optional()
    .default({}),
})

export const updateProjectSchema = createProjectSchema.partial().extend({
  isArchived: z.boolean().optional(),
  isStarred: z.boolean().optional(),
})

export const createTagSchema = z.object({
  name: z.string().min(1, 'Tag name is required'),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .default('#6B7280'),
  description: z.string().optional(),
  groupName: z.string().optional(),
})

export const updateTagSchema = createTagSchema.partial()

const coerceOptionalInt = z.coerce.number().int().optional()

const coerceOptionalBool = z.preprocess((val) => {
  if (val === 'true') return true
  if (val === 'false') return false
  return val
}, z.boolean().optional())

const coerceStringArray = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((val) => {
    if (val === undefined || val === null) return undefined
    return Array.isArray(val) ? val : [val]
  }, z.array(schema).optional())

export const searchQuerySchema = z.object({
  q: z.string().optional(),
  entryTypes: coerceStringArray(entryTypeSchema),
  projectId: z.string().uuid().optional(),
  tagIds: coerceStringArray(z.string().uuid()),
  yearFrom: coerceOptionalInt,
  yearTo: coerceOptionalInt,
  isFavorite: coerceOptionalBool,
  untagged: coerceOptionalBool,
  sortBy: z
    .enum(['relevance', 'title', 'author', 'year', 'createdAt', 'updatedAt'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
})

export const shareProjectSchema = z.object({
  email: z.string().email().optional(),
  permission: z.enum(['view', 'comment', 'edit', 'admin']).default('view'),
  isPublicLink: z.boolean().optional().default(false),
})

export const pdfExportOptionsSchema = z.object({
  paperSize: z.enum(['letter', 'a4', 'legal']).default('letter'),
  margins: z
    .object({
      top: z.number().default(1),
      right: z.number().default(1),
      bottom: z.number().default(1),
      left: z.number().default(1),
    })
    .default({}),
  font: z.string().default('Times New Roman'),
  fontSize: z.number().int().min(8).max(24).default(12),
  lineSpacing: z.enum(['single', 'oneAndHalf', 'double']).default('double'),
  includeAnnotations: z.boolean().default(false),
  annotationStyle: z.enum(['paragraph', 'bullets']).default('paragraph'),
  annotationMaxLength: z.number().int().optional(),
  includeTitlePage: z.boolean().default(false),
  title: z.string().optional(),
  pageNumbers: z.boolean().default(true),
  citationStyleId: z.string().optional(),
  sortBy: z.enum(['author', 'title', 'year', 'custom']).default('author'),
})

export const excelExportOptionsSchema = z.object({
  presetId: z.string().uuid().optional(),
  columns: z
    .array(
      z.object({
        id: z.string(),
        field: z.string(),
        header: z.string(),
        width: z.number(),
        format: z.string(),
        enabled: z.boolean(),
        order: z.number(),
      }),
    )
    .optional(),
  includeHeaderRow: z.boolean().default(true),
  freezeHeaderRow: z.boolean().default(true),
  autoFitColumns: z.boolean().default(true),
  alternateRowColors: z.boolean().default(true),
  enableWrapping: z.boolean().default(true),
  sortBy: z
    .array(
      z.object({
        field: z.string(),
        direction: z.enum(['asc', 'desc']),
      }),
    )
    .optional(),
  additionalSheets: z
    .object({
      summary: z.boolean().default(false),
      tagBreakdown: z.boolean().default(false),
      sourceTypeDistribution: z.boolean().default(false),
      veritasDistribution: z.boolean().default(false),
      timelineChart: z.boolean().default(false),
    })
    .optional(),
})

export type CreateEntryInput = z.infer<typeof createEntrySchema>
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>
export type CreateAnnotationInput = z.infer<typeof createAnnotationSchema>
export type UpdateAnnotationInput = z.infer<typeof updateAnnotationSchema>
export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type CreateTagInput = z.infer<typeof createTagSchema>
export type UpdateTagInput = z.infer<typeof updateTagSchema>
export type SearchQueryInput = z.infer<typeof searchQuerySchema>
export const docxExportOptionsSchema = pdfExportOptionsSchema
export type PdfExportOptions = z.infer<typeof pdfExportOptionsSchema>
export type DocxExportOptionsInput = z.infer<typeof docxExportOptionsSchema>
export type ExcelExportOptionsInput = z.infer<typeof excelExportOptionsSchema>
