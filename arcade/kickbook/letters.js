// Letter games for b, d and s (owner's request, October 18, 2026). Young readers often mix up b and d, and write s
// backwards. The football memory trick: "b: the goalpost first, then the ball" (| then ●), "d: the ball first, then
// the goalpost" (● then |), and s is a snake that starts at the top. Four games, all seeded:
//   keeper:  a big letter flies at the goal; the child catches it with the b glove or the d glove;
//   missing: a picture word with its first letter missing; pick b, d or s;
//   mirror:  which s is written the right way round?
//   find:    tap every ball with the target letter among look-alikes.

export const LETTERS = ['b', 'd', 's'];
export const MODES = ['keeper', 'missing', 'mirror', 'find'];

/** Picture words starting with b, d or s (emoji pictures, no files). */
export const WORDS = {
  en: [
    ['b', 'ball', '⚽'], ['b', 'bed', '🛏️'], ['b', 'bus', '🚌'], ['b', 'bird', '🐦'], ['b', 'boot', '👢'], ['b', 'banana', '🍌'],
    ['d', 'dog', '🐶'], ['d', 'duck', '🦆'], ['d', 'drum', '🥁'], ['d', 'door', '🚪'], ['d', 'dice', '🎲'], ['d', 'dinosaur', '🦕'],
    ['s', 'sun', '☀️'], ['s', 'sock', '🧦'], ['s', 'star', '⭐'], ['s', 'snake', '🐍'], ['s', 'shoe', '👟'], ['s', 'six', '6️⃣'],
  ],
  tr: [
    ['b', 'balık', '🐟'], ['b', 'bebek', '👶'], ['b', 'bulut', '☁️'], ['b', 'bal', '🍯'], ['b', 'bisiklet', '🚲'], ['b', 'balon', '🎈'],
    ['d', 'dağ', '⛰️'], ['d', 'diş', '🦷'], ['d', 'dondurma', '🍦'], ['d', 'deve', '🐫'], ['d', 'davul', '🥁'], ['d', 'dinozor', '🦕'],
    ['s', 'su', '💧'], ['s', 'saat', '⏰'], ['s', 'simit', '🥯'], ['s', 'salyangoz', '🐌'], ['s', 'sandalye', '🪑'], ['s', 'sincap', '🐿️'],
  ],
};

const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];
function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/**
 * One letter question. Option keys: 'b', 'd', 's' (written normally) and 'b~', 'd~', 's~' (mirrored, for the mirror
 * game). Returns { mode, answer, options, ... } for the page to draw; `level` 2 adds harder look-alikes.
 */
export function makeLetterQuestion(mode, { lang = 'en', level = 1, rand }) {
  if (mode === 'keeper') {
    const letter = pick(rand, ['b', 'd']);
    return { mode, letter, answer: letter, options: ['b', 'd'] };
  }
  if (mode === 'missing') {
    const [letter, word, picture] = pick(rand, WORDS[lang]);
    return { mode, letter, word, picture, rest: word.slice(1), answer: letter, options: shuffle(LETTERS, rand) };
  }
  if (mode === 'mirror') {
    // Only s: a mirrored b is simply a d (and the other way round), which the keeper game already teaches.
    const letter = 's';
    return { mode, letter, answer: letter, options: shuffle([letter, `${letter}~`], rand) };
  }
  // find: a 3 x 4 field of balls; 3 or 4 carry the target, the rest are look-alikes (mirrored or the other letter).
  const target = pick(rand, LETTERS);
  // Never a mirrored b or d as a decoy: a mirrored b looks exactly like a d, so it would be the target in disguise.
  const decoys = target === 's' ? ['s~', 'z', 's~'] : target === 'b' ? ['d', 'p', 'd'] : ['b', 'q', 'b'];
  const hits = 3 + Math.floor(rand() * 2);
  const cells = shuffle([...Array(hits).fill(target), ...Array.from({ length: 12 - hits }, (_, i) => (level === 1 && i % 3 === 2 ? 'o' : decoys[i % decoys.length]))], rand);
  return { mode, target, cells, answer: 'all', options: cells.map((_, i) => String(i)), hits: cells.map((c, i) => (c === target ? String(i) : null)).filter((x) => x !== null) };
}
