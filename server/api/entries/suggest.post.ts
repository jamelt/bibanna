import { z } from "zod";
import type { Author, EntryMetadata, EntryType } from "~/shared/types";
import { extractMetadataFromUrl } from "~/server/services/url/metadata-extractor";

const suggestSchema = z.object({
  query: z.string().min(1),
  maxResults: z.number().int().min(1).max(10).optional().default(5),
});

interface EntrySuggestion {
  id: string;
  source: "crossref" | "openlibrary" | "url" | "pubmed";
  title: string;
  authors: Author[];
  year?: number;
  entryType: EntryType;
  metadata: EntryMetadata;
}

export default defineEventHandler(async (event) => {
  await requireAuth(event);

  const body = await readBody(event);
  const parsed = suggestSchema.safeParse(body);

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: "Invalid suggestion query",
      data: parsed.error.flatten(),
    });
  }

  const { query, maxResults } = parsed.data;
  const trimmed = query.trim();

  if (!trimmed) {
    return { suggestions: [] as EntrySuggestion[] };
  }

  const suggestions: EntrySuggestion[] = [];

  if (looksLikeUrl(trimmed)) {
    const urlSuggestion = await lookupByUrl(trimmed);
    if (urlSuggestion) {
      suggestions.push(urlSuggestion);
    }
  } else if (looksLikeDoi(trimmed)) {
    const doiSuggestion = await lookupByDoi(trimmed);
    if (doiSuggestion) {
      suggestions.push(doiSuggestion);
    }
  } else if (looksLikeIsbn(trimmed)) {
    const isbnSuggestion = await lookupByIsbn(trimmed);
    if (isbnSuggestion) {
      suggestions.push(isbnSuggestion);
    }
  } else if (looksLikePmid(trimmed)) {
    const pmid = extractPmid(trimmed);
    if (pmid) {
      const pmidSuggestion = await lookupByPmid(pmid);
      if (pmidSuggestion) {
        suggestions.push(pmidSuggestion);
      }
    }
  } else {
    const [crossrefSuggestions, openLibrarySuggestions] = await Promise.all([
      searchCrossrefByTitle(trimmed, maxResults),
      searchOpenLibraryByTitle(trimmed, Math.min(maxResults, 5)),
    ]);

    const merged = rankAndDedupe(trimmed, [
      ...openLibrarySuggestions,
      ...crossrefSuggestions,
    ]);
    suggestions.push(...merged.slice(0, maxResults));
  }

  return { suggestions };
});

function looksLikeUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

function looksLikeDoi(value: string): boolean {
  return /^10\.\d{4,9}\/\S+$/i.test(value);
}

function normalizeIsbn(value: string): string {
  return value.replace(/[-\s]/g, "");
}

function looksLikeIsbn(value: string): boolean {
  const numeric = normalizeIsbn(value);
  return (
    (numeric.length === 10 || numeric.length === 13) &&
    /^[0-9Xx]+$/.test(numeric)
  );
}

async function lookupByUrl(url: string): Promise<EntrySuggestion | null> {
  try {
    const metadata = await extractMetadataFromUrl(url);

    if (!metadata.title) {
      return null;
    }

    const authors = metadata.authors ?? [];

    const entryType: EntryType = metadata.entryType || "website";

    const entryMetadata: EntryMetadata = {
      doi: metadata.doi,
      isbn: metadata.isbn,
      url: metadata.url || url,
      abstract: metadata.description,
      publisher: metadata.publisher,
      journal: metadata.journal,
      volume: metadata.volume,
      issue: metadata.issue,
      pages: metadata.pages,
      accessDate: new Date().toISOString().split("T")[0],
    };

    return {
      id: metadata.doi || metadata.isbn || metadata.url || url,
      source: "url",
      title: metadata.title,
      authors,
      year: metadata.year,
      entryType,
      metadata: entryMetadata,
    };
  } catch {
    return null;
  }
}

async function lookupByDoi(doi: string): Promise<EntrySuggestion | null> {
  const trimmed = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");

  try {
    const controller = new AbortController();
    const response = await fetch(
      `https://api.crossref.org/works/${encodeURIComponent(trimmed)}`,
      {
        headers: {
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) {
      return null;
    }

    const data: any = await response.json();
    const work = data?.message;
    if (!work) return null;

    return crossrefWorkToSuggestion(work, "crossref");
  } catch {
    return null;
  }
}

async function lookupByIsbn(isbn: string): Promise<EntrySuggestion | null> {
  const normalized = normalizeIsbn(isbn);

  try {
    const response = await fetch(
      `https://openlibrary.org/isbn/${encodeURIComponent(normalized)}.json`,
      {
        headers: {
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) {
      return null;
    }

    const data: any = await response.json();

    const title: string | undefined = data?.title;
    if (!title) return null;

    const authors: Author[] = Array.isArray(data?.authors)
      ? data.authors.map((a: any) => ({
          firstName: "",
          lastName: String(a.name ?? "").trim() || "Unknown",
        }))
      : [];

    const publishedYear: number | undefined = data?.publish_date
      ? parseYear(String(data.publish_date))
      : undefined;

    const metadata: EntryMetadata = {
      isbn: normalized,
      publisher: Array.isArray(data?.publishers)
        ? data.publishers[0]
        : data?.publisher,
      pages: data?.number_of_pages ? String(data.number_of_pages) : undefined,
      language: Array.isArray(data?.languages)
        ? data.languages[0]?.key
        : undefined,
    };

    return {
      id: normalized,
      source: "openlibrary",
      title,
      authors,
      year: publishedYear,
      entryType: "book",
      metadata,
    };
  } catch {
    return null;
  }
}

async function searchCrossrefByTitle(
  title: string,
  maxResults: number,
): Promise<EntrySuggestion[]> {
  try {
    const response = await fetch(
      `https://api.crossref.org/works?query=${encodeURIComponent(title)}&rows=${maxResults}`,
      {
        headers: {
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) {
      return [];
    }

    const data: any = await response.json();
    const items: any[] = data?.message?.items ?? [];

    return items
      .map((item) => crossrefWorkToSuggestion(item, "crossref"))
      .filter((s): s is EntrySuggestion => !!s);
  } catch {
    return [];
  }
}

function crossrefWorkToSuggestion(
  work: any,
  source: "crossref",
): EntrySuggestion | null {
  const title: string | undefined = Array.isArray(work.title)
    ? work.title[0]
    : work.title;
  if (!title) return null;

  const authors: Author[] = Array.isArray(work.author)
    ? work.author.map((a: any) => {
        const given = String(a.given ?? "").trim();
        const family = String(a.family ?? "").trim();
        return {
          firstName: given,
          lastName: family || given || "Unknown",
        };
      })
    : [];

  const year = extractYearFromCrossref(work);

  const journal =
    (Array.isArray(work["container-title"]) && work["container-title"][0]) ||
    work["container-title"];

  const type = String(work.type ?? "").toLowerCase();

  let entryType: EntryType = "journal_article";
  if (type.includes("book")) entryType = "book";
  else if (type.includes("dataset")) entryType = "dataset";
  else if (type.includes("proceedings") || type.includes("conference"))
    entryType = "conference_paper";
  else if (type.includes("report")) entryType = "report";

  const metadata: EntryMetadata = {
    doi: work.DOI,
    url: work.URL,
    journal: journal,
    volume: work.volume,
    issue: work.issue,
    pages: work.page,
    publisher: work.publisher,
    language: Array.isArray(work.language) ? work.language[0] : work.language,
    citationCount:
      typeof work["is-referenced-by-count"] === "number"
        ? work["is-referenced-by-count"]
        : undefined,
  };

  return {
    id: work.DOI || work.URL || title,
    source,
    title,
    authors,
    year,
    entryType,
    metadata,
  };
}

function extractYearFromCrossref(work: any): number | undefined {
  const dateParts =
    work?.issued?.["date-parts"] ||
    work?.published?.["date-parts"] ||
    work?.created?.["date-parts"];

  if (
    Array.isArray(dateParts) &&
    Array.isArray(dateParts[0]) &&
    typeof dateParts[0][0] === "number"
  ) {
    return dateParts[0][0];
  }

  const printed = work?.["published-print"]?.["date-parts"];
  if (
    Array.isArray(printed) &&
    Array.isArray(printed[0]) &&
    typeof printed[0][0] === "number"
  ) {
    return printed[0][0];
  }

  return undefined;
}

function looksLikePmid(value: string): boolean {
  if (/^\d{5,12}$/.test(value)) return true;
  return /pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i.test(value);
}

function extractPmid(value: string): string | null {
  const urlMatch = value.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i);
  if (urlMatch) return urlMatch[1]!;
  if (/^\d{5,12}$/.test(value)) return value;
  return null;
}

async function lookupByPmid(pmid: string): Promise<EntrySuggestion | null> {
  try {
    const response = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${encodeURIComponent(pmid)}&retmode=json`,
      { signal: AbortSignal.timeout(8000) },
    );

    if (!response.ok) return null;

    const data: any = await response.json();
    const record = data?.result?.[pmid];
    if (!record || record.error) return null;

    const title: string | undefined = record.title
      ?.replace(/<[^>]*>/g, "")
      .replace(/\.$/, "");
    if (!title) return null;

    const authors: Author[] = Array.isArray(record.authors)
      ? record.authors.map((a: any) => {
          const name = String(a.name ?? "").trim();
          const parts = name.split(" ");
          const lastName = parts[0] || "Unknown";
          const firstName = parts.slice(1).join(" ");
          return { firstName, lastName };
        })
      : [];

    const pubDate = String(record.pubdate ?? "");
    const year = parseYear(pubDate);

    const doi: string | undefined = Array.isArray(record.articleids)
      ? record.articleids.find((id: any) => id.idtype === "doi")?.value
      : undefined;

    const metadata: EntryMetadata = {
      doi,
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      journal: record.fulljournalname || record.source,
      volume: record.volume || undefined,
      issue: record.issue || undefined,
      pages: record.pages || undefined,
      language: record.lang?.[0] || undefined,
    };

    return {
      id: pmid,
      source: "pubmed",
      title,
      authors,
      year,
      entryType: "journal_article",
      metadata,
    };
  } catch {
    return null;
  }
}

async function searchOpenLibraryByTitle(
  title: string,
  maxResults: number,
): Promise<EntrySuggestion[]> {
  try {
    const response = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(title)}&limit=${maxResults}&fields=key,title,author_name,first_publish_year,isbn,publisher,number_of_pages_median,language,subject`,
      { signal: AbortSignal.timeout(8000) },
    );

    if (!response.ok) return [];

    const data: any = await response.json();
    const docs: any[] = data?.docs ?? [];

    return docs
      .filter((doc: any) => !!doc.title)
      .map((doc: any) => {
        const authors: Author[] = Array.isArray(doc.author_name)
          ? doc.author_name.map((name: string) => {
              const parts = name.trim().split(/\s+/);
              if (parts.length === 1)
                return { firstName: "", lastName: parts[0] || "Unknown" };
              const lastName = parts[parts.length - 1] || "";
              const firstName = parts.slice(0, -1).join(" ");
              return { firstName, lastName };
            })
          : [];

        const isbn =
          Array.isArray(doc.isbn) && doc.isbn.length > 0
            ? doc.isbn[0]
            : undefined;

        const metadata: EntryMetadata = {
          isbn,
          publisher: Array.isArray(doc.publisher)
            ? doc.publisher[0]
            : undefined,
          pages: doc.number_of_pages_median
            ? String(doc.number_of_pages_median)
            : undefined,
        };

        return {
          id: `ol-${doc.key || doc.title}`,
          source: "openlibrary" as const,
          title: doc.title as string,
          authors,
          year: doc.first_publish_year,
          entryType: "book" as EntryType,
          metadata,
        };
      });
  } catch {
    return [];
  }
}

function titleSimilarity(query: string, title: string): number {
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

function rankAndDedupe(
  query: string,
  suggestions: EntrySuggestion[],
): EntrySuggestion[] {
  const MIN_SIMILARITY = 0.4;

  const filtered = suggestions.filter((s) => {
    const sim = titleSimilarity(query, s.title);
    return sim >= MIN_SIMILARITY;
  });

  const seen = new Map<string, EntrySuggestion>();
  for (const s of filtered) {
    const normTitle = s.title.toLowerCase().replace(/[^a-z0-9]/g, "");
    const key = `${normTitle}-${s.year || ""}`;

    if (!seen.has(key)) {
      seen.set(key, s);
    }
  }

  const deduped = Array.from(seen.values());

  deduped.sort((a, b) => {
    const simA = titleSimilarity(query, a.title);
    const simB = titleSimilarity(query, b.title);

    if (Math.abs(simA - simB) > 0.1) return simB - simA;

    const bookBoostA = a.entryType === "book" ? 0.1 : 0;
    const bookBoostB = b.entryType === "book" ? 0.1 : 0;
    const scoreA = simA + bookBoostA;
    const scoreB = simB + bookBoostB;

    if (Math.abs(scoreA - scoreB) > 0.05) return scoreB - scoreA;

    const citesA = a.metadata?.citationCount ?? 0;
    const citesB = b.metadata?.citationCount ?? 0;
    return citesB - citesA;
  });

  return deduped;
}

function parseYear(value: string): number | undefined {
  const match = value.match(/(\d{4})/);
  if (!match) return undefined;
  const year = Number.parseInt(match[1], 10);
  return Number.isFinite(year) ? year : undefined;
}
