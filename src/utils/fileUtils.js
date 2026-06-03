/**
 * Trigger a file download in the browser.
 *
 * @param {string} content - File content
 * @param {string} filename - Desired filename
 * @param {string} mimeType - MIME type (default: text/markdown)
 */
export function downloadFile(
  content,
  filename,
  mimeType = "text/markdown;charset=utf-8"
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate a slugified filename from a title and date.
 *
 * @param {string} title - The conversation title
 * @returns {string} Filename like "2026-06-03-gmail-vanilla-js.md"
 */
export function generateFilename(title) {
  const date = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
  const slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // strip non-alphanumeric
    .replace(/\s+/g, "-") // spaces to hyphens
    .replace(/-+/g, "-") // collapse multiple hyphens
    .replace(/^-|-$/g, "") // trim leading/trailing hyphens
    .slice(0, 50); // cap length

  return `${date}-${slug || "gemini-conversation"}.md`;
}
