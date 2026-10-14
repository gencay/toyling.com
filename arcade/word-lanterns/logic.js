// Pure game-side logic shared by the UI and the tests. No DOM access here.

export const FREE_THEMES = 4;

export const CATEGORIES = {
  Garden: ["Grandma's Garden Gate", "Things That Grow in Spring", "A Stroll Past the Flowerbeds", "Muddy Boots and Blossoms"],
  Kitchen: ["Sunday Baking Day", "Tea Time Treasures", "What's Cooking, Love?", "In the Pantry Cupboard"],
  Travel: ["Pack Your Suitcase!", "Postcards From Away", "All Aboard!", "The Long Way Round"],
  Birds: ["Who's at the Bird Feeder?", "Feathered Friends", "The Dawn Chorus", "Spotted From the Porch"],
  Music: ["Strike Up the Band", "A Night at the Concert Hall", "Hum Along With Me", "Saturday Dance Hall"],
  "Old Films": ["Saturday Matinee", "Silver Screen Classics", "Lights, Camera, Popcorn!", "Front Row Seats"],
  Holidays: ["Festive Feelings", "Holiday Memories", "Time for a Celebration", "Wrapped With a Bow"],
  Family: ["Family Reunion", "Around the Dinner Table", "Pages of the Photo Album", "Home Sweet Home"],
};

export const PRAISE = ["Nice!", "Lovely!", "Splendid!", "Wonderful!", "Magnificent!", "Marvellous!"];

export const categoryFor = (themeName, seed) => {
  const list = CATEGORIES[themeName] ?? [themeName];
  return list[seed % list.length];
};

export const praiseLevel = (combo, wordLength) => Math.min(combo + (wordLength >= 7 ? 1 : 0), PRAISE.length - 1);

/** Merges saved progress over defaults, so fields added in later versions get their default values. */
export function mergeSave(defaults, raw) {
  try {
    const saved = JSON.parse(raw || "{}");
    return saved && typeof saved === "object" && !Array.isArray(saved) ? { ...defaults, ...saved } : defaults;
  } catch {
    return defaults;
  }
}

export const ownsTheme = (state, t) => t < FREE_THEMES || state.ownedThemes.includes(t);

/** The theme for the next board: the chosen one if owned, otherwise a rotation through owned themes. */
export function chooseTheme(state, themeCount) {
  if (state.themePref !== "mix" && ownsTheme(state, Number(state.themePref))) return Number(state.themePref);
  const owned = Array.from({ length: themeCount }, (_, t) => t).filter((t) => ownsTheme(state, t));
  return owned[state.boards % owned.length];
}

export const center = (i, size) => [(i % size) + 0.5, Math.floor(i / size) + 0.5];

/** Maps a point on the board as displayed (turned clockwise `rotation` times) to unturned core coordinates. */
export function toLogical(dx, dy, size, rotation) {
  let x = dx, y = dy;
  for (let r = 0; r < (rotation || 0); r++) [x, y] = [y, size - x];
  return { x, y };
}

export const cellAt = (start, ux, uy, k, size) => start + uy * k * size + ux * k;

export function clampSteps(start, ux, uy, k, size) {
  const c = start % size;
  const r = Math.floor(start / size);
  while (k > 0 && (c + ux * k < 0 || c + ux * k >= size || r + uy * k < 0 || r + uy * k >= size)) k--;
  return Math.max(k, 0);
}

/** Snaps a drag point to the nearest of eight straight directions from the start cell. */
export function snap(start, p, size) {
  const [cx, cy] = center(start, size);
  const dx = p.x - cx;
  const dy = p.y - cy;
  if (Math.hypot(dx, dy) < 0.5) return { end: start, ux: 0, uy: 0, k: 0 };
  const oct = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  const ux = Math.round(Math.cos((oct * Math.PI) / 4)) || 0;
  const uy = Math.round(Math.sin((oct * Math.PI) / 4)) || 0;
  let k = Math.round((dx * ux + dy * uy) / (ux * ux + uy * uy));
  k = clampSteps(start, ux, uy, k, size);
  return { end: cellAt(start, ux, uy, k, size), ux, uy, k };
}

export function isStraight(a, b, size) {
  const ar = Math.floor(a / size), ac = a % size;
  const br = Math.floor(b / size), bc = b % size;
  return ar === br || ac === bc || Math.abs(ar - br) === Math.abs(ac - bc);
}

export function pathCells(a, b, size) {
  const ar = Math.floor(a / size), ac = a % size;
  const br = Math.floor(b / size), bc = b % size;
  const n = Math.max(Math.abs(br - ar), Math.abs(bc - ac));
  const sr = Math.sign(br - ar), sc = Math.sign(bc - ac);
  return Array.from({ length: n + 1 }, (_, k) => (ar + sr * k) * size + ac + sc * k);
}

/**
 * Seconds without touching the board before the mascot walks over and knocks on a letter. Early, gentle boards
 * get help sooner; harder boards leave more time to search alone.
 */
export const IDLE_MIN = 25;
export const IDLE_MAX = 75;
export const idleDelayFor = (step) => Math.min(IDLE_MAX, IDLE_MIN + Math.max(step, 0) * 2.5);

// ---- Rounds and levels ----
export const LEVELS = 5;

/** The level after this one: the next level of the round, or level 1 of the next round. */
export const nextLevel = ({ round, level }) => (level >= LEVELS ? { round: round + 1, level: 1 } : { round, level: level + 1 });

/** Levels completed before this one, from 0; used for timings that grow with progress. */
export const progressIndex = (round, level) => (Math.max(round, 1) - 1) * LEVELS + (Math.max(level, 1) - 1);

export const levelLabel = (round, level) => `Round ${round} · Level ${level} of ${LEVELS}`;

/** Converts saves from before rounds existed (adaptive "step") to the round and level at the same difficulty. */
export function migrateSave(state) {
  if (state.round == null && typeof state.step === "number") {
    const { step, ...rest } = state;
    return { ...rest, round: Math.floor(step / LEVELS) + 1, level: (step % LEVELS) + 1 };
  }
  return state;
}

/** Loads a save: older formats are converted before defaults fill in new fields. */
export const loadSave = (defaults, raw) => ({ ...defaults, ...migrateSave(mergeSave({}, raw)) });

/** Smallest letter cell in CSS px that stays readable and easy to tap for older players. */
export const MIN_CELL = 36;

/** Largest grid that keeps cells at least MIN_CELL px on a board this many px wide (between 6 and 12). */
export const maxGridFor = (boardPx) => Math.max(6, Math.min(12, Math.floor((boardPx - 12) / MIN_CELL)));
