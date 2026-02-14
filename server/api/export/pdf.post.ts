import { z } from 'zod'
import { db } from '~/server/database/client'
import { entries, entryTags, tags, annotations, entryProjects } from '~/server/database/schema'
import { generatePdf } from '~/server/services/export'
import { requireLightOrProTier } from '~/server/utils/auth'
import { eq, and, inArray } from 'drizzle-orm'
import { pdfExportOptionsSchema } from '~/shared/validation'
import type { Entry } from '~/shared/types'

const exportSchema = pdfExportOptionsSchema.extend({
  entryIds: z.array(z.string().uuid()).optional(),
  projectId: z.string().uuid().optional(),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  requireLightOrProTier(user)

  const body = await readBody(event)

  const parsed = exportSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid export options',
      data: parsed.error.flatten(),
    })
  }

  const { entryIds, projectId, ...options } = parsed.data

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

  const entryIdList = userEntries.map((e) => e.id)

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

  const enrichedEntries: Entry[] = userEntries.map(
    (e) =>
      ({
        ...e,
        tags: tagsByEntry[e.id] || [],
        annotations: annotationsByEntry[e.id] || [],
      }) as Entry,
  )

  const buffer = await generatePdf(enrichedEntries, options)

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `attachment; filename="bibliography-${Date.now()}.pdf"`)

  return buffer
})
