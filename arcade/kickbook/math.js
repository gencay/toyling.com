// Math training (owner's request, October 18, 2026): 2nd-grade math with a football theme, in English and Turkish.
// Curriculum (read October 18, 2026):
//   - Türkiye, MEB 2. sınıf (2018 program, as listed in a university course note: avys.omu.edu.tr, "Çarpma işlemi"):
//     multiplication as repeated addition, numbers up to 10 times 1-5, and the multiplication table up to 5.
//     (The 2024 Maarif program text could not be read; check it before relying on exact outcome codes.)
//   - USA, Common Core grade 2 (ospi.k12.wa.us, mathstandards_grade2.pdf): add and subtract within 100 in word problems
//     (2.OA.A.1), fluently within 20 (2.OA.B.2), arrays up to 5 by 5 (2.OA.C.4), skip-counting by 5s and 10s (2.NBT.A.2).
// So: tables 1-5 are the core and tables 6-10 a bonus for later; add/subtract within 20 (level 1) and 100 (level 2).
// Every question is seeded, has exactly one right answer among 3 options, and the wrong options are believable.

export const TOPICS = ['times', 'add', 'sub', 'array', 'skip', 'story'];
export const CORE_TABLES = [1, 2, 3, 4, 5];
export const BONUS_TABLES = [6, 7, 8, 9, 10];
export const SESSION = 5;
export const MASTERY = 2; // right on the first try this many times = mastered

const int = (rand, lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];
export const factKey = (a, b) => `${a}x${b}`;

/** Three options: the answer and two believable wrong ones, shuffled. */
export function options(answer, near, rand) {
  const set = new Set([answer]);
  for (const n of [...near, answer + 1, answer - 1, answer + 2, answer + 10, answer - 10]) {
    if (set.size === 3) break;
    if (Number.isInteger(n) && n >= 0 && n !== answer) set.add(n);
  }
  const out = [...set].map(String);
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

/** The next table fact to practise: unmastered facts first, in a seeded order. */
export function nextFact(table, facts, rand) {
  const all = Array.from({ length: 10 }, (_, i) => i + 1);
  const open = all.filter((a) => (facts[factKey(a, table)] ?? 0) < MASTERY);
  return pick(rand, open.length ? open : all);
}

const STORY = {
  times: [
    (a, b, n) => ({ en: `${n} scores ${b} goals in each game. He plays ${a} games. How many goals is that?`, tr: `${n} her maçta ${b} gol atıyor. ${a} maç oynuyor. Kaç gol eder?` }),
    (a, b) => ({ en: `There are ${a} teams. Each team has ${b} balls. How many balls in all?`, tr: `${a} takım var. Her takımın ${b} topu var. Hepsi kaç top?` }),
  ],
  add: [
    (a, b, n) => ({ en: `${n} scored ${a} goals. Then he scored ${b} more. How many goals now?`, tr: `${n} ${a} gol attı. Sonra ${b} gol daha attı. Şimdi kaç golü var?` }),
    (a, b) => ({ en: `${a} fans sit on the left. ${b} fans sit on the right. How many fans?`, tr: `Solda ${a} taraftar, sağda ${b} taraftar oturuyor. Kaç taraftar var?` }),
  ],
  sub: [
    (a, b) => ({ en: `There are ${a} balls. ${b} balls roll away. How many are left?`, tr: `${a} top var. ${b} top yuvarlanıp gidiyor. Kaç top kaldı?` }),
    (a, b, n) => ({ en: `${n} has ${a} stickers. He gives ${b} to a friend. How many are left?`, tr: `${n}’nın ${a} çıkartması var. ${b} tanesini arkadaşına veriyor. Kaç tane kaldı?` }),
  ],
};
const STORY_NAMES = ['Messi', 'Pelé', 'Haaland', 'Mbappé', 'Arda', 'Ronaldo'];

/**
 * One math question. topic: one of TOPICS; level 1 or 2; table: for 'times'. facts: the child's mastery counts.
 * Returns { topic, answer (string), options, en, tr, fact?, array? }.
 */
export function makeQuestion(topic, { level = 1, table = 2, facts = {}, rand }) {
  if (topic === 'times') {
    const a = nextFact(table, facts, rand);
    const ans = a * table;
    return { topic, fact: factKey(a, table), answer: String(ans), options: options(ans, [ans + table, ans - table, a + table], rand), en: { q: `${a} × ${table} = ?` }, tr: { q: `${a} × ${table} = ?` } };
  }
  if (topic === 'add') {
    const max = level === 1 ? 20 : 100;
    const a = int(rand, 1, max - 2), b = int(rand, 1, max - a);
    const ans = a + b;
    return { topic, answer: String(ans), options: options(ans, [ans - 1, ans + 1, ans + 10], rand), en: { q: `${a} + ${b} = ?` }, tr: { q: `${a} + ${b} = ?` } };
  }
  if (topic === 'sub') {
    const max = level === 1 ? 20 : 100;
    const a = int(rand, 3, max), b = int(rand, 1, a - 1);
    const ans = a - b;
    return { topic, answer: String(ans), options: options(ans, [ans + 1, ans - 1, a + b], rand), en: { q: `${a} − ${b} = ?` }, tr: { q: `${a} − ${b} = ?` } };
  }
  if (topic === 'array') {
    const rows = int(rand, 2, 5), cols = int(rand, 2, 5);
    const ans = rows * cols;
    return { topic, array: { rows, cols }, answer: String(ans), options: options(ans, [rows + cols, ans + cols, ans - rows], rand), en: { q: `How many balls? ${rows} rows of ${cols}.` }, tr: { q: `Kaç top var? ${rows} sıra, her sırada ${cols} top.` } };
  }
  if (topic === 'skip') {
    const step = pick(rand, level === 1 ? [2, 5, 10] : [2, 3, 4, 5, 10]);
    const start = step * int(rand, 0, 4);
    const seq = [0, 1, 2].map((i) => start + step * i);
    const ans = start + step * 3;
    return { topic, answer: String(ans), options: options(ans, [ans + 1, ans + step, ans - 1], rand), en: { q: `${seq.join(', ')}, ? What comes next?` }, tr: { q: `${seq.join(', ')}, ? Sırada hangisi var?` } };
  }
  // story: football word problems, so math is reading too.
  const kind = pick(rand, ['times', 'add', 'sub']);
  const n = pick(rand, STORY_NAMES);
  let a, b, ans;
  if (kind === 'times') { a = int(rand, 2, 5); b = int(rand, 1, 5); ans = a * b; }
  else if (kind === 'add') { a = int(rand, 1, level === 1 ? 10 : 50); b = int(rand, 1, level === 1 ? 10 : 40); ans = a + b; }
  else { a = int(rand, 5, level === 1 ? 20 : 90); b = int(rand, 1, a - 1); ans = a - b; }
  const text = pick(rand, STORY[kind])(a, b, n);
  const wrong = kind === 'times' ? [a + b, ans + b] : kind === 'add' ? [ans - 1, Math.abs(a - b)] : [a + b, ans + 1];
  return { topic, story: kind, answer: String(ans), options: options(ans, wrong, rand), en: { q: text.en }, tr: { q: text.tr } };
}

/** Is a times table open to practise? Core tables always; a bonus table after every core table is mastered. */
export function tableOpen(table, facts) {
  if (CORE_TABLES.includes(table)) return true;
  return CORE_TABLES.every((t) => tableMastered(t, facts));
}

export function tableMastered(table, facts) {
  return Array.from({ length: 10 }, (_, i) => i + 1).every((a) => (facts[factKey(a, table)] ?? 0) >= MASTERY);
}

export const masteredCount = (facts) => Object.values(facts).filter((n) => n >= MASTERY).length;
