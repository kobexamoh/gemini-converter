/**
 * Parses raw Gemini conversation text into structured Q&A pairs.
 *
 * Supports formats:
 * - "my q:" / "my q2:" / "my q3:" style prefixes
 * - "question:" / "q:" prefixes
 * - "answer:" prefix for responses
 *
 * Each pair contains the question text, answer text,
 * inline citation markers, and reference links.
 */

// Matches question markers like "my q:", "my q2:", "initial q:", "follow up q:", "q:"
// Allows optional prefix words before q/question
const QUESTION_REGEX =
  /^(?:(?:my|initial|follow\s*-?\s*up|next|final|last|bonus)\s+)?q(?:uestion)?\s*(\d*)\s*[:]\s*/im;

// Matches answer markers like "answer:", "a:"
const ANSWER_REGEX = /^answer\s*[:]\s*/im;

// Matches inline citation markers like [1, 2, 3] or [1]
const INLINE_CITATION_REGEX = /\[(\d+(?:,\s*\d+)*)\]/g;

// Matches reference lines like [1] [https://example.com](https://example.com)
// or [1] https://example.com
const REFERENCE_LINE_REGEX =
  /^\[(\d+)\]\s*(?:\[([^\]]+)\]\(([^)]+)\)|(\S+))\s*$/;

/**
 * Parse raw text into an array of Q&A pair objects.
 * @param {string} rawText - The pasted Gemini conversation text
 * @returns {{ pairs: Array<{question: string, answer: string, citations: Array}>, title: string }}
 */
export function parseConversation(rawText) {
  if (!rawText || !rawText.trim()) {
    return { pairs: [], title: "" };
  }

  // Strip HTML blocks (Gemini's embedded stock charts, widgets, etc.)
  rawText = stripHtmlBlocks(rawText);

  // Clean LaTeX notation into readable plain text
  rawText = cleanLatexNotation(rawText);

  // Re-insert line breaks before block-level markers that got merged inline
  rawText = normalizeBlockElements(rawText);

  // Convert long dash runs into proper markdown horizontal rules
  rawText = normalizeHorizontalRules(rawText);

  // Wrap [Foo] ➔ [Bar] flow diagrams in code fences
  rawText = wrapFlowDiagrams(rawText);

  // Ensure table pipe syntax gets blank lines around it
  rawText = normalizeTableBlocks(rawText);

  // Normalize nested lists (fix copy-paste artifacts from Gemini)
  rawText = normalizeNestedLists(rawText);

  const lines = rawText.split("\n");
  const pairs = [];
  let currentQuestion = null;
  let currentAnswer = null;
  let currentCitations = [];
  let buffer = [];
  let mode = "unknown"; // 'question', 'answer', or 'unknown'

  function flushPair() {
    if (currentQuestion !== null || currentAnswer !== null) {
      const answerText = currentAnswer || buffer.join("\n").trim();
      const { cleanText, citations } = extractCitations(answerText);
      pairs.push({
        question: currentQuestion || "",
        answer: cleanText,
        citations: [...currentCitations, ...citations],
      });
    }
    currentQuestion = null;
    currentAnswer = null;
    currentCitations = [];
    buffer = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const questionMatch = line.match(QUESTION_REGEX);
    const answerMatch = line.match(ANSWER_REGEX);

    if (questionMatch) {
      // We hit a new question — flush whatever we had
      if (mode === "answer") {
        currentAnswer = buffer.join("\n").trim();
        flushPair();
      } else if (mode === "question") {
        // Question without an answer before it — flush as-is
        flushPair();
      }
      // Start new question
      const questionText = line.replace(QUESTION_REGEX, "").trim();
      currentQuestion = questionText;
      buffer = [];
      mode = "question";
    } else if (answerMatch) {
      // Start collecting answer
      const answerStart = line.replace(ANSWER_REGEX, "").trim();
      buffer = answerStart ? [answerStart] : [];
      mode = "answer";
    } else {
      buffer.push(line);
    }
  }

  // Flush the final pair
  if (mode === "answer") {
    currentAnswer = buffer.join("\n").trim();
    flushPair();
  } else if (mode === "question") {
    currentAnswer = buffer.join("\n").trim();
    flushPair();
  } else if (buffer.length > 0 && buffer.join("").trim()) {
    // No question/answer markers found — treat the whole thing as a single
    // answer block (user just pasted Gemini output without their questions)
    const fullText = buffer.join("\n").trim();
    const { cleanText, citations } = extractCitations(fullText);
    pairs.push({
      question: "",
      answer: cleanText,
      citations,
    });
  }

  const title = guessTitle(pairs);

  return { pairs, title };
}

/**
 * Extract citation references from answer text.
 * Separates inline [N] markers and [N] URL reference lines.
 */
function extractCitations(text) {
  const lines = text.split("\n");
  const contentLines = [];
  const citations = [];

  for (const line of lines) {
    const refMatch = line.match(REFERENCE_LINE_REGEX);
    if (refMatch) {
      const num = refMatch[1];
      const label = refMatch[2] || refMatch[4] || "";
      const url = refMatch[3] || refMatch[4] || "";
      citations.push({ num, label, url });
    } else {
      contentLines.push(line);
    }
  }

  return {
    cleanText: contentLines.join("\n").trim(),
    citations,
  };
}

/**
 * Strip inline citation markers [1, 2, 3] from text.
 */
export function stripInlineCitations(text) {
  return text.replace(INLINE_CITATION_REGEX, "").replace(/ {2,}/g, " ");
}

/**
 * Normalize nested list indentation from Gemini's copy-paste output.
 *
 * Gemini's copy-paste often produces inconsistent nesting:
 *   - `   * Item` (3-space indent) for sub-items
 *   - `      * Item` (6-space indent) for sub-sub-items
 *   - Mixed `*` bullets where numbered sub-lists were intended
 *
 * This normalizes them into standard markdown nesting that
 * react-markdown renders correctly.
 */
function normalizeNestedLists(text) {
  const lines = text.split("\n");
  const result = [];
  let lastNumberedIndent = -1;
  let subItemCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track numbered list items at any indent level
    const numberedMatch = line.match(/^(\s*)(\d+)\.\s/);
    if (numberedMatch) {
      lastNumberedIndent = numberedMatch[1].length;
      subItemCounter = 0;
      result.push(line);
      continue;
    }

    // Detect indented bullet that's a child of a numbered item.
    // Convert `   * Item` to `   1. Item` when it follows a numbered list.
    const bulletMatch = line.match(/^(\s+)\*\s(.+)/);
    if (bulletMatch && lastNumberedIndent >= 0) {
      const indent = bulletMatch[1].length;
      const content = bulletMatch[2];

      // Bullet at same indent or deeper than the parent numbered item
      // is a sub-item (Gemini copy-paste converts numbered sub-lists to bullets)
      if (indent >= lastNumberedIndent) {
        subItemCounter++;
        // Use 4-space indent relative to parent for proper nesting
        const newIndent = " ".repeat(lastNumberedIndent + 4);
        result.push(`${newIndent}${subItemCounter}. ${content}`);
        continue;
      }
    }

    // Reset tracking on blank lines or non-list content
    if (line.trim() === "" || (!numberedMatch && !bulletMatch)) {
      // Only reset if it's a true content break (not just whitespace between list items)
      if (line.trim() === "" && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (!nextLine.match(/^\s+[*]\s/) && !nextLine.match(/^\s+\d+\.\s/)) {
          lastNumberedIndent = -1;
          subItemCounter = 0;
        }
      }
    }

    result.push(line);
  }

  return result.join("\n");
}

/**
 * Clean LaTeX notation from Gemini output into readable plain text.
 *
 * Handles:
 *   - `$\$34$` → `$34`  (inline dollar amounts)
 *   - `$397\%$` → `397%` (inline percentages)
 *   - `$$\text{Market Cap} = ...$$` → `Market Cap = ...` (display math)
 *   - `\text{...}` → unwrapped text
 */
function cleanLatexNotation(text) {
  // Display math blocks: $$...$$ → unwrap and clean inner LaTeX
  text = text.replace(/\$\$([^$]+?)\$\$/g, (match, inner) => {
    return inner
      .replace(/\\text\{([^}]*)\}/g, "$1")
      .replace(/\\times/g, "×")
      .replace(/\\,/g, " ")
      .trim();
  });

  // Inline dollar amounts: $\$34$ → $34
  text = text.replace(/\$\\\$([\d,.]+)\$/g, "$$$1");

  // Inline percentages: $397\%$ → 397%
  text = text.replace(/\$([\d,.]+)\\%\$/g, "$1%");

  // Any remaining \text{...} outside of math delimiters
  text = text.replace(/\\text\{([^}]*)\}/g, "$1");

  return text;
}

/**
 * Re-insert line breaks before block-level markdown markers that Gemini's
 * copy-paste merged into a single line.
 *
 * Detects inline `##`, `* `, `1. `, etc. mid-paragraph and splits them
 * onto their own lines with blank lines before them so markdown renders
 * headings, lists, and other block elements correctly.
 */
function normalizeBlockElements(text) {
  // Split heading markers (##) onto their own line when mid-paragraph
  // e.g. "some text ## Heading" → "some text\n\n## Heading"
  text = text.replace(/([^\n])\s*(#{1,6}\s)/g, "$1\n\n$2");

  // Split inline bullet items after colon: "details: * Item" → "details:\n\n* Item"
  text = text.replace(/:\s*\*\s+/g, ":\n\n* ");

  // Split inline numbered list items: "...text 1. Item" when 1. follows sentence-end
  text = text.replace(/([.!?])\s+(\d+\.\s)/g, "$1\n\n$2");

  return text;
}

/**
 * Convert long dash sequences (5+ dashes) into proper markdown
 * horizontal rules (`---`) with blank lines around them.
 */
function normalizeHorizontalRules(text) {
  return text.replace(/^-{5,}$/gm, "\n---\n");
}

/**
 * Detect `[Foo] ➔ [Bar] ➔ [Baz]` flow diagram patterns and wrap them
 * in markdown code fences so they render as preformatted blocks
 * instead of running into surrounding text.
 */
function wrapFlowDiagrams(text) {
  // Match lines containing [Something] ➔ [Something] (at least one arrow)
  return text.replace(
    /^(.*\[.+?\]\s*➔\s*\[.+?\].*)$/gm,
    "\n```\n$1\n```\n"
  );
}

/**
 * Ensure markdown table blocks (lines starting with `|`) have blank
 * lines before and after them so react-markdown parses them as tables.
 */
function normalizeTableBlocks(text) {
  const lines = text.split("\n");
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isTableLine = /^\|/.test(line.trim());
    const prevIsTableLine =
      i > 0 && /^\|/.test((lines[i - 1] || "").trim());
    const nextIsTableLine =
      i < lines.length - 1 && /^\|/.test((lines[i + 1] || "").trim());

    // Add blank line before first table row
    if (isTableLine && !prevIsTableLine) {
      // Insert separator row after header if the next line is also a table
      // line but there's no `---` separator yet
      result.push("");
    }

    result.push(line);

    // If this is the first table row and next is also a table row,
    // check if we need to inject a separator row
    if (
      isTableLine &&
      nextIsTableLine &&
      !prevIsTableLine
    ) {
      // Count columns by splitting on |
      const cols = line.split("|").length - 1;
      const nextLine = lines[i + 1].trim();
      // Only inject separator if next line isn't already one
      if (!/^[\s|:-]+$/.test(nextLine)) {
        const sep =
          "|" + " --- |".repeat(Math.max(cols, 1));
        result.push(sep);
      }
    }

    // Add blank line after last table row
    if (isTableLine && !nextIsTableLine) {
      result.push("");
    }
  }

  return result.join("\n");
}

/**
 * Strip HTML blocks from the input text.
 * Handles Gemini's embedded widgets (stock charts, etc.) that come
 * through as raw HTML when copy-pasted.
 */
function stripHtmlBlocks(text) {
  const lines = text.split("\n");
  const cleaned = [];
  let inHtmlBlock = false;
  let htmlDepth = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect start of an HTML block (line starts with a block-level tag)
    if (
      !inHtmlBlock &&
      /^<(?:div|svg|span|table|section|article)\b/i.test(trimmed)
    ) {
      inHtmlBlock = true;
      htmlDepth = 0;
    }

    if (inHtmlBlock) {
      // Count opening/closing tags to track nesting depth
      const opens = (
        trimmed.match(/<(?:div|svg|span|table|section|article)\b/gi) || []
      ).length;
      const closes = (
        trimmed.match(/<\/(?:div|svg|span|table|section|article)>/gi) || []
      ).length;
      htmlDepth += opens - closes;

      if (htmlDepth <= 0) {
        inHtmlBlock = false;
        htmlDepth = 0;
      }
      continue;
    }

    // Also strip single-line HTML fragments (inline widget remnants)
    if (
      /^<[a-z][^>]*>.*<\/[a-z]+>$/i.test(trimmed) &&
      trimmed.length > 200
    ) {
      continue;
    }

    cleaned.push(line);
  }

  return cleaned.join("\n");
}

/**
 * Attempt to guess a short title from the conversation content.
 */
function guessTitle(pairs) {
  if (pairs.length === 0) return "Gemini Conversation";

  // Use the first question if available
  const firstQ = pairs[0].question;
  if (firstQ) {
    // Truncate to first ~60 chars at a word boundary
    if (firstQ.length <= 60) return firstQ;
    const truncated = firstQ.slice(0, 60);
    const lastSpace = truncated.lastIndexOf(" ");
    return truncated.slice(0, lastSpace > 20 ? lastSpace : 60) + "…";
  }

  // Fall back to first line of first answer
  const firstLine = pairs[0].answer.split("\n")[0].slice(0, 60);
  return firstLine || "Gemini Conversation";
}
