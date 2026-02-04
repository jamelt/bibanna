import { extractMetadataFromUrl } from '~/server/services/url/metadata-extractor'
import { enhanceMetadataWithAI } from '~/server/services/url/ai-fallback'
import { z } from 'zod'

const lookupSchema = z.object({
  url: z.string().url(),
  useAI: z.boolean().default(true),
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const body = await readBody(event)

  const parsed = lookupSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid URL',
      data: parsed.error.flatten(),
    })
  }

  const { url, useAI } = parsed.data

  let metadata = await extractMetadataFromUrl(url)

  if (useAI && metadata.confidence < 50) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Bibanna/1.0',
          'Accept': 'text/html',
        },
        signal: AbortSignal.timeout(5000),
      })

      if (response.ok) {
        const html = await response.text()
        metadata = await enhanceMetadataWithAI(url, metadata, html)
      }
    }
    catch (error) {
      metadata = await enhanceMetadataWithAI(url, metadata)
    }
  }

  return {
    title: metadata.title,
    authors: metadata.authors,
    year: metadata.year,
    entryType: metadata.entryType || 'website',
    metadata: {
      url: metadata.url || url,
      abstract: metadata.description,
      publisher: metadata.publisher,
      siteName: metadata.siteName,
      doi: metadata.doi,
      isbn: metadata.isbn,
      journal: metadata.journal,
      volume: metadata.volume,
      issue: metadata.issue,
      pages: metadata.pages,
      accessDate: new Date().toISOString().split('T')[0],
    },
    confidence: metadata.confidence,
    imageUrl: metadata.imageUrl,
  }
})
