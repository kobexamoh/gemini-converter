import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarkdownPreview({ markdown }) {
  if (!markdown) return null;

  return (
    <div className="rounded-lg border border-border bg-surface-alt p-6">
      <div className="prose">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
}
