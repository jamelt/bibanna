import { parse as parseHTML } from 'node-html-parser'
import type { EntryType, Author } from '~/shared/types'

export interface ExtractedMetadata {
  title?: string
  authors?: Author[]
  year?: number
  entryType?: EntryType
  description?: string
  siteName?: string
  url?: string
  imageUrl?: string
  publishedDate?: string
  modifiedDate?: string
  publisher?: string
  doi?: string
  isbn?: string
  journal?: string
  volume?: string
  issue?: string
  pages?: string
  confidence: number
}

export async function extractMetadataFromUrl(url: string): Promise<ExtractedMetadata> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AnnoBib/1.0 (Academic Bibliography Tool)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const html = await response.text()
    const root = parseHTML(html)

    let metadata: ExtractedMetadata = { confidence: 0, url }

    const schemaOrg = extractSchemaOrg(root, html)
    if (schemaOrg) {
      metadata = mergeMetadata(metadata, schemaOrg)
    }

    const openGraph = extractOpenGraph(root)
    metadata = mergeMetadata(metadata, openGraph)

    const twitter = extractTwitterCards(root)
    metadata = mergeMetadata(metadata, twitter)

    const htmlMeta = extractHtmlMeta(root)
    metadata = mergeMetadata(metadata, htmlMeta)

    const siteSpecific = extractSiteSpecific(url, root, html)
    if (siteSpecific) {
      metadata = mergeMetadata(metadata, siteSpecific)
    }

    metadata.entryType = inferEntryType(url, metadata)
    metadata.confidence = calculateConfidence(metadata)

    return metadata
  } catch (error: any) {
    console.error('URL extraction failed:', error.message)
    return {
      url,
      confidence: 0,
    }
  }
}

function extractSchemaOrg(root: any, html: string): Partial<ExtractedMetadata> | null {
  const ldJsonScripts = root.querySelectorAll('script[type="application/ld+json"]')
  const metadata: Partial<ExtractedMetadata> = {}

  for (const script of ldJsonScripts) {
    try {
      const data = JSON.parse(script.textContent)
      const items = Array.isArray(data) ? data : [data]

      for (const item of items) {
        const type = item['@type']

        if (type === 'Article' || type === 'NewsArticle' || type === 'ScholarlyArticle') {
          metadata.title = metadata.title || item.headline || item.name
          metadata.description = metadata.description || item.description
          metadata.publishedDate = metadata.publishedDate || item.datePublished
          metadata.modifiedDate = metadata.modifiedDate || item.dateModified

          if (item.author) {
            metadata.authors = parseSchemaAuthors(item.author)
          }

          if (item.publisher?.name) {
            metadata.publisher = item.publisher.name
          }

          if (item.isPartOf?.name) {
            metadata.journal = item.isPartOf.name
          }
        }

        if (type === 'Book') {
          metadata.title = metadata.title || item.name
          metadata.isbn = item.isbn

          if (item.author) {
            metadata.authors = parseSchemaAuthors(item.author)
          }

          if (item.publisher?.name) {
            metadata.publisher = item.publisher.name
          }
        }

        if (type === 'WebPage' || type === 'WebSite') {
          metadata.title = metadata.title || item.name || item.headline
          metadata.description = metadata.description || item.description
          metadata.siteName = metadata.siteName || item.name
        }
      }
    } catch {
      /* ignored */
    }
  }

  return Object.keys(metadata).length > 0 ? metadata : null
}

function parseSchemaAuthors(author: any): Author[] {
  const authors: Author[] = []
  const authorList = Array.isArray(author) ? author : [author]

  for (const a of authorList) {
    if (typeof a === 'string') {
      authors.push(parseAuthorName(a))
    } else if (a.name) {
      authors.push(parseAuthorName(a.name))
    }
  }

  return authors
}

function parseAuthorName(name: string): Author {
  const parts = name.trim().split(/\s+/)

  if (parts.length === 1) {
    return { lastName: parts[0] }
  }

  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1],
  }
}

function extractOpenGraph(root: any): Partial<ExtractedMetadata> {
  const metadata: Partial<ExtractedMetadata> = {}

  const getMeta = (property: string): string | undefined => {
    const el =
      root.querySelector(`meta[property="${property}"]`) ||
      root.querySelector(`meta[name="${property}"]`)
    return el?.getAttribute('content')
  }

  metadata.title = getMeta('og:title')
  metadata.description = getMeta('og:description')
  metadata.siteName = getMeta('og:site_name')
  metadata.imageUrl = getMeta('og:image')
  metadata.url = getMeta('og:url')
  metadata.publishedDate = getMeta('article:published_time')
  metadata.modifiedDate = getMeta('article:modified_time')

  const ogType = getMeta('og:type')
  if (ogType === 'article') {
    const authorTag = getMeta('article:author')
    if (authorTag) {
      metadata.authors = [parseAuthorName(authorTag)]
    }
  }

  return metadata
}

function extractTwitterCards(root: any): Partial<ExtractedMetadata> {
  const metadata: Partial<ExtractedMetadata> = {}

  const getMeta = (name: string): string | undefined => {
    const el =
      root.querySelector(`meta[name="${name}"]`) || root.querySelector(`meta[property="${name}"]`)
    return el?.getAttribute('content')
  }

  metadata.title = metadata.title || getMeta('twitter:title')
  metadata.description = metadata.description || getMeta('twitter:description')
  metadata.imageUrl = metadata.imageUrl || getMeta('twitter:image')

  return metadata
}

function extractHtmlMeta(root: any): Partial<ExtractedMetadata> {
  const metadata: Partial<ExtractedMetadata> = {}

  const getMeta = (name: string): string | undefined => {
    const el = root.querySelector(`meta[name="${name}"]`)
    return el?.getAttribute('content')
  }

  metadata.title = metadata.title || root.querySelector('title')?.textContent?.trim()
  metadata.description = metadata.description || getMeta('description')
  metadata.authors =
    metadata.authors || (getMeta('author') ? [parseAuthorName(getMeta('author')!)] : undefined)
  metadata.publishedDate = metadata.publishedDate || getMeta('date')
  metadata.doi = getMeta('citation_doi') || getMeta('dc.identifier')

  const citationTitle = getMeta('citation_title')
  const citationAuthors = root.querySelectorAll('meta[name="citation_author"]')
  const citationJournal = getMeta('citation_journal_title')
  const citationVolume = getMeta('citation_volume')
  const citationIssue = getMeta('citation_issue')
  const citationPages = getMeta('citation_firstpage')
  const citationLastPage = getMeta('citation_lastpage')
  const citationDate = getMeta('citation_publication_date') || getMeta('citation_date')

  if (citationTitle) {
    metadata.title = citationTitle
  }

  if (citationAuthors.length > 0) {
    metadata.authors = citationAuthors.map((el: any) => parseAuthorName(el.getAttribute('content')))
  }

  if (citationJournal) metadata.journal = citationJournal
  if (citationVolume) metadata.volume = citationVolume
  if (citationIssue) metadata.issue = citationIssue
  if (citationPages) {
    metadata.pages = citationLastPage ? `${citationPages}-${citationLastPage}` : citationPages
  }
  if (citationDate) metadata.publishedDate = citationDate

  return metadata
}

function extractSiteSpecific(
  url: string,
  root: any,
  html: string,
): Partial<ExtractedMetadata> | null {
  const hostname = new URL(url).hostname.toLowerCase()

  if (hostname.includes('arxiv.org')) {
    return extractArxiv(root)
  }

  if (hostname.includes('doi.org') || hostname.includes('dx.doi.org')) {
    return { doi: url.split('/').slice(-2).join('/') }
  }

  if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
    return extractYouTube(root)
  }

  if (
    hostname.includes('nytimes.com') ||
    hostname.includes('washingtonpost.com') ||
    hostname.includes('theguardian.com') ||
    hostname.includes('bbc.')
  ) {
    return { entryType: 'newspaper_article' }
  }

  if (hostname.includes('medium.com') || hostname.includes('substack.com')) {
    return { entryType: 'magazine_article' }
  }

  return null
}

function extractArxiv(root: any): Partial<ExtractedMetadata> {
  const metadata: Partial<ExtractedMetadata> = {
    entryType: 'report',
    publisher: 'arXiv',
  }

  const abstractEl = root.querySelector('.abstract')
  if (abstractEl) {
    metadata.description = abstractEl.textContent?.replace('Abstract:', '').trim()
  }

  return metadata
}

function extractYouTube(root: any): Partial<ExtractedMetadata> {
  return {
    entryType: 'video',
    siteName: 'YouTube',
  }
}

function inferEntryType(url: string, metadata: Partial<ExtractedMetadata>): EntryType {
  const hostname = new URL(url).hostname.toLowerCase()

  if (metadata.doi || metadata.journal) return 'journal_article'

  if (hostname.includes('youtube.com') || hostname.includes('vimeo.com')) return 'video'
  if (hostname.includes('podcast') || hostname.includes('spotify.com/episode')) return 'podcast'
  if (hostname.includes('arxiv.org') || hostname.includes('ssrn.com')) return 'report'

  if (
    hostname.includes('nytimes.com') ||
    hostname.includes('washingtonpost.com') ||
    hostname.includes('bbc.') ||
    hostname.includes('cnn.com') ||
    hostname.includes('reuters.com') ||
    hostname.includes('apnews.com')
  ) {
    return 'newspaper_article'
  }

  if (
    hostname.includes('medium.com') ||
    hostname.includes('forbes.com') ||
    hostname.includes('wired.com') ||
    hostname.includes('techcrunch.com')
  ) {
    return 'magazine_article'
  }

  return 'website'
}

function mergeMetadata(
  base: ExtractedMetadata,
  additional: Partial<ExtractedMetadata>,
): ExtractedMetadata {
  const result = { ...base }

  for (const [key, value] of Object.entries(additional)) {
    if (value !== undefined && value !== null && value !== '') {
      if (!(result as any)[key]) {
        ;(result as any)[key] = value
      }
    }
  }

  if (result.publishedDate && !result.year) {
    const match = result.publishedDate.match(/(\d{4})/)
    if (match) {
      result.year = parseInt(match[1])
    }
  }

  return result
}

function calculateConfidence(metadata: ExtractedMetadata): number {
  let score = 0

  if (metadata.title) score += 25
  if (metadata.authors?.length) score += 20
  if (metadata.year || metadata.publishedDate) score += 15
  if (metadata.description) score += 10
  if (metadata.publisher || metadata.siteName) score += 10
  if (metadata.doi) score += 15
  if (metadata.journal) score += 10
  if (metadata.isbn) score += 10

  return Math.min(score, 100)
}
