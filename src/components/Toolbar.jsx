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
    <div className="no-print flex flex-col gap-3 rounded-lg border border-border bg-surface-alt p-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Editable title */}
      <input
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        className="w-full rounded border border-border bg-surface px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent sm:max-w-xs"
        aria-label="Conversation title"
      />

      <div className="flex flex-wrap items-center gap-3">
        <ToggleSources enabled={showSources} onToggle={onToggleSources} />

        <button
          onClick={onDownload}
          className="rounded-lg bg-accent/20 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/30"
        >
          ↓ Download .md
        </button>

        <button
          onClick={onPrint}
          className="rounded-lg bg-accent/20 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent/30"
        >
          🖨 Print / PDF
        </button>
      </div>
    </div>
  );
}
