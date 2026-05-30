/**
 * Safely and robustly parses a JSON string, handling potential markdown packaging,
 * thinking traces, leading/trailing non-JSON text, or unescaped characters gracefully.
 */
export function safeJsonParse(text: string): any {
  if (!text) {
    return null;
  }
  
  const trimmed = text.trim();
  
  // 1. Skip thinking blocks if present at the start
  let cleaned = trimmed;
  if (cleaned.includes('</thought>')) {
    cleaned = cleaned.split('</thought>').pop()?.trim() || cleaned;
  } else if (cleaned.includes('<thought>') && !cleaned.includes('</thought>')) {
    // If it's cut off mid-thought, we might not have the JSON yet
    return null;
  }

  // 2. Direct parse attempt
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Continue through robust cleanup
  }

  // 3. Remove standard markdown wrapper formats
  cleaned = cleaned
    .replace(/^```json\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Continue
  }

  // 4. Find bracket borders to separate JSON content from conversational intro/outro text
  const firstCurly = cleaned.indexOf('{');
  const lastCurly = cleaned.lastIndexOf('}');
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');

  let start = -1;
  let end = -1;

  if (firstCurly !== -1 && (firstBracket === -1 || firstCurly < firstBracket)) {
    start = firstCurly;
    end = lastCurly;
  } else if (firstBracket !== -1) {
    start = firstBracket;
    end = lastBracket;
  }

  if (start !== -1 && end !== -1 && end > start) {
    const candidate = cleaned.substring(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // 5. Clean up common JSON flaws such as trailing commas before closing symbols
      try {
        const withCleanCommas = candidate.replace(/,\s*([\]}])/g, '$1');
        return JSON.parse(withCleanCommas);
      } catch (err) {
        // 6. Emergency fix for newline escape characters in string literals
        try {
          // Replace raw linebreaks inside quotes with \n, and try again
          // This is a slightly safer regex for internal linebreaks
          const withEscapedNewlines = candidate.replace(/"([^"]*?)\n([^"]*?)"/g, (match) => 
            match.replace(/\n/g, '\\n')
          );
          return JSON.parse(withEscapedNewlines);
        } catch {
          // 7. Last resort: if it's a "content" or "story" field we are looking for, try a very loose match
          const contentMatch = cleaned.match(/"(?:content|story)"\s*:\s*"(.*)"\s*,\s*"characterCards"/s);
          if (contentMatch) {
            return {
              content: contentMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
              characterCards: []
            };
          }
          
          console.error("Robust parser failed. Extracted raw candidate:\n", candidate);
          throw new Error(`Invalid JSON output: ${text}`);
        }
      }
    }
  }

  throw new Error(`Failed to locate valid JSON structure in response: ${text}`);
}
