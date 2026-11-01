import test from "node:test";
import assert from "node:assert/strict";
import { createPostsFromModules, buildTree } from "../src/lib/content.ts";
import { createSearchIndex, serializeSearchIndex, hydrateSearchIndex, searchDocuments, paginateResults, highlightParts } from "../src/lib/search.ts";
import { ancestorPaths, documentHref, parseRoute, resolveDocumentHref, searchHref } from "../src/lib/navigation.ts";

const posts = createPostsFromModules({
  "./content/급여/주기별/매월.md": "---\ntitle: 월급 안내\n---\n매달 급여를 지급하고 원천징수를 확인합니다.",
  "./content/인사/유형별/신규채용.md": "# 채용\n보험 자격 취득과 급여 계좌를 등록합니다.",
  "./content/인사/주기별/매년.md": "# 연차\n연차유급휴가 정산 기준",
  "./content/기록물/퇴직[계약만료].md": "계약이 종료된 문서를 보존합니다.",
});
const index = createSearchIndex(posts);

test("the serialized deployment index reuses existing documents and includes subsequent document changes", () => {
  const data = JSON.parse(JSON.stringify(serializeSearchIndex(posts)));
  assert.ok(!("post" in data[0]));
  assert.deepEqual(searchDocuments(hydrateSearchIndex(posts, data), "급여"), searchDocuments(index, "급여"));
  assert.equal(hydrateSearchIndex(posts, data)[0].post, posts[0]);
  const changed = posts.map((post, position) => position === 0 ? { ...post, body: `${post.body} 배포갱신확인` } : post);
  assert.equal(searchDocuments(hydrateSearchIndex(changed, serializeSearchIndex(changed)), "배포갱신확인").length, 1);
});

test("filename, complete nested path, title and markdown body are independently searchable", () => {
  assert.equal(searchDocuments(index, "매월.md")[0].post.path, "급여/주기별/매월.md");
  assert.equal(searchDocuments(index, "인사/유형별")[0].filename, "신규채용.md");
  assert.equal(searchDocuments(index, "월급 안내")[0].filename, "매월.md");
  assert.equal(searchDocuments(index, "원천징수")[0].filename, "매월.md");
  assert.equal(searchDocuments(index, "급여").length, 2);
});

test("multiple search words may match different fields and all must match", () => {
  assert.equal(searchDocuments(index, "인사 계좌")[0].filename, "신규채용.md");
  assert.equal(searchDocuments(index, "인사 원천징수").length, 0);
  assert.deepEqual(searchDocuments(index, "   "), []);
  assert.deepEqual(searchDocuments(index, "존재하지않는검색어"), []);
});

test("normalization handles Korean decomposition and Latin case without mutating documents", () => {
  const sample = createPostsFromModules({ "./content/Test.md": "한글 Cloudflare" });
  const entries = createSearchIndex(sample);
  assert.equal(searchDocuments(entries, "한글".normalize("NFD")).length, 1);
  assert.equal(searchDocuments(entries, "CLOUDFLARE").length, 1);
  assert.equal(sample[0].body, "한글 Cloudflare");
});

test("snippets include matches deep in a document", () => {
  const sample = createPostsFromModules({ "./content/긴 문서.md": `${"앞부분 ".repeat(200)}찾을단어 뒤쪽 내용` });
  const result = searchDocuments(createSearchIndex(sample), "찾을단어")[0];
  assert.ok(result.snippet.startsWith("…"));
  assert.ok(result.snippet.includes("찾을단어"));
  assert.ok(result.snippet.length <= 182);
});

test("search pages hold 15 items, preserve every result, and clamp invalid pages", () => {
  const items = Array.from({ length: 32 }, (_, index) => index);
  assert.deepEqual(paginateResults(items, 1).items, items.slice(0, 15));
  assert.deepEqual(paginateResults(items, 2).items, items.slice(15, 30));
  assert.deepEqual(paginateResults(items, 3).items, [30, 31]);
  assert.equal(paginateResults(items, 999).page, 3);
  assert.equal(paginateResults(items, -8).page, 1);
  assert.equal(paginateResults([], 1).totalPages, 1);
});

test("highlighting treats regex punctuation literally and never produces HTML", () => {
  const parts = highlightParts("퇴직[계약만료].md <script> 급여", "[계약만료] 급여");
  assert.deepEqual(parts.filter((part) => part.match).map((part) => part.text), ["[계약만료]", "급여"]);
  assert.equal(parts.map((part) => part.text).join(""), "퇴직[계약만료].md <script> 급여");
});

test("initial menu has no open ancestors; document links expand only their path", () => {
  assert.equal(ancestorPaths(null).size, 0);
  const post = posts.find((post) => post.path === "인사/유형별/신규채용.md");
  assert.deepEqual([...ancestorPaths(post)], ["인사", "인사/유형별"]);
  const tree = buildTree(posts);
  assert.ok(tree.children.every((node) => !node.post));
  assert.equal(tree.children.find((node) => node.name === "인사").children.length, 2);
});

test("tree paths distinguish folders and files with similar names", () => {
  const sample = createPostsFromModules({ "./content/문서.md": "file", "./content/문서/하위.md": "nested" });
  assert.equal(buildTree(sample).children.length, 2);
});

test("document routes survive Korean, spaces and reserved filename characters", () => {
  const post = { path: "인사/한글 공백 [계약] #1?.md" };
  assert.deepEqual(parseRoute(documentHref(post)), { kind: "document", path: post.path });
  assert.deepEqual(parseRoute("#/doc/%ZZ"), { kind: "not-found" });
  assert.deepEqual(parseRoute(""), { kind: "home" });
  assert.deepEqual(parseRoute("#/files"), { kind: "files" });
});

test("search URL stores its query and page for reloads and browser history", () => {
  assert.deepEqual(parseRoute(searchHref("  급여 & 휴가  ", 2)), { kind: "search", query: "급여 & 휴가", page: 2 });
  assert.equal(parseRoute("#/search?q=test&page=Infinity").page, 1);
  assert.equal(parseRoute("#/search?q=test&page=-2").page, 1);
});

test("relative markdown links navigate through document routes, external links remain intact", () => {
  const current = posts.find((post) => post.path === "인사/유형별/신규채용.md");
  const target = posts.find((post) => post.path === "인사/주기별/매년.md");
  assert.equal(resolveDocumentHref("../주기별/매년.md", current, posts), documentHref(target));
  assert.equal(resolveDocumentHref("/인사/주기별/매년", current, posts), documentHref(target));
  assert.equal(resolveDocumentHref("https://example.com/file.md", current, posts), "https://example.com/file.md");
});

test("Windows paths and UTF-8 BOM are accepted without changing the original corpus", () => {
  const sample = createPostsFromModules({ ".\\content\\급여\\원본.md": "\uFEFF---\r\ntitle: 기존 제목\r\n---\r\n기존 본문" });
  assert.equal(sample[0].path, "급여/원본.md");
  assert.equal(sample[0].title, "기존 제목");
  assert.equal(sample[0].body, "기존 본문");
});
