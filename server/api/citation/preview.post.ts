import { previewStyleWithEntry, formatSingleEntryWithSubsequent, getStyleById } from '~/server/services/citation'
import { z } from 'zod'
import type { Entry, Author } from '~/shared/types'

const previewSchema = z.object({
  styleId: z.string().optional(),
  cslXml: z.string().optional(),
  sampleEntry: z.object({
    title: z.string(),
    authors: z.array(z.object({
      firstName: z.string().optional(),
      lastName: z.string(),
    })).optional(),
    year: z.number().optional(),
    entryType: z.string(),
    metadata: z.record(z.any()).optional(),
  }).optional(),
})

const SAMPLE_ENTRIES: Entry[] = [
  {
    id: 'sample-book',
    userId: 'system',
    title: 'The Structure of Scientific Revolutions',
    authors: [
      { firstName: 'Thomas S.', lastName: 'Kuhn' },
    ],
    year: 1962,
    entryType: 'book',
    metadata: {
      publisher: 'University of Chicago Press',
      publisherLocation: 'Chicago',
      edition: '4th',
    },
    isFavorite: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'sample-article',
    userId: 'system',
    title: 'A Neural Probabilistic Language Model',
    authors: [
      { firstName: 'Yoshua', lastName: 'Bengio' },
      { firstName: 'Réjean', lastName: 'Ducharme' },
      { firstName: 'Pascal', lastName: 'Vincent' },
      { firstName: 'Christian', lastName: 'Jauvin' },
    ],
    year: 2003,
    entryType: 'journal_article',
    metadata: {
      journal: 'Journal of Machine Learning Research',
      volume: '3',
      pages: '1137-1155',
    },
    isFavorite: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'sample-website',
    userId: 'system',
    title: 'World Health Organization: COVID-19 Dashboard',
    authors: [
      { lastName: 'World Health Organization' },
    ],
    year: 2024,
    entryType: 'website',
    metadata: {
      url: 'https://covid19.who.int/',
      accessDate: '2024-01-15',
    },
    isFavorite: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const parsed = previewSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid preview request',
      data: parsed.error.flatten(),
    })
  }

  const { styleId, cslXml, sampleEntry } = parsed.data

  if (!styleId && !cslXml) {
    throw createError({
      statusCode: 400,
      message: 'Either styleId or cslXml must be provided',
    })
  }

  const entryToFormat = sampleEntry
    ? {
        id: 'preview',
        userId: 'system',
        title: sampleEntry.title,
        authors: sampleEntry.authors as Author[],
        year: sampleEntry.year,
        entryType: sampleEntry.entryType as any,
        metadata: sampleEntry.metadata,
        isFavorite: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Entry
    : SAMPLE_ENTRIES[0]

  if (cslXml) {
    const result = await previewStyleWithEntry(entryToFormat, cslXml)
    return {
      entry: entryToFormat,
      formatted: result,
    }
  }

  const style = getStyleById(styleId!)

  const allSamples = await Promise.all(
    SAMPLE_ENTRIES.map(async (entry) => {
      const formatted = await formatSingleEntryWithSubsequent(entry, styleId!)
      return {
        type: entry.entryType,
        title: entry.title,
        bibliography: formatted.bibliography,
        inText: formatted.inText,
        subsequentNote: formatted.subsequentNote,
      }
    }),
  )

  return {
    styleId,
    styleName: style?.name,
    category: style?.category,
    samples: allSamples,
  }
})
