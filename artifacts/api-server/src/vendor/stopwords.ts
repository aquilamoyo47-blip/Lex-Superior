/**
 * Vendored stopwords list — ported from fergiemcdowall/stopword
 * Source: https://github.com/fergiemcdowall/stopword (MIT)
 * Legal-domain + general English stopword corpus.
 * Used by keyword extractor and BM25 scorer to filter noise.
 */

export const GENERAL_STOPWORDS: ReadonlySet<string> = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'ago', 'all', 'also', 'am',
  'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been',
  'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'cannot',
  'can\'t', 'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t',
  'doing', 'don\'t', 'down', 'during', 'each', 'few', 'for', 'from', 'further',
  'get', 'got', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having',
  'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself',
  'him', 'himself', 'his', 'how', 'how\'s', 'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve',
  'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s',
  'me', 'more', 'most', 'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of',
  'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves',
  'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s',
  'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the',
  'their', 'theirs', 'them', 'themselves', 'then', 'there', 'there\'s', 'these',
  'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through',
  'to', 'too', 'under', 'until', 'up', 'very', 'was', 'wasn\'t', 'we', 'we\'d',
  'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when',
  'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom',
  'why', 'why\'s', 'will', 'with', 'won\'t', 'would', 'wouldn\'t', 'you',
  'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves',
  'i', 'j', 'k', 'v', 'vs', 'vs.',
]);

export const LEGAL_STOPWORDS: ReadonlySet<string> = new Set([
  'above', 'abovementioned', 'accordance', 'accordingly', 'act', 'action',
  'additional', 'aforesaid', 'aforementioned', 'agreed', 'agreement',
  'applicable', 'application', 'applicant', 'applied', 'apply', 'applies',
  'appropriate', 'article', 'behalf', 'caption', 'cause', 'causes',
  'circumstance', 'circumstances', 'clause', 'clauses', 'company',
  'consideration', 'court', 'courts', 'date', 'dated', 'day', 'days',
  'deemed', 'defendant', 'duly', 'effect', 'effective', 'except',
  'execution', 'forth', 'full', 'given', 'grant', 'granted', 'granting',
  'hereafter', 'hereby', 'herein', 'hereinafter', 'hereinbefore',
  'hereof', 'hereto', 'hereunder', 'herewith', 'include', 'included',
  'including', 'incorporated', 'indicated', 'interest', 'judgment',
  'liability', 'likewise', 'made', 'manner', 'matter', 'matters',
  'means', 'mention', 'mentioned', 'month', 'months', 'must', 'mutatis',
  'mutandis', 'nature', 'note', 'noticed', 'number', 'obligation',
  'order', 'orders', 'paragraph', 'paragraphs', 'part', 'parties',
  'party', 'person', 'place', 'plaintiff', 'point', 'present', 'provided',
  'provision', 'provisions', 'pursuant', 'referred', 'regarding',
  'relating', 'relevant', 'relief', 'required', 'requirements',
  'respect', 'respondent', 'result', 'right', 'rights', 'rule', 'rules',
  'said', 'section', 'sections', 'shall', 'state', 'states', 'sub',
  'subsection', 'such', 'sufficient', 'term', 'terms', 'thereof',
  'therein', 'thereto', 'together', 'upon', 'used', 'ways', 'whether',
  'within', 'without', 'written', 'year', 'years',
]);

export const ALL_STOPWORDS: ReadonlySet<string> = new Set([
  ...GENERAL_STOPWORDS,
  ...LEGAL_STOPWORDS,
]);

export function removeStopwords(tokens: string[], stopwordSet: ReadonlySet<string> = ALL_STOPWORDS): string[] {
  return tokens.filter(token => !stopwordSet.has(token.toLowerCase()));
}

export function isStopword(word: string, stopwordSet: ReadonlySet<string> = ALL_STOPWORDS): boolean {
  return stopwordSet.has(word.toLowerCase());
}

export function filterStopwordsFromText(text: string, stopwordSet: ReadonlySet<string> = ALL_STOPWORDS): string {
  return text
    .split(/\s+/)
    .filter(word => !stopwordSet.has(word.toLowerCase()))
    .join(' ');
}
