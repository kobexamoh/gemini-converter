import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarkdownPreview({ markdown }) {
  if (!markdown) return null;

  return (
    <div className="rounded-lg border border-border bg-surface-alt px-8 py-8 md:px-12">
      <div className="prose mx-auto">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
}
