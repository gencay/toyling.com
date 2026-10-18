// Letter games for b, d and s (owner's request, October 18, 2026). Young readers often mix up b and d, and write s
// backwards. The football memory trick: "b: the goalpost first, then the ball" (| then ●), "d: the ball first, then
// the goalpost" (● then |), and s is a snake that starts at the top. Four games, all seeded:
//   keeper:  a big letter flies at the goal; the child catches it with the b glove or the d glove;
//   missing: a picture word with its first letter missing; pick b, d or s;
//   mirror:  which s is written the right way round?
//   find:    tap every ball with the target letter among look-alikes.

export const LETTERS = ['b', 'd', 's'];
export const MODES = ['keeper', 'missing', 'mirror', 'find', 'puzzle', 'sentence'];

// From the owner's 2nd-grade writing worksheet "S, b, d Yazı Çalışması" (claude.ai artifact KED5DKDJCo8uF6LdebX6RN,
// read October 18, 2026): its long sentences and its two-missing-letters puzzle. Worksheet item 7 ("___ü___ük",
// büyük) is left out: its second missing letter is y, not b, d or s. English sets are written to the same rules.
export const SENTENCES = {
  tr: [
    'Dedem bahçedeki ağaçtan bol bol badem topladı.',
    'Babam sabah erkenden bisikletle bakkala gitti.',
    'Sude ile Deniz bahçede beraber saklambaç oynadı.',
    'Annem dolaptaki sütü büyük bardağa doldurdu.',
    'Bodrum’da denize giren Selin dalgalarla oynadı.',
    'Sabah dişlerimi fırçalar, sonra bol bol kahvaltı ederim.',
    'Bebeğin battaniyesi sobanın yanında kurudu.',
    'Dondurmacı bize böğürtlenli ve sade dondurma verdi.',
    'Doktor, boğazım ağrıdığı için bana şurup verdi.',
  ],
  en: [
    'Dad and Ben ride their bikes to the beach.',
    'Sam saw a big duck swim in the pond.',
    'The dog sleeps on a soft blue bed.',
    'Sara drinks milk from a big brown cup.',
    'Bob builds a sandcastle by the sea.',
    'Dina brushes her teeth before breakfast.',
    'The baby sits on a soft sofa with a book.',
    'Six birds sing in the big tree.',
    'Dan scores a goal and the fans dance.',
  ],
};
/** Words with two letters missing (each a b, d or s), and where the gaps are. */
export const PUZZLES = {
  tr: [['bardak', [0, 3]], ['dondurma', [0, 3]], ['bidon', [0, 2]], ['badem', [0, 2]], ['sabun', [0, 2]], ['susam', [0, 2]], ['doldur', [0, 3]]],
  en: [['bed', [0, 2]], ['bird', [0, 3]], ['sand', [0, 3]], ['desk', [0, 2]], ['bus', [0, 2]], ['dads', [0, 3]], ['sad', [0, 2]]],
};

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
    ['b', 'bardak', '🥛'], ['b', 'badem', '🌰'], ['s', 'sabun', '🧼'], ['s', 'sepet', '🧺'],
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
  if (mode === 'puzzle') {
    // fill both gaps, one after the other (each answer is b, d or s)
    const [word, gaps] = pick(rand, PUZZLES[lang]);
    return { mode, word, gaps, steps: gaps.map((g) => word[g]), answer: 'steps', options: ['b', 'd', 's'] };
  }
  if (mode === 'sentence') {
    // read a long sentence, then find the word that starts with a letter, or count a letter
    const sentence = pick(rand, SENTENCES[lang]);
    const words = [...new Set(sentence.split(/\s+/).map((w) => w.replace(/[.,!?’']+.*$|[.,!?]$/g, '').replace(/[.,!?]/g, '')))];
    const low = (w) => w.toLocaleLowerCase(lang);
    const present = LETTERS.filter((l) => words.some((w) => low(w)[0] === l));
    if (rand() < 0.5 && present.length) {
      const letter = pick(rand, present);
      const right = pick(rand, words.filter((w) => low(w)[0] === letter));
      const others = shuffle(words.filter((w) => low(w)[0] !== letter && w.length > 1), rand);
      // prefer look-alike starts (b for d, d for b) so the child really looks at the letter
      others.sort((a, b) => (LETTERS.includes(low(b)[0]) ? 1 : 0) - (LETTERS.includes(low(a)[0]) ? 1 : 0));
      return { mode, kind: 'starts', sentence, letter, answer: right, options: shuffle([right, ...others.slice(0, 2)], rand) };
    }
    const letter = pick(rand, LETTERS.filter((l) => low(sentence).includes(l)));
    const n = [...low(sentence)].filter((c) => c === letter).length;
    const opts = [n, n + 1, n > 1 ? n - 1 : n + 2].map(String);
    return { mode, kind: 'count', sentence, letter, answer: String(n), options: shuffle([...new Set(opts)], rand) };
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
