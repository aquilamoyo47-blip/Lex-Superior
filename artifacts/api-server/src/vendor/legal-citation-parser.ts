/**
 * Vendored legal citation parser for Zimbabwean/Commonwealth law
 * Ported from approaches in:
 *   - https://github.com/freelawproject/eyecite (BSD-2, adapted patterns only)
 *   - https://github.com/lawmirror/lawmirror
 *   - https://github.com/judge0/judge0 citation patterns (MIT)
 * Detects and normalises legal citations in text: case reports, statutes, SI numbers.
 */

export interface ParsedCitation {
  raw: string;
  type: 'case' | 'statute' | 'statutory_instrument' | 'constitutional' | 'rule' | 'section';
  normalized: string;
  jurisdiction: 'ZW' | 'ZA' | 'UK' | 'UNKNOWN';
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

const ZW_REPORTERS = ['ZLR', 'ZWSC', 'ZWHHC', 'ZWLAC', 'ZWBHC', 'ZWMAG', 'ZWR', 'BCLR'];
const ZA_REPORTERS = ['SA', 'BCLR', 'SACR', 'SALJ', 'SAPL'];
const UK_REPORTERS = ['AC', 'QB', 'WLR', 'All ER', 'UKHL', 'UKSC'];

const COURT_ABBREVIATIONS: Record<string, string> = {
  'SC': 'Supreme Court of Zimbabwe',
  'HH': 'High Court of Zimbabwe (Harare)',
  'HB': 'High Court of Zimbabwe (Bulawayo)',
  'CCZ': 'Constitutional Court of Zimbabwe',
  'ZWSC': 'Supreme Court of Zimbabwe',
  'ZWHHC': 'High Court of Zimbabwe',
  'ZWLAC': 'Labour Appeals Court of Zimbabwe',
};

const CASE_PATTERNS: RegExp[] = [
  /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+v[s.]?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+\[?(\d{4})\]?\s*\(?(\d+)\)?\s+(ZLR|ZWSC|ZWHHC|ZWLAC|ZWR|SA|SALR|BCLR|SACR)\s+(\d+)/g,
  /\b(HH|SC|HB|CCZ|ZWSC|ZWHHC|ZWLAC)\s*[-–]\s*(\d+)\s*[-–]\s*(\d{2,4})\b/gi,
  /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+v[s.]?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g,
];

const SI_PATTERN = /\bSI\s+(\d+)\s+of\s+(\d{4})\b/gi;
const CHAPTER_PATTERN = /\bChapter\s+(\d+):(\d+)\b/gi;
const SECTION_PATTERN = /\bs(?:ection)?\s*\.?\s*(\d+)(?:\s*\((\d+)\))?(?:\s*\(([a-z])\))?\b/gi;
const CONSTITUTION_PATTERN = /\bConstitution(?:\s+of\s+Zimbabwe)?(?:\s+(?:Amendment\s+)?(?:No\.\s*\d+\s+of\s+)?\d{4})?\b/gi;
const RULE_PATTERN = /\bOrder\s+(\d+)\s+[Rr]ule\s+(\d+)(?:\s*\((\d+)\))?|\bRule\s+(\d+)(?:\s*\((\d+)\))?/gi;

function detectJurisdiction(text: string): 'ZW' | 'ZA' | 'UK' | 'UNKNOWN' {
  if (ZW_REPORTERS.some(r => text.includes(r))) return 'ZW';
  if (ZA_REPORTERS.some(r => text.includes(r))) return 'ZA';
  if (UK_REPORTERS.some(r => text.includes(r))) return 'UK';
  if (/Zimbabwe|Harare|Bulawayo|Zim\b/i.test(text)) return 'ZW';
  if (/South Africa|Pretoria|Cape Town/i.test(text)) return 'ZA';
  if (/England|Wales|London|UK|United Kingdom/i.test(text)) return 'UK';
  return 'UNKNOWN';
}

function normalizeCitation(raw: string, type: ParsedCitation['type']): string {
  let normalized = raw.replace(/\s+/g, ' ').trim();
  if (type === 'statutory_instrument') {
    normalized = normalized.replace(/\bSI\s+/i, 'SI ').replace(/\s+of\s+/i, ' of ');
  } else if (type === 'statute') {
    normalized = normalized.replace(/\bChapter\s+/i, 'Chapter ');
  } else if (type === 'section') {
    normalized = normalized.replace(/\bSection\s+/i, 's ').replace(/\bs\s+/i, 's ');
  }
  return normalized;
}

function extractCourt(raw: string): string | undefined {
  for (const [abbr, full] of Object.entries(COURT_ABBREVIATIONS)) {
    const pattern = new RegExp(`\\b${abbr}\\b`, 'i');
    if (pattern.test(raw)) return full;
  }
  return undefined;
}

export function parseCitations(text: string): CitationParseResult {
  const found: ParsedCitation[] = [];
  const seen = new Set<string>();

  const addIfNew = (c: ParsedCitation) => {
    const key = c.normalized.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      found.push(c);
    }
  };

  const siMatches = [...text.matchAll(SI_PATTERN)];
  for (const m of siMatches) {
    addIfNew({
      raw: m[0],
      type: 'statutory_instrument',
      normalized: `SI ${m[1]} of ${m[2]}`,
      jurisdiction: 'ZW',
      year: parseInt(m[2]),
    });
  }

  const chapterMatches = [...text.matchAll(CHAPTER_PATTERN)];
  for (const m of chapterMatches) {
    addIfNew({
      raw: m[0],
      type: 'statute',
      normalized: `Chapter ${m[1]}:${m[2]}`,
      jurisdiction: 'ZW',
      chapter: `${m[1]}:${m[2]}`,
    });
  }

  const constitutionMatches = [...text.matchAll(CONSTITUTION_PATTERN)];
  for (const m of constitutionMatches) {
    const yearMatch = m[0].match(/\b(19|20)\d{2}\b/);
    addIfNew({
      raw: m[0],
      type: 'constitutional',
      normalized: 'Constitution of Zimbabwe 2013',
      jurisdiction: 'ZW',
      year: yearMatch ? parseInt(yearMatch[0]) : 2013,
    });
  }

  const ruleMatches = [...text.matchAll(RULE_PATTERN)];
  for (const m of ruleMatches) {
    addIfNew({
      raw: m[0],
      type: 'rule',
      normalized: m[0].replace(/\s+/g, ' ').trim(),
      jurisdiction: 'ZW',
    });
  }

  const sectionMatches = [...text.matchAll(SECTION_PATTERN)];
  for (const m of sectionMatches) {
    const parts = [`s ${m[1]}`];
    if (m[2]) parts.push(`(${m[2]})`);
    if (m[3]) parts.push(`(${m[3]})`);
    addIfNew({
      raw: m[0],
      type: 'section',
      normalized: parts.join(''),
      jurisdiction: 'UNKNOWN',
      sectionNumber: m[1],
    });
  }

  for (const pattern of CASE_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = [...text.matchAll(pattern)];
    for (const m of matches) {
      const raw = m[0].trim();
      const jurisdiction = detectJurisdiction(raw);
      const yearMatch = raw.match(/\b(19|20)\d{2}\b/);
      addIfNew({
        raw,
        type: 'case',
        normalized: raw,
        jurisdiction,
        year: m[3] ? parseInt(m[3]) : (yearMatch ? parseInt(yearMatch[0]) : undefined),
        volume: m[4] ? parseInt(m[4]) : undefined,
        page: m[6] ? parseInt(m[6]) : undefined,
        reporter: m[5] || undefined,
        court: extractCourt(raw),
      });
    }
  }

  found.sort((a, b) => text.indexOf(a.raw) - text.indexOf(b.raw));

  return {
    citations: found,
    text,
    count: found.length,
  };
}

export function formatCitationSummary(citations: ParsedCitation[]): string {
  if (citations.length === 0) return '';

  const grouped: Record<string, ParsedCitation[]> = {};
  for (const c of citations) {
    if (!grouped[c.type]) grouped[c.type] = [];
    grouped[c.type].push(c);
  }

  const lines: string[] = ['**Detected Legal Citations:**'];

  if (grouped.case?.length) {
    lines.push(`\n*Case Law:* ${grouped.case.map(c => c.normalized).join('; ')}`);
  }
  if (grouped.constitutional?.length) {
    lines.push(`\n*Constitutional Provisions:* ${grouped.constitutional.map(c => c.normalized).join('; ')}`);
  }
  if (grouped.statute?.length) {
    lines.push(`\n*Statutes (Chapter):* ${grouped.statute.map(c => c.normalized).join('; ')}`);
  }
  if (grouped.statutory_instrument?.length) {
    lines.push(`\n*Statutory Instruments:* ${grouped.statutory_instrument.map(c => c.normalized).join('; ')}`);
  }
  if (grouped.rule?.length) {
    lines.push(`\n*Court Rules:* ${grouped.rule.map(c => c.normalized).join('; ')}`);
  }
  if (grouped.section?.length) {
    lines.push(`\n*Sections Referenced:* ${grouped.section.map(c => c.normalized).join(', ')}`);
  }

  return lines.join('');
}

export function annotateCitationsInQuery(query: string): {
  annotatedQuery: string;
  citations: ParsedCitation[];
  statutes: string[];
  caseRefs: string[];
} {
  const { citations } = parseCitations(query);
  const statutes = citations
    .filter(c => ['statute', 'statutory_instrument', 'constitutional', 'rule'].includes(c.type))
    .map(c => c.normalized);
  const caseRefs = citations.filter(c => c.type === 'case').map(c => c.normalized);

  let annotatedQuery = query;
  if (citations.length > 0) {
    annotatedQuery = `${query}\n\n[Citation Context: ${citations.map(c => `${c.type}: ${c.normalized}`).join(' | ')}]`;
  }

  return { annotatedQuery, citations, statutes, caseRefs };
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
