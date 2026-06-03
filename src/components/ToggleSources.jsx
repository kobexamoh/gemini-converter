export default function ToggleSources({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface-hover"
      aria-pressed={enabled}
    >
      <span
        className={`inline-block h-4 w-8 rounded-full transition-colors ${
          enabled ? "bg-accent" : "bg-border"
        } relative`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
            enabled ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
      <span className="text-text-secondary">Sources</span>
    </button>
  );
}
