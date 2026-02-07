<script setup lang="ts">
import { useDebounceFn, useMediaQuery } from "@vueuse/core";
import type { Author, EntryType, EntryMetadata } from "~/shared/types";
import { ENTRY_TYPE_LABELS } from "~/shared/types";

const isMobile = useMediaQuery("(max-width: 640px)");

interface EntrySuggestion {
  id: string;
  source:
    | "crossref"
    | "openlibrary"
    | "url"
    | "pubmed"
    | "openalex"
    | "semantic_scholar"
    | "google_books"
    | "loc";
  title: string;
  authors: Author[];
  year?: number;
  entryType: EntryType;
  metadata: EntryMetadata;
}

interface SuggestResponse {
  suggestions: EntrySuggestion[];
  hasMore: boolean;
  total: number;
}

type DetectedKind = "doi" | "isbn" | "url" | "pmid" | "title";
type FieldQualifier = "any" | "author" | "title" | "publisher" | "journal" | "subject" | "year";
type QuickAddStatus =
  | "idle"
  | "typing"
  | "loading"
  | "loaded"
  | "preview"
  | "creating"
  | "success"
  | "error";

const props = defineProps<{
  open: boolean;
  defaultProjectId?: string;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  created: [entry: any];
}>();

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit("update:open", value),
});

const toast = useToast();

const query = ref("");
const detectedKind = ref<DetectedKind>("title");
const status = ref<QuickAddStatus>("idle");
const suggestions = ref<EntrySuggestion[]>([]);
const highlightedIndex = ref(-1);
const selectedSuggestion = ref<EntrySuggestion | null>(null);
const errorMessage = ref<string | null>(null);
const isCreating = ref(false);

const selectedProjectId = ref<string | null>(props.defaultProjectId ?? null);
const showOptions = ref(false);

const { data: projects } = useFetch("/api/projects", { lazy: true });

const inputRef = ref<HTMLElement | null>(null);

const activeQualifier = ref<FieldQualifier>("any");
const showSlashDropdown = ref(false);
const slashFilterText = ref("");

interface QualifierOption {
  key: FieldQualifier;
  label: string;
  shortcut: string;
  color: string;
}

const qualifierOptions: QualifierOption[] = [
  { key: "author", label: "Author", shortcut: "/a", color: "blue" },
  { key: "title", label: "Title", shortcut: "/t", color: "neutral" },
  { key: "publisher", label: "Publisher", shortcut: "/p", color: "violet" },
  { key: "journal", label: "Journal", shortcut: "/j", color: "green" },
  { key: "subject", label: "Subject", shortcut: "/s", color: "amber" },
  { key: "year", label: "Year", shortcut: "/y", color: "rose" },
];

const SLASH_MAP: Record<string, FieldQualifier> = {
  a: "author",
  t: "title",
  p: "publisher",
  j: "journal",
  s: "subject",
  y: "year",
};

const COLON_PREFIX_MAP: Record<string, FieldQualifier> = {
  author: "author",
  title: "title",
  publisher: "publisher",
  journal: "journal",
  subject: "subject",
  year: "year",
};

const qualifierColorMap: Record<FieldQualifier, string> = {
  any: "neutral",
  author: "blue",
  title: "neutral",
  publisher: "violet",
  journal: "green",
  subject: "amber",
  year: "rose",
};

const qualifierLabelMap: Record<FieldQualifier, string> = {
  any: "Any",
  author: "Author",
  title: "Title",
  publisher: "Publisher",
  journal: "Journal",
  subject: "Subject",
  year: "Year",
};

const filteredQualifierOptions = computed(() => {
  if (!slashFilterText.value) return qualifierOptions;
  const filter = slashFilterText.value.toLowerCase();
  return qualifierOptions.filter(
    (opt) =>
      opt.label.toLowerCase().startsWith(filter) ||
      opt.shortcut.slice(1).startsWith(filter),
  );
});

const slashHighlightIndex = ref(0);

function selectQualifier(qualifier: FieldQualifier) {
  activeQualifier.value = qualifier;
  showSlashDropdown.value = false;
  slashFilterText.value = "";
  slashHighlightIndex.value = 0;

  query.value = "";

  nextTick(() => {
    const el = inputRef.value;
    if (el) {
      const input = el.querySelector?.("input") || el;
      (input as HTMLElement).focus?.();
    }
  });
}

function clearQualifier() {
  activeQualifier.value = "any";
  showSlashDropdown.value = false;
  slashFilterText.value = "";
  slashHighlightIndex.value = 0;
}

function parseColonPrefix(value: string): { qualifier: FieldQualifier; cleanQuery: string } | null {
  const match = value.match(/^(\w+):\s*(.*)/);
  if (!match) return null;
  const prefix = match[1].toLowerCase();
  const qualifier = COLON_PREFIX_MAP[prefix];
  if (!qualifier) return null;
  return { qualifier, cleanQuery: match[2] || "" };
}

function detectInputKind(value: string): DetectedKind {
  const trimmed = value.trim();
  if (!trimmed) return "title";
  if (/^10\.\d{4,9}\/\S+$/i.test(trimmed) || /doi\.org\//i.test(trimmed))
    return "doi";
  if (/^https?:\/\//i.test(trimmed)) return "url";
  const numericOnly = trimmed.replace(/[-\s]/g, "");
  if (
    (numericOnly.length === 10 || numericOnly.length === 13) &&
    /^[0-9Xx]+$/.test(numericOnly)
  )
    return "isbn";
  if (
    /^\d{5,12}$/.test(trimmed) ||
    /pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i.test(trimmed)
  )
    return "pmid";
  return "title";
}

const kindLabels: Record<DetectedKind, string> = {
  doi: "DOI",
  isbn: "ISBN",
  url: "URL",
  pmid: "PMID",
  title: "Title",
};

const sourceLabels: Record<string, string> = {
  crossref: "Crossref",
  openlibrary: "OpenLibrary",
  url: "URL",
  pubmed: "PubMed",
  openalex: "OpenAlex",
  semantic_scholar: "Semantic Scholar",
  google_books: "Google Books",
  loc: "Library of Congress",
};

const sourceColors: Record<string, string> = {
  crossref: "blue",
  openlibrary: "green",
  url: "purple",
  pubmed: "orange",
  openalex: "cyan",
  semantic_scholar: "violet",
  google_books: "red",
  loc: "amber",
};

function formatAuthorsShort(authors: Author[]): string {
  if (!authors || authors.length === 0) return "Unknown";
  if (authors.length === 1) {
    return authors[0]?.lastName || "Unknown";
  }
  if (authors.length === 2) {
    return `${authors[0]?.lastName} & ${authors[1]?.lastName}`;
  }
  return `${authors[0]?.lastName} et al.`;
}

function formatAuthorsFull(authors: Author[]): string {
  if (!authors || authors.length === 0) return "Unknown Author";
  return authors
    .map(
      (a) =>
        `${a.lastName}${a.firstName ? `, ${a.firstName}` : ""}${a.middleName ? ` ${a.middleName}` : ""}`,
    )
    .join("; ");
}

function getMissingFields(suggestion: EntrySuggestion): string[] {
  const missing: string[] = [];
  if (!suggestion.authors || suggestion.authors.length === 0)
    missing.push("Authors");
  if (!suggestion.year) missing.push("Year");
  if (!suggestion.metadata?.publisher && suggestion.entryType === "book")
    missing.push("Publisher");
  if (
    !suggestion.metadata?.journal &&
    suggestion.entryType === "journal_article"
  )
    missing.push("Journal");
  return missing;
}

const hasMore = ref(false);
const totalResults = ref(0);

const debouncedSuggest = useDebounceFn(async (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    suggestions.value = [];
    hasMore.value = false;
    totalResults.value = 0;
    status.value = "idle";
    return;
  }

  status.value = "loading";
  errorMessage.value = null;

  try {
    const kind = detectInputKind(trimmed);
    const maxResults = kind === "title" ? 8 : 5;
    const field = activeQualifier.value !== "any" ? activeQualifier.value : undefined;

    const response = await $fetch<SuggestResponse>(
      "/api/entries/suggest",
      {
        method: "POST",
        body: { query: trimmed, maxResults, field },
      },
    );

    suggestions.value = response.suggestions;
    hasMore.value = response.hasMore;
    totalResults.value = response.total;
    highlightedIndex.value = suggestions.value.length > 0 ? 0 : -1;
    status.value = suggestions.value.length > 0 ? "loaded" : "error";

    if (suggestions.value.length === 0) {
      errorMessage.value = "no_results";
    }
  } catch (err: any) {
    status.value = "error";
    errorMessage.value = err.data?.message || "network";
    suggestions.value = [];
  }
}, 300);

const loadingMore = ref(false);
const sentinelRef = ref<HTMLElement | null>(null);

async function loadMore() {
  if (loadingMore.value || !hasMore.value || !query.value.trim()) return;

  loadingMore.value = true;
  const currentOffset = suggestions.value.length;
  const field = activeQualifier.value !== "any" ? activeQualifier.value : undefined;

  try {
    const response = await $fetch<SuggestResponse>(
      "/api/entries/suggest",
      {
        method: "POST",
        body: {
          query: query.value.trim(),
          maxResults: 8,
          offset: currentOffset,
          field,
        },
      },
    );

    suggestions.value = [...suggestions.value, ...response.suggestions];
    hasMore.value = response.hasMore;
    totalResults.value = response.total;
  } catch {
    hasMore.value = false;
  } finally {
    loadingMore.value = false;
  }
}

watch(query, (value) => {
  detectedKind.value = detectInputKind(value);
  selectedSuggestion.value = null;

  if (value === "/" && activeQualifier.value === "any") {
    showSlashDropdown.value = true;
    slashFilterText.value = "";
    slashHighlightIndex.value = 0;
    return;
  }

  if (showSlashDropdown.value && value.startsWith("/")) {
    const afterSlash = value.slice(1);

    if (afterSlash.length === 1 && SLASH_MAP[afterSlash.toLowerCase()]) {
      const qualifier = SLASH_MAP[afterSlash.toLowerCase()]!;
      selectQualifier(qualifier);
      return;
    }

    slashFilterText.value = afterSlash;
    slashHighlightIndex.value = 0;
    return;
  }

  if (showSlashDropdown.value && !value.startsWith("/")) {
    showSlashDropdown.value = false;
    slashFilterText.value = "";
  }

  if (activeQualifier.value === "any" && value.length > 2) {
    const colonParsed = parseColonPrefix(value);
    if (colonParsed) {
      activeQualifier.value = colonParsed.qualifier;
      query.value = colonParsed.cleanQuery;
      return;
    }
  }

  if (value.trim()) {
    status.value = "typing";
    debouncedSuggest(value);
  } else {
    status.value = "idle";
    suggestions.value = [];
    highlightedIndex.value = -1;
  }
});

function selectSuggestion(suggestion: EntrySuggestion) {
  selectedSuggestion.value = suggestion;
  status.value = "preview";
}

function clearPreview() {
  selectedSuggestion.value = null;
  status.value = suggestions.value.length > 0 ? "loaded" : "idle";
}

async function addToLibrary() {
  if (!selectedSuggestion.value) return;

  isCreating.value = true;
  status.value = "creating";

  try {
    const s = selectedSuggestion.value;

    const payload: Record<string, unknown> = {
      entryType: s.entryType,
      title: s.title,
      authors: s.authors,
      year: s.year,
      metadata: s.metadata,
    };

    if (selectedProjectId.value) {
      payload.projectIds = [selectedProjectId.value];
    }

    const entry = await $fetch("/api/entries", {
      method: "POST",
      body: payload,
    });

    status.value = "success";
    emit("created", entry);

    toast.add({
      title: "Added to library",
      description: s.title,
      color: "success",
    });

    resetAndClose();
  } catch (err: any) {
    if (err.statusCode === 409) {
      status.value = "error";
      errorMessage.value = `duplicate:${err.data?.message || "A similar entry already exists."}`;
      isCreating.value = false;
      return;
    }
    status.value = "error";
    errorMessage.value = err.data?.message || "Failed to create entry";
    isCreating.value = false;
  }
}

async function forceAddToLibrary() {
  if (!selectedSuggestion.value) return;

  isCreating.value = true;
  status.value = "creating";

  try {
    const s = selectedSuggestion.value;

    const payload: Record<string, unknown> = {
      entryType: s.entryType,
      title: s.title,
      authors: s.authors,
      year: s.year,
      metadata: s.metadata,
    };

    if (selectedProjectId.value) {
      payload.projectIds = [selectedProjectId.value];
    }

    const entry = await $fetch("/api/entries?skipDedupe=true", {
      method: "POST",
      body: payload,
    });

    status.value = "success";
    emit("created", entry);

    toast.add({
      title: "Added to library",
      description: s.title,
      color: "success",
    });

    resetAndClose();
  } catch (err: any) {
    status.value = "error";
    errorMessage.value = err.data?.message || "Failed to create entry";
    isCreating.value = false;
  }
}

async function addAnyway() {
  const trimmed = query.value.trim();
  if (!trimmed) return;

  isCreating.value = true;
  status.value = "creating";

  try {
    const kind = detectedKind.value;
    const payload: Record<string, unknown> = {
      entryType: "website" as EntryType,
      title: trimmed,
      authors: [],
      metadata: {} as EntryMetadata,
    };

    if (kind === "url") {
      payload.entryType = "website";
      payload.metadata = { url: trimmed };
    } else if (kind === "doi") {
      payload.entryType = "journal_article";
      payload.metadata = {
        doi: trimmed.replace(/^https?:\/\/(dx\.)?doi\.org\//i, ""),
      };
    } else if (kind === "isbn") {
      payload.entryType = "book";
      payload.metadata = { isbn: trimmed.replace(/[-\s]/g, "") };
    }

    if (selectedProjectId.value) {
      payload.projectIds = [selectedProjectId.value];
    }

    const entry = await $fetch("/api/entries", {
      method: "POST",
      body: payload,
    });

    status.value = "success";
    emit("created", entry);

    toast.add({
      title: "Added to library",
      description: "You can edit the details later.",
      color: "success",
    });

    resetAndClose();
  } catch (err: any) {
    status.value = "error";
    errorMessage.value = err.data?.message || "Failed to create entry";
    isCreating.value = false;
  }
}

function openEditDetails() {
  resetAndClose();
  navigateTo("/app/library?action=add");
}

function resetForm() {
  query.value = "";
  detectedKind.value = "title";
  status.value = "idle";
  suggestions.value = [];
  highlightedIndex.value = -1;
  selectedSuggestion.value = null;
  errorMessage.value = null;
  isCreating.value = false;
  selectedProjectId.value = props.defaultProjectId ?? null;
  showOptions.value = false;
  activeQualifier.value = "any";
  showSlashDropdown.value = false;
  slashFilterText.value = "";
  hasMore.value = false;
  totalResults.value = 0;
}

function resetAndClose() {
  resetForm();
  isOpen.value = false;
}

function handleKeydown(e: KeyboardEvent) {
  if (showSlashDropdown.value) {
    const opts = filteredQualifierOptions.value;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      slashHighlightIndex.value = Math.min(
        slashHighlightIndex.value + 1,
        opts.length - 1,
      );
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      slashHighlightIndex.value = Math.max(slashHighlightIndex.value - 1, 0);
      return;
    }
    if (e.key === "Enter" && opts.length > 0) {
      e.preventDefault();
      const selected = opts[slashHighlightIndex.value] || opts[0];
      if (selected) selectQualifier(selected.key);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      showSlashDropdown.value = false;
      slashFilterText.value = "";
      query.value = "";
      return;
    }
    return;
  }

  if (
    e.key === "Backspace" &&
    query.value === "" &&
    activeQualifier.value !== "any"
  ) {
    e.preventDefault();
    clearQualifier();
    return;
  }

  if (e.key === "Escape" && activeQualifier.value !== "any") {
    e.preventDefault();
    clearQualifier();
    return;
  }

  if (status.value === "preview") {
    if (e.key === "Escape") {
      e.preventDefault();
      clearPreview();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      addToLibrary();
      return;
    }
    return;
  }

  const list = suggestions.value;
  if (list.length === 0) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    highlightedIndex.value = Math.min(
      highlightedIndex.value + 1,
      list.length - 1,
    );
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0);
  } else if (e.key === "Enter" && highlightedIndex.value >= 0) {
    e.preventDefault();
    const item = list[highlightedIndex.value];
    if (item) {
      selectSuggestion(item);
    }
  }
}

watch(isOpen, (open) => {
  if (!open) {
    resetForm();
  } else {
    nextTick(() => {
      const el = inputRef.value;
      if (el) {
        const input = el.querySelector?.("input") || el;
        (input as HTMLElement).focus?.();
      }
    });
  }
});

let scrollObserver: IntersectionObserver | null = null;

watch(sentinelRef, (el) => {
  if (scrollObserver) {
    scrollObserver.disconnect();
    scrollObserver = null;
  }
  if (el) {
    scrollObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );
    scrollObserver.observe(el);
  }
});

onMounted(() => {
  function handleGlobalKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      if (isOpen.value) {
        resetAndClose();
      } else {
        isOpen.value = true;
      }
    }
  }
  window.addEventListener("keydown", handleGlobalKeydown);
  onUnmounted(() => {
    window.removeEventListener("keydown", handleGlobalKeydown);
    if (scrollObserver) {
      scrollObserver.disconnect();
      scrollObserver = null;
    }
  });
});
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :fullscreen="isMobile"
    :ui="{
      content: isMobile
        ? 'w-full h-full max-w-full max-h-full rounded-none'
        : 'sm:max-w-2xl w-full max-h-[min(90vh,44rem)]',
    }"
  >
    <template #content>
      <div
        class="flex flex-col bg-white dark:bg-gray-900 overflow-hidden"
        :class="
          isMobile ? 'h-full w-full' : 'max-h-[min(90vh,44rem)] rounded-lg'
        "
        @keydown="handleKeydown"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 shrink-0"
        >
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
            Add a source
          </h2>
          <div class="flex items-center gap-2">
            <kbd
              class="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 rounded"
            >
              <span class="text-xs">{{
                navigator?.platform?.includes("Mac") ? "⌘" : "Ctrl"
              }}</span
              >K
            </kbd>
            <UButton
              variant="ghost"
              icon="i-heroicons-x-mark"
              color="neutral"
              size="sm"
              @click="resetAndClose"
            />
          </div>
        </div>

        <!-- Primary input -->
        <div class="px-4 sm:px-5 pt-4 pb-2">
          <div class="relative">
            <div class="flex items-center gap-2">
              <UBadge
                v-if="activeQualifier !== 'any'"
                :color="qualifierColorMap[activeQualifier]"
                variant="subtle"
                size="sm"
                class="shrink-0 cursor-pointer"
                @click="clearQualifier"
              >
                {{ qualifierLabelMap[activeQualifier] }}
                <span class="ml-1 opacity-60">&times;</span>
              </UBadge>
              <UInput
                ref="inputRef"
                v-model="query"
                icon="i-heroicons-magnifying-glass"
                size="lg"
                :placeholder="
                  activeQualifier !== 'any'
                    ? `Search by ${qualifierLabelMap[activeQualifier].toLowerCase()}…`
                    : 'Paste DOI, ISBN, URL… or search — type / for fields'
                "
                autofocus
                class="flex-1"
                :ui="{ base: 'text-[16px] sm:text-sm', trailing: 'pr-20' }"
              />
            </div>
            <div
              v-if="query.trim() && activeQualifier === 'any'"
              class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5"
            >
              <UBadge
                variant="subtle"
                :color="detectedKind === 'title' ? 'neutral' : 'primary'"
                size="xs"
              >
                {{ kindLabels[detectedKind] }}
              </UBadge>
              <UButton
                variant="ghost"
                icon="i-heroicons-x-mark"
                color="neutral"
                size="xs"
                @click="query = ''"
              />
            </div>
            <div
              v-else-if="query.trim() && activeQualifier !== 'any'"
              class="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <UButton
                variant="ghost"
                icon="i-heroicons-x-mark"
                color="neutral"
                size="xs"
                @click="query = ''"
              />
            </div>

            <!-- Slash command dropdown -->
            <div
              v-if="showSlashDropdown"
              class="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
            >
              <div class="py-1">
                <button
                  v-for="(opt, idx) in filteredQualifierOptions"
                  :key="opt.key"
                  type="button"
                  class="w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors"
                  :class="
                    idx === slashHighlightIndex
                      ? 'bg-primary-50 dark:bg-primary-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  "
                  @click="selectQualifier(opt.key)"
                  @mouseenter="slashHighlightIndex = idx"
                >
                  <div class="flex items-center gap-2">
                    <UBadge
                      :color="opt.color"
                      variant="subtle"
                      size="xs"
                    >
                      {{ opt.label }}
                    </UBadge>
                  </div>
                  <kbd
                    class="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded"
                  >
                    {{ opt.shortcut }}
                  </kbd>
                </button>
                <div
                  v-if="filteredQualifierOptions.length === 0"
                  class="px-3 py-2 text-sm text-gray-400"
                >
                  No matching field
                </div>
              </div>
            </div>
          </div>

          <!-- Field qualifier pills -->
          <div
            v-if="status !== 'preview'"
            class="flex items-center gap-1.5 mt-2 flex-wrap"
          >
            <button
              v-for="opt in [{ key: 'any' as FieldQualifier, label: 'Any', color: 'neutral' }, ...qualifierOptions]"
              :key="opt.key"
              type="button"
              class="px-2 py-0.5 text-xs rounded-full border transition-colors"
              :class="
                activeQualifier === opt.key
                  ? 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-medium'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300'
              "
              @click="opt.key === 'any' ? clearQualifier() : selectQualifier(opt.key)"
            >
              {{ opt.label }}
            </button>
          </div>

          <p class="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
            We'll fetch metadata and show a preview before saving.
          </p>
        </div>

        <!-- Scrollable body -->
        <div class="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-5 pb-4">
          <!-- Loading skeleton -->
          <div
            v-if="status === 'loading' || status === 'typing'"
            class="space-y-2 py-2"
          >
            <div
              v-for="i in 3"
              :key="i"
              class="animate-pulse flex gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              <div class="flex-1 space-y-2">
                <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          </div>

          <!-- Suggestions list -->
          <div
            v-else-if="status === 'loaded' && !selectedSuggestion"
            class="space-y-1 py-2"
          >
            <button
              v-for="(suggestion, index) in suggestions"
              :key="suggestion.id"
              type="button"
              class="w-full text-left p-3 rounded-lg transition-colors group"
              :class="[
                highlightedIndex === index
                  ? 'bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-200 dark:ring-primary-800'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800',
              ]"
              @click="selectSuggestion(suggestion)"
              @mouseenter="highlightedIndex = index"
            >
              <div class="flex items-start gap-2 sm:gap-3">
                <div class="flex-1 min-w-0">
                  <p
                    class="font-medium text-gray-900 dark:text-white line-clamp-2 text-sm"
                  >
                    {{ suggestion.title }}
                  </p>
                  <p
                    class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate"
                  >
                    {{ formatAuthorsShort(suggestion.authors) }}
                    <span v-if="suggestion.year"> · {{ suggestion.year }}</span>
                  </p>
                </div>
                <div
                  class="flex flex-wrap items-center gap-1 shrink-0 pt-0.5 max-w-22 sm:max-w-none justify-end"
                >
                  <UBadge
                    :color="sourceColors[suggestion.source] || 'neutral'"
                    variant="subtle"
                    size="xs"
                  >
                    {{ sourceLabels[suggestion.source] || suggestion.source }}
                  </UBadge>
                  <UBadge
                    variant="subtle"
                    color="neutral"
                    size="xs"
                    class="hidden sm:inline-flex"
                  >
                    {{
                      ENTRY_TYPE_LABELS[suggestion.entryType] ||
                      suggestion.entryType
                    }}
                  </UBadge>
                </div>
              </div>
              <div v-if="suggestion.metadata?.doi" class="mt-1">
                <span class="text-xs text-gray-400 font-mono">
                  {{ suggestion.metadata.doi }}
                </span>
              </div>
            </button>

            <!-- Load more sentinel -->
            <div
              v-if="hasMore"
              ref="sentinelRef"
              class="flex justify-center py-3"
            >
              <div
                v-if="loadingMore"
                class="flex items-center gap-2 text-xs text-gray-400"
              >
                <div class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-primary-500" />
                Loading more results…
              </div>
              <button
                v-else
                type="button"
                class="text-xs text-primary-500 hover:text-primary-600 dark:hover:text-primary-400"
                @click="loadMore"
              >
                Load more results
              </button>
            </div>
          </div>

          <!-- Preview card -->
          <div
            v-else-if="status === 'preview' && selectedSuggestion"
            class="py-2 space-y-4"
          >
            <div class="flex items-center gap-2">
              <UButton
                variant="ghost"
                icon="i-heroicons-arrow-left"
                color="neutral"
                size="xs"
                @click="clearPreview"
              >
                Back to results
              </UButton>
            </div>

            <UCard>
              <div class="space-y-3">
                <div class="flex items-start justify-between gap-3">
                  <div class="flex-1">
                    <h3
                      class="font-semibold text-gray-900 dark:text-white text-base"
                    >
                      {{ selectedSuggestion.title }}
                    </h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {{ formatAuthorsFull(selectedSuggestion.authors) }}
                    </p>
                  </div>
                  <div class="flex flex-col items-end gap-1 shrink-0">
                    <UBadge
                      variant="subtle"
                      :color="sourceColors[selectedSuggestion.source]"
                      size="xs"
                    >
                      {{ sourceLabels[selectedSuggestion.source] }}
                    </UBadge>
                    <UBadge variant="subtle" color="neutral" size="xs">
                      {{ ENTRY_TYPE_LABELS[selectedSuggestion.entryType] }}
                    </UBadge>
                  </div>
                </div>

                <dl
                  class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm"
                >
                  <div v-if="selectedSuggestion.year">
                    <dt class="text-gray-500 dark:text-gray-400 text-xs">
                      Year
                    </dt>
                    <dd class="text-gray-900 dark:text-white">
                      {{ selectedSuggestion.year }}
                    </dd>
                  </div>
                  <div v-if="selectedSuggestion.metadata?.journal">
                    <dt class="text-gray-500 dark:text-gray-400 text-xs">
                      Journal
                    </dt>
                    <dd class="text-gray-900 dark:text-white">
                      {{ selectedSuggestion.metadata.journal }}
                    </dd>
                  </div>
                  <div v-if="selectedSuggestion.metadata?.publisher">
                    <dt class="text-gray-500 dark:text-gray-400 text-xs">
                      Publisher
                    </dt>
                    <dd class="text-gray-900 dark:text-white">
                      {{ selectedSuggestion.metadata.publisher }}
                    </dd>
                  </div>
                  <div v-if="selectedSuggestion.metadata?.doi">
                    <dt class="text-gray-500 dark:text-gray-400 text-xs">
                      DOI
                    </dt>
                    <dd>
                      <a
                        :href="`https://doi.org/${selectedSuggestion.metadata.doi}`"
                        target="_blank"
                        class="text-primary-500 hover:underline text-xs font-mono break-all"
                      >
                        {{ selectedSuggestion.metadata.doi }}
                      </a>
                    </dd>
                  </div>
                  <div v-if="selectedSuggestion.metadata?.isbn">
                    <dt class="text-gray-500 dark:text-gray-400 text-xs">
                      ISBN
                    </dt>
                    <dd class="text-gray-900 dark:text-white font-mono text-xs">
                      {{ selectedSuggestion.metadata.isbn }}
                    </dd>
                  </div>
                  <div v-if="selectedSuggestion.metadata?.volume">
                    <dt class="text-gray-500 dark:text-gray-400 text-xs">
                      Volume/Issue
                    </dt>
                    <dd class="text-gray-900 dark:text-white">
                      {{ selectedSuggestion.metadata.volume
                      }}{{
                        selectedSuggestion.metadata.issue
                          ? `(${selectedSuggestion.metadata.issue})`
                          : ""
                      }}
                    </dd>
                  </div>
                  <div v-if="selectedSuggestion.metadata?.pages">
                    <dt class="text-gray-500 dark:text-gray-400 text-xs">
                      Pages
                    </dt>
                    <dd class="text-gray-900 dark:text-white">
                      {{ selectedSuggestion.metadata.pages }}
                    </dd>
                  </div>
                </dl>

                <div
                  v-if="getMissingFields(selectedSuggestion).length"
                  class="flex flex-wrap gap-1.5"
                >
                  <span class="text-xs text-amber-600 dark:text-amber-400"
                    >Missing:</span
                  >
                  <UBadge
                    v-for="field in getMissingFields(selectedSuggestion)"
                    :key="field"
                    variant="subtle"
                    color="amber"
                    size="xs"
                  >
                    {{ field }}
                  </UBadge>
                </div>
              </div>
            </UCard>

            <!-- Optional project -->
            <div>
              <button
                type="button"
                class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
                @click="showOptions = !showOptions"
              >
                <UIcon
                  :name="
                    showOptions
                      ? 'i-heroicons-chevron-down'
                      : 'i-heroicons-chevron-right'
                  "
                  class="w-3.5 h-3.5"
                />
                Options
              </button>
              <div v-if="showOptions" class="mt-2 space-y-3">
                <UFormField label="Add to project">
                  <USelectMenu
                    v-model="selectedProjectId"
                    :items="
                      (projects || []).map((p) => ({
                        ...p,
                        description: p.description ?? undefined,
                      }))
                    "
                    placeholder="None (library only)"
                    value-key="id"
                    label-key="name"
                    :ui="{ trigger: 'w-full' }"
                  />
                </UFormField>
              </div>
            </div>
          </div>

          <!-- Duplicate warning -->
          <div
            v-else-if="
              status === 'error' && errorMessage?.startsWith('duplicate:')
            "
            class="py-6 space-y-3"
          >
            <UAlert
              icon="i-heroicons-document-duplicate"
              color="warning"
              :title="errorMessage.replace('duplicate:', '')"
            />
            <div class="flex justify-center gap-2">
              <UButton
                variant="outline"
                color="neutral"
                size="sm"
                @click="clearPreview"
              >
                Go back
              </UButton>
              <UButton
                color="primary"
                size="sm"
                :loading="isCreating"
                @click="forceAddToLibrary"
              >
                Add anyway
              </UButton>
            </div>
          </div>

          <!-- Error / no results -->
          <div
            v-else-if="status === 'error'"
            class="py-8 text-center space-y-3"
          >
            <UIcon
              :name="
                errorMessage === 'no_results'
                  ? 'i-heroicons-magnifying-glass'
                  : 'i-heroicons-exclamation-triangle'
              "
              class="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600"
            />
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{
                errorMessage === "no_results"
                  ? "We couldn't find a match for that query."
                  : errorMessage === "network"
                    ? "Can't reach metadata services right now."
                    : errorMessage || "Something went wrong."
              }}
            </p>
            <div class="flex justify-center gap-2">
              <UButton
                variant="outline"
                color="neutral"
                size="sm"
                @click="
                  query = '';
                  status = 'idle';
                "
              >
                Try again
              </UButton>
              <UButton
                color="primary"
                size="sm"
                @click="addAnyway"
                :loading="isCreating"
              >
                Add anyway
              </UButton>
            </div>
          </div>

          <!-- Idle state -->
          <div
            v-else-if="status === 'idle' && !query.trim()"
            class="py-10 text-center"
          >
            <UIcon
              name="i-heroicons-book-open"
              class="w-12 h-12 mx-auto text-gray-200 dark:text-gray-700"
            />
            <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
              Paste a DOI, ISBN, URL, or type a title to search
            </p>
            <div class="mt-4 flex justify-center gap-3 text-xs text-gray-400">
              <span
                class="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded font-mono"
                >10.1234/example</span
              >
              <span
                class="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded font-mono"
                >978-0-13-468599-1</span
              >
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div
          v-if="status === 'preview' && selectedSuggestion"
          class="px-4 sm:px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3 shrink-0"
        >
          <UButton
            variant="ghost"
            color="neutral"
            size="sm"
            @click="openEditDetails"
          >
            Edit details
          </UButton>
          <div class="flex gap-2">
            <UButton
              variant="outline"
              color="neutral"
              size="sm"
              @click="resetAndClose"
            >
              Cancel
            </UButton>
            <UButton
              color="primary"
              :loading="isCreating"
              @click="addToLibrary"
            >
              Add to library
            </UButton>
          </div>
        </div>

        <!-- Footer for non-preview states -->
        <div
          v-else-if="status !== 'idle' || query.trim()"
          class="px-4 sm:px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end shrink-0"
        >
          <UButton
            variant="outline"
            color="neutral"
            size="sm"
            @click="resetAndClose"
          >
            Cancel
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
