import { marked } from 'marked';

/** Strips markdown syntax markers from a single line of text. */
function stripLineMarkdown(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, '')
    .replace(/^[-*+]\s+/, '')
    .replace(/^\d+\.\s+/, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/\|/g, ' ')
    .trim();
}

/** True for table separator rows like "---|---" or ":--|--:". */
function isTableSeparatorLine(line: string): boolean {
  return /^[|:\s-]+$/.test(line) && line.includes('-');
}

/** Renders markdown down to a single line of plain text, e.g. for list previews. */
export function toPlainSummary(markdown: string): string {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !isTableSeparatorLine(line))
    .map(stripLineMarkdown)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Renders markdown to HTML for on-screen display. Internal tool input only —
 * no output sanitization is applied. */
export function toHtml(markdown: string): string {
  return marked.parse(markdown, { async: false }) as string;
}

/** Simplified markdown-to-plain-text approximation for pptx/pdf export, where
 * full HTML rendering isn't worth the complexity: headings and body text
 * become plain lines, list items get a "• " prefix, and all other markdown
 * syntax (bold, italic, code, tables) is stripped down to its plain text. */
export function markdownToPlainLines(markdown: string): string[] {
  const lines: string[] = [];

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || isTableSeparatorLine(line)) continue;

    const listMatch = line.match(/^[-*+]\s+(.*)$/) ?? line.match(/^\d+\.\s+(.*)$/);
    if (listMatch) {
      lines.push(`• ${stripLineMarkdown(listMatch[1])}`);
      continue;
    }

    lines.push(stripLineMarkdown(line));
  }

  return lines;
}
