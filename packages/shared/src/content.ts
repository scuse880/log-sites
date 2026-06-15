export type Post = {
  path: string;
  slug: string;
  title: string;
  date?: string;
  tags: string[];
  body: string;
  parts: string[];
};

export type TreeNode = {
  name: string;
  path: string;
  children: TreeNode[];
  post?: Post;
};

function parseFrontmatter(raw: string) {
  raw = raw
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trimStart();

  const match = raw.match(/^---[ \t]*\n([\s\S]*?)\n---[ \t]*\n?([\s\S]*)$/);

  if (!match) {
    return {
      data: {},
      body: raw,
    };
  }

  const front = match[1];
  const body = match[2];

  const data: Record<string, string | string[]> = {};

  for (const line of front.split("\n")) {
    const [key, ...rest] = line.split(":");
    if (!key || rest.length === 0) continue;

    const value = rest.join(":").trim();

    if (value.startsWith("[") && value.endsWith("]")) {
      data[key.trim()] = value
        .slice(1, -1)
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    } else {
      data[key.trim()] = value;
    }
  }

  return { data, body };
}

function filenameToTitle(filename: string) {
  return filename
    .replace(/\.md$/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function createPostsFromModules(
  modules: Record<string, string>,
  basePath = "./content/",
): Post[] {
  return Object.entries(modules).map(([path, raw]) => {
    const { data, body } = parseFrontmatter(raw);

    const cleanPath = path.replace(basePath, "");
    const parts = cleanPath.split("/");
    const fileName = parts[parts.length - 1];
    const slug = cleanPath.replace(/\.md$/, "");

    return {
      path: cleanPath,
      slug,
      title: typeof data.title === "string" ? data.title : filenameToTitle(fileName),
      date: typeof data.date === "string" ? data.date : undefined,
      tags: Array.isArray(data.tags) ? data.tags : [],
      body,
      parts,
    };
  });
}

export function buildTree(posts: Post[]): TreeNode {
  const root: TreeNode = {
    name: "root",
    path: "",
    children: [],
  };

  for (const post of posts) {
    let current = root;

    post.parts.forEach((part, index) => {
      const isFile = index === post.parts.length - 1;
      const name = isFile ? post.title : part;
      const nodePath = post.parts.slice(0, index + 1).join("/").replace(/\.md$/, "");

      let child = current.children.find((c) => c.path === nodePath);

      if (!child) {
        child = {
          name,
          path: nodePath,
          children: [],
        };

        current.children.push(child);
      }

      if (isFile) {
        child.post = post;
      }

      current = child;
    });
  }

  return root;
}
