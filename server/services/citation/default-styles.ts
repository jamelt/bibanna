export interface DefaultStyle {
  id: string
  name: string
  shortName: string
  category: 'author-date' | 'numeric' | 'note' | 'label'
  fields: string[]
  description: string
  cslUrl: string
}

export const DEFAULT_STYLES: DefaultStyle[] = [
  {
    id: 'apa-7th',
    name: 'American Psychological Association 7th Edition',
    shortName: 'APA 7th',
    category: 'author-date',
    fields: ['psychology', 'social-sciences', 'education'],
    description: 'The most widely used style in social sciences',
    cslUrl: 'https://www.zotero.org/styles/apa?source=1',
  },
  {
    id: 'mla-9th',
    name: 'Modern Language Association 9th Edition',
    shortName: 'MLA 9th',
    category: 'author-date',
    fields: ['humanities', 'literature', 'language'],
    description: 'Standard for humanities and liberal arts',
    cslUrl: 'https://www.zotero.org/styles/modern-language-association?source=1',
  },
  {
    id: 'chicago-17th-author-date',
    name: 'Chicago Manual of Style 17th Edition (Author-Date)',
    shortName: 'Chicago Author-Date',
    category: 'author-date',
    fields: ['social-sciences', 'natural-sciences'],
    description: 'Chicago style with in-text author-date citations',
    cslUrl: 'https://www.zotero.org/styles/chicago-author-date?source=1',
  },
  {
    id: 'chicago-17th-note',
    name: 'Chicago Manual of Style 17th Edition (Notes-Bibliography)',
    shortName: 'Chicago Notes',
    category: 'note',
    fields: ['humanities', 'history', 'arts'],
    description: 'Chicago style with footnotes/endnotes',
    cslUrl: 'https://www.zotero.org/styles/chicago-note-bibliography?source=1',
  },
  {
    id: 'turabian-9th-author-date',
    name: 'Turabian 9th Edition (Author-Date)',
    shortName: 'Turabian Author-Date',
    category: 'author-date',
    fields: ['social-sciences', 'natural-sciences'],
    description: 'Student-friendly version of Chicago style',
    cslUrl: 'https://www.zotero.org/styles/turabian-author-date?source=1',
  },
  {
    id: 'turabian-9th-note',
    name: 'Turabian 9th Edition (Notes-Bibliography)',
    shortName: 'Turabian Notes',
    category: 'note',
    fields: ['humanities', 'history'],
    description: 'Student-friendly Chicago with footnotes',
    cslUrl: 'https://www.zotero.org/styles/turabian-fullnote-bibliography?source=1',
  },
  {
    id: 'harvard',
    name: 'Harvard Reference Format',
    shortName: 'Harvard',
    category: 'author-date',
    fields: ['general', 'business'],
    description: 'Common in UK and Australian universities',
    cslUrl: 'https://www.zotero.org/styles/harvard-cite-them-right?source=1',
  },
  {
    id: 'ieee',
    name: 'IEEE',
    shortName: 'IEEE',
    category: 'numeric',
    fields: ['engineering', 'computer-science', 'technology'],
    description: 'Standard for engineering and technology',
    cslUrl: 'https://www.zotero.org/styles/ieee?source=1',
  },
  {
    id: 'acm',
    name: 'Association for Computing Machinery',
    shortName: 'ACM',
    category: 'numeric',
    fields: ['computer-science'],
    description: 'Standard for computer science publications',
    cslUrl: 'https://www.zotero.org/styles/acm-sig-proceedings?source=1',
  },
  {
    id: 'ama',
    name: 'American Medical Association 11th Edition',
    shortName: 'AMA',
    category: 'numeric',
    fields: ['medicine', 'health-sciences'],
    description: 'Standard for medical journals',
    cslUrl: 'https://www.zotero.org/styles/american-medical-association?source=1',
  },
  {
    id: 'vancouver',
    name: 'Vancouver',
    shortName: 'Vancouver',
    category: 'numeric',
    fields: ['medicine', 'biomedical'],
    description: 'Common in biomedical journals',
    cslUrl: 'https://www.zotero.org/styles/vancouver?source=1',
  },
  {
    id: 'acs',
    name: 'American Chemical Society',
    shortName: 'ACS',
    category: 'numeric',
    fields: ['chemistry'],
    description: 'Standard for chemistry publications',
    cslUrl: 'https://www.zotero.org/styles/american-chemical-society?source=1',
  },
  {
    id: 'nature',
    name: 'Nature',
    shortName: 'Nature',
    category: 'numeric',
    fields: ['natural-sciences', 'biology'],
    description: 'Style used by Nature journals',
    cslUrl: 'https://www.zotero.org/styles/nature?source=1',
  },
  {
    id: 'science',
    name: 'Science',
    shortName: 'Science',
    category: 'numeric',
    fields: ['natural-sciences'],
    description: 'Style used by Science magazine',
    cslUrl: 'https://www.zotero.org/styles/science?source=1',
  },
  {
    id: 'cell',
    name: 'Cell',
    shortName: 'Cell',
    category: 'numeric',
    fields: ['biology', 'life-sciences'],
    description: 'Style used by Cell Press journals',
    cslUrl: 'https://www.zotero.org/styles/cell?source=1',
  },
  {
    id: 'bluebook',
    name: 'Bluebook Legal Citation',
    shortName: 'Bluebook',
    category: 'note',
    fields: ['law'],
    description: 'Standard legal citation in the US',
    cslUrl: 'https://www.zotero.org/styles/bluebook-law-review?source=1',
  },
  {
    id: 'oscola',
    name: 'Oxford Standard for Citation of Legal Authorities',
    shortName: 'OSCOLA',
    category: 'note',
    fields: ['law'],
    description: 'UK legal citation standard',
    cslUrl: 'https://www.zotero.org/styles/oscola?source=1',
  },
  {
    id: 'aaa',
    name: 'American Anthropological Association',
    shortName: 'AAA',
    category: 'author-date',
    fields: ['anthropology'],
    description: 'Standard for anthropology',
    cslUrl: 'https://www.zotero.org/styles/american-anthropological-association?source=1',
  },
  {
    id: 'asa',
    name: 'American Sociological Association 6th Edition',
    shortName: 'ASA',
    category: 'author-date',
    fields: ['sociology'],
    description: 'Standard for sociology',
    cslUrl: 'https://www.zotero.org/styles/american-sociological-association?source=1',
  },
  {
    id: 'apsa',
    name: 'American Political Science Association',
    shortName: 'APSA',
    category: 'author-date',
    fields: ['political-science'],
    description: 'Standard for political science',
    cslUrl: 'https://www.zotero.org/styles/american-political-science-association?source=1',
  },
]

const styleCache = new Map<string, string>()

const FETCH_TIMEOUT_MS = 10_000
const MAX_RETRIES = 2

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, { signal: controller.signal })
    return response
  } finally {
    clearTimeout(timer)
  }
}

const EN_US_LOCALE_URL =
  'https://raw.githubusercontent.com/citation-style-language/locales/master/locales-en-US.xml'

let _enUsLocale: string | null = null

export async function getEnUsLocale(): Promise<string> {
  if (_enUsLocale) return _enUsLocale

  try {
    const response = await fetchWithTimeout(EN_US_LOCALE_URL, FETCH_TIMEOUT_MS)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching en-US locale`)
    }
    _enUsLocale = await response.text()
    return _enUsLocale
  } catch {
    _enUsLocale = getFallbackLocale()
    return _enUsLocale
  }
}

function getFallbackLocale(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<locale xmlns="http://purl.org/net/xbiblio/csl" version="1.0" xml:lang="en-US">
  <info><updated>2024-01-01T00:00:00+00:00</updated></info>
  <style-options punctuation-in-quote="true"/>
  <date form="text">
    <date-part name="month" suffix=" "/><date-part name="day" suffix=", "/><date-part name="year"/>
  </date>
  <date form="numeric">
    <date-part name="month" form="numeric-leading-zeros" suffix="/"/>
    <date-part name="day" form="numeric-leading-zeros" suffix="/"/>
    <date-part name="year"/>
  </date>
  <terms>
    <term name="accessed">accessed</term>
    <term name="and">and</term>
    <term name="and others">and others</term>
    <term name="anonymous">anonymous</term>
    <term name="anonymous" form="short">anon.</term>
    <term name="at">at</term>
    <term name="available at">available at</term>
    <term name="by">by</term>
    <term name="circa">circa</term>
    <term name="circa" form="short">c.</term>
    <term name="cited">cited</term>
    <term name="edition"><single>edition</single><multiple>editions</multiple></term>
    <term name="edition" form="short">ed.</term>
    <term name="et-al">et al.</term>
    <term name="forthcoming">forthcoming</term>
    <term name="from">from</term>
    <term name="ibid">ibid.</term>
    <term name="in">in</term>
    <term name="in press">in press</term>
    <term name="internet">internet</term>
    <term name="no date">no date</term>
    <term name="no date" form="short">n.d.</term>
    <term name="online">online</term>
    <term name="presented at">presented at the</term>
    <term name="reference"><single>reference</single><multiple>references</multiple></term>
    <term name="reference" form="short"><single>ref.</single><multiple>refs.</multiple></term>
    <term name="retrieved">retrieved</term>
    <term name="version">version</term>
    <term name="page"><single>page</single><multiple>pages</multiple></term>
    <term name="page" form="short"><single>p.</single><multiple>pp.</multiple></term>
    <term name="volume"><single>volume</single><multiple>volumes</multiple></term>
    <term name="volume" form="short"><single>vol.</single><multiple>vols.</multiple></term>
    <term name="issue"><single>number</single><multiple>numbers</multiple></term>
    <term name="issue" form="short"><single>no.</single><multiple>nos.</multiple></term>
    <term name="chapter"><single>chapter</single><multiple>chapters</multiple></term>
    <term name="chapter" form="short"><single>chap.</single><multiple>chaps.</multiple></term>
    <term name="section"><single>section</single><multiple>sections</multiple></term>
    <term name="section" form="short"><single>sec.</single><multiple>secs.</multiple></term>
    <term name="editor"><single>editor</single><multiple>editors</multiple></term>
    <term name="editor" form="short"><single>ed.</single><multiple>eds.</multiple></term>
    <term name="translator"><single>translator</single><multiple>translators</multiple></term>
    <term name="translator" form="short"><single>trans.</single><multiple>trans.</multiple></term>
    <term name="ordinal">th</term>
    <term name="ordinal-01">st</term>
    <term name="ordinal-02">nd</term>
    <term name="ordinal-03">rd</term>
    <term name="ordinal-11">th</term>
    <term name="ordinal-12">th</term>
    <term name="ordinal-13">th</term>
    <term name="long-ordinal-01">first</term>
    <term name="long-ordinal-02">second</term>
    <term name="long-ordinal-03">third</term>
    <term name="long-ordinal-04">fourth</term>
    <term name="long-ordinal-05">fifth</term>
    <term name="long-ordinal-06">sixth</term>
    <term name="long-ordinal-07">seventh</term>
    <term name="long-ordinal-08">eighth</term>
    <term name="long-ordinal-09">ninth</term>
    <term name="long-ordinal-10">tenth</term>
    <term name="month-01">January</term>
    <term name="month-02">February</term>
    <term name="month-03">March</term>
    <term name="month-04">April</term>
    <term name="month-05">May</term>
    <term name="month-06">June</term>
    <term name="month-07">July</term>
    <term name="month-08">August</term>
    <term name="month-09">September</term>
    <term name="month-10">October</term>
    <term name="month-11">November</term>
    <term name="month-12">December</term>
    <term name="month-01" form="short">Jan.</term>
    <term name="month-02" form="short">Feb.</term>
    <term name="month-03" form="short">Mar.</term>
    <term name="month-04" form="short">Apr.</term>
    <term name="month-05" form="short">May</term>
    <term name="month-06" form="short">Jun.</term>
    <term name="month-07" form="short">Jul.</term>
    <term name="month-08" form="short">Aug.</term>
    <term name="month-09" form="short">Sep.</term>
    <term name="month-10" form="short">Oct.</term>
    <term name="month-11" form="short">Nov.</term>
    <term name="month-12" form="short">Dec.</term>
  </terms>
</locale>`
}

async function fetchCslXmlWithRetry(url: string, label: string): Promise<string> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(url, FETCH_TIMEOUT_MS)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} fetching CSL style "${label}" from ${url}`)
      }
      return await response.text()
    } catch (err: any) {
      lastError = err
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
      }
    }
  }

  throw new Error(
    `Failed to fetch CSL style "${label}" after ${MAX_RETRIES + 1} attempts: ${lastError?.message}`,
  )
}

function extractParentStyleUrl(xml: string): string | null {
  const match =
    xml.match(/<link[^>]+rel\s*=\s*"independent-parent"[^>]+href\s*=\s*"([^"]+)"/) ||
    xml.match(/<link[^>]+href\s*=\s*"([^"]+)"[^>]+rel\s*=\s*"independent-parent"/)
  if (!match) return null

  const href = match[1]
  if (
    href.startsWith('http://www.zotero.org/styles/') ||
    href.startsWith('https://www.zotero.org/styles/')
  ) {
    const styleName = href.replace(/^https?:\/\/www\.zotero\.org\/styles\//, '')
    return `https://www.zotero.org/styles/${styleName}?source=1`
  }
  return null
}

export async function fetchStyleXml(styleId: string): Promise<string> {
  const cached = styleCache.get(styleId)
  if (cached) return cached

  const style = DEFAULT_STYLES.find((s) => s.id === styleId)
  if (!style) {
    throw new Error(`Style not found: ${styleId}`)
  }

  let xml = await fetchCslXmlWithRetry(style.cslUrl, style.shortName)

  const parentUrl = extractParentStyleUrl(xml)
  if (parentUrl) {
    xml = await fetchCslXmlWithRetry(parentUrl, `${style.shortName} (parent)`)
  }

  styleCache.set(styleId, xml)
  return xml
}

export function getDefaultStyles(): DefaultStyle[] {
  return DEFAULT_STYLES
}

export function getStyleById(styleId: string): DefaultStyle | undefined {
  return DEFAULT_STYLES.find((s) => s.id === styleId)
}

export function getStylesByField(field: string): DefaultStyle[] {
  return DEFAULT_STYLES.filter((s) => s.fields.includes(field))
}

export function getStylesByCategory(category: DefaultStyle['category']): DefaultStyle[] {
  return DEFAULT_STYLES.filter((s) => s.category === category)
}
