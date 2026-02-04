import { OpenAI } from 'openai'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import pdf from 'pdf-parse'
import mammoth from 'mammoth'
import { db } from '~/server/database/client'
import { documentChunks, entries, annotations } from '~/server/database/schema'
import { eq, and, sql } from 'drizzle-orm'
import type { Entry, Annotation } from '~/shared/types'

const openai = new OpenAI({
  apiKey: process.env.NUXT_OPENAI_API_KEY,
})

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ['\n\n', '\n', '. ', ', ', ' ', ''],
})

export interface ChunkMetadata {
  sourceType: 'entry' | 'annotation' | 'upload'
  sourceId: string
  entryId?: string
  title?: string
  authors?: string[]
  year?: number
  chunkIndex: number
  totalChunks: number
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 1536,
  })

  return response.data[0].embedding
}

export async function ingestEntry(entry: Entry, projectId: string): Promise<number> {
  let textContent = `Title: ${entry.title}\n`

  if (entry.authors?.length) {
    textContent += `Authors: ${entry.authors.map(a => `${a.firstName || ''} ${a.lastName}`.trim()).join(', ')}\n`
  }

  if (entry.year) {
    textContent += `Year: ${entry.year}\n`
  }

  if (entry.metadata?.abstract) {
    textContent += `\nAbstract:\n${entry.metadata.abstract}\n`
  }

  if (entry.metadata?.keywords?.length) {
    textContent += `Keywords: ${entry.metadata.keywords.join(', ')}\n`
  }

  const entryAnnotations = await db.query.annotations.findMany({
    where: eq(annotations.entryId, entry.id),
  })

  if (entryAnnotations.length > 0) {
    textContent += '\nAnnotations:\n'
    for (const annotation of entryAnnotations) {
      textContent += `- [${annotation.annotationType}] ${annotation.content}\n`
    }
  }

  const chunks = await textSplitter.splitText(textContent)

  let insertedCount = 0

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const embedding = await generateEmbedding(chunk)

    const metadata: ChunkMetadata = {
      sourceType: 'entry',
      sourceId: entry.id,
      entryId: entry.id,
      title: entry.title,
      authors: entry.authors?.map(a => `${a.firstName || ''} ${a.lastName}`.trim()),
      year: entry.year,
      chunkIndex: i,
      totalChunks: chunks.length,
    }

    await db.insert(documentChunks).values({
      projectId,
      content: chunk,
      embedding: sql`${JSON.stringify(embedding)}::vector`,
      metadata,
    }).onConflictDoNothing()

    insertedCount++
  }

  return insertedCount
}

export async function ingestAnnotation(annotation: Annotation, projectId: string): Promise<number> {
  const embedding = await generateEmbedding(annotation.content)

  const entry = await db.query.entries.findFirst({
    where: eq(entries.id, annotation.entryId),
  })

  const metadata: ChunkMetadata = {
    sourceType: 'annotation',
    sourceId: annotation.id,
    entryId: annotation.entryId,
    title: entry?.title,
    chunkIndex: 0,
    totalChunks: 1,
  }

  await db.insert(documentChunks).values({
    projectId,
    content: annotation.content,
    embedding: sql`${JSON.stringify(embedding)}::vector`,
    metadata,
  }).onConflictDoNothing()

  return 1
}

export async function ingestPDF(
  buffer: Buffer,
  filename: string,
  projectId: string,
  uploadId: string,
): Promise<number> {
  const data = await pdf(buffer)
  const text = data.text

  const chunks = await textSplitter.splitText(text)

  let insertedCount = 0

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const embedding = await generateEmbedding(chunk)

    const metadata: ChunkMetadata = {
      sourceType: 'upload',
      sourceId: uploadId,
      title: filename,
      chunkIndex: i,
      totalChunks: chunks.length,
    }

    await db.insert(documentChunks).values({
      projectId,
      content: chunk,
      embedding: sql`${JSON.stringify(embedding)}::vector`,
      metadata,
    })

    insertedCount++
  }

  return insertedCount
}

export async function ingestDOCX(
  buffer: Buffer,
  filename: string,
  projectId: string,
  uploadId: string,
): Promise<number> {
  const result = await mammoth.extractRawText({ buffer })
  const text = result.value

  const chunks = await textSplitter.splitText(text)

  let insertedCount = 0

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const embedding = await generateEmbedding(chunk)

    const metadata: ChunkMetadata = {
      sourceType: 'upload',
      sourceId: uploadId,
      title: filename,
      chunkIndex: i,
      totalChunks: chunks.length,
    }

    await db.insert(documentChunks).values({
      projectId,
      content: chunk,
      embedding: sql`${JSON.stringify(embedding)}::vector`,
      metadata,
    })

    insertedCount++
  }

  return insertedCount
}

export async function ingestPlainText(
  text: string,
  title: string,
  projectId: string,
  uploadId: string,
): Promise<number> {
  const chunks = await textSplitter.splitText(text)

  let insertedCount = 0

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const embedding = await generateEmbedding(chunk)

    const metadata: ChunkMetadata = {
      sourceType: 'upload',
      sourceId: uploadId,
      title,
      chunkIndex: i,
      totalChunks: chunks.length,
    }

    await db.insert(documentChunks).values({
      projectId,
      content: chunk,
      embedding: sql`${JSON.stringify(embedding)}::vector`,
      metadata,
    })

    insertedCount++
  }

  return insertedCount
}

export async function deleteChunksForSource(sourceId: string, projectId: string): Promise<number> {
  const result = await db
    .delete(documentChunks)
    .where(
      and(
        eq(documentChunks.projectId, projectId),
        sql`${documentChunks.metadata}->>'sourceId' = ${sourceId}`,
      ),
    )

  return 0
}
