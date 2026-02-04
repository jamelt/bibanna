import { OpenAI } from 'openai'
import type { ExtractedMetadata } from './metadata-extractor'

const openai = new OpenAI({
  apiKey: process.env.NUXT_OPENAI_API_KEY,
})

export async function enhanceMetadataWithAI(
  url: string,
  existingMetadata: ExtractedMetadata,
  htmlContent?: string,
): Promise<ExtractedMetadata> {
  const textContent = htmlContent
    ? extractTextFromHtml(htmlContent)
    : ''

  const prompt = `Analyze this webpage and extract bibliographic metadata.

URL: ${url}
Existing metadata: ${JSON.stringify(existingMetadata, null, 2)}
${textContent ? `\nPage content (first 2000 chars):\n${textContent.slice(0, 2000)}` : ''}

Return a JSON object with these fields (only include fields you can confidently determine):
{
  "title": "The title of the work",
  "authors": [{"firstName": "First", "lastName": "Last"}],
  "year": 2024,
  "entryType": "one of: book, journal_article, conference_paper, thesis, website, newspaper, magazine, video, podcast, report, chapter, patent, legal_case, other",
  "description": "A brief description or abstract",
  "publisher": "Publisher name",
  "doi": "DOI if available",
  "journal": "Journal name if applicable",
  "volume": "Volume number",
  "issue": "Issue number",
  "pages": "Page range"
}

Be conservative - only include fields you can extract with high confidence from the URL and content.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a metadata extraction assistant. Extract bibliographic information from web content. Return valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 500,
    })

    const content = response.choices[0]?.message?.content
    if (!content) return existingMetadata

    const aiMetadata = JSON.parse(content)

    const enhanced: ExtractedMetadata = { ...existingMetadata }

    if (aiMetadata.title && !enhanced.title) enhanced.title = aiMetadata.title
    if (aiMetadata.authors?.length && !enhanced.authors?.length) enhanced.authors = aiMetadata.authors
    if (aiMetadata.year && !enhanced.year) enhanced.year = aiMetadata.year
    if (aiMetadata.entryType && !enhanced.entryType) enhanced.entryType = aiMetadata.entryType
    if (aiMetadata.description && !enhanced.description) enhanced.description = aiMetadata.description
    if (aiMetadata.publisher && !enhanced.publisher) enhanced.publisher = aiMetadata.publisher
    if (aiMetadata.doi && !enhanced.doi) enhanced.doi = aiMetadata.doi
    if (aiMetadata.journal && !enhanced.journal) enhanced.journal = aiMetadata.journal
    if (aiMetadata.volume && !enhanced.volume) enhanced.volume = aiMetadata.volume
    if (aiMetadata.issue && !enhanced.issue) enhanced.issue = aiMetadata.issue
    if (aiMetadata.pages && !enhanced.pages) enhanced.pages = aiMetadata.pages

    let confidence = enhanced.confidence
    const aiFields = ['title', 'authors', 'year', 'entryType', 'description', 'publisher', 'doi', 'journal']
    const addedFields = aiFields.filter(f => aiMetadata[f] && !(existingMetadata as any)[f])
    confidence += addedFields.length * 5

    enhanced.confidence = Math.min(confidence, 95)

    return enhanced
  }
  catch (error) {
    console.error('AI metadata enhancement failed:', error)
    return existingMetadata
  }
}

function extractTextFromHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
