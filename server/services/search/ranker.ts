import type { FieldQualifier, EntrySuggestion } from "./types";

const SOURCE_PRIORITY: Record<string, number> = {
  openalex: 5,
  crossref: 4,
  pubmed: 3,
  semantic_scholar: 2,
  google_books: 2,
  openlibrary: 1,
  loc: 1,
};

export function rankAndDedupe(
  query: string,
  suggestions: EntrySuggestion[],
  field: FieldQualifier,
): EntrySuggestion[] {
  const deduped = deduplicateSuggestions(suggestions);
  const scored = deduped.map((s) => ({
    suggestion: s,
    score: computeScore(query, s, field),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.map((s) => s.suggestion);
}

function computeScore(
  query: string,
  suggestion: EntrySuggestion,
  field: FieldQualifier,
): number {
  const cites = suggestion.metadata?.citationCount ?? 0;
  const citationScore = Math.log10(cites + 1) * 10;
  const sourcePriority = SOURCE_PRIORITY[suggestion.source] ?? 0;

  switch (field) {
    case "title":
    case "any": {
      const sim = titleSimilarity(query, suggestion.title);
      const bookBoost = suggestion.entryType === "book" ? 5 : 0;
      return sim * 50 + citationScore + sourcePriority + bookBoost;
    }
    case "author": {
      const authorMatch = authorRelevance(query, suggestion.authors);
      return authorMatch * 40 + citationScore * 2 + sourcePriority;
    }
    case "publisher": {
      const pubMatch = textSimilarity(
        query,
        suggestion.metadata?.publisher ?? "",
      );
      return pubMatch * 40 + citationScore + sourcePriority;
    }
    case "journal": {
      const journalMatch = textSimilarity(
        query,
        suggestion.metadata?.journal ?? "",
      );
      return journalMatch * 40 + citationScore + sourcePriority;
    }
    case "subject": {
      return citationScore * 2 + sourcePriority + 10;
    }
    case "year": {
      const yearMatch =
        suggestion.year && query.includes(String(suggestion.year)) ? 50 : 0;
      return yearMatch + citationScore + sourcePriority;
    }
    default:
      return citationScore + sourcePriority;
  }
}

function deduplicateSuggestions(
  suggestions: EntrySuggestion[],
): EntrySuggestion[] {
  const seen = new Map<string, EntrySuggestion>();

  for (const s of suggestions) {
    const doiKey = s.metadata?.doi
      ? `doi:${normalizeDoi(s.metadata.doi)}`
      : null;

    if (doiKey && seen.has(doiKey)) {
      const existing = seen.get(doiKey)!;
      seen.set(doiKey, pickRicher(existing, s));
      continue;
    }

    const fuzzyKey = buildFuzzyKey(s);
    if (seen.has(fuzzyKey)) {
      const existing = seen.get(fuzzyKey)!;
      const merged = pickRicher(existing, s);
      seen.set(fuzzyKey, merged);
      if (doiKey) seen.set(doiKey, merged);
      continue;
    }

    if (doiKey) seen.set(doiKey, s);
    seen.set(fuzzyKey, s);
  }

  const unique = new Set(seen.values());
  return Array.from(unique);
}

function pickRicher(a: EntrySuggestion, b: EntrySuggestion): EntrySuggestion {
  const priorityA = SOURCE_PRIORITY[a.source] ?? 0;
  const priorityB = SOURCE_PRIORITY[b.source] ?? 0;

  const base = priorityA >= priorityB ? a : b;
  const other = base === a ? b : a;

  return {
    ...base,
    metadata: {
      ...other.metadata,
      ...removeUndefined(base.metadata),
    },
    authors: base.authors.length >= other.authors.length
      ? base.authors
      : other.authors,
    year: base.year ?? other.year,
  };
}

function removeUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) result[key] = value;
  }
  return result;
}

function normalizeDoi(doi: string): string {
  return doi
    .toLowerCase()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .trim();
}

function buildFuzzyKey(s: EntrySuggestion): string {
  const normTitle = s.title.toLowerCase().replace(/[^a-z0-9]/g, "");
  const firstAuthor =
    s.authors[0]?.lastName?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
  const year = s.year ?? "";
  return `fuzzy:${normTitle.slice(0, 60)}-${firstAuthor}-${year}`;
}

export function titleSimilarity(query: string, title: string): number {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim();
  const q = normalize(query);
  const t = normalize(title);

  if (q === t) return 1.0;
  if (t.startsWith(q) || t.endsWith(q)) return 0.9;

  const qWords = new Set(q.split(/\s+/).filter((w) => w.length > 2));
  const tWords = new Set(t.split(/\s+/).filter((w) => w.length > 2));

  if (qWords.size === 0) return 0;

  let matches = 0;
  for (const w of qWords) {
    if (tWords.has(w)) matches++;
  }

  return matches / qWords.size;
}

function textSimilarity(query: string, text: string): number {
  if (!text) return 0;
  const q = query.toLowerCase().trim();
  const t = text.toLowerCase().trim();

  if (q === t) return 1.0;
  if (t.includes(q) || q.includes(t)) return 0.8;

  const qWords = new Set(q.split(/\s+/).filter((w) => w.length > 1));
  const tWords = new Set(t.split(/\s+/).filter((w) => w.length > 1));

  if (qWords.size === 0) return 0;

  let matches = 0;
  for (const w of qWords) {
    if (tWords.has(w)) matches++;
  }

  return matches / qWords.size;
}

function authorRelevance(
  query: string,
  authors: { firstName: string; lastName: string }[],
): number {
  if (authors.length === 0) return 0;

  const qNorm = query.toLowerCase().trim();
  const qParts = new Set(qNorm.split(/\s+/).filter((w) => w.length > 1));

  let bestMatch = 0;
  for (const author of authors) {
    const fullName =
      `${author.firstName} ${author.lastName}`.toLowerCase().trim();
    const nameParts = new Set(
      fullName.split(/\s+/).filter((w) => w.length > 1),
    );

    if (fullName === qNorm) return 1.0;
    if (fullName.includes(qNorm) || qNorm.includes(fullName)) return 0.9;

    let matches = 0;
    for (const w of qParts) {
      if (nameParts.has(w)) matches++;
    }
    const score = qParts.size > 0 ? matches / qParts.size : 0;
    if (score > bestMatch) bestMatch = score;
  }

  return bestMatch;
}
