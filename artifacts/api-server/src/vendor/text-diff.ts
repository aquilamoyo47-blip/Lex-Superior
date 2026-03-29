/**
 * Vendored text diff — Myers diff algorithm ported from kpdecker/jsdiff
 * Source: https://github.com/kpdecker/jsdiff (BSD-3-Clause)
 * Compares document versions in the Vault and shows what changed between uploaded revisions.
 */

export type DiffChangeType = 'equal' | 'insert' | 'delete';

export interface DiffChange {
  type: DiffChangeType;
  value: string;
  count?: number;
}

export interface DiffResult {
  changes: DiffChange[];
  additions: number;
  deletions: number;
  unchanged: number;
  similarity: number;
}

interface DiffEdit {
  x: number;
  y: number;
  snake?: boolean;
  diag?: number;
}

function splitLines(text: string): string[] {
  return text.split(/(\n)/);
}

function splitWords(text: string): string[] {
  return text.split(/(\s+|[^a-zA-Z0-9]+)/);
}

function splitChars(text: string): string[] {
  return text.split('');
}

function myersDiff(oldTokens: string[], newTokens: string[]): DiffChange[] {
  const M = oldTokens.length;
  const N = newTokens.length;

  if (M === 0 && N === 0) return [];
  if (M === 0) return [{ type: 'insert', value: newTokens.join(''), count: N }];
  if (N === 0) return [{ type: 'delete', value: oldTokens.join(''), count: M }];

  const MAX = M + N;
  const V: number[] = new Array(2 * MAX + 1).fill(0);
  const trace: number[][] = [];

  outerLoop: for (let d = 0; d <= MAX; d++) {
    trace.push([...V]);

    for (let k = -d; k <= d; k += 2) {
      const kIdx = k + MAX;
      let x: number;

      if (k === -d || (k !== d && V[kIdx - 1] < V[kIdx + 1])) {
        x = V[kIdx + 1];
      } else {
        x = V[kIdx - 1] + 1;
      }

      let y = x - k;

      while (x < M && y < N && oldTokens[x] === newTokens[y]) {
        x++;
        y++;
      }

      V[kIdx] = x;

      if (x >= M && y >= N) {
        break outerLoop;
      }
    }
  }

  const changes: DiffChange[] = [];
  let x = M;
  let y = N;

  for (let d = trace.length - 1; d >= 0; d--) {
    const v = trace[d];
    const kIdx = (x - y) + MAX;

    let prevK: number;
    if ((x - y) === -d || ((x - y) !== d && v[kIdx - 1] < v[kIdx + 1])) {
      prevK = (x - y) + 1;
    } else {
      prevK = (x - y) - 1;
    }

    const prevX = v[prevK + MAX];
    const prevY = prevX - prevK;

    while (x > prevX && y > prevY) {
      changes.unshift({ type: 'equal', value: oldTokens[x - 1], count: 1 });
      x--;
      y--;
    }

    if (d > 0) {
      if (x === prevX) {
        changes.unshift({ type: 'insert', value: newTokens[y - 1], count: 1 });
        y--;
      } else {
        changes.unshift({ type: 'delete', value: oldTokens[x - 1], count: 1 });
        x--;
      }
    }
  }

  return coalesceChanges(changes);
}

function coalesceChanges(changes: DiffChange[]): DiffChange[] {
  const result: DiffChange[] = [];
  for (const change of changes) {
    const last = result[result.length - 1];
    if (last && last.type === change.type) {
      last.value += change.value;
      last.count = (last.count ?? 1) + (change.count ?? 1);
    } else {
      result.push({ ...change });
    }
  }
  return result;
}

export function diffLines(oldText: string, newText: string): DiffResult {
  const oldLines = splitLines(oldText);
  const newLines = splitLines(newText);
  const changes = myersDiff(oldLines, newLines);
  return buildResult(changes);
}

export function diffWords(oldText: string, newText: string): DiffResult {
  const oldWords = splitWords(oldText);
  const newWords = splitWords(newText);
  const changes = myersDiff(oldWords, newWords);
  return buildResult(changes);
}

export function diffChars(oldText: string, newText: string): DiffResult {
  const oldChars = splitChars(oldText);
  const newChars = splitChars(newText);
  const changes = myersDiff(oldChars, newChars);
  return buildResult(changes);
}

function buildResult(changes: DiffChange[]): DiffResult {
  let additions = 0;
  let deletions = 0;
  let unchanged = 0;

  for (const change of changes) {
    if (change.type === 'insert') additions += change.value.length;
    else if (change.type === 'delete') deletions += change.value.length;
    else unchanged += change.value.length;
  }

  const total = additions + deletions + unchanged;
  const similarity = total > 0 ? unchanged / total : 1;

  return { changes, additions, deletions, unchanged, similarity };
}

export function formatDiffAsText(result: DiffResult): string {
  return result.changes
    .map(change => {
      if (change.type === 'insert') return `[+${change.value}]`;
      if (change.type === 'delete') return `[-${change.value}]`;
      return change.value;
    })
    .join('');
}

export function formatDiffAsMarkdown(result: DiffResult): string {
  const lines: string[] = [];
  for (const change of result.changes) {
    if (change.type === 'insert') {
      for (const line of change.value.split('\n')) {
        if (line) lines.push(`+ ${line}`);
      }
    } else if (change.type === 'delete') {
      for (const line of change.value.split('\n')) {
        if (line) lines.push(`- ${line}`);
      }
    } else {
      for (const line of change.value.split('\n')) {
        if (line) lines.push(`  ${line}`);
      }
    }
  }
  return lines.join('\n');
}

export function hasMeaningfulChanges(result: DiffResult, threshold = 0.01): boolean {
  const total = result.additions + result.deletions + result.unchanged;
  if (total === 0) return false;
  return (result.additions + result.deletions) / total > threshold;
}

export function summarizeDiff(result: DiffResult): string {
  const pct = Math.round((1 - result.similarity) * 100);
  if (pct === 0) return 'No changes detected.';
  if (pct <= 5) return `Minor changes (${pct}% different): ${result.additions} characters added, ${result.deletions} removed.`;
  if (pct <= 25) return `Moderate changes (${pct}% different): ${result.additions} characters added, ${result.deletions} removed.`;
  return `Significant changes (${pct}% different): ${result.additions} characters added, ${result.deletions} removed.`;
}
