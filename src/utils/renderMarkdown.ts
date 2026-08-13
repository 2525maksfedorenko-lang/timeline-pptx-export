import { marked, type MarkedToken } from 'marked';

// The intentionally-limited markdown subset given real structural treatment
// in exports: headings, paragraphs, bullet/numbered lists, and GFM tables.
// Everything else (links, images, code, blockquotes) is flattened to plain
// text inside a paragraph, same as the rest of this file has always done.
export type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] };

/** Strips markdown syntax markers from a single line of text. */
function stripLineMarkdown(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, '')
    .replace(/^[-*+]\s+/, '')
    .replace(/^\d+\.\s+/, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
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

function headingLevel(depth: number): 1 | 2 | 3 {
  if (depth <= 1) return 1;
  if (depth === 2) return 2;
  return 3;
}

/** Maps a lexed token stream to our block union, recursing into blockquotes
 * (whose nested tokens are structural too) but flattening everything else
 * unsupported straight to a paragraph of plain text. */
function tokensToBlocks(tokens: MarkedToken[]): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];

  const pushParagraph = (text: string) => {
    const trimmed = stripLineMarkdown(text);
    if (trimmed) blocks.push({ type: 'paragraph', text: trimmed });
  };

  tokens.forEach((token) => {
    switch (token.type) {
      case 'heading':
        blocks.push({ type: 'heading', level: headingLevel(token.depth), text: stripLineMarkdown(token.text) });
        break;
      case 'paragraph':
      case 'text':
        pushParagraph(token.text);
        break;
      case 'list':
        blocks.push({ type: 'list', items: token.items.map((item) => stripLineMarkdown(item.text)) });
        break;
      case 'table':
        blocks.push({
          type: 'table',
          headers: token.header.map((cell) => stripLineMarkdown(cell.text)),
          rows: token.rows.map((row) => row.map((cell) => stripLineMarkdown(cell.text))),
        });
        break;
      case 'blockquote':
        blocks.push(...tokensToBlocks(token.tokens as MarkedToken[]));
        break;
      case 'code':
        pushParagraph(token.text);
        break;
      case 'hr':
      case 'space':
        break;
      default:
        if ('text' in token && typeof token.text === 'string') pushParagraph(token.text);
        break;
    }
  });

  return blocks;
}

/** Parses the supported markdown subset (headings, paragraphs, bullet/numbered
 * lists, GFM tables) into structural blocks for real rendering in exports —
 * see pptxExporter.ts / pdfExporter.ts. */
export function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  return tokensToBlocks(marked.lexer(markdown) as MarkedToken[]);
}
