export default function PasteInput({ value, onChange, onConvert }) {
  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="paste-input" className="text-sm font-medium text-text-secondary">
        Paste your Gemini conversation
      </label>
      <textarea
        id="paste-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`my q: is it true the first version of gmail was built with vanilla js\nanswer:\nYes, it is largely true that the first version of Gmail (launched in 2004)...`}
        className="w-full min-h-48 md:min-h-64 rounded-lg border border-border bg-surface-alt p-4 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent resize-y font-mono text-sm leading-relaxed"
      />
      <button
        onClick={onConvert}
        disabled={!value.trim()}
        className="w-full rounded-lg bg-accent px-4 py-3 font-semibold text-surface transition-colors hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed md:w-auto md:self-end"
      >
        Convert to Markdown
      </button>
    </div>
  );
}
