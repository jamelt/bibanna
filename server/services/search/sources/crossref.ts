import type { Author, EntryMetadata, EntryType } from "~/shared/types";
import type { EntrySuggestion, SearchRequest, SourceAdapter } from "../types";

const CROSSREF_API = "https://api.crossref.org";
const REQUEST_TIMEOUT = 8000;

export const crossrefAdapter: SourceAdapter = {
  name: "crossref",
  supportedFields: ["any", "title", "author", "publisher", "journal", "year"],

  async search(request: SearchRequest): Promise<EntrySuggestion[]> {
    const { query, field, maxResults, offset } = request;

    const params = new URLSearchParams();
    params.set("rows", String(maxResults));
    params.set("offset", String(offset));

    switch (field) {
      case "author":
        params.set("query.author", query);
        break;
      case "publisher":
        params.set("query.publisher-name", query);
        break;
      case "journal":
        params.set("query.container-title", query);
        break;
      case "year": {
        const year = parseYear(query);
        if (year) {
          params.set(
            "filter",
            `from-pub-date:${year},until-pub-date:${year}`,
          );
        } else {
          params.set("query", query);
        }
        break;
      }
      case "title":
        params.set("query.bibliographic", query);
        break;
      default:
        params.set("query", query);
        break;
    }

    return fetchCrossrefWorks(params);
  },
};

async function fetchCrossrefWorks(
  params: URLSearchParams,
): Promise<EntrySuggestion[]> {
  try {
    const response = await fetch(
      `${CROSSREF_API}/works?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "Bibanna/1.0 (mailto:support@bibanna.dev)",
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      },
    );

    if (!response.ok) return [];

    const data: any = await response.json();
    const items: any[] = data?.message?.items ?? [];

    return items
      .map((item) => crossrefWorkToSuggestion(item))
      .filter((s): s is EntrySuggestion => !!s);
  } catch {
    return [];
  }
}

export async function lookupByDoi(
  doi: string,
): Promise<EntrySuggestion | null> {
  const trimmed = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");

  try {
    const response = await fetch(
      `${CROSSREF_API}/works/${encodeURIComponent(trimmed)}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "Bibanna/1.0 (mailto:support@bibanna.dev)",
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT),
      },
    );

    if (!response.ok) return null;

    const data: any = await response.json();
    const work = data?.message;
    if (!work) return null;

    return crossrefWorkToSuggestion(work);
  } catch {
    return null;
  }
}

export function crossrefWorkToSuggestion(
  work: any,
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
    journal,
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
    source: "crossref",
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

function parseYear(value: string): number | undefined {
  const match = value.match(/(\d{4})/);
  if (!match) return undefined;
  const year = Number.parseInt(match[1], 10);
  return Number.isFinite(year) ? year : undefined;
}
