import { stripInlineCitations } from "./parser.js";

/**
 * Convert parsed Q&A pairs into a clean markdown string.
 *
 * @param {Object} params
 * @param {Array} params.pairs - Parsed Q&A pair objects
 * @param {string} params.title - Conversation title
 * @param {boolean} params.showSources - Whether to include citations
 * @returns {string} Formatted markdown
 */
export function formatMarkdown({ pairs, title, showSources = true }) {
  if (!pairs || pairs.length === 0) return "";

  const sections = [];

  // Header
  const date = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
  sections.push(`# ${title}`);
  sections.push(`_Converted: ${date}_\n`);
  sections.push("---\n");

  // Q&A pairs
  pairs.forEach((pair, index) => {
    const num = index + 1;

    // Question heading
    if (pair.question) {
      sections.push(`## Q${num}: ${pair.question}\n`);
    } else if (pairs.length > 1) {
      sections.push(`## Part ${num}\n`);
    }

    // Answer body — adjust heading levels so they nest under the Q heading
    let answer = pair.answer;
    if (!showSources) {
      answer = stripInlineCitations(answer);
    }

    // Bump any markdown headings down by 1 level to nest under the Q## heading
    answer = adjustHeadingLevels(answer);

    sections.push(answer);

    // Citations appendix for this Q&A
    if (showSources && pair.citations.length > 0) {
      sections.push("\n**Sources:**");
      pair.citations.forEach((cite) => {
        if (cite.url) {
          sections.push(
            `- [${cite.num}] [${cite.label || cite.url}](${cite.url})`
          );
        } else if (cite.label) {
          sections.push(`- [${cite.num}] ${cite.label}`);
        }
      });
    }

    sections.push("\n---\n");
  });

  return sections.join("\n").trim() + "\n";
}

/**
 * Bump heading levels in the answer text by 1 so ## becomes ###, etc.
 * Only bumps by 1 to keep subheadings readable while nesting under Q## headings.
 */
function adjustHeadingLevels(text) {
  return text.replace(/^(#{1,4})\s/gm, (match, hashes) => {
    const newLevel = Math.min(hashes.length + 1, 6);
    return "#".repeat(newLevel) + " ";
  });
}
