/**
 * Vendored text highlighter — snippet-generation logic ported from mark.js
 * Source: https://github.com/julmot/mark.js (MIT)
 * Produces annotated excerpts when returning RAG source references to the user.
 */

export interface HighlightMatch {
  text: string;
  start: number;
  end: number;
  isMatch: boolean;
}

export interface HighlightOptions {
  caseSensitive?: boolean;
  wholeWords?: boolean;
  maxSnippetLength?: number;
  contextChars?: number;
  markTemplate?: (match: string) => string;
}

export interface SnippetResult {
  snippet: string;
  matchCount: number;
  highlights: HighlightMatch[];
  originalLength: number;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSearchRegex(terms: string[], options: HighlightOptions): RegExp {
  const escaped = terms.map(t => escapeRegex(t.trim())).filter(Boolean);
  if (escaped.length === 0) return /(?!)/;

  const pattern = options.wholeWords
    ? escaped.map(t => `\\b${t}\\b`).join('|')
    : escaped.join('|');

  return new RegExp(pattern, options.caseSensitive ? 'g' : 'gi');
}

export function findHighlights(text: string, terms: string[], options: HighlightOptions = {}): HighlightMatch[] {
  const regex = buildSearchRegex(terms, options);
  const matches: HighlightMatch[] = [];
  let lastEnd = 0;
  let match: RegExpExecArray | null;

  regex.lastIndex = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastEnd) {
      matches.push({ text: text.slice(lastEnd, match.index), start: lastEnd, end: match.index, isMatch: false });
    }
    matches.push({ text: match[0], start: match.index, end: match.index + match[0].length, isMatch: true });
    lastEnd = match.index + match[0].length;
  }

  if (lastEnd < text.length) {
    matches.push({ text: text.slice(lastEnd), start: lastEnd, end: text.length, isMatch: false });
  }

  return matches;
}

export function generateSnippet(
  text: string,
  terms: string[],
  options: HighlightOptions = {}
): SnippetResult {
  const {
    maxSnippetLength = 300,
    contextChars = 80,
    markTemplate = (m) => `**${m}**`,
    caseSensitive = false,
    wholeWords = false,
  } = options;

  const regex = buildSearchRegex(terms, { caseSensitive, wholeWords });
  regex.lastIndex = 0;

  const firstMatch = regex.exec(text);
  if (!firstMatch) {
    return {
      snippet: text.slice(0, maxSnippetLength) + (text.length > maxSnippetLength ? '…' : ''),
      matchCount: 0,
      highlights: [],
      originalLength: text.length,
    };
  }

  const matchStart = firstMatch.index;
  const snippetStart = Math.max(0, matchStart - contextChars);
  const snippetEnd = Math.min(text.length, matchStart + maxSnippetLength - contextChars);

  let snippet = text.slice(snippetStart, snippetEnd);
  if (snippetStart > 0) snippet = '…' + snippet;
  if (snippetEnd < text.length) snippet = snippet + '…';

  const highlights = findHighlights(snippet.replace(/^…/, '').replace(/…$/, ''), terms, { caseSensitive, wholeWords });
  let matchCount = 0;

  regex.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) matchCount++;

  const annotatedSnippet = snippet.replace(
    buildSearchRegex(terms, { caseSensitive, wholeWords }),
    (match) => markTemplate(match)
  );

  return {
    snippet: annotatedSnippet,
    matchCount,
    highlights,
    originalLength: text.length,
  };
}

export function highlightInHtml(html: string, terms: string[], options: HighlightOptions = {}): string {
  const {
    caseSensitive = false,
    wholeWords = false,
    markTemplate = (m) => `<mark class="lex-highlight">${m}</mark>`,
  } = options;

  const regex = buildSearchRegex(terms, { caseSensitive, wholeWords });
  return html.replace(regex, (match) => markTemplate(match));
}

export function generateMultipleSnippets(
  text: string,
  terms: string[],
  options: HighlightOptions & { maxSnippets?: number } = {}
): SnippetResult[] {
  const { maxSnippets = 3, caseSensitive = false, wholeWords = false, contextChars = 80, maxSnippetLength = 200 } = options;
  const regex = buildSearchRegex(terms, { caseSensitive, wholeWords });
  const matches: number[] = [];

  regex.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null && matches.length < maxSnippets) {
    matches.push(m.index);
  }

  if (matches.length === 0) {
    return [generateSnippet(text, terms, options)];
  }

  return matches.map(matchStart => {
    const snippetStart = Math.max(0, matchStart - contextChars);
    const snippetEnd = Math.min(text.length, matchStart + maxSnippetLength);
    let snippet = text.slice(snippetStart, snippetEnd);
    if (snippetStart > 0) snippet = '…' + snippet;
    if (snippetEnd < text.length) snippet = snippet + '…';

    const annotated = snippet.replace(
      buildSearchRegex(terms, { caseSensitive, wholeWords }),
      (match) => (options.markTemplate ?? ((m) => `**${m}**`))(match)
    );

    return {
      snippet: annotated,
      matchCount: 1,
      highlights: [],
      originalLength: text.length,
    };
  });
}
