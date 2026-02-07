import { describe, it, expect } from 'vitest'
import { rankAndDedupe, titleSimilarity } from '~/server/services/search/ranker'
import type { EntrySuggestion } from '~/server/services/search/types'

function makeSuggestion(overrides: Partial<EntrySuggestion> = {}): EntrySuggestion {
  return {
    id: `test-${Math.random().toString(36).slice(2)}`,
    source: 'crossref',
    title: 'Test Title',
    authors: [{ firstName: 'John', lastName: 'Doe' }],
    year: 2024,
    entryType: 'journal_article',
    metadata: {},
    ...overrides,
  }
}

describe('titleSimilarity', () => {
  it('returns 1.0 for exact match', () => {
    expect(titleSimilarity('the power broker', 'The Power Broker')).toBe(1.0)
  })

  it('returns 0.9 for prefix match', () => {
    expect(titleSimilarity('the power', 'The Power Broker: Robert Moses')).toBe(0.9)
  })

  it('returns partial score for word overlap', () => {
    const score = titleSimilarity('power broker moses', 'The Power Broker')
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(1)
  })

  it('returns 0 for no overlap', () => {
    expect(titleSimilarity('quantum physics', 'The Power Broker')).toBe(0)
  })

  it('ignores punctuation and case', () => {
    expect(titleSimilarity('hello world', 'Hello, World!')).toBe(1.0)
  })
})

describe('rankAndDedupe', () => {
  it('deduplicates by DOI', () => {
    const suggestions = [
      makeSuggestion({ id: '1', source: 'crossref', title: 'Paper A', metadata: { doi: '10.1234/test' } }),
      makeSuggestion({ id: '2', source: 'openalex', title: 'Paper A', metadata: { doi: '10.1234/test' } }),
    ]

    const result = rankAndDedupe('Paper A', suggestions, 'title')
    expect(result).toHaveLength(1)
  })

  it('prefers higher-priority source when merging duplicates', () => {
    const suggestions = [
      makeSuggestion({
        id: '1',
        source: 'openlibrary',
        title: 'Paper A',
        metadata: { doi: '10.1234/test', publisher: 'OL Publisher' },
      }),
      makeSuggestion({
        id: '2',
        source: 'openalex',
        title: 'Paper A',
        metadata: { doi: '10.1234/test', journal: 'Nature' },
      }),
    ]

    const result = rankAndDedupe('Paper A', suggestions, 'title')
    expect(result).toHaveLength(1)
    expect(result[0].source).toBe('openalex')
  })

  it('deduplicates by fuzzy key (title + author + year)', () => {
    const suggestions = [
      makeSuggestion({
        id: '1',
        source: 'crossref',
        title: 'The Power Broker',
        authors: [{ firstName: 'Robert', lastName: 'Caro' }],
        year: 1974,
      }),
      makeSuggestion({
        id: '2',
        source: 'openlibrary',
        title: 'The Power Broker',
        authors: [{ firstName: 'Robert A.', lastName: 'Caro' }],
        year: 1974,
      }),
    ]

    const result = rankAndDedupe('The Power Broker', suggestions, 'title')
    expect(result).toHaveLength(1)
  })

  it('ranks by title similarity for title field', () => {
    const suggestions = [
      makeSuggestion({ title: 'Something Else Entirely', metadata: { citationCount: 1000 } }),
      makeSuggestion({ title: 'The Power Broker' }),
    ]

    const result = rankAndDedupe('The Power Broker', suggestions, 'title')
    expect(result[0].title).toBe('The Power Broker')
  })

  it('ranks by citation count for author field', () => {
    const suggestions = [
      makeSuggestion({
        title: 'Low Citations Paper',
        authors: [{ firstName: 'Robert', lastName: 'Caro' }],
        metadata: { citationCount: 5 },
      }),
      makeSuggestion({
        title: 'High Citations Paper',
        authors: [{ firstName: 'Robert', lastName: 'Caro' }],
        metadata: { citationCount: 5000 },
      }),
    ]

    const result = rankAndDedupe('Robert Caro', suggestions, 'author')
    expect(result[0].title).toBe('High Citations Paper')
  })

  it('handles empty suggestions array', () => {
    const result = rankAndDedupe('anything', [], 'any')
    expect(result).toEqual([])
  })

  it('preserves unique entries', () => {
    const suggestions = [
      makeSuggestion({ id: '1', title: 'First Paper', year: 2020 }),
      makeSuggestion({ id: '2', title: 'Second Paper', year: 2021 }),
      makeSuggestion({ id: '3', title: 'Third Paper', year: 2022 }),
    ]

    const result = rankAndDedupe('Paper', suggestions, 'any')
    expect(result).toHaveLength(3)
  })

  it('merges metadata from lower-priority source into higher-priority result', () => {
    const suggestions = [
      makeSuggestion({
        source: 'openlibrary',
        title: 'Test Book',
        metadata: { doi: '10.1234/test', isbn: '978-0-12-345678-9', publisher: 'Publisher A' },
      }),
      makeSuggestion({
        source: 'openalex',
        title: 'Test Book',
        metadata: { doi: '10.1234/test', journal: 'Nature' },
      }),
    ]

    const result = rankAndDedupe('Test Book', suggestions, 'title')
    expect(result).toHaveLength(1)
    expect(result[0].metadata.journal).toBe('Nature')
    expect(result[0].metadata.isbn).toBe('978-0-12-345678-9')
  })
})
