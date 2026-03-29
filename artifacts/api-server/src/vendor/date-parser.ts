/**
 * Vendored date parser — core patterns ported from chrono-node
 * Source: https://github.com/wanasit/chrono (MIT)
 * Extracts and normalises legal dates (judgment dates, filing deadlines, limitation periods).
 */

export interface ParsedDate {
  text: string;
  date: Date;
  isoString: string;
  confidence: 'high' | 'medium' | 'low';
  context?: 'judgment' | 'filing' | 'limitation' | 'general';
  start: number;
  end: number;
}

export interface DateParseResult {
  dates: ParsedDate[];
  earliest?: ParsedDate;
  latest?: ParsedDate;
  count: number;
}

const MONTHS: Record<string, number> = {
  january: 0, jan: 0,
  february: 1, feb: 1,
  march: 2, mar: 2,
  april: 3, apr: 3,
  may: 4,
  june: 5, jun: 5,
  july: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sep: 8, sept: 8,
  october: 9, oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
};

const MONTH_NAMES = Object.keys(MONTHS).filter(k => k.length > 3).join('|');
const MONTH_ABBRS = 'jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec';
const ALL_MONTHS = `(?:${MONTH_NAMES}|${MONTH_ABBRS})`;

const DATE_PATTERNS: Array<{ regex: RegExp; parse: (m: RegExpExecArray) => Date | null; confidence: ParsedDate['confidence'] }> = [
  {
    regex: new RegExp(
      `(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:day\\s+of\\s+)?(${MONTH_NAMES})\\s+((?:19|20)\\d{2})`,
      'gi'
    ),
    parse: (m) => {
      const day = parseInt(m[1], 10);
      const month = MONTHS[m[2].toLowerCase()];
      const year = parseInt(m[3], 10);
      if (month === undefined || day < 1 || day > 31) return null;
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    },
    confidence: 'high',
  },
  {
    regex: new RegExp(
      `(${MONTH_NAMES})\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+((?:19|20)\\d{2})`,
      'gi'
    ),
    parse: (m) => {
      const month = MONTHS[m[1].toLowerCase()];
      const day = parseInt(m[2], 10);
      const year = parseInt(m[3], 10);
      if (month === undefined || day < 1 || day > 31) return null;
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    },
    confidence: 'high',
  },
  {
    regex: /(\d{4})-(\d{2})-(\d{2})/g,
    parse: (m) => {
      const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
      return isNaN(d.getTime()) ? null : d;
    },
    confidence: 'high',
  },
  {
    regex: /(\d{1,2})\/(\d{1,2})\/(\d{4})/g,
    parse: (m) => {
      const day = parseInt(m[1], 10);
      const month = parseInt(m[2], 10) - 1;
      const year = parseInt(m[3], 10);
      if (day < 1 || day > 31 || month < 0 || month > 11) return null;
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    },
    confidence: 'medium',
  },
  {
    regex: new RegExp(
      `(${MONTH_NAMES})\\s+((?:19|20)\\d{2})`,
      'gi'
    ),
    parse: (m) => {
      const month = MONTHS[m[1].toLowerCase()];
      const year = parseInt(m[2], 10);
      if (month === undefined) return null;
      const d = new Date(year, month, 1);
      return isNaN(d.getTime()) ? null : d;
    },
    confidence: 'low',
  },
];

const LEGAL_CONTEXT_KEYWORDS: Record<ParsedDate['context'] & string, string[]> = {
  judgment: ['judgment', 'decided', 'handed down', 'delivered', 'dated', 'order granted'],
  filing: ['filed', 'lodged', 'served', 'issued', 'return date', 'notice of appeal', 'application date'],
  limitation: ['prescribes', 'prescription', 'limitation period', 'expires', 'within', 'days of', 'months from'],
  general: [],
};

function detectContext(text: string, position: number): ParsedDate['context'] {
  const windowStart = Math.max(0, position - 80);
  const windowEnd = Math.min(text.length, position + 80);
  const window = text.slice(windowStart, windowEnd).toLowerCase();

  for (const [ctx, keywords] of Object.entries(LEGAL_CONTEXT_KEYWORDS)) {
    if (ctx === 'general') continue;
    if (keywords.some(kw => window.includes(kw))) {
      return ctx as ParsedDate['context'];
    }
  }
  return 'general';
}

export function parseDates(text: string): DateParseResult {
  const results: ParsedDate[] = [];
  const coveredRanges: Array<[number, number]> = [];

  function overlaps(start: number, end: number): boolean {
    return coveredRanges.some(([s, e]) => start < e && end > s);
  }

  for (const { regex, parse, confidence } of DATE_PATTERNS) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;
      if (overlaps(start, end)) continue;

      const date = parse(match);
      if (!date) continue;

      if (date.getFullYear() < 1890 || date.getFullYear() > 2100) continue;

      coveredRanges.push([start, end]);
      results.push({
        text: match[0].trim(),
        date,
        isoString: date.toISOString().slice(0, 10),
        confidence,
        context: detectContext(text, start),
        start,
        end,
      });
    }
  }

  results.sort((a, b) => a.start - b.start);

  const sorted = [...results].sort((a, b) => a.date.getTime() - b.date.getTime());

  return {
    dates: results,
    earliest: sorted[0],
    latest: sorted[sorted.length - 1],
    count: results.length,
  };
}

export function formatLegalDate(date: Date, format: 'long' | 'short' | 'iso' = 'long'): string {
  const day = date.getDate();
  const suffix = day === 1 || day === 21 || day === 31 ? 'st'
    : day === 2 || day === 22 ? 'nd'
    : day === 3 || day === 23 ? 'rd'
    : 'th';

  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  switch (format) {
    case 'long':
      return `${day}${suffix} ${months[date.getMonth()]} ${date.getFullYear()}`;
    case 'short':
      return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    case 'iso':
      return date.toISOString().slice(0, 10);
  }
}

export function daysBetween(a: Date, b: Date): number {
  const ms = Math.abs(b.getTime() - a.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function addCalendarDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isWithinLimitationPeriod(eventDate: Date, limitYears: number, fromDate: Date = new Date()): boolean {
  const limitDate = new Date(eventDate);
  limitDate.setFullYear(limitDate.getFullYear() + limitYears);
  return fromDate <= limitDate;
}
