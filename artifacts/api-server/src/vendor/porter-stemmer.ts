/**
 * Vendored Porter stemmer — ported from NaturalNode/natural
 * Source: https://github.com/NaturalNode/natural (MIT)
 * Normalises legal term variants (e.g., "pleading" → "plead").
 * Used by BM25 and TF-IDF modules.
 */

function hasSuffix(word: string, suffix: string): boolean {
  return word.endsWith(suffix);
}

function containsVowel(stem: string): boolean {
  return /[aeiou]/.test(stem);
}

function measure(stem: string): number {
  const processed = stem.toLowerCase();
  let m = 0;
  let prevVowel = false;
  for (let i = 0; i < processed.length; i++) {
    const isVowel = /[aeiou]/.test(processed[i]) || (processed[i] === 'y' && i > 0 && !/[aeiou]/.test(processed[i - 1]));
    if (!prevVowel && isVowel) {
      prevVowel = true;
    } else if (prevVowel && !isVowel) {
      m++;
      prevVowel = false;
    }
  }
  return m;
}

function endsWithDoubleConsonant(word: string): boolean {
  if (word.length < 2) return false;
  const last = word[word.length - 1];
  const secondLast = word[word.length - 2];
  return last === secondLast && !/[aeiou]/.test(last);
}

function endsCVC(word: string): boolean {
  if (word.length < 3) return false;
  const c3 = word[word.length - 1];
  const c2 = word[word.length - 2];
  const c1 = word[word.length - 3];
  const isVowel = (c: string) => /[aeiou]/.test(c);
  if (c3 === 'w' || c3 === 'x' || c3 === 'y') return false;
  return !isVowel(c3) && isVowel(c2) && !isVowel(c1);
}

function step1a(word: string): string {
  if (hasSuffix(word, 'sses')) return word.slice(0, -2);
  if (hasSuffix(word, 'ies')) return word.slice(0, -2);
  if (hasSuffix(word, 'ss')) return word;
  if (hasSuffix(word, 's')) return word.slice(0, -1);
  return word;
}

function step1b(word: string): string {
  if (hasSuffix(word, 'eed')) {
    const stem = word.slice(0, -3);
    if (measure(stem) > 0) return stem + 'ee';
    return word;
  }
  if (hasSuffix(word, 'ed')) {
    const stem = word.slice(0, -2);
    if (containsVowel(stem)) {
      return step1bHelper(stem);
    }
    return word;
  }
  if (hasSuffix(word, 'ing')) {
    const stem = word.slice(0, -3);
    if (containsVowel(stem)) {
      return step1bHelper(stem);
    }
    return word;
  }
  return word;
}

function step1bHelper(stem: string): string {
  if (hasSuffix(stem, 'at')) return stem + 'e';
  if (hasSuffix(stem, 'bl')) return stem + 'e';
  if (hasSuffix(stem, 'iz')) return stem + 'e';
  if (endsWithDoubleConsonant(stem) && !hasSuffix(stem, 'l') && !hasSuffix(stem, 's') && !hasSuffix(stem, 'z')) {
    return stem.slice(0, -1);
  }
  if (measure(stem) === 1 && endsCVC(stem)) return stem + 'e';
  return stem;
}

function step1c(word: string): string {
  if (hasSuffix(word, 'y')) {
    const stem = word.slice(0, -1);
    if (containsVowel(stem)) return stem + 'i';
  }
  return word;
}

function step2(word: string): string {
  const suffixMap: Array<[string, string]> = [
    ['ational', 'ate'], ['tional', 'tion'], ['enci', 'ence'], ['anci', 'ance'],
    ['izer', 'ize'], ['abli', 'able'], ['alli', 'al'], ['entli', 'ent'],
    ['eli', 'e'], ['ousli', 'ous'], ['ization', 'ize'], ['ation', 'ate'],
    ['ator', 'ate'], ['alism', 'al'], ['iveness', 'ive'], ['fulness', 'ful'],
    ['ousness', 'ous'], ['aliti', 'al'], ['iviti', 'ive'], ['biliti', 'ble'],
  ];
  for (const [suffix, replacement] of suffixMap) {
    if (hasSuffix(word, suffix)) {
      const stem = word.slice(0, -suffix.length);
      if (measure(stem) > 0) return stem + replacement;
    }
  }
  return word;
}

function step3(word: string): string {
  const suffixMap: Array<[string, string]> = [
    ['icate', 'ic'], ['ative', ''], ['alize', 'al'], ['iciti', 'ic'],
    ['ical', 'ic'], ['ful', ''], ['ness', ''],
  ];
  for (const [suffix, replacement] of suffixMap) {
    if (hasSuffix(word, suffix)) {
      const stem = word.slice(0, -suffix.length);
      if (measure(stem) > 0) return stem + replacement;
    }
  }
  return word;
}

function step4(word: string): string {
  const suffixes = [
    'al', 'ance', 'ence', 'er', 'ic', 'able', 'ible', 'ant', 'ement',
    'ment', 'ent', 'ion', 'ou', 'ism', 'ate', 'iti', 'ous', 'ive', 'ize',
  ];
  for (const suffix of suffixes) {
    if (hasSuffix(word, suffix)) {
      const stem = word.slice(0, -suffix.length);
      if (suffix === 'ion') {
        if (measure(stem) > 1 && (hasSuffix(stem, 's') || hasSuffix(stem, 't'))) {
          return stem;
        }
        continue;
      }
      if (measure(stem) > 1) return stem;
    }
  }
  return word;
}

function step5a(word: string): string {
  if (hasSuffix(word, 'e')) {
    const stem = word.slice(0, -1);
    if (measure(stem) > 1) return stem;
    if (measure(stem) === 1 && !endsCVC(stem)) return stem;
  }
  return word;
}

function step5b(word: string): string {
  if (measure(word) > 1 && endsWithDoubleConsonant(word) && hasSuffix(word, 'l')) {
    return word.slice(0, -1);
  }
  return word;
}

export function stem(word: string): string {
  if (word.length <= 2) return word.toLowerCase();

  let w = word.toLowerCase();
  w = step1a(w);
  w = step1b(w);
  w = step1c(w);
  w = step2(w);
  w = step3(w);
  w = step4(w);
  w = step5a(w);
  w = step5b(w);
  return w;
}

export function stemTokens(tokens: string[]): string[] {
  return tokens.map(stem);
}

export function stemText(text: string): string {
  return text.split(/\s+/).map(stem).join(' ');
}
