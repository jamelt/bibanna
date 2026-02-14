import { OpenAI } from 'openai'
import * as pdfParse from 'pdf-parse'
import sharp from 'sharp'

const openai = new OpenAI({
  apiKey: process.env.NUXT_OPENAI_API_KEY,
})

export interface ImageAnalysisResult {
  description: string
  extractedText?: string
  bookInfo?: {
    title?: string
    authors?: string[]
    isbn?: string
    publisher?: string
  }
  confidence: number
}

export async function analyzeBookCover(imageBuffer: Buffer): Promise<ImageAnalysisResult> {
  const resizedImage = await sharp(imageBuffer)
    .resize(1024, 1024, { fit: 'inside' })
    .jpeg({ quality: 85 })
    .toBuffer()

  const base64Image = resizedImage.toString('base64')

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this book cover image and extract bibliographic information. Return a JSON object with:
{
  "description": "Brief description of the book cover",
  "extractedText": "Any visible text on the cover",
  "bookInfo": {
    "title": "Book title if visible",
    "authors": ["Author names if visible"],
    "isbn": "ISBN if visible",
    "publisher": "Publisher if visible"
  },
  "confidence": 0.0-1.0
}`,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
              detail: 'high',
            },
          },
        ],
      },
    ],
    max_tokens: 500,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    return {
      description: 'Unable to analyze image',
      confidence: 0,
    }
  }

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as ImageAnalysisResult
    }
  } catch {
    // Return partial result
  }

  return {
    description: content,
    confidence: 0.5,
  }
}

export async function extractTextFromImage(imageBuffer: Buffer): Promise<string> {
  const resizedImage = await sharp(imageBuffer)
    .resize(2048, 2048, { fit: 'inside' })
    .jpeg({ quality: 90 })
    .toBuffer()

  const base64Image = resizedImage.toString('base64')

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Extract all visible text from this image. Preserve the layout as much as possible.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
              detail: 'high',
            },
          },
        ],
      },
    ],
    max_tokens: 2000,
  })

  return completion.choices[0]?.message?.content || ''
}

export async function analyzePDFFirstPage(pdfBuffer: Buffer): Promise<{
  title?: string
  authors?: string[]
  abstract?: string
  keywords?: string[]
  doi?: string
}> {
  const pdfData = await pdfParse(pdfBuffer, { max: 2 })
  const text = pdfData.text

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Extract bibliographic metadata from this academic paper's first pages. Return JSON with:
{
  "title": "Paper title",
  "authors": ["Author 1", "Author 2"],
  "abstract": "Abstract text if found",
  "keywords": ["keyword1", "keyword2"],
  "doi": "DOI if found"
}`,
      },
      {
        role: 'user',
        content: text.substring(0, 4000),
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 1000,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    return {}
  }

  return JSON.parse(content)
}

export async function generateImageEmbedding(imageBuffer: Buffer): Promise<number[]> {
  const resizedImage = await sharp(imageBuffer)
    .resize(512, 512, { fit: 'inside' })
    .jpeg({ quality: 80 })
    .toBuffer()

  const base64Image = resizedImage.toString('base64')

  const description = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Describe this image in detail for embedding purposes. Include visual elements, colors, text, and context.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          },
        ],
      },
    ],
    max_tokens: 300,
  })

  const descriptionText = description.choices[0]?.message?.content || ''

  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: descriptionText,
  })

  return embedding.data[0].embedding
}

export async function detectISBNFromImage(imageBuffer: Buffer): Promise<string | null> {
  const resizedImage = await sharp(imageBuffer)
    .resize(1024, 1024, { fit: 'inside' })
    .sharpen()
    .jpeg({ quality: 90 })
    .toBuffer()

  const base64Image = resizedImage.toString('base64')

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Look for an ISBN barcode or ISBN number in this image. Return ONLY the ISBN number (10 or 13 digits) if found, or "NOT_FOUND" if no ISBN is visible.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
              detail: 'high',
            },
          },
        ],
      },
    ],
    max_tokens: 50,
  })

  const content = completion.choices[0]?.message?.content?.trim() || ''

  const isbnMatch = content.match(/(?:97[89])?\d{9}[\dXx]/)
  return isbnMatch ? isbnMatch[0].replace(/-/g, '') : null
}
