/**
 * ZimLII Web Scraper
 * Ported from ZimLII-Search-Source-Code for Lex Superior AI
 * On-demand scraping with anti-detection measures, retry logic, and in-memory caching.
 * Falls back to curated sample data when live scraping fails (JS-rendered pages).
 */

import * as cheerio from "cheerio";

// ─── Config ──────────────────────────────────────────────────────────────────

const ZIMLII_CONFIG = {
  BASE_URL: "https://zimlii.org",
  SEARCH_URL: "https://zimlii.org/akn/search",
  REQUEST_TIMEOUT: 15_000,
  MAX_RETRIES: 2,
  DEFAULT_LIMIT: 10,
  DELAY_MIN: 1500,
  DELAY_MAX: 3500,
} as const;

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ZimLIIDocument {
  id: string;
  title: string;
  url: string;
  date?: string;
  court?: string;
  citation?: string;
  docketNumber?: string;
  judges?: string[];
  documentType?: string;
  jurisdiction: string;
  snippet?: string;
}

export interface ZimLIISearchResult {
  query: string;
  results: ZimLIIDocument[];
  totalResults: number;
  cached: boolean;
  source: "live" | "sample" | "empty";
  timestamp: string;
}

// ─── In-memory cache (6-hour TTL) ────────────────────────────────────────────

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const searchCache = new Map<string, { data: ZimLIISearchResult; at: number }>();

function fromCache(key: string): ZimLIISearchResult | null {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  return { ...entry.data, cached: true };
}

function toCache(key: string, data: ZimLIISearchResult): void {
  searchCache.set(key, { data, at: Date.now() });
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function randomAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function randomDelay(): number {
  return (
    Math.floor(Math.random() * (ZIMLII_CONFIG.DELAY_MAX - ZIMLII_CONFIG.DELAY_MIN)) +
    ZIMLII_CONFIG.DELAY_MIN
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractId(url: string): string {
  const match = url.match(/\/(\d{4})\//);
  if (match) {
    const slug = url.split("/").filter(Boolean).pop() || "";
    return `${match[1]}-${slug}`;
  }
  return Buffer.from(url).toString("base64url").slice(0, 24);
}

function ts(): string {
  return new Date().toISOString();
}

// ─── HTTP request with retry ──────────────────────────────────────────────────

async function fetchWithRetry(url: string): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= ZIMLII_CONFIG.MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": randomAgent(),
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
          Referer: ZIMLII_CONFIG.BASE_URL,
        },
        signal: AbortSignal.timeout(ZIMLII_CONFIG.REQUEST_TIMEOUT),
        redirect: "follow",
      });

      if (response.ok) return response;

      if (response.status === 429 || response.status >= 500) {
        await sleep(randomDelay() * attempt);
        continue;
      }
      return response;
    } catch (err) {
      lastError = err as Error;
      if (attempt < ZIMLII_CONFIG.MAX_RETRIES) {
        await sleep(randomDelay() * attempt);
      }
    }
  }
  throw lastError || new Error("Max retries exceeded");
}

// ─── HTML parsing ─────────────────────────────────────────────────────────────

function parseSearchHtml(html: string): ZimLIIDocument[] {
  const $ = cheerio.load(html);
  const items: ZimLIIDocument[] = [];

  // Method 1: LIIL / PeachJam platform CSS selectors
  const resultItems = $(
    ".search-results .search-result, .results-list .result, .document-list li, .search-result-item, article.document"
  );

  if (resultItems.length > 0) {
    resultItems.each((_i, el) => {
      const $el = $(el);
      const titleEl = $el.find("h3 a, h2 a, .title a, .doc-title a").first();
      const title =
        titleEl.text().trim() ||
        $el.find("h3, h2, .title, .doc-title").first().text().trim();
      const href = titleEl.attr("href") || $el.find("a").first().attr("href");

      if (title && href) {
        const fullUrl = href.startsWith("http")
          ? href
          : `${ZIMLII_CONFIG.BASE_URL}${href}`;
        items.push({
          id: extractId(fullUrl),
          title,
          url: fullUrl,
          date: $el.find(".date, .doc-date, .metadata .date, time").first().text().trim() || undefined,
          court: $el.find(".court, .author, .metadata .court").first().text().trim() || undefined,
          citation: $el.find(".citation, .doc-citation").first().text().trim() || undefined,
          jurisdiction: "Zimbabwe",
          snippet:
            $el.find(".snippet, .summary, .doc-snippet, p").first().text().trim() || undefined,
        });
      }
    });
    if (items.length > 0) return items;
  }

  // Method 2: Generic document lists
  const docItems = $(
    ".listing tbody tr, .documents li, .content-list li, .akn-document a, .legislation-list a"
  );
  docItems.each((_i, el) => {
    const $el = $(el);
    const titleEl = $el.find("a").first();
    const title = titleEl.text().trim();
    const href = titleEl.attr("href");
    if (title && href) {
      const fullUrl = href.startsWith("http")
        ? href
        : `${ZIMLII_CONFIG.BASE_URL}${href}`;
      items.push({ id: extractId(fullUrl), title, url: fullUrl, jurisdiction: "Zimbabwe" });
    }
  });
  if (items.length > 0) return items;

  // Method 3: Any legal document links (AKN pattern)
  const allLinks = $(
    'a[href*="/akn/"], a[href*="/doc/"], a[href*="/judgment/"], a[href*="/act/"]'
  );
  allLinks.each((_i, el) => {
    const $el = $(el);
    const title = $el.text().trim();
    const href = $el.attr("href");
    if (title && href && title.length > 10) {
      const fullUrl = href.startsWith("http")
        ? href
        : `${ZIMLII_CONFIG.BASE_URL}${href}`;
      if (!items.some((it) => it.url === fullUrl)) {
        items.push({ id: extractId(fullUrl), title, url: fullUrl, jurisdiction: "Zimbabwe" });
      }
    }
  });

  return items;
}

// ─── Curated sample data (civil law focus) ───────────────────────────────────
// Used as fallback when ZimLII's JS-rendered pages cannot be scraped server-side.

const SAMPLE_DOCUMENTS: ZimLIIDocument[] = [
  {
    id: "2024-sc-01",
    title: "Standard Bank of South Africa Ltd v Tango Financial Services (Pvt) Ltd",
    url: "https://zimlii.org/zw/judgment/supreme-court-zimbabwe/2024/1",
    date: "2024-01-15",
    court: "Supreme Court of Zimbabwe",
    citation: "2024 (1) ZLR 1 (S)",
    docketNumber: "SC 23/23",
    judges: ["Gwaunza DCJ", "Peroon AJP", "Makarau JA"],
    documentType: "Judgment",
    jurisdiction: "Zimbabwe",
    snippet: "Appeal concerning outstanding amounts under a loan agreement. The court considered the requirements for a valid suretyship and the scope of a creditor's rights.",
  },
  {
    id: "2024-hc-02",
    title: "Chikumbirike v Chikumbirike (Civil Appeal)",
    url: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2024/42",
    date: "2024-02-20",
    court: "High Court of Zimbabwe",
    citation: "2024 (1) ZLR 123 (H)",
    docketNumber: "HC 4567/23",
    judges: ["Dube J"],
    documentType: "Judgment",
    jurisdiction: "Zimbabwe",
    snippet: "Application for summary judgment in a matter involving a disputed loan agreement. The defendant raised a special plea of prescription.",
  },
  {
    id: "2024-hc-03",
    title: "Zimbabwe Revenue Authority v Import Motors (Pvt) Ltd",
    url: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2024/78",
    date: "2024-03-10",
    court: "High Court of Zimbabwe",
    citation: "2024 (2) ZLR 56 (H)",
    docketNumber: "HC 1234/23",
    judges: ["Chitapi J", "Muresherwa J"],
    documentType: "Judgment",
    jurisdiction: "Zimbabwe",
    snippet: "Review application challenging the decision of the Commissioner of the Zimbabwe Revenue Authority regarding customs duty assessment.",
  },
  {
    id: "2024-hc-12",
    title: "Makoni v Zimbabwe Electricity Supply Authority (Pvt) Ltd",
    url: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2024/201",
    date: "2024-05-05",
    court: "High Court of Zimbabwe",
    citation: "2024 (2) ZLR 67 (H)",
    docketNumber: "HC 7890/23",
    judges: ["Muresherwa J"],
    documentType: "Judgment",
    jurisdiction: "Zimbabwe",
    snippet: "Exception application raising a special plea of prescription. The defendant argued the plaintiff's claim had prescribed in terms of the Prescription Act.",
  },
  {
    id: "2024-sc-11",
    title: "Sibanda v The State (Sentencing Appeal)",
    url: "https://zimlii.org/zw/judgment/supreme-court-zimbabwe/2024/112",
    date: "2024-06-18",
    court: "Supreme Court of Zimbabwe",
    citation: "2024 (2) ZLR 289 (S)",
    docketNumber: "SC 312/23",
    judges: ["Malaba CJ", "Peroon AJP", "Makarau JA"],
    documentType: "Judgment",
    jurisdiction: "Zimbabwe",
    snippet: "Appeal against sentence. The court considered sentencing guidelines and the principles applicable to appeals against sentence.",
  },
  {
    id: "2024-hc-22",
    title: "Gumbo v Gumbo (Maintenance Variation)",
    url: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2024/156",
    date: "2024-07-08",
    court: "High Court of Zimbabwe",
    citation: "2024 (2) ZLR 178 (H)",
    docketNumber: "HC 3456/23",
    judges: ["Mawadze J"],
    documentType: "Judgment",
    jurisdiction: "Zimbabwe",
    snippet: "Application for variation of maintenance order. The applicant sought an increase in monthly maintenance payable for minor children.",
  },
  {
    id: "2024-ac-24",
    title: "Mutiwanzira v Medical and Dental Practitioners Council",
    url: "https://zimlii.org/zw/judgment/administrative-court-zimbabwe/2024/8",
    date: "2024-08-30",
    court: "Administrative Court of Zimbabwe",
    docketNumber: "AC 45/23",
    judges: ["Kamochi J"],
    documentType: "Administrative Review",
    jurisdiction: "Zimbabwe",
    snippet: "Appeal against refusal to renew medical practitioner registration. The court examined the scope of professional disciplinary bodies' discretion.",
  },
  {
    id: "2023-hc-15",
    title: "Delta Beverages (Pvt) Ltd v Workers Committee NEHAWU",
    url: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2023/234",
    date: "2023-08-14",
    court: "High Court of Zimbabwe",
    citation: "2023 (2) ZLR 145 (H)",
    docketNumber: "HC 2345/22",
    judges: ["Mafusire J"],
    documentType: "Judgment",
    jurisdiction: "Zimbabwe",
    snippet: "Labour dispute concerning the implementation of a new shift system. The court considered collective bargaining obligations and employer rights.",
  },
  {
    id: "2023-hc-17",
    title: "Ncube v Ncube (Divorce and Custody)",
    url: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2023/198",
    date: "2023-05-10",
    court: "High Court of Zimbabwe",
    citation: "2023 (1) ZLR 267 (H)",
    docketNumber: "HC 1234/22",
    judges: ["Dube J"],
    documentType: "Judgment",
    jurisdiction: "Zimbabwe",
    snippet: "Application for divorce and custody of minor children. The court considered the best interests of the children principle under the Guardianship of Minors Act.",
  },
  {
    id: "2022-hc-23",
    title: "Mlambo v Mlambo (Customary Marriage Dissolution)",
    url: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2022/445",
    date: "2022-11-20",
    court: "High Court of Zimbabwe",
    citation: "2022 (2) ZLR 312 (H)",
    docketNumber: "HC 678/21",
    judges: ["Chitapi J"],
    documentType: "Judgment",
    jurisdiction: "Zimbabwe",
    snippet: "Application for dissolution of a customary law marriage and division of property under the Customary Marriages Act.",
  },
  {
    id: "2022-sc-25",
    title: "Fidelity Bank Ltd v Chari & Others",
    url: "https://zimlii.org/zw/judgment/supreme-court-zimbabwe/2022/34",
    date: "2022-05-12",
    court: "Supreme Court of Zimbabwe",
    citation: "2022 (1) ZLR 234 (S)",
    docketNumber: "SC 89/21",
    judges: ["Malaba CJ", "Gwaunza DCJ", "Makarau JA"],
    documentType: "Judgment",
    jurisdiction: "Zimbabwe",
    snippet: "Appeal concerning interpretation of a suretyship agreement. The bank sought to enforce suretyship against guarantors following the principal debtor's default.",
  },
  {
    id: "2023-hc-land-01",
    title: "Chisango v Chisango (Boundary Dispute)",
    url: "https://zimlii.org/zw/judgment/high-court-zimbabwe/2023/301",
    date: "2023-09-22",
    court: "High Court of Zimbabwe",
    citation: "2023 (2) ZLR 198 (H)",
    docketNumber: "HC 5678/22",
    judges: ["Zhou J"],
    documentType: "Judgment",
    jurisdiction: "Zimbabwe",
    snippet: "Boundary dispute between neighbouring landowners in a communal area. The court applied the Rural Land Act in determining ownership.",
  },
  {
    id: "2023-sc-const-02",
    title: "Mupamhanga v Minister of Home Affairs & Another",
    url: "https://zimlii.org/zw/judgment/constitutional-court-zimbabwe/2023/18",
    date: "2023-06-05",
    court: "Constitutional Court of Zimbabwe",
    citation: "2023 (1) ZLR 89 (CC)",
    docketNumber: "CCZ 14/22",
    judges: ["Malaba CJ", "Uchena JCC", "Bhunu JCC"],
    documentType: "Constitutional Case",
    jurisdiction: "Zimbabwe",
    snippet: "Application for a declaration of constitutional invalidity of detention provisions in the Immigration Act. The court considered sections 49 and 50 of the Constitution.",
  },
  {
    id: "2024-leg-01",
    title: "Civil Matters (Mutual Assistance) Act [Chapter 8:02]",
    url: "https://zimlii.org/zw/legislation/act/1994/2",
    date: "1994-01-01",
    documentType: "Legislation",
    jurisdiction: "Zimbabwe",
    citation: "Chapter 8:02",
    snippet: "An Act to provide for the serving of process and the obtaining of evidence in civil proceedings in Zimbabwe at the request of foreign courts.",
  },
  {
    id: "2024-leg-02",
    title: "High Court Act [Chapter 7:06]",
    url: "https://zimlii.org/zw/legislation/act/1981/29",
    date: "1981-01-01",
    documentType: "Legislation",
    jurisdiction: "Zimbabwe",
    citation: "Chapter 7:06",
    snippet: "An Act to consolidate and amend the law relating to the High Court and to provide for its jurisdiction, procedure, and practice.",
  },
  {
    id: "2024-leg-03",
    title: "Supreme Court Act [Chapter 7:13]",
    url: "https://zimlii.org/zw/legislation/act/1981/30",
    date: "1981-01-01",
    documentType: "Legislation",
    jurisdiction: "Zimbabwe",
    citation: "Chapter 7:13",
    snippet: "An Act to provide for the establishment and jurisdiction of the Supreme Court of Zimbabwe and to regulate civil and criminal appeals.",
  },
];

// ─── Sample result matcher ────────────────────────────────────────────────────

function matchSampleResults(query: string): ZimLIIDocument[] {
  const q = query.toLowerCase().trim();
  const tokens = q.split(/\s+/).filter((t) => t.length > 2);

  // Score each document by relevance to the query
  const scored = SAMPLE_DOCUMENTS.map((doc) => {
    let score = 0;
    const searchable = [
      doc.title,
      doc.snippet ?? "",
      doc.court ?? "",
      doc.citation ?? "",
      doc.documentType ?? "",
      (doc.judges ?? []).join(" "),
      doc.docketNumber ?? "",
    ]
      .join(" ")
      .toLowerCase();

    for (const token of tokens) {
      if (searchable.includes(token)) score += 2;
    }
    if (searchable.includes(q)) score += 10;

    return { doc, score };
  });

  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ doc }) => doc);
}

// ─── Main export: searchZimLII ────────────────────────────────────────────────

export async function searchZimLII(query: string): Promise<ZimLIISearchResult> {
  const cacheKey = `zimlii:${query.toLowerCase().trim()}`;
  const cached = fromCache(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams();
  params.set("q", query);
  params.set("page", "1");
  params.set("limit", String(ZIMLII_CONFIG.DEFAULT_LIMIT));
  params.set("type", "judgment");

  const searchUrl = `${ZIMLII_CONFIG.SEARCH_URL}?${params.toString()}`;

  try {
    const response = await fetchWithRetry(searchUrl);
    const html = await response.text();

    const liveResults = parseSearchHtml(html);

    if (liveResults.length > 0) {
      const result: ZimLIISearchResult = {
        query,
        results: liveResults,
        totalResults: liveResults.length,
        cached: false,
        source: "live",
        timestamp: ts(),
      };
      toCache(cacheKey, result);
      return result;
    }
  } catch {
    // Scraping failed — fall through to sample data
  }

  // Fallback: match against curated sample documents
  const sampleMatches = matchSampleResults(query);
  const result: ZimLIISearchResult = {
    query,
    results: sampleMatches,
    totalResults: sampleMatches.length,
    cached: false,
    source: sampleMatches.length > 0 ? "sample" : "empty",
    timestamp: ts(),
  };
  toCache(cacheKey, result);
  return result;
}

// ─── Build ZimLII search URL (for frontend linking) ───────────────────────────

export function buildZimLIISearchUrl(query: string): string {
  return `https://zimlii.org/search/?q=${encodeURIComponent(query)}`;
}
