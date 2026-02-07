import { z } from "zod";
import { extractMetadataFromUrl } from "~/server/services/url/metadata-extractor";
import {
  searchAllSources,
  lookupByDoi,
  lookupByIsbn,
  lookupByPmid,
} from "~/server/services/search";
import type { EntrySuggestion } from "~/server/services/search";
import type { EntryMetadata, EntryType } from "~/shared/types";

const suggestSchema = z.object({
  query: z.string().min(1),
  field: z
    .enum(["any", "author", "title", "publisher", "journal", "subject", "year"])
    .optional()
    .default("any"),
  maxResults: z.number().int().min(1).max(20).optional().default(8),
  offset: z.number().int().min(0).optional().default(0),
});

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

  const { query, field, maxResults, offset } = parsed.data;
  const trimmed = query.trim();

  if (!trimmed) {
    return { suggestions: [] as EntrySuggestion[], hasMore: false, total: 0 };
  }

  if (looksLikeUrl(trimmed)) {
    const suggestion = await lookupByUrl(trimmed);
    return {
      suggestions: suggestion ? [suggestion] : [],
      hasMore: false,
      total: suggestion ? 1 : 0,
    };
  }

  if (looksLikeDoi(trimmed)) {
    const suggestion = await lookupByDoi(trimmed);
    return {
      suggestions: suggestion ? [suggestion] : [],
      hasMore: false,
      total: suggestion ? 1 : 0,
    };
  }

  if (looksLikeIsbn(trimmed)) {
    const suggestion = await lookupByIsbn(trimmed);
    return {
      suggestions: suggestion ? [suggestion] : [],
      hasMore: false,
      total: suggestion ? 1 : 0,
    };
  }

  if (looksLikePmid(trimmed)) {
    const pmid = extractPmid(trimmed);
    if (pmid) {
      const suggestion = await lookupByPmid(pmid);
      return {
        suggestions: suggestion ? [suggestion] : [],
        hasMore: false,
        total: suggestion ? 1 : 0,
      };
    }
  }

  return searchAllSources({ query: trimmed, field, maxResults, offset });
});

function looksLikeUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

function looksLikeDoi(value: string): boolean {
  return /^10\.\d{4,9}\/\S+$/i.test(value);
}

function looksLikeIsbn(value: string): boolean {
  const numeric = value.replace(/[-\s]/g, "");
  return (
    (numeric.length === 10 || numeric.length === 13) &&
    /^[0-9Xx]+$/.test(numeric)
  );
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

async function lookupByUrl(url: string): Promise<EntrySuggestion | null> {
  try {
    const metadata = await extractMetadataFromUrl(url);

    if (!metadata.title) return null;

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
