import type { Author, EntryMetadata, EntryType } from "~/shared/types";

export type FieldQualifier =
  | "any"
  | "author"
  | "title"
  | "publisher"
  | "journal"
  | "subject"
  | "year";

export interface SearchRequest {
  query: string;
  field: FieldQualifier;
  maxResults: number;
  offset: number;
}

export interface EntrySuggestion {
  id: string;
  source:
    | "crossref"
    | "openlibrary"
    | "pubmed"
    | "openalex"
    | "semantic_scholar"
    | "google_books"
    | "loc"
    | "url";
  title: string;
  authors: Author[];
  year?: number;
  entryType: EntryType;
  metadata: EntryMetadata;
  relevanceScore?: number;
}

export interface SearchResult {
  suggestions: EntrySuggestion[];
  total: number;
  hasMore: boolean;
}

export interface SourceAdapter {
  name: string;
  supportedFields: FieldQualifier[];
  search(request: SearchRequest): Promise<EntrySuggestion[]>;
}
