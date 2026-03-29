/**
 * Vendored markdown parser — core rendering ported from marked.js
 * Source: https://github.com/markedjs/marked (MIT)
 * Simplified for server-side post-processing of AI legal responses.
 */

export interface MarkdownOptions {
  sanitize?: boolean;
  breaks?: boolean;
  gfm?: boolean;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function processInline(text: string, options: MarkdownOptions): string {
  let result = text;

  result = result.replace(/\[VERIFY:\s*([^\]]+)\]/gi, '<span class="verify-flag" data-type="$1">[VERIFY: $1]</span>');

  result = result.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/__(.+?)__/g, '<strong>$1</strong>');
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');
  result = result.replace(/_(.+?)_/g, '<em>$1</em>');

  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');

  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    if (options.sanitize) {
      if (!/^https?:\/\//i.test(url)) return escapeHtml(label);
    }
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
  });

  result = result.replace(/~~(.+?)~~/g, '<del>$1</del>');

  return result;
}

export function parseMarkdown(markdown: string, options: MarkdownOptions = {}): string {
  const { breaks = false, gfm = true, sanitize = false } = options;

  if (!markdown) return '';

  const lines = markdown.split('\n');
  const htmlParts: string[] = [];

  let i = 0;
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];
  let inBlockquote = false;
  let blockquoteLines: string[] = [];
  let inList = false;
  let listItems: string[] = [];
  let listOrdered = false;

  function flushList(): void {
    if (!inList) return;
    const tag = listOrdered ? 'ol' : 'ul';
    htmlParts.push(`<${tag}>`);
    for (const item of listItems) {
      htmlParts.push(`<li>${processInline(item, options)}</li>`);
    }
    htmlParts.push(`</${tag}>`);
    listItems = [];
    inList = false;
  }

  function flushBlockquote(): void {
    if (!inBlockquote) return;
    const content = parseMarkdown(blockquoteLines.join('\n'), options);
    htmlParts.push(`<blockquote>${content}</blockquote>`);
    blockquoteLines = [];
    inBlockquote = false;
  }

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      if (inCodeBlock) {
        const code = sanitize ? escapeHtml(codeBlockLines.join('\n')) : codeBlockLines.join('\n');
        const langAttr = codeBlockLang ? ` class="language-${escapeHtml(codeBlockLang)}"` : '';
        htmlParts.push(`<pre><code${langAttr}>${code}</code></pre>`);
        codeBlockLines = [];
        codeBlockLang = '';
        inCodeBlock = false;
      } else {
        flushList();
        flushBlockquote();
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
      }
      i++;
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      i++;
      continue;
    }

    if (gfm && /^\s*>\s?/.test(line)) {
      flushList();
      inBlockquote = true;
      blockquoteLines.push(line.replace(/^\s*>\s?/, ''));
      i++;
      continue;
    } else if (inBlockquote) {
      flushBlockquote();
    }

    if (gfm && /^\s*[-*+]\s+/.test(line)) {
      if (inList && listOrdered) flushList();
      inList = true;
      listOrdered = false;
      listItems.push(line.replace(/^\s*[-*+]\s+/, ''));
      i++;
      continue;
    } else if (gfm && /^\s*\d+\.\s+/.test(line)) {
      if (inList && !listOrdered) flushList();
      inList = true;
      listOrdered = true;
      listItems.push(line.replace(/^\s*\d+\.\s+/, ''));
      i++;
      continue;
    } else if (inList && line.trim() === '') {
      flushList();
    } else if (inList) {
      listItems[listItems.length - 1] += ' ' + line.trim();
      i++;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushList();
      flushBlockquote();
      const level = headingMatch[1].length;
      const content = processInline(headingMatch[2], options);
      htmlParts.push(`<h${level}>${content}</h${level}>`);
      i++;
      continue;
    }

    if (/^---+$|^\*\*\*+$|^___+$/.test(line.trim())) {
      flushList();
      htmlParts.push('<hr>');
      i++;
      continue;
    }

    if (line.trim() === '') {
      flushList();
      flushBlockquote();
      i++;
      continue;
    }

    const processed = processInline(line, options);
    if (breaks) {
      htmlParts.push(`<p>${processed}<br></p>`);
    } else {
      htmlParts.push(`<p>${processed}</p>`);
    }
    i++;
  }

  flushList();
  flushBlockquote();

  return htmlParts.join('\n');
}

export function markdownToPlainText(markdown: string): string {
  if (!markdown) return '';

  return markdown
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s*/gm, '')
    .replace(/^---+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function extractMarkdownSections(markdown: string): Array<{ heading: string; level: number; content: string }> {
  const sections: Array<{ heading: string; level: number; content: string }> = [];
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const lines = markdown.split('\n');

  let currentHeading = '';
  let currentLevel = 0;
  let currentContent: string[] = [];

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      if (currentHeading) {
        sections.push({
          heading: currentHeading,
          level: currentLevel,
          content: currentContent.join('\n').trim(),
        });
      }
      currentHeading = match[2];
      currentLevel = match[1].length;
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  if (currentHeading) {
    sections.push({
      heading: currentHeading,
      level: currentLevel,
      content: currentContent.join('\n').trim(),
    });
  }

  void headingRegex;
  return sections;
}
