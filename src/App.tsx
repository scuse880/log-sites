import "./lib/style.css";
import { AppShell, createPostsFromModules } from "./lib";
import FilesPage from "./FilesPage";

const modules = import.meta.glob("./content/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const posts = createPostsFromModules(modules);

export default function App() {
  return <AppShell siteTitle="Learning Log" posts={posts} filesPage={<FilesPage />} />;
}
