import { describe, it, expect } from 'vitest'
import { generateBibtex, parseBibtex } from '~/server/services/export/bibtex'
import { generateDocx } from '~/server/services/export/docx'
import { generateBibliographyHtml, sortEntries } from '~/server/services/export/pdf'
import type { PdfExportOptions } from '~/server/services/export/pdf'
import type { Entry, Author, Annotation } from '~/shared/types'

function makeEntry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'test-id-1',
    userId: 'user-1',
    entryType: 'book',
    title: 'The Art of Testing',
    authors: [{ firstName: 'John', lastName: 'Doe' }],
    year: 2024,
    metadata: { publisher: 'Test Press' },
    customFields: {},
    isFavorite: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: 'ann-1',
    entryId: 'test-id-1',
    userId: 'user-1',
    content: 'This is an important annotation about the work.',
    annotationType: 'summary',
    highlights: [],
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('BibTeX Generation', () => {
  it('generates valid BibTeX for a book entry', () => {
    const entry = makeEntry()
    const result = generateBibtex([entry])

    expect(result).toContain('@book{')
    expect(result).toContain('doe2024')
    expect(result).toContain('title = {The Art of Testing}')
    expect(result).toContain('author = {Doe, John}')
    expect(result).toContain('year = {2024}')
    expect(result).toContain('publisher = {Test Press}')
  })

  it('generates valid BibTeX for a journal article', () => {
    const entry = makeEntry({
      entryType: 'journal_article',
      title: 'A Study on Testing',
      metadata: {
        journal: 'Journal of Testing',
        volume: '10',
        issue: '3',
        pages: '100-120',
        doi: '10.1234/test.2024',
      },
    })
    const result = generateBibtex([entry])

    expect(result).toContain('@article{')
    expect(result).toContain('journal = {Journal of Testing}')
    expect(result).toContain('volume = {10}')
    expect(result).toContain('number = {3}')
    expect(result).toContain('pages = {100--120}')
    expect(result).toContain('doi = {10.1234/test.2024}')
  })

  it('generates valid BibTeX for a website entry', () => {
    const entry = makeEntry({
      entryType: 'website',
      title: 'Testing Guide Online',
      metadata: { url: 'https://example.com/testing' },
    })
    const result = generateBibtex([entry])

    expect(result).toContain('@misc{')
    expect(result).toContain('url = {https://example.com/testing}')
  })

  it('generates valid BibTeX for a conference paper', () => {
    const entry = makeEntry({
      entryType: 'conference_paper',
      title: 'Testing in Practice',
      metadata: { container: 'International Conference on Testing' },
    })
    const result = generateBibtex([entry])

    expect(result).toContain('@inproceedings{')
    expect(result).toContain('booktitle = {International Conference on Testing}')
  })

  it('generates valid BibTeX for a thesis', () => {
    const entry = makeEntry({
      entryType: 'thesis',
      title: 'My PhD Thesis',
      metadata: { publisher: 'MIT' },
    })
    const result = generateBibtex([entry])

    expect(result).toContain('@phdthesis{')
    expect(result).toContain('school = {MIT}')
    expect(result).toContain('type = {PhD Thesis}')
  })

  it('handles entries with no authors', () => {
    const entry = makeEntry({ authors: [] })
    const result = generateBibtex([entry])

    expect(result).toContain('@book{')
    expect(result).toContain('title = {The Art of Testing}')
    expect(result).not.toContain('author = {')
    expect(result).toContain('unknown2024')
  })

  it('handles entries with no year', () => {
    const entry = makeEntry({ year: undefined })
    const result = generateBibtex([entry])

    expect(result).toContain('@book{')
    expect(result).not.toContain('year = {')
    expect(result).toContain('doend')
  })

  it('handles multiple authors correctly', () => {
    const entry = makeEntry({
      authors: [
        { firstName: 'Alice', lastName: 'Smith' },
        { firstName: 'Bob', lastName: 'Jones' },
        { firstName: 'Carol', lastName: 'White' },
      ],
    })
    const result = generateBibtex([entry])

    expect(result).toContain('author = {Smith, Alice and Jones, Bob and White, Carol}')
  })

  it('escapes special BibTeX characters', () => {
    const entry = makeEntry({ title: 'Testing & Verification: A 100% Guide' })
    const result = generateBibtex([entry])

    expect(result).toContain('Testing \\& Verification: A 100\\% Guide')
  })

  it('generates multiple entries separated by blank lines', () => {
    const entries = [
      makeEntry({ id: '1', title: 'Book One' }),
      makeEntry({ id: '2', title: 'Book Two' }),
    ]
    const result = generateBibtex(entries)
    const entryBlocks = result.split('\n\n')

    expect(entryBlocks).toHaveLength(2)
    expect(entryBlocks[0]).toContain('Book One')
    expect(entryBlocks[1]).toContain('Book Two')
  })

  it('handles empty entry list', () => {
    const result = generateBibtex([])
    expect(result).toBe('')
  })

  it('includes ISBN and ISSN when present', () => {
    const entry = makeEntry({
      metadata: { isbn: '978-3-16-148410-0', issn: '0378-5955' },
    })
    const result = generateBibtex([entry])

    expect(result).toContain('isbn = {978-3-16-148410-0}')
    expect(result).toContain('issn = {0378-5955}')
  })
})

describe('BibTeX Parsing (round-trip)', () => {
  it('round-trips a book entry', () => {
    const original = makeEntry()
    const bibtex = generateBibtex([original])
    const parsed = parseBibtex(bibtex)

    expect(parsed).toHaveLength(1)
    expect(parsed[0]?.title).toBe('The Art of Testing')
    expect(parsed[0]?.year).toBe(2024)
    expect(parsed[0]?.authors).toBeDefined()
    expect(parsed[0]?.authors?.[0]?.lastName).toBe('Doe')
    expect(parsed[0]?.authors?.[0]?.firstName).toBe('John')
    expect(parsed[0]?.metadata?.publisher).toBe('Test Press')
  })

  it('round-trips a journal article', () => {
    const original = makeEntry({
      entryType: 'journal_article',
      title: 'Testing Methods',
      metadata: {
        journal: 'Testing Quarterly',
        volume: '5',
        issue: '2',
        pages: '10-25',
        doi: '10.5678/tq.2024',
      },
    })
    const bibtex = generateBibtex([original])
    const parsed = parseBibtex(bibtex)

    expect(parsed).toHaveLength(1)
    expect(parsed[0]?.title).toBe('Testing Methods')
    expect(parsed[0]?.metadata?.journal).toBe('Testing Quarterly')
    expect(parsed[0]?.metadata?.volume).toBe('5')
    expect(parsed[0]?.metadata?.issue).toBe('2')
    expect(parsed[0]?.metadata?.doi).toBe('10.5678/tq.2024')
  })

  it('round-trips multiple entries', () => {
    const entries = [
      makeEntry({ id: '1', title: 'First Book', year: 2020 }),
      makeEntry({ id: '2', title: 'Second Book', year: 2022 }),
    ]
    const bibtex = generateBibtex(entries)
    const parsed = parseBibtex(bibtex)

    expect(parsed).toHaveLength(2)
    expect(parsed[0]?.title).toBe('First Book')
    expect(parsed[0]?.year).toBe(2020)
    expect(parsed[1]?.title).toBe('Second Book')
    expect(parsed[1]?.year).toBe(2022)
  })

  it('parses empty BibTeX string', () => {
    const parsed = parseBibtex('')
    expect(parsed).toHaveLength(0)
  })
})

describe('DOCX Generation', () => {
  it('produces a valid buffer with default options', async () => {
    const entries = [makeEntry()]
    const buffer = await generateDocx(entries)

    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(0)
    // DOCX files are ZIP archives starting with PK signature
    expect(buffer[0]).toBe(0x50) // P
    expect(buffer[1]).toBe(0x4b) // K
  })

  it('produces a valid buffer with custom options', async () => {
    const entries = [makeEntry()]
    const buffer = await generateDocx(entries, {
      paperSize: 'a4',
      fontSize: 14,
      lineSpacing: 'single',
      sortBy: 'title',
    })

    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(0)
  })

  it('includes title page when option is set', async () => {
    const entries = [makeEntry()]
    const bufferWithTitle = await generateDocx(entries, {
      includeTitlePage: true,
      title: 'My Bibliography',
    })
    const bufferWithoutTitle = await generateDocx(entries, {
      includeTitlePage: false,
    })

    expect(bufferWithTitle.length).toBeGreaterThan(bufferWithoutTitle.length)
  })

  it('includes annotations when option is set', async () => {
    const entries = [
      makeEntry({
        annotations: [makeAnnotation()],
      }),
    ]
    const bufferWithAnnotations = await generateDocx(entries, {
      includeAnnotations: true,
    })
    const bufferWithoutAnnotations = await generateDocx(entries, {
      includeAnnotations: false,
    })

    expect(bufferWithAnnotations.length).toBeGreaterThan(bufferWithoutAnnotations.length)
  })

  it('handles empty entry list', async () => {
    const buffer = await generateDocx([])

    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(0)
  })

  it('sorts entries by different criteria', async () => {
    const entries = [
      makeEntry({
        id: '1',
        title: 'Zebra Book',
        authors: [{ firstName: 'Zara', lastName: 'Zoey' }],
        year: 2020,
      }),
      makeEntry({
        id: '2',
        title: 'Alpha Book',
        authors: [{ firstName: 'Anna', lastName: 'Adams' }],
        year: 2024,
      }),
    ]

    const byAuthor = await generateDocx(entries, { sortBy: 'author' })
    const byTitle = await generateDocx(entries, { sortBy: 'title' })
    const byYear = await generateDocx(entries, { sortBy: 'year' })

    expect(byAuthor).toBeInstanceOf(Buffer)
    expect(byTitle).toBeInstanceOf(Buffer)
    expect(byYear).toBeInstanceOf(Buffer)
  })

  it('handles different entry types in DOCX', async () => {
    const entries = [
      makeEntry({ id: '1', entryType: 'book', title: 'A Book' }),
      makeEntry({
        id: '2',
        entryType: 'journal_article',
        title: 'An Article',
        metadata: {
          journal: 'Nature',
          volume: '1',
          issue: '2',
          pages: '1-10',
          doi: '10.1234/x',
        },
      }),
      makeEntry({
        id: '3',
        entryType: 'website',
        title: 'A Website',
        metadata: { url: 'https://example.com' },
      }),
    ]

    const buffer = await generateDocx(entries)
    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(0)
  })
})

describe('Bibliography Preview HTML Generation', () => {
  const defaultOpts: PdfExportOptions = {
    paperSize: 'letter',
    margins: { top: 1, right: 1, bottom: 1, left: 1 },
    font: 'Times New Roman',
    fontSize: 12,
    lineSpacing: 'double',
    includeAnnotations: false,
    annotationStyle: 'paragraph',
    includeTitlePage: false,
    title: 'Bibliography',
    pageNumbers: true,
    sortBy: 'author',
  }

  it('generates valid HTML with doctype and body', async () => {
    const entries = [makeEntry()]
    const html = await generateBibliographyHtml(entries, defaultOpts)

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html>')
    expect(html).toContain('<body>')
    expect(html).toContain('</html>')
  })

  it('includes entry titles in the output', async () => {
    const entries = [
      makeEntry({ id: '1', title: 'First Book' }),
      makeEntry({ id: '2', title: 'Second Book' }),
    ]
    const html = await generateBibliographyHtml(entries, defaultOpts)

    expect(html).toContain('First Book')
    expect(html).toContain('Second Book')
  })

  it('applies font settings from options', async () => {
    const entries = [makeEntry()]
    const html = await generateBibliographyHtml(entries, {
      ...defaultOpts,
      font: 'Arial',
      fontSize: 14,
    })

    expect(html).toContain('Arial')
    expect(html).toContain('14pt')
  })

  it('includes title page when option is set', async () => {
    const entries = [makeEntry()]
    const html = await generateBibliographyHtml(entries, {
      ...defaultOpts,
      includeTitlePage: true,
      title: 'My Bibliography',
    })

    expect(html).toContain('title-page')
    expect(html).toContain('My Bibliography')
  })

  it('does not include title page element by default', async () => {
    const entries = [makeEntry()]
    const html = await generateBibliographyHtml(entries, defaultOpts)

    expect(html).not.toContain('<div class="title-page">')
  })

  it('shows "Works Cited" when annotations are excluded', async () => {
    const entries = [makeEntry()]
    const html = await generateBibliographyHtml(entries, {
      ...defaultOpts,
      includeAnnotations: false,
    })

    expect(html).toContain('Works Cited')
  })

  it('shows "Annotated Bibliography" when annotations are included', async () => {
    const entries = [makeEntry()]
    const html = await generateBibliographyHtml(entries, {
      ...defaultOpts,
      includeAnnotations: true,
    })

    expect(html).toContain('Annotated Bibliography')
  })

  it('includes annotation content when option is set', async () => {
    const entries = [
      makeEntry({
        annotations: [
          makeAnnotation({
            content: 'This is a key annotation about the study.',
          }),
        ],
      }),
    ]
    const html = await generateBibliographyHtml(entries, {
      ...defaultOpts,
      includeAnnotations: true,
    })

    expect(html).toContain('This is a key annotation about the study.')
  })

  it('handles empty entry list', async () => {
    const html = await generateBibliographyHtml([], defaultOpts)

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('Works Cited')
  })
})

describe('sortEntries', () => {
  it('sorts by author last name ascending', () => {
    const entries = [
      makeEntry({
        id: '1',
        authors: [{ firstName: 'Zara', lastName: 'Zoey' }],
      }),
      makeEntry({
        id: '2',
        authors: [{ firstName: 'Anna', lastName: 'Adams' }],
      }),
    ]
    const sorted = sortEntries(entries, 'author')

    expect(sorted[0]?.authors?.[0]?.lastName).toBe('Adams')
    expect(sorted[1]?.authors?.[0]?.lastName).toBe('Zoey')
  })

  it('sorts by title alphabetically', () => {
    const entries = [
      makeEntry({ id: '1', title: 'Zebra Studies' }),
      makeEntry({ id: '2', title: 'Alpha Research' }),
    ]
    const sorted = sortEntries(entries, 'title')

    expect(sorted[0]?.title).toBe('Alpha Research')
    expect(sorted[1]?.title).toBe('Zebra Studies')
  })

  it('sorts by year descending', () => {
    const entries = [makeEntry({ id: '1', year: 2020 }), makeEntry({ id: '2', year: 2024 })]
    const sorted = sortEntries(entries, 'year')

    expect(sorted[0]?.year).toBe(2024)
    expect(sorted[1]?.year).toBe(2020)
  })

  it('does not mutate the original array', () => {
    const entries = [makeEntry({ id: '1', title: 'B' }), makeEntry({ id: '2', title: 'A' })]
    const sorted = sortEntries(entries, 'title')

    expect(entries[0]?.title).toBe('B')
    expect(sorted[0]?.title).toBe('A')
  })
})
