import { OpenAI } from 'openai'
import { db } from '~/server/database/client'
import { documentChunks, entries, annotations } from '~/server/database/schema'
import { eq, and, sql } from 'drizzle-orm'
import type { Entry, Annotation } from '~/shared/types'

let openaiClient: OpenAI | null = null
let textSplitterInstance: any = null

async function getOpenAI() {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.NUXT_OPENAI_API_KEY,
    })
  }
  return openaiClient
}

async function getTextSplitter() {
  if (!textSplitterInstance) {
    const { RecursiveCharacterTextSplitter } = await import('@langchain/textsplitters')
    textSplitterInstance = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
      separators: ['\n\n', '\n', '. ', ', ', ' ', ''],
    })
  }
  return textSplitterInstance
}

async function parsePDF(buffer: Buffer): Promise<string> {
  const pdfParse = (await import('pdf-parse')).default
  const result = await pdfParse(buffer)
  return result.text
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = await getOpenAI()
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 1536,
  })

  return response.data[0].embedding
}

export async function ingestEntry(
  entry: Entry,
  projectId: string,
  userId: string,
): Promise<number> {
  const splitter = await getTextSplitter()
  let textContent = `Title: ${entry.title}\n`

  if (entry.authors?.length) {
    textContent += `Authors: ${entry.authors.map((a) => `${a.firstName || ''} ${a.lastName}`.trim()).join(', ')}\n`
  }

  if (entry.year) {
    textContent += `Year: ${entry.year}\n`
  }

  if (entry.metadata?.abstract) {
    textContent += `\nAbstract:\n${entry.metadata.abstract}\n`
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

  const chunks = await splitter.splitText(textContent)

  let insertedCount = 0

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const embedding = await generateEmbedding(chunk)

    await db
      .insert(documentChunks)
      .values({
        projectId,
        userId,
        entryId: entry.id,
        content: chunk,
        embedding,
        chunkIndex: i,
        tokenCount: Math.ceil(chunk.length / 4),
        metadata: {
          sourceType: 'entry',
          title: entry.title,
          authors: entry.authors
            ?.map((a) => `${a.firstName || ''} ${a.lastName}`.trim())
            .join(', '),
        },
      })
      .onConflictDoNothing()

    insertedCount++
  }

  return insertedCount
}

export async function ingestAnnotation(
  annotation: Annotation,
  projectId: string,
  userId: string,
): Promise<number> {
  const embedding = await generateEmbedding(annotation.content)

  const entry = await db.query.entries.findFirst({
    where: eq(entries.id, annotation.entryId),
  })

  await db
    .insert(documentChunks)
    .values({
      projectId,
      userId,
      entryId: annotation.entryId,
      annotationId: annotation.id,
      content: annotation.content,
      embedding,
      chunkIndex: 0,
      tokenCount: Math.ceil(annotation.content.length / 4),
      metadata: {
        sourceType: 'annotation',
        title: entry?.title,
      },
    })
    .onConflictDoNothing()

  return 1
}

export async function ingestPDF(
  buffer: Buffer,
  filename: string,
  projectId: string,
  uploadId: string,
  userId: string,
): Promise<number> {
  const splitter = await getTextSplitter()
  const data = await parsePDF(buffer)

  const chunks = await splitter.splitText(data)

  let insertedCount = 0

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const embedding = await generateEmbedding(chunk)

    await db.insert(documentChunks).values({
      projectId,
      userId,
      uploadId,
      content: chunk,
      embedding,
      chunkIndex: i,
      tokenCount: Math.ceil(chunk.length / 4),
      metadata: {
        sourceType: 'upload',
        title: filename,
      },
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
  userId: string,
): Promise<number> {
  const splitter = await getTextSplitter()
  const text = await parseDocx(buffer)

  const chunks = await splitter.splitText(text)

  let insertedCount = 0

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const embedding = await generateEmbedding(chunk)

    await db.insert(documentChunks).values({
      projectId,
      userId,
      uploadId,
      content: chunk,
      embedding,
      chunkIndex: i,
      tokenCount: Math.ceil(chunk.length / 4),
      metadata: {
        sourceType: 'upload',
        title: filename,
      },
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
  userId: string,
): Promise<number> {
  const splitter = await getTextSplitter()
  const chunks = await splitter.splitText(text)

  let insertedCount = 0

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const embedding = await generateEmbedding(chunk)

    await db.insert(documentChunks).values({
      projectId,
      userId,
      uploadId,
      content: chunk,
      embedding,
      chunkIndex: i,
      tokenCount: Math.ceil(chunk.length / 4),
      metadata: {
        sourceType: 'upload',
        title,
      },
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
