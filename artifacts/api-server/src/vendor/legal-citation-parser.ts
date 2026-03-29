/**
 * Vendored legal citation parser — ported from eyecite / Lawmirror patterns
 * Sources: https://github.com/freelawproject/eyecite (BSD-2)
 *          https://github.com/lawmirror/lawmirror
 * Adapted for Zimbabwe-style legal citations: case names, statute refs, section numbers.
 */

export interface ParsedCitation {
  raw: string;
  type: 'case' | 'statute' | 'section' | 'rule' | 'constitutional' | 'si' | 'unknown';
  normalized: string;
  year?: number;
  volume?: number;
  reporter?: string;
  page?: number;
  court?: string;
  chapter?: string;
  sectionNumber?: string;
}

export interface CitationParseResult {
  citations: ParsedCitation[];
  text: string;
  count: number;
}

const ZIMBABWE_REPORTERS = [
  'ZLR', 'ZWSC', 'ZWHHC', 'ZWLAC', 'ZWHHC', 'ZWBHC', 'ZWMAG', 'ZWR',
  'SA', 'SALR', 'ALL SA', 'SACR',
];

const COURT_ABBREVIATIONS: Record<string, string> = {
  'SC': 'Supreme Court of Zimbabwe',
  'HH': 'High Court of Zimbabwe (Harare)',
  'HB': 'High Court of Zimbabwe (Bulawayo)',
  'CCZ': 'Constitutional Court of Zimbabwe',
  'ZWSC': 'Supreme Court of Zimbabwe',
  'ZWHHC': 'High Court of Zimbabwe',
  'ZWLAC': 'Labour Appeals Court of Zimbabwe',
};

const CITATION_PATTERNS: Array<{ regex: RegExp; type: ParsedCitation['type'] }> = [
  {
    regex: /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+v\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(\d{4})\s*\((\d+)\)\s+(ZLR|ZWSC|ZWHHC|ZWLAC|ZWR|SA|SALR)\s+(\d+)/g,
    type: 'case',
  },
  {
    regex: /\b(HH|SC|HB|CCZ|ZWSC|ZWHHC|ZWLAC)\s*[-–]\s*(\d+)\s*[-–]\s*(\d{2,4})\b/gi,
    type: 'case',
  },
  {
    regex: /\bChapter\s+(\d+):(\d+)\b/gi,
    type: 'statute',
  },
  {
    regex: /\bSI\s+(\d+)\s+of\s+(\d{4})\b/gi,
    type: 'si',
  },
  {
    regex: /\bSection\s+(\d+)(?:\s*\((\d+)\))?(?:\s*\(([a-z])\))?\b/gi,
    type: 'section',
  },
  {
    regex: /\bOrder\s+(\d+)\s+Rule\s+(\d+)(?:\s*\((\d+)\))?\b/gi,
    type: 'rule',
  },
  {
    regex: /\bRule\s+(\d+[A-Z]?)(?:\s*\((\d+)\))?\b/gi,
    type: 'rule',
  },
  {
    regex: /\bConstitution\s+of\s+Zimbabwe(?:\s+(?:Amendment\s+)?(?:No\.\s*\d+\s+of\s+)?\d{4})?\b/gi,
    type: 'constitutional',
  },
  {
    regex: /\bSection\s+(\d+)\s+of\s+the\s+Constitution\b/gi,
    type: 'constitutional',
  },
];

function normalizeCitation(raw: string, type: ParsedCitation['type']): string {
  let normalized = raw.replace(/\s+/g, ' ').trim();
  if (type === 'si') {
    normalized = normalized.replace(/\bSI\s+/i, 'SI ').replace(/\s+of\s+/i, ' of ');
  } else if (type === 'statute') {
    normalized = normalized.replace(/\bChapter\s+/i, 'Chapter ');
  } else if (type === 'section') {
    normalized = normalized.replace(/\bSection\s+/i, 'Section ');
  }
  return normalized;
}

function extractYear(raw: string): number | undefined {
  const match = raw.match(/\b(19|20)\d{2}\b/);
  return match ? parseInt(match[0], 10) : undefined;
}

function extractCourt(raw: string): string | undefined {
  for (const [abbr, full] of Object.entries(COURT_ABBREVIATIONS)) {
    const pattern = new RegExp(`\\b${abbr}\\b`, 'i');
    if (pattern.test(raw)) return full;
  }
  return undefined;
}

function extractReporter(raw: string): string | undefined {
  for (const reporter of ZIMBABWE_REPORTERS) {
    if (raw.includes(reporter)) return reporter;
  }
  return undefined;
}

export function parseCitations(text: string): CitationParseResult {
  const found: ParsedCitation[] = [];
  const seen = new Set<string>();

  for (const { regex, type } of CITATION_PATTERNS) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const raw = match[0].trim();
      const key = raw.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const citation: ParsedCitation = {
        raw,
        type,
        normalized: normalizeCitation(raw, type),
        year: extractYear(raw),
        court: extractCourt(raw),
        reporter: extractReporter(raw),
      };

      if (type === 'statute' || type === 'constitutional') {
        const chapterMatch = raw.match(/Chapter\s+(\d+:\d+)/i);
        if (chapterMatch) citation.chapter = chapterMatch[1];
      }

      if (type === 'section') {
        const secMatch = raw.match(/\d+/);
        if (secMatch) citation.sectionNumber = secMatch[0];
      }

      found.push(citation);
    }
  }

  found.sort((a, b) => text.indexOf(a.raw) - text.indexOf(b.raw));

  return {
    citations: found,
    text,
    count: found.length,
  };
}

export function formatCitation(citation: ParsedCitation): string {
  switch (citation.type) {
    case 'case':
      return citation.normalized;
    case 'statute':
      return citation.chapter ? `[Chapter ${citation.chapter}]` : citation.normalized;
    case 'si':
      return citation.normalized;
    case 'section':
      return citation.sectionNumber ? `s ${citation.sectionNumber}` : citation.normalized;
    case 'rule':
      return citation.normalized;
    case 'constitutional':
      return citation.normalized;
    default:
      return citation.raw;
  }
}

export function groupCitationsByType(citations: ParsedCitation[]): Record<string, ParsedCitation[]> {
  const groups: Record<string, ParsedCitation[]> = {};
  for (const citation of citations) {
    if (!groups[citation.type]) groups[citation.type] = [];
    groups[citation.type].push(citation);
  }
  return groups;
}

export function deduplicateCitations(citations: ParsedCitation[]): ParsedCitation[] {
  const seen = new Set<string>();
  return citations.filter(c => {
    const key = c.normalized.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
