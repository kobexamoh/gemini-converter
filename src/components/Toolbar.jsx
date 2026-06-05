import ToggleSources from "./ToggleSources.jsx";

export default function Toolbar({
  showSources,
  onToggleSources,
  onDownload,
  onPrint,
  title,
  onTitleChange,
}) {
  return (
    <div className="no-print flex flex-col gap-3 rounded-lg border border-border bg-surface-alt p-4 sm:flex-row sm:items-center sm:justify-between" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Editable title */}
      <input
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        className="w-full rounded border border-border bg-surface px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 sm:max-w-xs"
        aria-label="Conversation title"
      />

      <div className="flex flex-wrap items-center gap-3">
        <ToggleSources enabled={showSources} onToggle={onToggleSources} />

        <button
          onClick={onDownload}
          className="rounded border border-border px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
        >
          ↓ Download .md
        </button>

        <button
          onClick={onPrint}
          className="rounded border border-border px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-hover"
        >
          Print / PDF
        </button>
      </div>
    </div>
  );
}
