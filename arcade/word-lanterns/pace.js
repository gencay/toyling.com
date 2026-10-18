// Fair pacing: the Block Blast-style "the generator looks at the player and picks the next board" idea, kept honest.
// Each new board is chosen from CANDIDATES boards built with the same round and level, so the level's rules (grid,
// words, directions, look-alike letters) never change and the game still only gets harder. Within that band the pick
// follows a tension wave through the round, and eases right after a board where the player needed a lot of help.
//
// Fairness rule (Toyling factory, eval adaptive-fairness): the only inputs are the round, the level and the player's
// own recent boards (words, help used, time). Never ads, purchases, hints owned or any revenue data.
// tests/pace.test.js enforces this.

export const CANDIDATES = 6;
export const FORM_SIZE = 5;

/** Tension through a round's levels: build up, a short breather before the finale, then the finale. */
export const WAVE = [0.3, 0.5, 0.65, 0.45, 0.6];

/** Help (hints and Lumi) per word on the last board at which the next board is the easiest of the candidates. */
export const RESCUE_AT = 0.5;

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};
const clamp01 = (x) => Math.min(1, Math.max(0, x));

/** How hard one placed word is to spot: direction, reading backwards, look-alike first letters and length. */
export function wordDifficulty(word, grid, size) {
  const dr = Math.sign(Math.floor(word.end / size) - Math.floor(word.start / size));
  const dc = Math.sign((word.end % size) - (word.start % size));
  let w = dr === 0 ? 1 : dc === 0 ? 1.3 : 1.8;
  if (dc < 0 || (dc === 0 && dr < 0)) w *= 1.5;
  let starts = 0;
  for (let i = 0; i < grid.length; i++) if (grid[i] === word.text[0]) starts++;
  return (w * (1 + (starts - 1) / size)) / Math.sqrt(word.text.length / 4);
}

/** Difficulty of a whole board ({ size, grid, words }), comparable between boards of the same round and level. */
export const boardScore = (b) => b.words.reduce((s, w) => s + wordDifficulty(w, b.grid, b.size), 0);

/** One finished board for the player's form: words on it, help used (hints + Lumi) and seconds taken. */
export const formEntry = (words, assists, seconds) => ({ words, assists, seconds: Math.round(seconds) });

/** Adds a finished board to the form, keeping the last FORM_SIZE. */
export const pushForm = (form, entry) => [...(form ?? []), entry].slice(-FORM_SIZE);

/**
 * Where to pick in the band, 0 (easiest candidate) to 1 (hardest), from the round's wave and the player's own form.
 * Reads only `level` and `form`.
 */
export function adaptTarget({ level, form }) {
  const wave = WAVE[Math.min(Math.max(level, 1), WAVE.length) - 1];
  const recent = Array.isArray(form) ? form.filter((f) => f && f.words > 0) : [];
  if (!recent.length) return wave;
  const last = recent.at(-1);
  if (last.assists / last.words >= RESCUE_AT) return 0;
  let t = wave;
  const pace = recent.slice(0, -1).map((f) => f.seconds / f.words);
  if (pace.length >= 2) {
    const ratio = last.seconds / last.words / Math.max(median(pace), 1);
    if (ratio > 1.6) t -= 0.25;
    else if (ratio < 0.7) t += 0.15;
  }
  const help = recent.reduce((s, f) => s + f.assists, 0) / recent.reduce((s, f) => s + f.words, 0);
  if (help > 0.3) t -= 0.15;
  else if (help === 0 && recent.length >= 3) t += 0.1;
  return clamp01(t);
}

/** The k-th candidate seed for a base seed (never 0, the same in every runtime). */
export function candidateSeed(base, k) {
  let h = (base ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0 || 1;
}

/**
 * Picks the seed whose board sits at `target` among CANDIDATES boards (scoreOf(seed) builds one and scores it).
 * Deterministic: the same base seed, target and board settings always give the same seed, so reloads match.
 */
export function pickSeed(base, target, scoreOf) {
  const ranked = Array.from({ length: CANDIDATES }, (_, k) => {
    const seed = candidateSeed(base, k);
    return { seed, score: scoreOf(seed) };
  }).sort((a, b) => a.score - b.score || a.seed - b.seed);
  return ranked[Math.round(clamp01(target) * (CANDIDATES - 1))].seed;
}
