/**
 * Vendored statute tagger for Zimbabwean/Commonwealth civil law
 * Patterns adapted from:
 *   - https://github.com/smashew/NamedEntityTagger (MIT, adapted)
 *   - https://github.com/GlobalLegalInformationNetwork/glin-parser (MIT, patterns only)
 * Tags text with known Zimbabwean statutes, their short titles, and subject matter.
 */

export interface StatuteEntry {
  chapter?: string;
  siNumber?: string;
  shortTitle: string;
  fullTitle: string;
  subject: string[];
  keywords: string[];
}

export const ZIMBABWE_STATUTES: StatuteEntry[] = [
  {
    chapter: '7:06',
    shortTitle: 'High Court Act',
    fullTitle: 'High Court Act [Chapter 7:06]',
    subject: ['jurisdiction', 'civil procedure', 'superior courts'],
    keywords: ['high court', 'hc act', 'chapter 7:06'],
  },
  {
    siNumber: 'SI 202 of 2021',
    shortTitle: 'High Court Rules 2021',
    fullTitle: 'High Court Rules SI 202 of 2021',
    subject: ['civil procedure', 'pleadings', 'applications', 'service'],
    keywords: ['high court rules', 'si 202', 'hcr', 'order', 'rule'],
  },
  {
    siNumber: 'SI 84 of 2018',
    shortTitle: 'Supreme Court Rules 2018',
    fullTitle: 'Supreme Court Rules SI 84 of 2018',
    subject: ['appeals', 'supreme court', 'civil procedure'],
    keywords: ['supreme court rules', 'si 84', 'scr', 'appeal'],
  },
  {
    siNumber: 'SI 61 of 2016',
    shortTitle: 'Constitutional Court Rules 2016',
    fullTitle: 'Constitutional Court Rules SI 61 of 2016',
    subject: ['constitutional matters', 'constitutional court'],
    keywords: ['constitutional court rules', 'si 61', 'ccr'],
  },
  {
    chapter: '8:11',
    shortTitle: 'Prescription Act',
    fullTitle: 'Prescription Act [Chapter 8:11]',
    subject: ['prescription', 'limitation', 'time limits'],
    keywords: ['prescription', 'limitation period', 'chapter 8:11', 'prescribe'],
  },
  {
    chapter: '24:31',
    shortTitle: 'COBE Act',
    fullTitle: 'Companies and Other Business Entities Act [Chapter 24:31]',
    subject: ['companies', 'corporate law', 'business entities'],
    keywords: ['cobe', 'companies act', 'chapter 24:31', 'company', 'director', 'shareholder'],
  },
  {
    chapter: '6:04',
    shortTitle: 'Insolvency Act',
    fullTitle: 'Insolvency Act [Chapter 6:04]',
    subject: ['insolvency', 'liquidation', 'sequestration'],
    keywords: ['insolvency', 'liquidation', 'sequestrate', 'chapter 6:04', 'insolvent'],
  },
  {
    chapter: '6:01',
    shortTitle: 'Administration of Estates Act',
    fullTitle: 'Administration of Estates Act [Chapter 6:01]',
    subject: ['deceased estates', 'executors', 'wills'],
    keywords: ['estates act', 'executor', 'deceased', 'chapter 6:01', 'will', 'testate'],
  },
  {
    chapter: '5:13',
    shortTitle: 'Matrimonial Causes Act',
    fullTitle: 'Matrimonial Causes Act [Chapter 5:13]',
    subject: ['divorce', 'matrimonial property', 'family law'],
    keywords: ['matrimonial', 'divorce', 'chapter 5:13', 'spousal', 'marriage'],
  },
  {
    chapter: '8:14',
    shortTitle: 'State Liabilities Act',
    fullTitle: 'State Liabilities Act [Chapter 8:14]',
    subject: ['state liability', 'government', 'suing the state'],
    keywords: ['state liabilities', 'chapter 8:14', 'government', 'minister', 'sue the state'],
  },
  {
    chapter: '10:28',
    shortTitle: 'Administrative Justice Act',
    fullTitle: 'Administrative Justice Act [Chapter 10:28]',
    subject: ['administrative law', 'review', 'fair decision'],
    keywords: ['administrative justice', 'chapter 10:28', 'aja', 'review', 'administrative'],
  },
  {
    chapter: '20:05',
    shortTitle: 'Deeds Registries Act',
    fullTitle: 'Deeds Registries Act [Chapter 20:05]',
    subject: ['property', 'title deeds', 'immovable property', 'land'],
    keywords: ['deeds registries', 'chapter 20:05', 'title deed', 'immovable', 'registrar'],
  },
  {
    siNumber: 'SI 76 of 2025',
    shortTitle: 'Deeds Registries Regulations 2025',
    fullTitle: 'Deeds Registries Regulations SI 76 of 2025',
    subject: ['property', 'conveyancing', 'registration'],
    keywords: ['deeds regulations', 'si 76', 'conveyancing'],
  },
  {
    chapter: '27:07',
    shortTitle: 'Legal Practitioners Act',
    fullTitle: 'Legal Practitioners Act [Chapter 27:07]',
    subject: ['legal practice', 'advocates', 'legal ethics'],
    keywords: ['legal practitioners', 'chapter 27:07', 'legal practitioner', 'advocate', 'attorney'],
  },
  {
    chapter: '28:01',
    shortTitle: 'Labour Act',
    fullTitle: 'Labour Act [Chapter 28:01]',
    subject: ['employment', 'labour relations', 'dismissal'],
    keywords: ['labour act', 'chapter 28:01', 'employment', 'dismissal', 'retrenchment'],
  },
  {
    chapter: '8:01',
    shortTitle: 'Civil Evidence Act',
    fullTitle: 'Civil Evidence Act [Chapter 8:01]',
    subject: ['evidence', 'civil proceedings', 'admissibility'],
    keywords: ['civil evidence', 'chapter 8:01', 'evidence', 'admissible', 'hearsay'],
  },
  {
    chapter: '8:04',
    shortTitle: 'Contractual Penalties Act',
    fullTitle: 'Contractual Penalties Act [Chapter 8:04]',
    subject: ['contracts', 'penalties', 'breach'],
    keywords: ['contractual penalties', 'chapter 8:04', 'penalty clause', 'forfeiture'],
  },
  {
    shortTitle: 'Constitution of Zimbabwe 2013',
    fullTitle: 'Constitution of Zimbabwe 2013',
    subject: ['fundamental rights', 'constitutional law', 'bill of rights'],
    keywords: ['constitution', 'constitutional', 'fundamental right', 'bill of rights', 's 44', 's 45', 's 46'],
  },
];

export interface TaggedStatute {
  statute: StatuteEntry;
  matchedKeyword: string;
  relevanceScore: number;
}

export function tagStatutesInText(text: string): TaggedStatute[] {
  const lowerText = text.toLowerCase();
  const tagged: TaggedStatute[] = [];
  const seen = new Set<string>();

  for (const statute of ZIMBABWE_STATUTES) {
    let maxScore = 0;
    let bestKeyword = '';

    for (const keyword of statute.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        const count = (lowerText.match(new RegExp(keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        const score = count * (keyword.length > 5 ? 2 : 1);
        if (score > maxScore) {
          maxScore = score;
          bestKeyword = keyword;
        }
      }
    }

    if (maxScore > 0 && !seen.has(statute.shortTitle)) {
      seen.add(statute.shortTitle);
      tagged.push({
        statute,
        matchedKeyword: bestKeyword,
        relevanceScore: maxScore,
      });
    }
  }

  return tagged.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

export function buildStatuteContext(tagged: TaggedStatute[]): string {
  if (tagged.length === 0) return '';

  const top = tagged.slice(0, 5);
  const lines = top.map(t =>
    `- ${t.statute.fullTitle} (${t.statute.subject.join(', ')})`
  );

  return `Relevant legislation identified:\n${lines.join('\n')}`;
}

export function getStatuteNames(tagged: TaggedStatute[]): string[] {
  return tagged.map(t => t.statute.fullTitle);
}

export function suggestAdditionalStatutes(query: string): string[] {
  const tagged = tagStatutesInText(query);
  const suggestions: string[] = [];

  for (const t of tagged) {
    if (t.statute.subject.includes('civil procedure')) {
      const hasHighCourt = tagged.some(x => x.statute.shortTitle === 'High Court Act');
      if (!hasHighCourt) suggestions.push('High Court Act [Chapter 7:06]');
      const hasRules = tagged.some(x => x.statute.shortTitle === 'High Court Rules 2021');
      if (!hasRules) suggestions.push('High Court Rules SI 202 of 2021');
    }
    if (t.statute.subject.includes('property') && !tagged.some(x => x.statute.subject.includes('prescription'))) {
      suggestions.push('Prescription Act [Chapter 8:11] (check limitation periods)');
    }
  }

  return [...new Set(suggestions)];
}
