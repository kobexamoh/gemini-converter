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
  return text.replace(INLINE_CITATION_REGEX, "").replace(/\s{2,}/g, " ");
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
