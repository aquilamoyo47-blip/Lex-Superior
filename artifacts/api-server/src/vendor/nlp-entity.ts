/**
 * Vendored NLP entity extractor — patterns and approach from compromise NLP
 * Source: https://github.com/spencermountain/compromise (MIT)
 * Adapted for Zimbabwean legal entity extraction.
 */

export interface EntityMatch {
  text: string;
  type: 'statute' | 'case' | 'section' | 'person' | 'organization' | 'date' | 'rule';
  start: number;
  end: number;
}

export interface ExtractedEntities {
  statutes: string[];
  cases: string[];
  sections: string[];
  persons: string[];
  organizations: string[];
  dates: string[];
  rules: string[];
  raw: EntityMatch[];
}

const PATTERNS: Array<{ regex: RegExp; type: EntityMatch['type'] }> = [
  { regex: /\bConstitution(?:\s+of\s+Zimbabwe)?(?:\s+(?:Amendment\s+)?(?:No\.\s*\d+\s+of\s+)?\d{4})?\b/gi, type: 'statute' },
  { regex: /\b(?:High|Supreme|Constitutional|Magistrates?|Labour)\s+Court\s+(?:Act|Rules?)(?:\s+(?:Chapter\s+\d+:\d+|SI\s+\d+\s+of\s+\d{4}))?\b/gi, type: 'statute' },
  { regex: /\bChapter\s+\d+:\d+\b/gi, type: 'statute' },
  { regex: /\bSI\s+\d+\s+of\s+\d{4}\b/gi, type: 'rule' },
  { regex: /\bOrder\s+\d+\s+Rule\s+\d+(?:\s*\(\d+\))?\b/gi, type: 'rule' },
  { regex: /\bRule\s+\d+(?:\s*\(\d+\))?(?:\s+of\s+(?:the\s+)?(?:High|Supreme|Constitutional|Magistrates?)\s+Court\s+Rules?)?\b/gi, type: 'rule' },
  { regex: /\bSection\s+\d+(?:\s*\(\d+\))?(?:\s*\([a-z]\))?\b/gi, type: 'section' },
  { regex: /\bs\s*\d+(?:\s*\(\d+\))?(?:\s*\([a-z]\))?\b/g, type: 'section' },
  { regex: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+v\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:\s+\d{4}\s*\(\d+\)\s+(?:ZLR|ZWSC|ZWHHC|ZWLAC)\s+\d+)?\b/g, type: 'case' },
  { regex: /\b(?:HH|SC|CCZ|ZWSC|ZWHHC|ZWLAC)\s*[-–]\s*\d+\s*[-–]\s*\d{2,4}\b/gi, type: 'case' },
  { regex: /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi, type: 'date' },
  { regex: /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi, type: 'date' },
  { regex: /\b(?:Ministry\s+of\s+\w+(?:\s+\w+)?|(?:Zimbabwe|Harare|Bulawayo)\s+(?:Revenue\s+Authority|Electricity\s+Supply\s+Authority|National\s+Road\s+Administration|Republic)|National\s+Railways?\s+of\s+Zimbabwe|Reserve\s+Bank\s+of\s+Zimbabwe|Zimbabwe\s+Revenue\s+Authority)\b/gi, type: 'organization' },
  { regex: /\bAdvocate\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g, type: 'person' },
  { regex: /\b(?:Mr|Mrs|Ms|Dr|Adv|Prof|Judge|J|AJ|JA|CJ|DCJ)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g, type: 'person' },
];

function deduplicate(arr: string[]): string[] {
  return [...new Set(arr.map(s => s.trim()).filter(Boolean))];
}

export function extractEntities(text: string): ExtractedEntities {
  const raw: EntityMatch[] = [];

  for (const { regex, type } of PATTERNS) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      raw.push({
        text: match[0].trim(),
        type,
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  raw.sort((a, b) => a.start - b.start);

  const filtered: EntityMatch[] = [];
  for (const entity of raw) {
    const overlaps = filtered.some(
      e => entity.start < e.end && entity.end > e.start
    );
    if (!overlaps) filtered.push(entity);
  }

  return {
    statutes: deduplicate(filtered.filter(e => e.type === 'statute').map(e => e.text)),
    cases: deduplicate(filtered.filter(e => e.type === 'case').map(e => e.text)),
    sections: deduplicate(filtered.filter(e => e.type === 'section').map(e => e.text)),
    persons: deduplicate(filtered.filter(e => e.type === 'person').map(e => e.text)),
    organizations: deduplicate(filtered.filter(e => e.type === 'organization').map(e => e.text)),
    dates: deduplicate(filtered.filter(e => e.type === 'date').map(e => e.text)),
    rules: deduplicate(filtered.filter(e => e.type === 'rule').map(e => e.text)),
    raw: filtered,
  };
}

export function tokenize(text: string): string[] {
  return text
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0);
}

export function lemmatize(word: string): string {
  const w = word.toLowerCase();
  if (w.endsWith('ing') && w.length > 5) return w.slice(0, -3);
  if (w.endsWith('tion') && w.length > 6) return w.slice(0, -4);
  if (w.endsWith('ed') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('s') && w.length > 3 && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

export function tagPartsOfSpeech(tokens: string[]): Array<{ word: string; tag: string }> {
  return tokens.map(word => {
    const lower = word.toLowerCase();
    if (/^(the|a|an|this|that|these|those|its|his|her|their|our|your|my)$/i.test(lower)) {
      return { word, tag: 'DET' };
    }
    if (/^(is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|shall|should|may|might|can|could|must|ought)$/i.test(lower)) {
      return { word, tag: 'AUX' };
    }
    if (/^(and|or|but|nor|so|yet|for|although|because|since|unless|until|while|whereas|whereby)$/i.test(lower)) {
      return { word, tag: 'CONJ' };
    }
    if (/^(in|on|at|by|for|with|about|against|between|through|during|before|after|above|below|from|to|of|up|out|into|per)$/i.test(lower)) {
      return { word, tag: 'PREP' };
    }
    if (/ing$|tion$|ment$|ance$|ence$|ity$|ness$/.test(lower)) {
      return { word, tag: 'NOUN' };
    }
    if (/^[A-Z]/.test(word) && word.length > 1) {
      return { word, tag: 'PROPN' };
    }
    if (/ly$/.test(lower)) return { word, tag: 'ADV' };
    if (/ed$|ing$/.test(lower)) return { word, tag: 'VERB' };
    if (/^[0-9]+$/.test(word)) return { word, tag: 'NUM' };
    return { word, tag: 'NOUN' };
  });
}
