import type { Entry } from '~/shared/types'
import {
  entryToCSLItem,
  createCitationProcessor,
  formatBibliography,
  formatInTextCitation,
  formatSubsequentCitation,
  type CitationItem,
} from './csl-processor'
import {
  fetchStyleXml,
  getDefaultStyles,
  getStyleById,
  getEnUsLocale,
  type DefaultStyle,
} from './default-styles'

export interface FormattedCitation {
  entryId: string
  bibliography: string
  inText: string
}

export interface BibliographyResult {
  styleId: string
  styleName: string
  entries: FormattedCitation[]
  fullBibliography: string
}

export async function formatEntriesWithStyle(
  entries: Entry[],
  styleId: string,
): Promise<BibliographyResult> {
  const style = getStyleById(styleId)
  if (!style) {
    throw new Error(`Unknown citation style: ${styleId}`)
  }

  const styleXml = await fetchStyleXml(styleId)
  const localeXml = await getEnUsLocale()
  const cslItems = entries.map(entryToCSLItem)
  const engine = await createCitationProcessor(styleXml, localeXml, cslItems)

  const itemIds = cslItems.map((item) => item.id)
  const bibliographies = formatBibliography(engine, itemIds)

  const formattedEntries: FormattedCitation[] = entries.map((entry, index) => ({
    entryId: entry.id,
    bibliography: bibliographies[index] || '',
    inText: formatInTextCitation(engine, entry.id),
  }))

  const fullBibliography = bibliographies.join('\n')

  return {
    styleId,
    styleName: style.name,
    entries: formattedEntries,
    fullBibliography,
  }
}

export async function formatSingleEntry(entry: Entry, styleId: string): Promise<FormattedCitation> {
  const result = await formatEntriesWithStyle([entry], styleId)
  return result.entries[0]
}

export interface FormattedCitationWithSubsequent extends FormattedCitation {
  subsequentNote?: string
}

export async function formatSingleEntryWithSubsequent(
  entry: Entry,
  styleId: string,
): Promise<FormattedCitationWithSubsequent> {
  const style = getStyleById(styleId)
  if (!style) {
    throw new Error(`Unknown citation style: ${styleId}`)
  }

  const styleXml = await fetchStyleXml(styleId)
  const localeXml = await getEnUsLocale()
  const cslItem = entryToCSLItem(entry)
  const engine = await createCitationProcessor(styleXml, localeXml, [cslItem])

  const [bibliography] = formatBibliography(engine, [entry.id])
  const inText = formatInTextCitation(engine, entry.id)

  let subsequentNote: string | undefined
  if (style.category === 'note') {
    const subsequentEngine = await createCitationProcessor(styleXml, localeXml, [cslItem])
    subsequentEngine.updateItems([entry.id])
    subsequentNote = formatSubsequentCitation(subsequentEngine, entry.id)
  }

  return {
    entryId: entry.id,
    bibliography: bibliography || '',
    inText,
    subsequentNote,
  }
}

export async function previewStyleWithEntry(
  entry: Entry,
  styleXml: string,
): Promise<FormattedCitation> {
  const localeXml = await getEnUsLocale()
  const cslItem = entryToCSLItem(entry)
  const engine = await createCitationProcessor(styleXml, localeXml, [cslItem])

  const [bibliography] = formatBibliography(engine, [entry.id])
  const inText = formatInTextCitation(engine, entry.id)

  return {
    entryId: entry.id,
    bibliography: bibliography || '',
    inText,
  }
}

export async function formatWithCustomStyle(
  entries: Entry[],
  styleXml: string,
  styleName: string,
): Promise<BibliographyResult> {
  const localeXml = await getEnUsLocale()
  const cslItems = entries.map(entryToCSLItem)
  const engine = await createCitationProcessor(styleXml, localeXml, cslItems)

  const itemIds = cslItems.map((item) => item.id)
  const bibliographies = formatBibliography(engine, itemIds)

  const formattedEntries: FormattedCitation[] = entries.map((entry, index) => ({
    entryId: entry.id,
    bibliography: bibliographies[index] || '',
    inText: formatInTextCitation(engine, entry.id),
  }))

  return {
    styleId: 'custom',
    styleName,
    entries: formattedEntries,
    fullBibliography: bibliographies.join('\n'),
  }
}

export {
  getDefaultStyles,
  getStyleById,
  getStylesByField,
  getStylesByCategory,
  type DefaultStyle,
} from './default-styles'

export { entryToCSLItem, type CitationItem } from './csl-processor'
