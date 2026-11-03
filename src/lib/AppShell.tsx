import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";

import "katex/dist/katex.min.css";
import "highlight.js/styles/github.css";

import { buildTree, type Post, type TreeNode } from "./content";
import { ancestorPaths, documentHref, parseRoute, resolveDocumentHref, searchHref } from "./navigation";
import { createSearchIndex, hydrateSearchIndex, highlightParts, paginateResults, searchDocuments, type SearchIndexData, type SearchResult } from "./search";
import "./search.css";

function Highlight({ text, query }: { text: string; query: string }) {
  return <>{highlightParts(text, query).map((part, index) => part.match
    ? <mark key={index}>{part.text}</mark>
    : part.text)}</>;
}

function SearchIcon() {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" />
  </svg>;
}

function TreeView({ node, selectedPath, expanded, onToggle }: {
  node: TreeNode;
  selectedPath?: string;
  expanded: Set<string>;
  onToggle: (path: string) => void;
}) {
  const children = () => node.children.map((child) => <TreeView key={child.path}
    node={child} selectedPath={selectedPath} expanded={expanded} onToggle={onToggle} />);

  if (node.path === "") return <ul className="tree">{children()}</ul>;
  if (node.post) {
    return <li><a className={`tree-file${selectedPath === node.post.path ? " is-current" : ""}`}
      href={documentHref(node.post)} aria-current={selectedPath === node.post.path ? "page" : undefined}>
      {node.name}
    </a></li>;
  }

  const open = expanded.has(node.path);
  return <li>
    <button className="tree-folder" aria-expanded={open} onClick={() => onToggle(node.path)}>
      <span aria-hidden="true" className="folder-chevron">{open ? "▾" : "▸"}</span>{node.name}
    </button>
    {open && <ul>{children()}</ul>}
  </li>;
}

function SearchResultLink({ result, query, onSelect }: {
  result: SearchResult;
  query: string;
  onSelect?: () => void;
}) {
  return <a className="search-result-link" href={documentHref(result.post)} onClick={onSelect}>
    <strong><Highlight text={result.filename} query={query} /></strong>
    <span className="search-result-path"><Highlight text={result.post.path} query={query} /></span>
    <span className="search-result-snippet"><Highlight text={result.snippet || "본문이 없는 문서입니다."} query={query} /></span>
  </a>;
}

export default function AppShell({ siteTitle, posts, filesPage, searchData }: {
  siteTitle: string;
  posts: Post[];
  filesPage?: ReactNode;
  searchData?: SearchIndexData;
}) {
  const tree = useMemo(() => buildTree(posts), [posts]);
  const searchIndex = useMemo(() => searchData ? hydrateSearchIndex(posts, searchData) : createSearchIndex(posts), [posts, searchData]);
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  const [query, setQuery] = useState(route.kind === "search" ? route.query : "");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(true);
  const selectedPost = route.kind === "document" ? posts.find((post) => post.path === route.path) ?? null : null;
  const [expanded, setExpanded] = useState(() => ancestorPaths(selectedPost));
  const composing = useRef(false);
  const compositionEnded = useRef(-Infinity);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestions = useMemo(() => searchDocuments(searchIndex, query), [searchIndex, query]);
  const resultQuery = route.kind === "search" ? route.query : "";
  const searchResults = useMemo(() => searchDocuments(searchIndex, resultQuery), [searchIndex, resultQuery]);
  const resultPage = paginateResults(searchResults, route.kind === "search" ? route.page : 1);

  useEffect(() => {
    const onHashChange = () => {
      const nextRoute = parseRoute(window.location.hash);
      setRoute(nextRoute);
      setSuggestionsOpen(false);
      if (nextRoute.kind === "search") setQuery(nextRoute.query);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    setExpanded(ancestorPaths(selectedPost));
    if (selectedPost) setMenuVisible(true);
  }, [selectedPost?.path]);

  useEffect(() => {
    const pageTitle = selectedPost?.title ?? (route.kind === "search" ? `검색: ${route.query}` : route.kind === "files" ? "파일 자료실" : "");
    document.title = pageTitle ? `${pageTitle} · ${siteTitle}` : siteTitle;
  }, [route, selectedPost, siteTitle]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    if (composing.current) return;
    setSuggestionsOpen(false);
    window.location.hash = searchHref(query);
    inputRef.current?.blur();
  }

  function toggleFolder(path: string) {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  return <div className="layout">
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="site-title"><a href="#/">{siteTitle}</a></h1>
        <div className="search-widget" onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setSuggestionsOpen(false);
        }}>
          <form className="search-form" role="search" onSubmit={submitSearch}>
            <label className="visually-hidden" htmlFor="document-search">전체 문서 검색</label>
            <input id="document-search" ref={inputRef} type="search" value={query} placeholder="문서 검색"
              autoComplete="off" maxLength={200} aria-controls="search-suggestions"
              aria-expanded={suggestionsOpen && !!query.trim()}
              onChange={(event) => { setQuery(event.target.value); setSuggestionsOpen(true); }}
              onFocus={() => setSuggestionsOpen(true)}
              onCompositionStart={() => { composing.current = true; }}
              onCompositionEnd={() => { composing.current = false; compositionEnded.current = performance.now(); }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (composing.current || event.nativeEvent.isComposing || event.keyCode === 229 || performance.now() - compositionEnded.current < 100)) event.preventDefault();
                if (event.key === "Escape") setSuggestionsOpen(false);
              }} />
            <button type="submit" aria-label="전체 검색 결과 보기" title="검색"><SearchIcon /></button>
          </form>
          {suggestionsOpen && query.trim() && <div id="search-suggestions" className="search-suggestions">
            <p className="suggestions-count" role="status">검색 결과 {suggestions.length}개</p>
            {suggestions.length ? <ul>
              {suggestions.slice(0, 6).map((result) => <li key={result.post.path}>
                <SearchResultLink result={result} query={query} onSelect={() => setSuggestionsOpen(false)} />
              </li>)}
            </ul> : <p className="search-empty">검색 결과가 없습니다.</p>}
            <a className="all-results-link" href={searchHref(query)} onClick={() => setSuggestionsOpen(false)}>전체 검색 결과 보기 →</a>
          </div>}
        </div>
      </div>
      <div className="menu-toolbar">
        <span>문서 메뉴 <small>{posts.length}</small></span>
        <button type="button" aria-expanded={menuVisible} aria-controls="document-navigation"
          onClick={() => setMenuVisible((visible) => !visible)}>{menuVisible ? "메뉴 접기" : "메뉴 펼치기"}</button>
      </div>
      <nav id="document-navigation" className="document-navigation" aria-label="문서 폴더" hidden={!menuVisible}>
        <TreeView node={tree} expanded={expanded} selectedPath={selectedPost?.path} onToggle={toggleFolder} />
      </nav>
      {filesPage && <div className="sidebar-footer">
        <a className="files-nav-link" href="https://maple.csstudylog.com" target="_blank" rel="noopener noreferrer">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M7 5h10c3 0 4 3 5 10 1 5-2 6-5 2H7c-3 4-6 3-5-2 1-7 2-10 5-10Z M7 9v5 M4.5 11.5h5 M16 10h.1 M19 13h.1" />
          </svg>CSMaple 학습 모험
        </a>
        <a className="files-nav-link" href="#/files" aria-current={route.kind === "files" ? "page" : undefined}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 3v13m-5-5 5 5 5-5M4 15v6h16v-6" />
          </svg>파일 자료실
        </a>
      </div>}
    </aside>

    <main className="content" id="main-content">
      {route.kind === "search" ? <section className="search-results-page" aria-labelledby="results-title">
        <header className="post-header"><h1 id="results-title">검색 결과</h1>
          <p role="status">{resultQuery.trim() ? <>‘{resultQuery}’ · 총 <strong>{searchResults.length}</strong>개</> : "검색어를 입력해 주세요."}</p>
        </header>
        {resultQuery.trim() && (searchResults.length ? <>
          <ol className="search-results" start={(resultPage.page - 1) * 15 + 1}>
            {resultPage.items.map((result) => <li key={result.post.path}><SearchResultLink result={result} query={resultQuery} /></li>)}
          </ol>
          <nav className="search-pagination" aria-label="검색 결과 페이지">
            {resultPage.page > 1 ? <a href={searchHref(resultQuery, resultPage.page - 1)}>← 이전</a> : <span aria-disabled="true">← 이전</span>}
            <span>{resultPage.page} / {resultPage.totalPages} 페이지</span>
            {resultPage.page < resultPage.totalPages ? <a href={searchHref(resultQuery, resultPage.page + 1)}>다음 →</a> : <span aria-disabled="true">다음 →</span>}
          </nav>
        </> : <p className="search-empty">검색 결과가 없습니다. 다른 검색어를 입력해 보세요.</p>)}
      </section> : route.kind === "files" && filesPage ? filesPage : selectedPost ? <>
        <header className="post-header">
          <p className="document-breadcrumb">{selectedPost.path}</p>
          <h1>{selectedPost.title}</h1>
          {selectedPost.date && <p className="date">{selectedPost.date}</p>}
          {selectedPost.tags.length > 0 && <div className="tags">
            {selectedPost.tags.map((tag) => <span key={tag}>#{tag}</span>)}
          </div>}
        </header>
        <article className="markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeHighlight]}
            components={{ a: ({ href, node: _node, ...props }) => <a {...props} href={resolveDocumentHref(href, selectedPost, posts)} /> }}>
            {selectedPost.body}
          </ReactMarkdown>
        </article>
      </> : route.kind === "home" ? <section className="home-introduction">
        <h1>{siteTitle}</h1><p>왼쪽 폴더를 펼쳐 문서를 선택하거나, 파일명·경로·본문으로 검색하세요.</p>
        <p className="document-count">전체 문서 {posts.length}개</p>
      </section> : <section><h1>문서를 찾을 수 없습니다.</h1><p>왼쪽 메뉴나 검색에서 문서를 다시 선택해 주세요.</p><a href="#/">처음으로</a></section>}
    </main>
  </div>;
}
