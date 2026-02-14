import { describe, it, expect } from 'vitest'

describe('CitationStylePicker', () => {
  const mockStyles = [
    { id: 'apa', name: 'APA 7th Edition', category: 'author-date', field: 'psychology' },
    { id: 'mla', name: 'MLA 9th Edition', category: 'author-date', field: 'humanities' },
    { id: 'chicago', name: 'Chicago 17th', category: 'note', field: 'history' },
    { id: 'ieee', name: 'IEEE', category: 'numeric', field: 'engineering' },
    { id: 'harvard', name: 'Harvard', category: 'author-date', field: 'general' },
  ]

  it('filters styles by search term', () => {
    const filterBySearch = (styles: typeof mockStyles, search: string) => {
      if (!search) return styles
      const term = search.toLowerCase()
      return styles.filter(
        (s) => s.name.toLowerCase().includes(term) || s.id.toLowerCase().includes(term),
      )
    }

    expect(filterBySearch(mockStyles, 'apa')).toHaveLength(1)
    expect(filterBySearch(mockStyles, 'edition')).toHaveLength(2)
    expect(filterBySearch(mockStyles, '')).toHaveLength(5)
    expect(filterBySearch(mockStyles, 'xyz')).toHaveLength(0)
  })

  it('filters styles by category', () => {
    const filterByCategory = (styles: typeof mockStyles, category: string | null) => {
      if (!category) return styles
      return styles.filter((s) => s.category === category)
    }

    expect(filterByCategory(mockStyles, 'author-date')).toHaveLength(3)
    expect(filterByCategory(mockStyles, 'numeric')).toHaveLength(1)
    expect(filterByCategory(mockStyles, 'note')).toHaveLength(1)
    expect(filterByCategory(mockStyles, null)).toHaveLength(5)
  })

  it('filters styles by field', () => {
    const filterByField = (styles: typeof mockStyles, field: string | null) => {
      if (!field) return styles
      return styles.filter((s) => s.field === field)
    }

    expect(filterByField(mockStyles, 'psychology')).toHaveLength(1)
    expect(filterByField(mockStyles, 'humanities')).toHaveLength(1)
    expect(filterByField(mockStyles, null)).toHaveLength(5)
  })

  it('combines multiple filters', () => {
    const filterStyles = (
      styles: typeof mockStyles,
      search: string,
      category: string | null,
      field: string | null,
    ) => {
      let result = styles

      if (search) {
        const term = search.toLowerCase()
        result = result.filter(
          (s) => s.name.toLowerCase().includes(term) || s.id.toLowerCase().includes(term),
        )
      }

      if (category) {
        result = result.filter((s) => s.category === category)
      }

      if (field) {
        result = result.filter((s) => s.field === field)
      }

      return result
    }

    expect(filterStyles(mockStyles, '', 'author-date', null)).toHaveLength(3)
    expect(filterStyles(mockStyles, 'edition', 'author-date', null)).toHaveLength(2)
    expect(filterStyles(mockStyles, '', 'author-date', 'psychology')).toHaveLength(1)
  })

  it('sorts styles alphabetically', () => {
    const sortStyles = (styles: typeof mockStyles) => {
      return [...styles].sort((a, b) => a.name.localeCompare(b.name))
    }

    const sorted = sortStyles(mockStyles)
    expect(sorted[0].name).toBe('APA 7th Edition')
    expect(sorted[sorted.length - 1].name).toBe('MLA 9th Edition')
  })
})
