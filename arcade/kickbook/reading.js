// Reading tools shared by the page and the content tests: splitting text into words (for tap-to-hear), and the
// readability scores that keep every card at a 2nd-grade level.
// English: Flesch-Kincaid grade = 0.39 × words/sentence + 11.8 × syllables/word − 15.59 (lower is easier).
// Turkish: Ateşman (1997) = 198.825 − 40.175 × syllables/word − 2.610 × words/sentence (higher is easier; 70-89 easy,
// 90+ very easy). Names (a card's `names`) count as one easy word, so "Ronaldinho" does not make a card look hard.

export const LIMITS = {
  1: { sentences: 3, words: 7, en: 1.5, tr: 75 },
  2: { sentences: 4, words: 9, en: 2.5, tr: 70 },
};

/** Words of a sentence, without punctuation (apostrophes stay inside words: "Brezilya’nın"). */
export function words(sentence) {
  return sentence.split(/\s+/).map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}’']+$/gu, '').replace(/[’']$/, '')).filter(Boolean);
}

export function syllablesEn(word) {
  if (/^\d+$/.test(word)) return word.length > 2 ? 3 : 1;
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 1;
  if (w.length <= 3) return 1;
  const trimmed = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

export function syllablesTr(word) {
  if (/^\d+$/.test(word)) return 2;
  const n = (word.toLocaleLowerCase('tr').match(/[aeıioöuüâîû]/g) ?? []).length;
  return Math.max(1, n);
}

function stats(sentences, lang, names) {
  const isName = (w) => names.some((n) => w.toLocaleLowerCase(lang).startsWith(n.toLocaleLowerCase(lang)));
  let total = 0, syl = 0;
  for (const s of sentences) for (const w of words(s)) {
    total++;
    syl += isName(w) ? (lang === 'tr' ? 2 : 1) : lang === 'tr' ? syllablesTr(w) : syllablesEn(w);
  }
  return { words: total, sentences: sentences.length, spw: syl / total, wps: total / sentences.length };
}

/** Flesch-Kincaid grade of English sentences. */
export function fkGrade(sentences, names = []) {
  const s = stats(sentences, 'en', names);
  return 0.39 * s.wps + 11.8 * s.spw - 15.59;
}

/** Ateşman readability of Turkish sentences. */
export function atesman(sentences, names = []) {
  const s = stats(sentences, 'tr', names);
  return 198.825 - 40.175 * s.spw - 2.61 * s.wps;
}
