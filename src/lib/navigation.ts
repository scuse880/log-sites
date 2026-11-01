import type { Post } from "./content";

export type Route =
  | { kind: "home" }
  | { kind: "document"; path: string }
  | { kind: "search"; query: string; page: number }
  | { kind: "files" }
  | { kind: "not-found" };

export function parseRoute(hash: string): Route {
  const [pathname, query = ""] = hash.replace(/^#/, "").split("?", 2);
  if (!pathname || pathname === "/") return { kind: "home" };
  if (pathname === "/files") return { kind: "files" };
  if (pathname === "/search") {
    const params = new URLSearchParams(query);
    const requestedPage = Number(params.get("page") ?? "1");
    return {
      kind: "search",
      query: params.get("q") ?? "",
      page: Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    };
  }
  if (pathname.startsWith("/doc/")) {
    try {
      return { kind: "document", path: decodeURIComponent(pathname.slice(5)) };
    } catch {
      return { kind: "not-found" };
    }
  }
  return { kind: "not-found" };
}

export function documentHref(post: Pick<Post, "path">) {
  return `#/doc/${encodeURIComponent(post.path)}`;
}

export function searchHref(query: string, page = 1) {
  return `#/search?${new URLSearchParams({ q: query.trim(), page: String(page) })}`;
}

export function ancestorPaths(post: Post | null): Set<string> {
  return new Set(post?.parts.slice(0, -1).map((_, index) => post.parts.slice(0, index + 1).join("/")) ?? []);
}

export function resolveDocumentHref(href: string | undefined, current: Post, posts: Post[]) {
  if (!href || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(href)) return href;
  let pathname: string;
  try {
    pathname = decodeURIComponent(href.split(/[?#]/, 1)[0]);
  } catch {
    return href;
  }
  const parts = pathname.startsWith("/") ? [] : current.parts.slice(0, -1);
  for (const part of pathname.split("/")) {
    if (part === "..") parts.pop();
    else if (part && part !== ".") parts.push(part);
  }
  const path = parts.join("/");
  const target = posts.find((post) => post.path === path || post.slug === path);
  return target ? documentHref(target) : href;
}
