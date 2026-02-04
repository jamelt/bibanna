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
    cslUrl: 'https://raw.githubusercontent.com/citation-style-language/styles/master/apa.csl',
  },
  {
    id: 'mla-9th',
    name: 'Modern Language Association 9th Edition',
    shortName: 'MLA 9th',
    category: 'author-date',
    fields: ['humanities', 'literature', 'language'],
    description: 'Standard for humanities and liberal arts',
    cslUrl: 'https://raw.githubusercontent.com/citation-style-language/styles/master/modern-language-association.csl',
  },
  {
    id: 'chicago-17th-author-date',
    name: 'Chicago Manual of Style 17th Edition (Author-Date)',
    shortName: 'Chicago Author-Date',
    category: 'author-date',
    fields: ['social-sciences', 'natural-sciences'],
    description: 'Chicago style with in-text author-date citations',
    cslUrl: 'https://raw.githubusercontent.com/citation-style-language/styles/master/chicago-author-date.csl',
  },
  {
    id: 'chicago-17th-note',
    name: 'Chicago Manual of Style 17th Edition (Notes-Bibliography)',
    shortName: 'Chicago Notes',
    category: 'note',
    fields: ['humanities', 'history', 'arts'],
    description: 'Chicago style with footnotes/endnotes',
    cslUrl: 'https://raw.githubusercontent.com/citation-style-language/styles/master/chicago-note-bibliography.csl',
  },
  {
    id: 'turabian-9th-author-date',
    name: 'Turabian 9th Edition (Author-Date)',
    shortName: 'Turabian Author-Date',
    category: 'author-date',
    fields: ['social-sciences', 'natural-sciences'],
    description: 'Student-friendly version of Chicago style',
    cslUrl: 'https://raw.githubusercontent.com/citation-style-language/styles/master/turabian-author-date.csl',
  },
  {
    id: 'turabian-9th-note',
    name: 'Turabian 9th Edition (Notes-Bibliography)',
    shortName: 'Turabian Notes',
    category: 'note',
    fields: ['humanities', 'history'],
    description: 'Student-friendly Chicago with footnotes',
    cslUrl: 'https://raw.githubusercontent.com/citation-style-language/styles/master/turabian-fullnote-bibliography.csl',
  },
  {
    id: 'harvard',
    name: 'Harvard Reference Format',
    shortName: 'Harvard',
    category: 'author-date',
    fields: ['general', 'business'],
    description: 'Common in UK and Australian universities',
    cslUrl: 'https://raw.githubusercontent.com/citation-style-language/styles/master/harvard-cite-them-right.csl',
  },
  {
    id: 'ieee',
    name: 'IEEE',
    shortName: 'IEEE',
    category: 'numeric',
    fields: ['engineering', 'computer-science', 'technology'],
    description: 'Standard for engineering and technology',
    cslUrl: 'https://raw.githubusercontent.com/citation-style-language/styles/master/ieee.csl',
  },
  {
    id: 'acm',
    name: 'Association for Computing Machinery',
    shortName: 'ACM',
    category: 'numeric',
    fields: ['computer-science'],
    description: 'Standard for computer science publications',
    cslUrl: 'https://raw.githubusercontent.com/citation-style-language/styles/master/acm-sig-proceedings.csl',
  },
  {
    id: 'ama',
    name: 'American Medical Association 11th Edition',
    shortName: 'AMA',
    category: 'numeric',
    fields: ['medicine', 'health-sciences'],
    description: 'Standard for medical journals',
    cslUrl: 'https://raw.githubusercontent.com/citation-style-language/styles/master/american-medical-association.csl',
  },
  {
    id: 'vancouver',
    name: 'Vancouver',
    shortName: 'Vancouver',
    category: 'numeric',
    fields: ['medicine', 'biomedical'],
    description: 'Common in biomedical journals',
    cslUrl: 'https://raw.githubusercontent.com/citation-style-language/styles/master/vancouver.csl',
  },
  {
    id: 'acs',
    name: 'American Chemical Society',
    shortName: 'ACS',
    category: 'numeric',
    fields: ['chemistry'],
    description: 'Standard for chemistry publications',
    cslUrl: 'https://raw.githubusercontent.com/citation-style-language/styles/master/american-chemical-society.csl',
  },
  {
    id: 'nature',
    name: 'Nature',
    shortName: 'Nature',
    category: 'numeric',
    fields: ['natural-sciences', 'biology'],
    description: 'Style used by Nature journals',
    cslUrl: 'https://raw.githubusercontent.com/citation-style-language/styles/master/nature.csl',
  },
  {
    id: 'science',
    name: 'Science',
    shortName: 'Science',
    category: 'numeric',
    fields: ['natural-sciences'],
    description: 'Style used by Science magazine',
    cslUrl: 'https://raw.githubusercontent.com/citation-style-language/styles/master/science.csl',
  },
  {
    id: 'cell',
    name: 'Cell',
    shortName: 'Cell',
    category: 'numeric',
    fields: ['biology', 'life-sciences'],
    description: 'Style used by Cell Press journals',
    cslUrl: 'https://raw.githubusercontent.com/citation-style-language/styles/master/cell.csl',
  },
  {
    id: 'bluebook',
    name: 'Bluebook Legal Citation',
    shortName: 'Bluebook',
    category: 'note',
    fields: ['law'],
    description: 'Standard legal citation in the US',
    cslUrl: 'https://raw.githubusercontent.com/citation-style-language/styles/master/bluebook-law-review.csl',
  },
  {
    id: 'oscola',
    name: 'Oxford Standard for Citation of Legal Authorities',
    shortName: 'OSCOLA',
    category: 'note',
    fields: ['law'],
    description: 'UK legal citation standard',
    cslUrl: 'https://raw.githubusercontent.com/citation-style-language/styles/master/oscola.csl',
  },
  {
    id: 'aaa',
    name: 'American Anthropological Association',
    shortName: 'AAA',
    category: 'author-date',
    fields: ['anthropology'],
    description: 'Standard for anthropology',
    cslUrl: 'https://raw.githubusercontent.com/citation-style-language/styles/master/american-anthropological-association.csl',
  },
  {
    id: 'asa',
    name: 'American Sociological Association 6th Edition',
    shortName: 'ASA',
    category: 'author-date',
    fields: ['sociology'],
    description: 'Standard for sociology',
    cslUrl: 'https://raw.githubusercontent.com/citation-style-language/styles/master/american-sociological-association.csl',
  },
  {
    id: 'apsa',
    name: 'American Political Science Association',
    shortName: 'APSA',
    category: 'author-date',
    fields: ['political-science'],
    description: 'Standard for political science',
    cslUrl: 'https://raw.githubusercontent.com/citation-style-language/styles/master/american-political-science-association.csl',
  },
]

export const EN_US_LOCALE = `<?xml version="1.0" encoding="utf-8"?>
<locale xmlns="http://purl.org/net/xbiblio/csl" version="1.0" xml:lang="en-US">
  <info>
    <rights license="http://creativecommons.org/licenses/by-sa/3.0/">This work is licensed under a Creative Commons Attribution-ShareAlike 3.0 License</rights>
    <updated>2024-01-01T00:00:00+00:00</updated>
  </info>
  <style-options punctuation-in-quote="true"/>
  <date form="text">
    <date-part name="month" suffix=" "/>
    <date-part name="day" suffix=", "/>
    <date-part name="year"/>
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
    <term name="edition">
      <single>edition</single>
      <multiple>editions</multiple>
    </term>
    <term name="edition" form="short">ed.</term>
    <term name="et-al">et al.</term>
    <term name="forthcoming">forthcoming</term>
    <term name="from">from</term>
    <term name="ibid">ibid.</term>
    <term name="in">in</term>
    <term name="in press">in press</term>
    <term name="internet">internet</term>
    <term name="interview">interview</term>
    <term name="letter">letter</term>
    <term name="no date">no date</term>
    <term name="no date" form="short">n.d.</term>
    <term name="online">online</term>
    <term name="presented at">presented at the</term>
    <term name="reference">
      <single>reference</single>
      <multiple>references</multiple>
    </term>
    <term name="reference" form="short">
      <single>ref.</single>
      <multiple>refs.</multiple>
    </term>
    <term name="retrieved">retrieved</term>
    <term name="scale">scale</term>
    <term name="version">version</term>
    <term name="page">
      <single>page</single>
      <multiple>pages</multiple>
    </term>
    <term name="page" form="short">
      <single>p.</single>
      <multiple>pp.</multiple>
    </term>
    <term name="number-of-pages">
      <single>page</single>
      <multiple>pages</multiple>
    </term>
    <term name="number-of-pages" form="short">
      <single>p.</single>
      <multiple>pp.</multiple>
    </term>
    <term name="paragraph">
      <single>paragraph</single>
      <multiple>paragraphs</multiple>
    </term>
    <term name="paragraph" form="short">
      <single>para.</single>
      <multiple>paras.</multiple>
    </term>
    <term name="volume">
      <single>volume</single>
      <multiple>volumes</multiple>
    </term>
    <term name="volume" form="short">
      <single>vol.</single>
      <multiple>vols.</multiple>
    </term>
    <term name="issue">
      <single>number</single>
      <multiple>numbers</multiple>
    </term>
    <term name="issue" form="short">
      <single>no.</single>
      <multiple>nos.</multiple>
    </term>
    <term name="chapter">
      <single>chapter</single>
      <multiple>chapters</multiple>
    </term>
    <term name="chapter" form="short">
      <single>chap.</single>
      <multiple>chaps.</multiple>
    </term>
    <term name="section">
      <single>section</single>
      <multiple>sections</multiple>
    </term>
    <term name="section" form="short">
      <single>sec.</single>
      <multiple>secs.</multiple>
    </term>
    <term name="editor">
      <single>editor</single>
      <multiple>editors</multiple>
    </term>
    <term name="editor" form="short">
      <single>ed.</single>
      <multiple>eds.</multiple>
    </term>
    <term name="translator">
      <single>translator</single>
      <multiple>translators</multiple>
    </term>
    <term name="translator" form="short">
      <single>trans.</single>
      <multiple>trans.</multiple>
    </term>
  </terms>
</locale>`

const styleCache = new Map<string, string>()

export async function fetchStyleXml(styleId: string): Promise<string> {
  const cached = styleCache.get(styleId)
  if (cached) return cached

  const style = DEFAULT_STYLES.find(s => s.id === styleId)
  if (!style) {
    throw new Error(`Style not found: ${styleId}`)
  }

  const response = await fetch(style.cslUrl)
  if (!response.ok) {
    throw new Error(`Failed to fetch style: ${style.cslUrl}`)
  }

  const xml = await response.text()
  styleCache.set(styleId, xml)

  return xml
}

export function getDefaultStyles(): DefaultStyle[] {
  return DEFAULT_STYLES
}

export function getStyleById(styleId: string): DefaultStyle | undefined {
  return DEFAULT_STYLES.find(s => s.id === styleId)
}

export function getStylesByField(field: string): DefaultStyle[] {
  return DEFAULT_STYLES.filter(s => s.fields.includes(field))
}

export function getStylesByCategory(category: DefaultStyle['category']): DefaultStyle[] {
  return DEFAULT_STYLES.filter(s => s.category === category)
}
