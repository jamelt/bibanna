import { Storage } from '@google-cloud/storage'
import * as pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import { db } from '~/server/database/client'
import { projectUploads } from '~/server/database/schema'
import { eq } from 'drizzle-orm'
import { ingestPDF, ingestDOCX, ingestPlainText } from '../companion/document-ingestion'

const storage = new Storage()
const bucketName = process.env.GCS_BUCKET_NAME || 'annobib-uploads'

export interface UploadResult {
  id: string
  filename: string
  contentType: string
  size: number
  url: string
  extractedText?: string
  metadata?: Record<string, unknown>
}

export interface UploadOptions {
  projectId: string
  userId: string
  maxSizeMB?: number
  allowedTypes?: string[]
}

const DEFAULT_ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
]

const DEFAULT_MAX_SIZE_MB = 50

export async function uploadFile(
  file: {
    data: Buffer
    filename: string
    type: string
  },
  options: UploadOptions,
): Promise<UploadResult> {
  const {
    projectId,
    userId,
    maxSizeMB = DEFAULT_MAX_SIZE_MB,
    allowedTypes = DEFAULT_ALLOWED_TYPES,
  } = options

  if (!allowedTypes.includes(file.type)) {
    throw createError({
      statusCode: 400,
      message: `File type ${file.type} is not allowed`,
    })
  }

  const sizeMB = file.data.length / (1024 * 1024)
  if (sizeMB > maxSizeMB) {
    throw createError({
      statusCode: 400,
      message: `File size exceeds maximum of ${maxSizeMB}MB`,
    })
  }

  const timestamp = Date.now()
  const safeFilename = file.filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  const gcsPath = `${userId}/${projectId}/${timestamp}-${safeFilename}`

  const bucket = storage.bucket(bucketName)
  const blob = bucket.file(gcsPath)

  await blob.save(file.data, {
    contentType: file.type,
    metadata: {
      projectId,
      userId,
      originalFilename: file.filename,
    },
  })

  let extractedText: string | undefined
  let metadata: Record<string, unknown> | undefined

  try {
    const extraction = await extractContent(file.data, file.type)
    extractedText = extraction.text
    metadata = extraction.metadata
  } catch (error) {
    console.error('Content extraction failed:', error)
  }

  const [upload] = await db
    .insert(projectUploads)
    .values({
      projectId,
      userId,
      filename: file.filename,
      contentType: file.type,
      size: file.data.length,
      gcsPath,
      extractedText,
      metadata,
      status: 'completed',
    })
    .returning()

  if (extractedText) {
    try {
      if (file.type === 'application/pdf') {
        await ingestPDF(file.data, file.filename, projectId, upload.id, userId)
      } else if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        await ingestDOCX(file.data, file.filename, projectId, upload.id, userId)
      } else {
        await ingestPlainText(extractedText, file.filename, projectId, upload.id, userId)
      }
    } catch (error) {
      console.error('Document ingestion failed:', error)
    }
  }

  const [signedUrl] = await blob.getSignedUrl({
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000,
  })

  return {
    id: upload.id,
    filename: file.filename,
    contentType: file.type,
    size: file.data.length,
    url: signedUrl,
    extractedText,
    metadata,
  }
}

export async function getUploadUrl(uploadId: string, userId: string): Promise<string> {
  const upload = await db.query.projectUploads.findFirst({
    where: eq(projectUploads.id, uploadId),
  })

  if (!upload || upload.userId !== userId) {
    throw createError({
      statusCode: 404,
      message: 'Upload not found',
    })
  }

  const bucket = storage.bucket(bucketName)
  const blob = bucket.file(upload.gcsPath)

  const [signedUrl] = await blob.getSignedUrl({
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000,
  })

  return signedUrl
}

export async function deleteUpload(uploadId: string, userId: string): Promise<void> {
  const upload = await db.query.projectUploads.findFirst({
    where: eq(projectUploads.id, uploadId),
  })

  if (!upload || upload.userId !== userId) {
    throw createError({
      statusCode: 404,
      message: 'Upload not found',
    })
  }

  const bucket = storage.bucket(bucketName)
  const blob = bucket.file(upload.gcsPath)

  await blob.delete().catch(() => {})
  await db.delete(projectUploads).where(eq(projectUploads.id, uploadId))
}

async function extractContent(
  buffer: Buffer,
  contentType: string,
): Promise<{
  text: string
  metadata?: Record<string, unknown>
}> {
  switch (contentType) {
    case 'application/pdf':
      return extractPdfContent(buffer)
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return extractDocxContent(buffer)
    case 'text/plain':
    case 'text/markdown':
      return { text: buffer.toString('utf-8') }
    default:
      return { text: '' }
  }
}

async function extractPdfContent(buffer: Buffer): Promise<{
  text: string
  metadata?: Record<string, unknown>
}> {
  const data = await pdfParse(buffer)

  return {
    text: data.text,
    metadata: {
      pages: data.numpages,
      info: data.info,
    },
  }
}

async function extractDocxContent(buffer: Buffer): Promise<{
  text: string
  metadata?: Record<string, unknown>
}> {
  const result = await mammoth.extractRawText({ buffer })

  return {
    text: result.value,
  }
}

export async function listProjectUploads(
  projectId: string,
  userId: string,
): Promise<
  Array<{
    id: string
    filename: string
    contentType: string
    size: number
    createdAt: Date
  }>
> {
  const uploads = await db.query.projectUploads.findMany({
    where: (pu, { eq, and }) => and(eq(pu.projectId, projectId), eq(pu.userId, userId)),
    orderBy: (pu, { desc }) => [desc(pu.createdAt)],
  })

  return uploads.map((u) => ({
    id: u.id,
    filename: u.filename,
    contentType: u.contentType,
    size: u.size,
    createdAt: u.createdAt,
  }))
}
