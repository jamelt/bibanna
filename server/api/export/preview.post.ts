import { z } from 'zod'
import { db } from '~/server/database/client'
import { entries, entryTags, tags, annotations, entryProjects } from '~/server/database/schema'
import { generateBibliographyHtml, sortEntries } from '~/server/services/export'
import { eq, and, inArray } from 'drizzle-orm'
import { pdfExportOptionsSchema } from '~/shared/validation'
import type { Entry } from '~/shared/types'
import type { PdfExportOptions } from '~/server/services/export'

const previewSchema = pdfExportOptionsSchema.extend({
  entryIds: z.array(z.string().uuid()).optional(),
  projectId: z.string().uuid().optional(),
  maxEntries: z.number().int().min(1).max(20).optional().default(5),
})

const defaultOptions: PdfExportOptions = {
  paperSize: 'letter',
  margins: { top: 1, right: 1, bottom: 1, left: 1 },
  font: 'Times New Roman',
  fontSize: 12,
  lineSpacing: 'double',
  includeAnnotations: false,
  annotationStyle: 'paragraph',
  includeTitlePage: false,
  title: 'Bibliography',
  pageNumbers: true,
  sortBy: 'author',
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)

  const parsed = previewSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid preview options',
      data: parsed.error.flatten(),
    })
  }

  const { entryIds, projectId, maxEntries, ...options } = parsed.data

  let userEntries

  if (projectId) {
    const projectEntryRows = await db
      .select({ entryId: entryProjects.entryId })
      .from(entryProjects)
      .where(eq(entryProjects.projectId, projectId))

    const projectEntryIds = projectEntryRows.map((r) => r.entryId)
    if (projectEntryIds.length === 0) {
      userEntries = []
    } else {
      userEntries = await db.query.entries.findMany({
        where: and(eq(entries.userId, user.id), inArray(entries.id, projectEntryIds)),
      })
    }
  } else {
    userEntries = await db.query.entries.findMany({
      where: eq(entries.userId, user.id),
    })
  }

  if (entryIds && entryIds.length > 0) {
    userEntries = userEntries.filter((e) => entryIds.includes(e.id))
  }

  const opts: PdfExportOptions = { ...defaultOptions, ...options }
  const sorted = sortEntries(userEntries as Entry[], opts.sortBy)
  const limited = sorted.slice(0, maxEntries)
  const totalCount = sorted.length

  const entryIdList = limited.map((e) => e.id)

  const [entryTagsData, entryAnnotationsData] = await Promise.all([
    entryIdList.length > 0
      ? db
          .select({
            entryId: entryTags.entryId,
            tagId: tags.id,
            tagName: tags.name,
            tagColor: tags.color,
          })
          .from(entryTags)
          .innerJoin(tags, eq(entryTags.tagId, tags.id))
          .where(inArray(entryTags.entryId, entryIdList))
      : [],
    entryIdList.length > 0
      ? db.query.annotations.findMany({
          where: inArray(annotations.entryId, entryIdList),
        })
      : [],
  ])

  const tagsByEntry = entryTagsData.reduce(
    (acc, tag) => {
      if (tag.entryId === undefined) return acc
      const arr = acc[tag.entryId] ?? []
      arr.push({
        id: tag.tagId,
        name: tag.tagName,
        color: tag.tagColor || '#6B7280',
      })
      acc[tag.entryId] = arr
      return acc
    },
    {} as Record<string, Array<{ id: string; name: string; color: string }>>,
  )

  type Annotation = (typeof entryAnnotationsData)[number]
  const annotationsByEntry = entryAnnotationsData.reduce(
    (acc, ann) => {
      if (ann.entryId === undefined) return acc
      const arr = acc[ann.entryId] ?? []
      arr.push(ann)
      acc[ann.entryId] = arr
      return acc
    },
    {} as Record<string, Annotation[]>,
  )

  const enrichedEntries: Entry[] = limited.map(
    (e) =>
      ({
        ...e,
        tags: tagsByEntry[e.id] || [],
        annotations: annotationsByEntry[e.id] || [],
      }) as Entry,
  )

  const html = await generateBibliographyHtml(enrichedEntries, opts)

  return {
    html,
    totalEntries: totalCount,
    previewedEntries: enrichedEntries.length,
  }
})
