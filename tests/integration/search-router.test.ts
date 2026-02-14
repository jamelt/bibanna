import { describe, it, expect } from 'vitest'
import { crossrefAdapter } from '~/server/services/search/sources/crossref'
import { openLibraryAdapter } from '~/server/services/search/sources/openlibrary'
import { pubmedAdapter } from '~/server/services/search/sources/pubmed'
import { openAlexAdapter } from '~/server/services/search/sources/openalex'
import { semanticScholarAdapter } from '~/server/services/search/sources/semantic-scholar'
import { googleBooksAdapter } from '~/server/services/search/sources/google-books'
import { locAdapter } from '~/server/services/search/sources/loc'
import type { FieldQualifier, SourceAdapter } from '~/server/services/search/types'

const allAdapters: SourceAdapter[] = [
  crossrefAdapter,
  openLibraryAdapter,
  pubmedAdapter,
  openAlexAdapter,
  semanticScholarAdapter,
  googleBooksAdapter,
  locAdapter,
]

function selectAdapters(field: FieldQualifier): SourceAdapter[] {
  return allAdapters.filter((adapter) => adapter.supportedFields.includes(field))
}

describe('Search Router - Adapter Selection', () => {
  it('selects all adapters for "any" field', () => {
    const adapters = selectAdapters('any')
    expect(adapters.length).toBe(7)
  })

  it('selects correct adapters for "title" field', () => {
    const adapters = selectAdapters('title')
    const names = adapters.map((a) => a.name)
    expect(names).toContain('crossref')
    expect(names).toContain('openlibrary')
    expect(names).toContain('pubmed')
    expect(names).toContain('openalex')
    expect(names).toContain('semantic_scholar')
    expect(names).toContain('google_books')
    expect(names).toContain('loc')
  })

  it('selects correct adapters for "author" field', () => {
    const adapters = selectAdapters('author')
    const names = adapters.map((a) => a.name)
    expect(names).toContain('crossref')
    expect(names).toContain('openlibrary')
    expect(names).toContain('pubmed')
    expect(names).toContain('openalex')
    expect(names).toContain('google_books')
    expect(names).toContain('loc')
    expect(names).not.toContain('semantic_scholar')
  })

  it('selects correct adapters for "publisher" field', () => {
    const adapters = selectAdapters('publisher')
    const names = adapters.map((a) => a.name)
    expect(names).toContain('crossref')
    expect(names).toContain('openalex')
    expect(names).toContain('google_books')
    expect(names).not.toContain('pubmed')
    expect(names).not.toContain('openlibrary')
    expect(names).not.toContain('semantic_scholar')
    expect(names).not.toContain('loc')
  })

  it('selects correct adapters for "journal" field', () => {
    const adapters = selectAdapters('journal')
    const names = adapters.map((a) => a.name)
    expect(names).toContain('crossref')
    expect(names).toContain('pubmed')
    expect(names).toContain('openalex')
    expect(names).not.toContain('openlibrary')
    expect(names).not.toContain('google_books')
  })

  it('selects correct adapters for "subject" field', () => {
    const adapters = selectAdapters('subject')
    const names = adapters.map((a) => a.name)
    expect(names).toContain('openlibrary')
    expect(names).toContain('pubmed')
    expect(names).toContain('openalex')
    expect(names).toContain('semantic_scholar')
    expect(names).toContain('google_books')
    expect(names).toContain('loc')
    expect(names).not.toContain('crossref')
  })

  it('selects correct adapters for "year" field', () => {
    const adapters = selectAdapters('year')
    const names = adapters.map((a) => a.name)
    expect(names).toContain('crossref')
    expect(names).toContain('pubmed')
    expect(names).toContain('openalex')
    expect(names).toContain('semantic_scholar')
    expect(names).toContain('loc')
    expect(names).not.toContain('openlibrary')
    expect(names).not.toContain('google_books')
  })
})

describe('Source Adapter - Supported Fields Declaration', () => {
  it('every adapter supports the "any" field', () => {
    for (const adapter of allAdapters) {
      expect(adapter.supportedFields).toContain('any')
    }
  })

  it('every adapter supports at least 2 fields', () => {
    for (const adapter of allAdapters) {
      expect(adapter.supportedFields.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('every adapter has a non-empty name', () => {
    for (const adapter of allAdapters) {
      expect(adapter.name.length).toBeGreaterThan(0)
    }
  })

  it('all adapter names are unique', () => {
    const names = allAdapters.map((a) => a.name)
    expect(new Set(names).size).toBe(names.length)
  })
})
