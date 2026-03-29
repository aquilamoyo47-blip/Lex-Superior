/**
 * Vendored HTML-to-text converter — ported from html-to-text/node-html-to-text
 * Source: https://github.com/html-to-text/node-html-to-text (MIT)
 * Cleans up HTML pages scraped from ZimLII before feeding into the RAG pipeline.
 */

export interface HtmlToTextOptions {
  wordwrap?: number | false;
  preserveNewlines?: boolean;
  tables?: boolean;
  headingStyle?: 'hashify' | 'linebreak' | 'none';
  bulletChar?: string;
  decodeEntities?: boolean;
  ignoreHref?: boolean;
  ignoreImage?: boolean;
  uppercaseHeadings?: boolean;
}

const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&nbsp;': ' ',
  '&ndash;': '–',
  '&mdash;': '—',
  '&lsquo;': '\u2018',
  '&rsquo;': '\u2019',
  '&ldquo;': '\u201C',
  '&rdquo;': '\u201D',
  '&hellip;': '…',
  '&copy;': '©',
  '&reg;': '®',
  '&trade;': '™',
  '&sect;': '§',
  '&para;': '¶',
  '&bull;': '•',
  '&middot;': '·',
  '&prime;': '′',
  '&Prime;': '″',
};

function decodeEntities(html: string): string {
  let result = html;
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    result = result.replace(new RegExp(entity, 'gi'), char);
  }
  result = result.replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  result = result.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
  return result;
}

function processHeading(tag: string, content: string, style: string, uppercase: boolean): string {
  const level = parseInt(tag.slice(1), 10);
  const text = uppercase ? content.toUpperCase() : content;
  if (style === 'hashify') {
    return '#'.repeat(level) + ' ' + text;
  }
  if (style === 'linebreak') {
    const underline = level === 1 ? '=' : '-';
    return text + '\n' + underline.repeat(Math.min(text.length, 80));
  }
  return text;
}

function extractTableText(tableHtml: string): string {
  const rows: string[] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const rowContent = rowMatch[1];
    const cells: string[] = [];
    const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
    let cellMatch: RegExpExecArray | null;

    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const cellText = convertHtmlToText(cellMatch[1], {}).trim();
      if (cellText) cells.push(cellText);
    }

    if (cells.length > 0) {
      rows.push(cells.join(' | '));
    }
  }

  return rows.join('\n');
}

export function convertHtmlToText(html: string, options: HtmlToTextOptions = {}): string {
  const {
    preserveNewlines = false,
    tables = true,
    headingStyle = 'linebreak',
    bulletChar = '•',
    decodeEntities: doDecode = true,
    ignoreHref = true,
    ignoreImage = true,
    uppercaseHeadings = false,
  } = options;

  let text = html;

  text = text.replace(/<!--[\s\S]*?-->/g, '');
  text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, '');
  text = text.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, '');
  text = text.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, '');
  text = text.replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, '');

  if (tables) {
    text = text.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (_, tableContent) => {
      return '\n' + extractTableText(tableContent) + '\n';
    });
  } else {
    text = text.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, '');
  }

  text = text.replace(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, tag, content) => {
    const cleanContent = convertHtmlToText(content, { ...options, headingStyle: 'none' }).trim();
    return '\n\n' + processHeading(tag, cleanContent, headingStyle, uppercaseHeadings) + '\n\n';
  });

  text = text.replace(/<(?:p|div|section|article|main|blockquote)\b[^>]*>/gi, '\n\n');
  text = text.replace(/<\/(?:p|div|section|article|main|blockquote)>/gi, '\n\n');

  text = text.replace(/<br\s*\/?>/gi, '\n');

  text = text.replace(/<li\b[^>]*>/gi, `\n${bulletChar} `);
  text = text.replace(/<\/li>/gi, '');
  text = text.replace(/<(?:ul|ol)[^>]*>/gi, '\n');
  text = text.replace(/<\/(?:ul|ol)>/gi, '\n');

  text = text.replace(/<strong\b[^>]*>/gi, '').replace(/<\/strong>/gi, '');
  text = text.replace(/<em\b[^>]*>/gi, '').replace(/<\/em>/gi, '');
  text = text.replace(/<b\b[^>]*>/gi, '').replace(/<\/b>/gi, '');
  text = text.replace(/<i\b[^>]*>/gi, '').replace(/<\/i>/gi, '');
  text = text.replace(/<u\b[^>]*>/gi, '').replace(/<\/u>/gi, '');

  if (!ignoreHref) {
    text = text.replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, linkText) => {
      const cleanText = convertHtmlToText(linkText, options).trim();
      return `${cleanText} (${href})`;
    });
  } else {
    text = text.replace(/<a\b[^>]*>/gi, '').replace(/<\/a>/gi, '');
  }

  if (ignoreImage) {
    text = text.replace(/<img\b[^>]*\/?>/gi, '');
  } else {
    text = text.replace(/<img\b[^>]*alt="([^"]*)"[^>]*\/?>/gi, (_, alt) => alt || '');
  }

  text = text.replace(/<[^>]+>/g, '');

  if (doDecode) {
    text = decodeEntities(text);
  }

  if (!preserveNewlines) {
    text = text.replace(/[ \t]+/g, ' ');
  }

  text = text.replace(/\n{4,}/g, '\n\n\n');
  text = text.replace(/^\s+|\s+$/gm, '');
  text = text.trim();

  return text;
}

export function stripHtml(html: string): string {
  return convertHtmlToText(html, {
    headingStyle: 'none',
    tables: false,
    ignoreHref: true,
    ignoreImage: true,
  });
}

export function htmlToLegalText(html: string): string {
  return convertHtmlToText(html, {
    headingStyle: 'linebreak',
    tables: true,
    ignoreHref: true,
    ignoreImage: true,
    uppercaseHeadings: false,
    decodeEntities: true,
  });
}
