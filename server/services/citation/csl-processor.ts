import CSL from 'citeproc'
import type { Entry, Author } from '~/shared/types'

export interface CitationItem {
  id: string
  type: string
  title: string
  author?: Array<{ family: string; given: string }>
  issued?: { 'date-parts': number[][] }
  publisher?: string
  'publisher-place'?: string
  URL?: string
  accessed?: { 'date-parts': number[][] }
  'container-title'?: string
  volume?: string
  issue?: string
  page?: string
  DOI?: string
  ISBN?: string
  ISSN?: string
  abstract?: string
  edition?: string
  editor?: Array<{ family: string; given: string }>
  'collection-title'?: string
  'number-of-pages'?: string
}

const ENTRY_TYPE_TO_CSL: Record<string, string> = {
  book: 'book',
  journal_article: 'article-journal',
  conference_paper: 'paper-conference',
  thesis: 'thesis',
  website: 'webpage',
  newspaper: 'article-newspaper',
  magazine: 'article-magazine',
  video: 'motion_picture',
  podcast: 'song',
  report: 'report',
  chapter: 'chapter',
  patent: 'patent',
  legal_case: 'legal_case',
  other: 'document',
}

export function entryToCSLItem(entry: Entry): CitationItem {
  const item: CitationItem = {
    id: entry.id,
    type: ENTRY_TYPE_TO_CSL[entry.entryType] || 'document',
    title: entry.title,
  }

  if (entry.authors && entry.authors.length > 0) {
    item.author = entry.authors.map(a => ({
      family: a.lastName,
      given: a.firstName || '',
    }))
  }

  if (entry.year) {
    item.issued = {
      'date-parts': [[entry.year]],
    }
  }

  if (entry.metadata) {
    const meta = entry.metadata

    if (meta.publisher) item.publisher = meta.publisher
    if (meta.publisherLocation) item['publisher-place'] = meta.publisherLocation
    if (meta.url) item.URL = meta.url
    if (meta.journal) item['container-title'] = meta.journal
    if (meta.volume) item.volume = meta.volume
    if (meta.issue) item.issue = meta.issue
    if (meta.pages) item.page = meta.pages
    if (meta.doi) item.DOI = meta.doi
    if (meta.isbn) item.ISBN = meta.isbn
    if (meta.issn) item.ISSN = meta.issn
    if (meta.abstract) item.abstract = meta.abstract
    if (meta.edition) item.edition = meta.edition
    if (meta.series) item['collection-title'] = meta.series
    if (meta.pageCount) item['number-of-pages'] = meta.pageCount.toString()

    if (meta.accessDate) {
      const accessDate = new Date(meta.accessDate)
      item.accessed = {
        'date-parts': [[
          accessDate.getFullYear(),
          accessDate.getMonth() + 1,
          accessDate.getDate(),
        ]],
      }
    }

    if (meta.editors && meta.editors.length > 0) {
      item.editor = meta.editors.map(e => ({
        family: e.lastName,
        given: e.firstName || '',
      }))
    }
  }

  return item
}

export function createCitationProcessor(
  styleXml: string,
  localeXml: string,
  items: CitationItem[],
): CSL.Engine {
  const itemsById: Record<string, CitationItem> = {}
  for (const item of items) {
    itemsById[item.id] = item
  }

  const sys: CSL.SystemOptions = {
    retrieveLocale: () => localeXml,
    retrieveItem: (id: string) => itemsById[id],
  }

  const engine = new CSL.Engine(sys, styleXml)
  return engine
}

export function formatBibliography(
  engine: CSL.Engine,
  itemIds: string[],
): string[] {
  engine.updateItems(itemIds)
  const [params, entries] = engine.makeBibliography()

  if (!entries) {
    return []
  }

  return entries.map((entry: string) => entry.trim())
}

export function formatCitation(
  engine: CSL.Engine,
  itemIds: string[],
): string {
  const citation = {
    citationItems: itemIds.map(id => ({ id })),
    properties: { noteIndex: 0 },
  }

  const result = engine.processCitationCluster(citation, [], [])

  if (result && result[1] && result[1][0]) {
    return result[1][0][1]
  }

  return ''
}

export function formatInTextCitation(
  engine: CSL.Engine,
  itemId: string,
): string {
  return formatCitation(engine, [itemId])
}
