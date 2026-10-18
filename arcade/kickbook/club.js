// The child's own player card (EA FC style, owner's request, October 18, 2026) and the locker shop. The card's six
// stats grow from what the child learns, never from luck: reading, math, letters, penalties, trying again and days of
// practice. Gear bought with earned coins adds a small bonus. Everything stays on this device.

export const STATS = ['pac', 'sho', 'pas', 'dri', 'def', 'phy'];
export const STAT_BASE = 40;
export const STAT_MAX = 99;
/** What raises each stat, and how many of it give about two thirds of the way to the top. */
export const GROWTH = {
  pac: { from: 'mathRight', k: 60 }, // pace: math answers right on the first try
  sho: { from: 'goals', k: 80 }, // shooting: penalties scored
  pas: { from: 'cardsRead', k: 25 }, // passing: player cards read
  dri: { from: 'lettersRight', k: 50 }, // dribbling: b, d and s letter answers
  def: { from: 'comebacks', k: 20 }, // defending: right after a wrong try (never give up)
  phy: { from: 'daysPlayed', k: 10 }, // physical: days of practice
};
export const TIERS = [
  { id: 'icon', min: 85 },
  { id: 'gold', min: 75 },
  { id: 'silver', min: 60 },
  { id: 'bronze', min: 0 },
];
export const POSITIONS = ['ST', 'MF', 'DF', 'GK'];
export const SLOTS = ['shirt', 'shorts', 'boots', 'ball', 'frame'];

const item = (id, slot, price, color, bonus, en, tr, extra = {}) => ({ id, slot, price, color, bonus, name: { en, tr }, ...extra });
/** The locker. Price 0 = what every child starts with. Colors are design tokens. */
export const ITEMS = [
  item('shirt-white', 'shirt', 0, 'kitWhite', {}, 'Classic white shirt', 'Klasik beyaz forma'),
  item('shirt-sky', 'shirt', 40, 'kitSkyStripe', { pas: 1 }, 'Sky blue shirt', 'Gök mavisi forma'),
  item('shirt-red', 'shirt', 80, 'kitRed', { sho: 2 }, 'Fire red shirt', 'Ateş kırmızısı forma'),
  item('shirt-purple', 'shirt', 120, 'kitPurple', { def: 2 }, 'Night purple shirt', 'Gece moru forma'),
  item('shirt-gold', 'shirt', 250, 'kitGold', { phy: 3 }, 'Golden shirt', 'Altın forma'),
  item('shorts-black', 'shorts', 0, 'kitBlack', {}, 'Black shorts', 'Siyah şort'),
  item('shorts-white', 'shorts', 30, 'kitWhite', { phy: 1 }, 'White shorts', 'Beyaz şort'),
  item('shorts-navy', 'shorts', 60, 'kitNavy', { def: 1 }, 'Navy shorts', 'Lacivert şort'),
  item('shorts-red', 'shorts', 90, 'kitRed', { pac: 2 }, 'Red shorts', 'Kırmızı şort'),
  item('shorts-gold', 'shorts', 200, 'kitGold', { phy: 3 }, 'Golden shorts', 'Altın şort'),
  item('boots-black', 'boots', 0, 'kitBlack', {}, 'Black boots', 'Siyah krampon'),
  item('boots-neon', 'boots', 50, 'kitNeon', { pac: 1 }, 'Neon boots', 'Neon krampon'),
  item('boots-red', 'boots', 100, 'kitRed', { sho: 2 }, 'Red striker boots', 'Kırmızı golcü kramponu'),
  item('boots-gold', 'boots', 180, 'kitGold', { pac: 3 }, 'Golden boots', 'Altın krampon'),
  item('boots-rocket', 'boots', 300, 'kitPink', { pac: 4 }, 'Rocket boots', 'Roket krampon'),
  item('ball-classic', 'ball', 0, 'ball', {}, 'Classic ball', 'Klasik top'),
  item('ball-star', 'ball', 40, 'kitSkyStripe', { dri: 1 }, 'Star ball', 'Yıldızlı top'),
  item('ball-fire', 'ball', 90, 'kitOrange', { sho: 2 }, 'Fire ball', 'Ateş topu'),
  item('ball-gold', 'ball', 200, 'kitGold', { sho: 3 }, 'Golden ball', 'Altın top'),
  item('ball-rainbow', 'ball', 300, 'kitPurple', { dri: 3 }, 'Rainbow ball', 'Gökkuşağı topu'),
  item('frame-tier', 'frame', 0, 'coin', {}, 'Card by rating (bronze, silver, gold)', 'Puana göre kart (bronz, gümüş, altın)'),
  item('frame-night', 'frame', 150, 'kitNavy', {}, 'Night card', 'Gece kartı'),
  item('frame-ocean', 'frame', 150, 'kitSkyStripe', {}, 'Ocean card', 'Okyanus kartı'),
  item('frame-fire', 'frame', 200, 'kitOrange', {}, 'Fire card', 'Ateş kartı'),
  item('frame-legend', 'frame', 400, 'kitPurple', {}, 'Legend card', 'Efsane kartı'),
  item('frame-cr7', 'frame', 0, 'kitRed', {}, 'CR7 champion card', 'CR7 şampiyon kartı', { earn: 'cr7' }),
];
const byId = new Map(ITEMS.map((i) => [i.id, i]));
export const itemById = (id) => byId.get(id);
export const STARTER = Object.fromEntries(SLOTS.map((s) => [s, ITEMS.find((i) => i.slot === s && i.price === 0 && !i.earn).id]));

export function newClub() {
  return {
    profile: { name: '', position: 'ST', country: 'TUR', club: null, photo: null },
    owned: Object.values(STARTER),
    equipped: { ...STARTER },
    mathRight: 0, lettersRight: 0, whoRight: 0, comebacks: 0, cardsRead: 0, facts: {},
  };
}

const growth = (n, k) => Math.round((STAT_MAX - STAT_BASE) * (1 - Math.exp(-n / k)));

/** The card's stats: learning first, then the equipped gear's bonus, capped at 99. */
export function stats(state) {
  const counts = { ...state, daysPlayed: state.days?.length ?? 0 };
  const bonus = gearBonus(state.equipped ?? STARTER);
  const out = {};
  for (const s of STATS) out[s] = Math.min(STAT_MAX, STAT_BASE + growth(counts[GROWTH[s].from] ?? 0, GROWTH[s].k) + (bonus[s] ?? 0));
  return out;
}

export function gearBonus(equipped) {
  const b = {};
  for (const id of Object.values(equipped)) for (const [s, n] of Object.entries(itemById(id)?.bonus ?? {})) b[s] = (b[s] ?? 0) + n;
  return b;
}

export const overall = (st) => Math.round(STATS.reduce((n, s) => n + st[s], 0) / STATS.length);
export const tier = (rating) => TIERS.find((t) => rating >= t.min).id;

/** Buys an item with earned coins. Refuses items already owned, earned-only items and too few coins. */
export function buy(state, id) {
  const it = itemById(id);
  if (!it || it.earn || state.owned.includes(id) || state.coins < it.price) return false;
  state.coins -= it.price;
  state.owned = [...state.owned, id];
  state.equipped = { ...state.equipped, [it.slot]: id };
  return true;
}

export function equip(state, id) {
  const it = itemById(id);
  if (!it || !state.owned.includes(id)) return false;
  state.equipped = { ...state.equipped, [it.slot]: id };
  return true;
}

/** Grants earned-only items (the CR7 champion card) once their goal is met. Returns the ids granted now. */
export function grantEarned(state, cr7Done) {
  const now = ITEMS.filter((i) => i.earn === 'cr7' && cr7Done && !state.owned.includes(i.id)).map((i) => i.id);
  if (now.length) state.owned = [...state.owned, ...now];
  return now;
}
