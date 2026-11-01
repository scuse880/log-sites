import type { Post } from "./content.ts";

export const SEARCH_PAGE_SIZE = 15;

export type SearchEntry = {
  post: Post;
  filename: string;
  text: string;
  titleKey: string;
  filenameKey: string;
  pathKey: string;
  textKey: string;
};

export type SearchResult = SearchEntry & { snippet: string; score: number };
export type SearchIndexData = (Omit<SearchEntry, "post"> & { path: string })[];

function normalize(value: string) {
  return value.normalize("NFC").toLocaleLowerCase("ko");
}

export function queryTerms(query: string): string[] {
  return [...new Set(normalize(query.trim()).split(/\s+/).filter(Boolean))];
}

function plainText(markdown: string) {
  return markdown
    .normalize("NFC")
    .replace(/<[^>]*>/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`#*>|~_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Vite embeds the complete markdown corpus at build time. This in-memory index
// is constructed once per corpus, never by reading server files per query.
export function createSearchIndex(posts: Post[]): SearchEntry[] {
  return posts.map((post) => {
    const filename = post.parts.at(-1) ?? post.path;
    const text = plainText(post.body);
    return {
      post,
      filename,
      text,
      titleKey: normalize(post.title),
      filenameKey: normalize(filename),
      pathKey: normalize(post.path),
      textKey: normalize(post.body),
    };
  });
}

export function serializeSearchIndex(posts: Post[]): SearchIndexData {
  return createSearchIndex(posts).map(({ post, ...entry }) => ({ path: post.path, ...entry }));
}

export function hydrateSearchIndex(posts: Post[], data: SearchIndexData): SearchEntry[] {
  const byPath = new Map(posts.map((post) => [post.path, post]));
  return data.flatMap(({ path, ...entry }) => {
    const post = byPath.get(path);
    return post ? [{ ...entry, post }] : [];
  });
}

function makeSnippet(text: string, terms: string[]) {
  const normalized = normalize(text);
  const positions = terms.map((term) => normalized.indexOf(term)).filter((index) => index >= 0);
  const firstMatch = positions.length ? Math.min(...positions) : 0;
  const start = Math.max(0, firstMatch - 48);
  const end = Math.min(text.length, start + 180);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

export function searchDocuments(index: SearchEntry[], query: string): SearchResult[] {
  const terms = queryTerms(query);
  if (!terms.length) return [];

  const results: SearchResult[] = [];
  for (const entry of index) {
    let score = 0;
    let matches = true;
    for (const term of terms) {
      const termScore =
        (entry.filenameKey.includes(term) ? 8 : 0) +
        (entry.titleKey.includes(term) ? 6 : 0) +
        (entry.pathKey.includes(term) ? 3 : 0) +
        (entry.textKey.includes(term) ? 1 : 0);
      if (!termScore) {
        matches = false;
        break;
      }
      score += termScore;
    }
    if (matches) results.push({ ...entry, score, snippet: makeSnippet(entry.text, terms) });
  }
  return results.sort((a, b) => b.score - a.score || a.post.path.localeCompare(b.post.path, "ko"));
}

export function paginateResults<T>(results: T[], requestedPage: number) {
  const totalPages = Math.max(1, Math.ceil(results.length / SEARCH_PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, Math.floor(requestedPage) || 1));
  return { page, totalPages, items: results.slice((page - 1) * SEARCH_PAGE_SIZE, page * SEARCH_PAGE_SIZE) };
}

export function highlightParts(text: string, query: string): { text: string; match: boolean }[] {
  const terms = queryTerms(query).sort((a, b) => b.length - a.length);
  if (!terms.length) return [{ text, match: false }];
  const escaped = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(${escaped.join("|")})`, "giu");
  return text.normalize("NFC").split(pattern).filter(Boolean).map((part) => ({
    text: part,
    match: terms.includes(normalize(part)),
  }));
}
