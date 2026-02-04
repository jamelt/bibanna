export interface PublisherTier {
  score: number
  keywords: string[]
  characteristics: string[]
}

export const publisherTiers: Record<string, PublisherTier> = {
  tier1_university: {
    score: 95,
    keywords: [
      'oxford university press',
      'cambridge university press',
      'harvard university press',
      'mit press',
      'princeton university press',
      'yale university press',
      'stanford university press',
      'university of chicago press',
      'columbia university press',
      'university of california press',
      'duke university press',
      'johns hopkins university press',
      'university of north carolina press',
      'cornell university press',
      'university of michigan press',
      'university of pennsylvania press',
      'university of toronto press',
      'edinburgh university press',
      'manchester university press',
    ],
    characteristics: ['Rigorous peer review', 'Academic editorial boards', 'Non-profit mission'],
  },

  tier2_major_academic: {
    score: 85,
    keywords: [
      'elsevier',
      'springer',
      'springer nature',
      'wiley',
      'john wiley',
      'taylor & francis',
      'taylor and francis',
      'routledge',
      'sage publications',
      'sage',
      'pearson',
      'mcgraw-hill',
      'mcgraw hill',
      'cengage',
      'wolters kluwer',
      'karger',
      'thieme',
      'de gruyter',
    ],
    characteristics: ['Peer review', 'Established reputation', 'Commercial academic'],
  },

  tier3_professional: {
    score: 75,
    keywords: [
      'ieee',
      'acm',
      'apa',
      'american psychological association',
      'ama',
      'american medical association',
      'acs',
      'american chemical society',
      'rsc',
      'royal society of chemistry',
      'nature publishing',
      'cell press',
      'aaas',
      'science',
      'plos',
      'frontiers',
      'mdpi',
      'bmc',
      'biomed central',
    ],
    characteristics: ['Field-specific expertise', 'Professional review'],
  },

  tier4_trade: {
    score: 60,
    keywords: [
      'harpercollins',
      'harper collins',
      'penguin random house',
      'penguin',
      'random house',
      'simon & schuster',
      'simon and schuster',
      'macmillan',
      'hachette',
      'scholastic',
      'bloomsbury',
      'basic books',
      'little, brown',
      'knopf',
      'doubleday',
      'vintage',
      'anchor',
    ],
    characteristics: ['Editorial review', 'Commercial focus', 'Variable rigor'],
  },

  tier5_independent: {
    score: 45,
    keywords: [
      'small press',
      'independent',
      'regional',
      'local publisher',
    ],
    characteristics: ['Variable quality', 'Limited peer review'],
  },

  tier6_self_published: {
    score: 25,
    keywords: [
      'amazon kdp',
      'kindle direct',
      'createspace',
      'lulu',
      'smashwords',
      'draft2digital',
      'ingramspark',
      'blurb',
      'self-published',
      'self published',
      'independently published',
    ],
    characteristics: ['No peer review', 'No editorial gatekeeping'],
  },

  predatory: {
    score: 5,
    keywords: [
      'omics',
      'sciencedomain',
      'waset',
      'imedpub',
      'scirp',
      'scientific research publishing',
      'dove medical press',
      'hindawi questionable',
    ],
    characteristics: ['Fake peer review', 'Pay-to-publish without review'],
  },
}

export const knownJournalRankings: Record<string, number> = {
  'nature': 95,
  'science': 95,
  'cell': 95,
  'the lancet': 95,
  'new england journal of medicine': 95,
  'nejm': 95,
  'jama': 92,
  'bmj': 90,
  'pnas': 90,
  'nature communications': 88,
  'science advances': 88,
  'elife': 85,
  'plos one': 70,
  'scientific reports': 70,
}

export function getPublisherScore(publisher: string | undefined): { score: number; tier: string; evidence: string } | null {
  if (!publisher) return null

  const normalizedPublisher = publisher.toLowerCase().trim()

  for (const [tierName, tierData] of Object.entries(publisherTiers)) {
    for (const keyword of tierData.keywords) {
      if (normalizedPublisher.includes(keyword)) {
        return {
          score: tierData.score,
          tier: tierName,
          evidence: `Publisher "${publisher}" matches ${tierName.replace(/_/g, ' ')}`,
        }
      }
    }
  }

  return null
}

export function getJournalScore(journal: string | undefined): { score: number; evidence: string } | null {
  if (!journal) return null

  const normalizedJournal = journal.toLowerCase().trim()

  for (const [journalName, score] of Object.entries(knownJournalRankings)) {
    if (normalizedJournal.includes(journalName)) {
      return {
        score,
        evidence: `Journal "${journal}" is a high-impact publication`,
      }
    }
  }

  return null
}
