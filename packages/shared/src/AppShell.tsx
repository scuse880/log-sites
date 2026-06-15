import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";

import "katex/dist/katex.min.css";
import "highlight.js/styles/github.css";

import { buildTree, type TreeNode, type Post } from "./content";

function formatFolderName(name: string) {
  return name.replace(/-/g, " ");
}

function TreeView({
  node,
  onSelect,
}: {
  node: TreeNode;
  onSelect: (post: Post) => void;
}) {
  if (node.name === "root") {
    return (
      <ul className="tree">
        {node.children.map((child) => (
          <TreeView key={child.path} node={child} onSelect={onSelect} />
        ))}
      </ul>
    );
  }

  if (node.post) {
    return (
      <li>
        <button className="tree-file" onClick={() => onSelect(node.post!)}>
          {node.name}
        </button>
      </li>
    );
  }

  return (
    <li>
      <details open>
        <summary>{formatFolderName(node.name)}</summary>
        <ul>
          {node.children.map((child) => (
            <TreeView key={child.path} node={child} onSelect={onSelect} />
          ))}
        </ul>
      </details>
    </li>
  );
}

type AppShellProps = {
  siteTitle: string;
  posts: Post[];
};

export default function AppShell({ siteTitle, posts }: AppShellProps) {
  const tree = useMemo(() => buildTree(posts), [posts]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(posts[0] ?? null);

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1 className="site-title">{siteTitle}</h1>
        <TreeView node={tree} onSelect={setSelectedPost} />
      </aside>

      <main className="content">
        {selectedPost ? (
          <>
            <header className="post-header">
              <h1>{selectedPost.title}</h1>
              {selectedPost.date && <p className="date">{selectedPost.date}</p>}
              {selectedPost.tags.length > 0 && (
                <div className="tags">
                  {selectedPost.tags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
              )}
            </header>

            <article className="markdown-body">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex, rehypeHighlight]}
              >
                {selectedPost.body}
              </ReactMarkdown>
            </article>
          </>
        ) : (
          <p>문서를 선택하세요.</p>
        )}
      </main>
    </div>
  );
}
