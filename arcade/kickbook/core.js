// Kickbook's rules: rounds, coins, sticker packs, reading levels and saves. Pure functions on a plain state object, no
// DOM, so the page, the tests and the playtest share one copy.
// TODO(deferred): port to a Zig core (WASM now, native later) like Word Lanterns, with core.api.json and api-sync.
// Target: the same functions and seeded results; trigger: before the Flutter app or version 1's word hunt.
// Fairness (factory rule "Fair adaptive difficulty"): the reading level reads only the child's own recent answers, and
// rounds are seeded so a reload rebuilds the same round. Coins are earned only: never bought, never lost.
import { PLAYERS, START_UNLOCKED, UNLOCK_AFTER } from './content.js';
import { STARTER, grantEarned, newClub } from './club.js';
import { SESSION, makeQuestion } from './math.js';
import { makeLetterQuestion, MODES as LETTER_MODES } from './letters.js';
import { makeWhoQuestion } from './who.js';

export const SAVE_VERSION = 1;
export const PACK_PRICE = 30;
export const COINS = { cardDone: 10, firstTry: 2, afterRetry: 1, readerBonus: 3, readAloudMultiplier: 2 };
export const QUESTIONS_PER_ROUND = { 1: 3, 2: 4 };
export const MAX_LEVEL = 2;
export const LEVEL_UP = { rounds: 3, accuracy: 0.8 };
export const LEVEL_DOWN = { rounds: 2, accuracy: 0.5 };
export const SESSION_DONE = 8;
export const GAMES = ['card', 'math', 'letters', 'who'];

const byId = new Map(PLAYERS.map((p) => [p.id, p]));
export const player = (id) => byId.get(id);

/** mulberry32: small, fast, seeded. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function newState(seed = 1) {
  return {
    v: SAVE_VERSION, seed: seed >>> 0, lang: null, coins: 0, unlocked: [...START_UNLOCKED], stickers: [], reads: {},
    level: 1, levelMode: 'auto', history: [], days: [], rounds: 0, earned: 0, current: null, lastPack: null,
    goals: 0, readerRounds: 0, langs: [], bestLevel: 1, spotlight: null, sessions: 0,
    mathLevel: 1, mathHistory: [], letterLevel: 1, letterHistory: [],
    ...newClub(),
    settings: { sound: true, motion: 'system', voice: {} },
  };
}

/** Loads a saved state (any earlier version), keeping everything the child earned; bad saves start fresh. */
export function loadState(raw, seed = 1) {
  let s;
  try { s = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return newState(seed); }
  if (!s || typeof s !== 'object' || typeof s.v !== 'number' || s.v > SAVE_VERSION) return newState(seed);
  const base = newState(s.seed ?? seed);
  const out = { ...base, ...s, settings: { ...base.settings, ...(s.settings ?? {}) }, profile: { ...base.profile, ...(s.profile ?? {}) }, equipped: { ...STARTER, ...(s.equipped ?? {}) }, facts: { ...(s.facts ?? {}) } };
  out.owned = [...new Set([...base.owned, ...(s.owned ?? [])])];
  const known = (ids) => [...new Set((ids ?? []).filter((id) => byId.has(id)))];
  out.unlocked = known([...START_UNLOCKED, ...(s.unlocked ?? [])]);
  out.stickers = known(s.stickers).filter((id) => out.unlocked.includes(id));
  out.coins = Math.max(0, Math.floor(Number(s.coins) || 0));
  out.level = Math.min(MAX_LEVEL, Math.max(1, Math.floor(Number(s.level) || 1)));
  if (out.current && !byId.has(out.current.cardId)) out.current = null;
  out.v = SAVE_VERSION;
  return out;
}

/** The 3 cards on the pitch: unread unlocked cards first, then the least-read ones; seeded per round number. */
export function offer(state) {
  const rand = rng(state.seed ^ Math.imul(state.rounds + 1, 0x9e3779b1));
  const unread = shuffle(state.unlocked.filter((id) => !state.stickers.includes(id)), rand)
    .sort((a, b) => (b === state.spotlight) - (a === state.spotlight));
  const read = shuffle(state.unlocked.filter((id) => state.stickers.includes(id)), rand).sort((a, b) => (state.reads[a] ?? 0) - (state.reads[b] ?? 0));
  return [...unread, ...read].slice(0, 3);
}

/** Builds the round for a card at the state's level. Options are keys ('a', 'w0', 'w1', 'true', 'false') so the language can change mid-round. */
export function startRound(state, cardId) {
  const p = player(cardId);
  if (!p || !state.unlocked.includes(cardId)) throw new Error(`card not available: ${cardId}`);
  const level = state.level;
  const rand = rng((state.seed ^ Math.imul(state.rounds + 7, 0x85ebca6b) ^ hash(cardId)) >>> 0);
  const pool = p.questions.filter((q) => q.levels.includes(level));
  // At least one choice question first, then a shuffled mix, without repeats.
  const choice = shuffle(pool.filter((q) => q.kind === 'choice'), rand);
  const rest = shuffle(pool.filter((q) => q !== choice[0]), rand);
  const picked = [choice[0], ...rest].slice(0, QUESTIONS_PER_ROUND[level]);
  const questions = shuffle(picked, rand).map((q) => ({
    id: q.id,
    kind: q.kind,
    options: q.kind === 'choice' ? shuffle(level === 1 ? ['a', 'w0'] : ['a', 'w0', 'w1'], rand) : ['true', 'false'],
    answer: q.kind === 'choice' ? 'a' : String(q.truth),
    tried: [],
    done: false,
  }));
  state.current = { type: 'card', cardId, level, round: state.rounds + 1, i: 0, questions, readToMe: false, finished: false };
  return state.current;
}

function hash(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

/** The child picks an option. Wrong costs nothing: the option is marked tried and they pick again. */
export function answer(state, option) {
  const r = state.current;
  if (!r || r.finished) throw new Error('no round');
  const q = r.questions[r.i];
  if (q.done) throw new Error('question already answered');
  if (q.kind === 'find') {
    if (q.found.includes(option)) return { correct: false, coins: 0, repeat: true };
    if (q.data.hits.includes(option)) {
      q.found.push(option);
      if (q.found.length < q.data.hits.length) return { correct: true, partial: true, coins: 0 };
      q.done = true;
      q.firstTry = q.tried.length === 0;
      return { correct: true, coins: q.firstTry ? COINS.firstTry : COINS.afterRetry, last: r.i === r.questions.length - 1 };
    }
    if (!q.options.includes(option) || q.tried.includes(option)) return { correct: false, coins: 0, repeat: true };
    q.tried.push(option);
    return { correct: false, coins: 0 };
  }
  if (q.kind === 'steps') {
    // fill the gaps in order: a right letter fills the next gap; a wrong one costs nothing
    const want = q.data.steps[q.found.length];
    if (option === want) {
      q.found.push(option);
      if (q.found.length < q.data.steps.length) return { correct: true, partial: true, coins: 0 };
      q.done = true;
      q.firstTry = q.tried.length === 0;
      return { correct: true, coins: q.firstTry ? COINS.firstTry : COINS.afterRetry, last: r.i === r.questions.length - 1 };
    }
    q.tried.push(`${q.found.length}:${option}`);
    return { correct: false, coins: 0 };
  }
  if (option === q.answer) {
    q.done = true;
    q.firstTry = q.tried.length === 0;
    return { correct: true, coins: q.firstTry ? COINS.firstTry : COINS.afterRetry, last: r.i === r.questions.length - 1 };
  }
  if (!q.options.includes(option) || q.tried.includes(option)) return { correct: false, coins: 0, repeat: true };
  q.tried.push(option);
  return { correct: false, coins: 0 };
}

export function next(state) {
  const r = state.current;
  if (r && r.questions[r.i].done && r.i < r.questions.length - 1) r.i++;
  return r;
}

/** Ends the round: coins, the sticker, the reading history and the next level. `day` is the local date (YYYY-MM-DD). */
export function finishRound(state, day) {
  const r = state.current;
  if (!r || r.finished || !r.questions.every((q) => q.done)) throw new Error('round not finished');
  const starsBefore = cr7Stars(state).filter((x) => x.done).map((x) => x.id);
  if (r.type && r.type !== 'card') return finishSession(state, r, day, starsBefore);
  state.cardsRead++;
  state.comebacks += r.questions.filter((q) => !q.firstTry).length;
  const answers = r.questions.reduce((n, q) => n + (q.firstTry ? COINS.firstTry : COINS.afterRetry), 0);
  const reader = r.readToMe ? 0 : COINS.readerBonus;
  const total = COINS.cardDone + answers + reader;
  const newSticker = !state.stickers.includes(r.cardId);
  if (newSticker) state.stickers.push(r.cardId);
  // A player earned by reading (Cristiano Ronaldo after Messi or Pelé) opens now and is offered first.
  const opened = Object.keys(UNLOCK_AFTER).find((id) => !state.unlocked.includes(id) && UNLOCK_AFTER[id].includes(r.cardId)) ?? null;
  if (opened) { state.unlocked = [...state.unlocked, opened]; state.spotlight = opened; }
  if (r.cardId === state.spotlight) state.spotlight = null;
  state.goals += r.questions.length;
  if (!r.readToMe) state.readerRounds++;
  if (state.lang && !state.langs.includes(state.lang)) state.langs = [...state.langs, state.lang];
  state.reads[r.cardId] = (state.reads[r.cardId] ?? 0) + 1;
  state.coins += total;
  state.earned += total;
  state.rounds++;
  const accuracy = r.questions.filter((q) => q.firstTry).length / r.questions.length;
  state.history = [...state.history, { level: r.level, accuracy }].slice(-10);
  if (day && !state.days.includes(day)) state.days = [...state.days, day].slice(-60);
  const before = state.level;
  if (state.levelMode === 'auto') state.level = nextLevel(state.history, state.level);
  state.bestLevel = Math.max(state.bestLevel, state.level);
  const stars = cr7Stars(state).filter((x) => x.done && !starsBefore.includes(x.id)).map((x) => x.id);
  const items = grantEarned(state, cr7Stars(state).every((x) => x.done));
  r.finished = true;
  r.reward = { cardDone: COINS.cardDone, answers, reader, total, newSticker, readAloud: false, unlocked: opened, stars, items };
  r.levelChange = state.level - before;
  return r.reward;
}

/**
 * The reading level after a round: reads only the child's own recent results at the current level (never coins,
 * stickers or anything else). Up after 3 strong rounds in a row, down after 2 hard ones.
 */
export function nextLevel(history, level) {
  const atLevel = [];
  for (let i = history.length - 1; i >= 0 && history[i].level === level; i--) atLevel.push(history[i].accuracy);
  if (level < MAX_LEVEL && atLevel.length >= LEVEL_UP.rounds && atLevel.slice(0, LEVEL_UP.rounds).every((a) => a >= LEVEL_UP.accuracy)) return level + 1;
  if (level > 1 && atLevel.length >= LEVEL_DOWN.rounds && atLevel.slice(0, LEVEL_DOWN.rounds).every((a) => a < LEVEL_DOWN.accuracy)) return level - 1;
  return level;
}

/** A grown-up heard the child read the card aloud (behind the parental gate): the round's coins once more, once. */
export function readAloudBonus(state) {
  const r = state.current;
  if (!r?.finished || r.reward.readAloud) return 0;
  const extra = r.reward.total * (COINS.readAloudMultiplier - 1);
  r.reward.readAloud = true;
  state.coins += extra;
  state.earned += extra;
  return extra;
}

export const locked = (state) => PLAYERS.map((p) => p.id).filter((id) => !state.unlocked.includes(id));
/** Locked players a sticker pack can bring (never the ones earned by reading). */
export const packable = (state) => locked(state).filter((id) => !(id in UNLOCK_AFTER));

/** Spends PACK_PRICE coins for a new player card; there is always a new player in a pack while any are locked. */
export function buyPack(state) {
  const left = packable(state);
  if (!left.length || state.coins < PACK_PRICE) return null;
  const rand = rng((state.seed ^ Math.imul(state.unlocked.length + 3, 0xc2b2ae35)) >>> 0);
  const id = left[Math.floor(rand() * left.length)];
  state.coins -= PACK_PRICE;
  state.unlocked = [...state.unlocked, id];
  state.lastPack = id;
  return id;
}

/** Days in a row with at least one card read, ending today or yesterday. Missing a day never takes anything away. */
export function streak(days, today) {
  const set = new Set(days);
  const d = new Date(`${today}T12:00:00Z`);
  if (!set.has(today)) d.setUTCDate(d.getUTCDate() - 1);
  let n = 0;
  while (set.has(d.toISOString().slice(0, 10))) { n++; d.setUTCDate(d.getUTCDate() - 1); }
  return n;
}

/**
 * The Cristiano Ronaldo goal: 7 "CR7 stars" (his number), each one of his traits from his card turned into a reading
 * target. All 7 make the child a CR7 champion. Reads only what the child did; never coins.
 */
export const CR7 = [
  { id: 'seven', need: 7, have: (s) => s.rounds }, // number 7: read 7 cards
  { id: 'island', need: 1, have: (s) => (s.stickers.includes('ronaldo') ? 1 : 0) }, // born on Madeira: read his card
  { id: 'jump', need: 2, have: (s) => s.bestLevel }, // jumps high: reach reading level 2
  { id: 'scorer', need: 25, have: (s) => s.goals }, // top scorer for his country: score 25 penalties
  { id: 'golden', need: 5, have: (s) => s.readerRounds }, // five Golden Balls: 5 cards read without "Read to me"
  { id: 'euro', need: 5, have: (s) => s.stickers.length }, // Euro 2016 champion: collect 5 players
  { id: 'captain', need: 2, have: (s) => s.langs.length }, // captain of Portugal: finish a card in both languages
];

export function cr7Stars(state) {
  return CR7.map((g) => { const have = Math.min(g.need, g.have(state)); return { id: g.id, need: g.need, have, done: have >= g.need }; });
}

const SEED = { math: 0x27d4eb2f, letters: 0x165667b1, who: 0xd3a2646c };

/**
 * Starts a training session of another game: 'math' (opts.topic, opts.table), 'letters' (opts.mode, or a mix) or
 * 'who'. Same answer flow as a card round (wrong answers cost nothing; every right answer is a penalty).
 */
export function startSession(state, game, opts = {}) {
  if (!SEED[game]) throw new Error(`unknown game: ${game}`);
  const rand = rng((state.seed ^ Math.imul(state.sessions + 11, SEED[game]) ^ hash(JSON.stringify(opts))) >>> 0);
  const level = game === 'math' ? state.mathLevel : game === 'letters' ? state.letterLevel : 1;
  const count = game === 'who' ? 4 : opts.mode === 'find' ? 3 : SESSION;
  const questions = [];
  for (let i = 0; i < count; i++) {
    const data = game === 'math'
      ? makeQuestion(opts.topic ?? 'times', { level, table: opts.table ?? 2, facts: { ...state.facts, ...Object.fromEntries(questions.filter((q) => q.data.fact).map((q) => [q.data.fact, 99])) }, rand })
      : game === 'letters'
        ? makeLetterQuestion(opts.mode ?? LETTER_MODES[(i + state.sessions) % LETTER_MODES.length], { lang: state.lang ?? 'en', level, rand })
        : makeWhoQuestion(state.unlocked, rand);
    questions.push({ id: String(i), kind: data.mode === 'find' ? 'find' : data.mode === 'puzzle' ? 'steps' : 'choice', options: data.options, answer: data.answer, tried: [], found: [], done: false, shown: 1, data });
  }
  state.current = { type: game, opts, level, round: state.sessions + 1, i: 0, questions, readToMe: true, finished: false };
  return state.current;
}

/** "Who am I?": show one more clue (fewer clues used = more coins). */
export function moreClue(state) {
  const q = state.current?.questions[state.current.i];
  if (q?.data.mode === 'who' && q.shown < q.data.clues.length) q.shown++;
  return q?.shown;
}

function finishSession(state, r, day, starsBefore) {
  const first = r.questions.filter((q) => q.firstTry);
  let answers = r.questions.reduce((n, q) => n + (q.firstTry ? COINS.firstTry : COINS.afterRetry), 0);
  if (r.type === 'who') answers += r.questions.reduce((n, q) => n + (q.data.clues.length - q.shown), 0);
  const total = SESSION_DONE + answers;
  state.coins += total;
  state.earned += total;
  state.sessions++;
  state.goals += r.questions.length;
  state.comebacks += r.questions.length - first.length;
  const accuracy = first.length / r.questions.length;
  if (r.type === 'math') {
    state.mathRight += first.length;
    for (const q of first) if (q.data.fact) state.facts = { ...state.facts, [q.data.fact]: (state.facts[q.data.fact] ?? 0) + 1 };
    state.mathHistory = [...state.mathHistory, { level: r.level, accuracy }].slice(-10);
    state.mathLevel = nextLevel(state.mathHistory, state.mathLevel);
  }
  if (r.type === 'letters') {
    state.lettersRight += first.length;
    state.letterHistory = [...state.letterHistory, { level: r.level, accuracy }].slice(-10);
    state.letterLevel = nextLevel(state.letterHistory, state.letterLevel);
  }
  if (r.type === 'who') state.whoRight += first.length;
  if (day && !state.days.includes(day)) state.days = [...state.days, day].slice(-60);
  const stars = cr7Stars(state).filter((x) => x.done && !starsBefore.includes(x.id)).map((x) => x.id);
  const items = grantEarned(state, cr7Stars(state).every((x) => x.done));
  r.finished = true;
  r.reward = { sessionDone: SESSION_DONE, answers, reader: 0, total, newSticker: false, readAloud: false, unlocked: null, stars, items };
  r.levelChange = 0;
  return r.reward;
}
