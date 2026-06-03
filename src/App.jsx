import { useState, useCallback } from "react";
import PasteInput from "./components/PasteInput.jsx";
import MarkdownPreview from "./components/MarkdownPreview.jsx";
import Toolbar from "./components/Toolbar.jsx";
import { parseConversation } from "./utils/parser.js";
import { formatMarkdown } from "./utils/markdownFormatter.js";
import { downloadFile, generateFilename } from "./utils/fileUtils.js";

export default function App() {
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState(null);
  const [title, setTitle] = useState("");
  const [showSources, setShowSources] = useState(true);

  const markdown = parsed
    ? formatMarkdown({ pairs: parsed.pairs, title, showSources })
    : "";

  const handleConvert = useCallback(() => {
    const result = parseConversation(rawText);
    setParsed(result);
    setTitle(result.title);
  }, [rawText]);

  const handleDownload = useCallback(() => {
    if (!markdown) return;
    const filename = generateFilename(title);
    downloadFile(markdown, filename);
  }, [markdown, title]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleReset = useCallback(() => {
    setRawText("");
    setParsed(null);
    setTitle("");
  }, []);

  return (
    <div className="min-h-screen px-4 py-6 md:px-8">
      <header className="no-print mx-auto mb-6 max-w-4xl">
        <h1 className="text-xl font-bold text-accent">Gemini Converter</h1>
        <p className="text-sm text-text-secondary">
          Paste a Gemini conversation → get clean markdown
        </p>
      </header>

      <main className="mx-auto max-w-4xl flex flex-col gap-6">
        {/* Input area — hidden after conversion on print */}
        {!parsed && (
          <div className="no-print">
            <PasteInput
              value={rawText}
              onChange={setRawText}
              onConvert={handleConvert}
            />
          </div>
        )}

        {/* After conversion: toolbar + preview */}
        {parsed && (
          <>
            <div className="no-print flex items-center justify-between">
              <button
                onClick={handleReset}
                className="text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                ← New conversion
              </button>
            </div>

            <Toolbar
              showSources={showSources}
              onToggleSources={() => setShowSources((s) => !s)}
              onDownload={handleDownload}
              onPrint={handlePrint}
              title={title}
              onTitleChange={setTitle}
            />

            <MarkdownPreview markdown={markdown} />
          </>
        )}
      </main>
    </div>
  );
}
