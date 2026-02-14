import { db } from '~/server/database/client'
import { excelPresets } from '~/server/database/schema'
import { z } from 'zod'
import type { ExcelExportOptions } from '~/shared/types'

const presetSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  columns: z.array(
    z.object({
      id: z.string(),
      header: z.string(),
      field: z.string(),
      width: z.number(),
      enabled: z.boolean(),
      order: z.number(),
      format: z.string().optional(),
      customMapping: z.string().optional(),
    }),
  ),
  options: z
    .object({
      includeHeaderRow: z.boolean().default(true),
      freezeHeaderRow: z.boolean().default(true),
      autoFitColumns: z.boolean().default(true),
      alternateRowColors: z.boolean().default(true),
      enableWrapping: z.boolean().default(true),
      headerStyle: z.object({
        bold: z.boolean(),
        backgroundColor: z.string(),
        textColor: z.string(),
        fontSize: z.number(),
      }),
      sortBy: z
        .array(
          z.object({
            field: z.string(),
            direction: z.enum(['asc', 'desc']),
          }),
        )
        .default([]),
      filters: z.record(z.unknown()).default({}),
      additionalSheets: z
        .object({
          summary: z.boolean().default(false),
          tagBreakdown: z.boolean().default(false),
          sourceTypeDistribution: z.boolean().default(false),
          veritasDistribution: z.boolean().default(false),
          timelineChart: z.boolean().default(false),
        })
        .default({}),
    })
    .optional(),
})

const defaultOptions: ExcelExportOptions = {
  includeHeaderRow: true,
  freezeHeaderRow: true,
  autoFitColumns: true,
  alternateRowColors: true,
  enableWrapping: true,
  headerStyle: {
    bold: true,
    backgroundColor: '#4F46E5',
    textColor: '#FFFFFF',
    fontSize: 11,
  },
  sortBy: [],
  filters: {},
  additionalSheets: {
    summary: false,
    tagBreakdown: false,
    sourceTypeDistribution: false,
    veritasDistribution: false,
    timelineChart: false,
  },
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)

  const parsed = presetSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid preset data',
      data: parsed.error.flatten(),
    })
  }

  const { name, description, columns, options } = parsed.data

  const [preset] = await db
    .insert(excelPresets)
    .values({
      userId: user.id,
      name,
      description: description || null,
      columns,
      options: options || defaultOptions,
    })
    .returning()

  return preset
})
