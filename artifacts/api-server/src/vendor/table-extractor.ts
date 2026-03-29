/**
 * Vendored table extractor — HTML table parsing, patterns from csv-parser / node-table-extractor
 * Sources: https://github.com/mafintosh/csv-parser (MIT)
 *          General HTML table extraction patterns
 * Pulls structured data (e.g., court fee tables, limitation period tables) from legal documents.
 */

export interface TableCell {
  text: string;
  isHeader: boolean;
  colspan: number;
  rowspan: number;
  rawHtml?: string;
}

export interface TableRow {
  cells: TableCell[];
  isHeaderRow: boolean;
}

export interface ExtractedTable {
  rows: TableRow[];
  headers: string[];
  data: Record<string, string>[];
  rawText: string;
  caption?: string;
  tableIndex: number;
}

export interface TableExtractionResult {
  tables: ExtractedTable[];
  count: number;
}

function cleanCellText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCell(cellHtml: string, isHeader: boolean): TableCell {
  const colspanMatch = cellHtml.match(/colspan="(\d+)"/i);
  const rowspanMatch = cellHtml.match(/rowspan="(\d+)"/i);

  const innerMatch = cellHtml.match(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/i);
  const innerHtml = innerMatch ? innerMatch[1] : cellHtml;

  return {
    text: cleanCellText(innerHtml),
    isHeader,
    colspan: colspanMatch ? parseInt(colspanMatch[1], 10) : 1,
    rowspan: rowspanMatch ? parseInt(rowspanMatch[1], 10) : 1,
  };
}

function parseRow(rowHtml: string): TableRow {
  const cells: TableCell[] = [];
  const cellRegex = /<(td|th)\b[^>]*>[\s\S]*?<\/\1>/gi;
  let cellMatch: RegExpExecArray | null;
  let hasHeader = false;

  while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
    const isHeader = cellMatch[1].toLowerCase() === 'th';
    if (isHeader) hasHeader = true;
    cells.push(parseCell(cellMatch[0], isHeader));
  }

  return {
    cells,
    isHeaderRow: hasHeader || rowHtml.toLowerCase().includes('<thead'),
  };
}

function extractCaption(tableHtml: string): string | undefined {
  const captionMatch = tableHtml.match(/<caption[^>]*>([\s\S]*?)<\/caption>/i);
  if (captionMatch) {
    return cleanCellText(captionMatch[1]);
  }
  return undefined;
}

function parseTable(tableHtml: string, tableIndex: number): ExtractedTable {
  const rows: TableRow[] = [];
  const rowRegex = /<tr\b[^>]*>[\s\S]*?<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const row = parseRow(rowMatch[0]);
    if (row.cells.length > 0) {
      rows.push(row);
    }
  }

  const headerRow = rows.find(r => r.isHeaderRow) || rows[0];
  const headers = headerRow ? headerRow.cells.map(c => c.text) : [];

  const dataRows = headers.length > 0
    ? rows.filter(r => !r.isHeaderRow || r === rows[rows.length - 1])
    : rows;

  const data: Record<string, string>[] = dataRows
    .filter(r => !r.isHeaderRow)
    .map(row => {
      const record: Record<string, string> = {};
      row.cells.forEach((cell, i) => {
        const key = headers[i] || `column_${i + 1}`;
        record[key] = cell.text;
      });
      return record;
    });

  const rawText = rows
    .map(row => row.cells.map(c => c.text).join(' | '))
    .join('\n');

  return {
    rows,
    headers,
    data,
    rawText,
    caption: extractCaption(tableHtml),
    tableIndex,
  };
}

export function extractTables(html: string): TableExtractionResult {
  const tables: ExtractedTable[] = [];
  const tableRegex = /<table\b[^>]*>[\s\S]*?<\/table>/gi;
  let tableMatch: RegExpExecArray | null;
  let idx = 0;

  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const table = parseTable(tableMatch[0], idx);
    if (table.rows.length > 0) {
      tables.push(table);
      idx++;
    }
  }

  return { tables, count: tables.length };
}

export function extractTablesFromText(text: string): string[] {
  const lines = text.split('\n');
  const tables: string[] = [];
  let inTable = false;
  let tableLines: string[] = [];

  for (const line of lines) {
    const isPipeRow = /^\|.+\|$/.test(line.trim());
    const isSeparator = /^\|[-:| ]+\|$/.test(line.trim());

    if (isPipeRow || isSeparator) {
      inTable = true;
      tableLines.push(line);
    } else if (inTable) {
      if (tableLines.length >= 2) {
        tables.push(tableLines.join('\n'));
      }
      tableLines = [];
      inTable = false;
    }
  }

  if (inTable && tableLines.length >= 2) {
    tables.push(tableLines.join('\n'));
  }

  return tables;
}

export function tableToMarkdown(table: ExtractedTable): string {
  if (table.rows.length === 0) return '';

  const lines: string[] = [];

  if (table.caption) {
    lines.push(`**${table.caption}**\n`);
  }

  if (table.headers.length > 0) {
    lines.push('| ' + table.headers.join(' | ') + ' |');
    lines.push('| ' + table.headers.map(() => '---').join(' | ') + ' |');
  }

  const dataRows = table.rows.filter(r => !r.isHeaderRow);
  for (const row of dataRows) {
    lines.push('| ' + row.cells.map(c => c.text).join(' | ') + ' |');
  }

  return lines.join('\n');
}
