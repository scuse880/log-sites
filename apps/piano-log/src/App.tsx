import { AppShell, createPostsFromModules } from "@log/shared";
import "@log/shared/style.css";

const modules = import.meta.glob("./content/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const posts = createPostsFromModules(modules);

export default function App() {
  return <AppShell siteTitle="Piano Log" posts={posts} />;
}
