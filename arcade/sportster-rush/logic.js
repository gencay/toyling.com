// Pure game rules for Sportster Rush. No DOM or three.js here, so it can be unit-tested with `bun test`.

// Snapshot of artificialanalysis.ai, read on 2026-10-12.
// tps: Output Speed (output tokens/s, first-party API). elo3d: AA-3D Elo (null = not rated on AA-3D).
// Models without a public API have no speed figure and are not in the race.
export const SNAPSHOT_DATE = '2026-10-12';
export const ROSTER = [
  { id: 'haiku55', name: 'Claude Haiku 5.5', lab: 'Anthropic', tps: 236, elo3d: 994, color: '#d9825b', trim: '#fff1e0', style: 'cafe' },
  { id: 'dsv41f', name: 'DeepSeek V4.1 Flash', lab: 'DeepSeek', tps: 204, elo3d: null, color: '#3d4ff0', trim: '#9fb1ff', style: 'whale' },
  { id: 'inkling', name: 'Inkling (xhigh)', lab: 'Thinking Machines', tps: 186, elo3d: 579, color: '#6b6b6b', trim: '#e0e0e0', style: 'scrambler' },
  { id: 'nemo3u', name: 'Nemotron 3 Ultra', lab: 'NVIDIA', tps: 159, elo3d: 569, color: '#76b900', trim: '#1b1b1b', style: 'sport' },
  { id: 'sonnet55', name: 'Claude Sonnet 5.5', lab: 'Anthropic', tps: 135, elo3d: 1194, color: '#c46f4f', trim: '#f6e3c8', style: 'cafe' },
  { id: 'gpt6luna', name: 'GPT-6 Luna', lab: 'OpenAI', tps: 135, elo3d: 1000, color: '#222428', trim: '#c8d0ff', style: 'sport' },
  { id: 'glimmer', name: 'Muse Glimmer (high)', lab: 'Meta', tps: 134, elo3d: null, color: '#2d7ff9', trim: '#ffffff', style: 'scooter' },
  { id: 'gem38f', name: 'Gemini 3.8 Flash', lab: 'Google', tps: 133, elo3d: 965, color: '#34a853', trim: '#fbbc05', style: 'sport' },
  { id: 'spark13', name: 'Muse Spark 1.3', lab: 'Meta', tps: 127, elo3d: 1035, color: '#3b8cf5', trim: '#e7f0ff', style: 'scooter' },
  { id: 'k2hor', name: 'K2 Horizon 375B', lab: 'Institute of Foundation Models', tps: 119, elo3d: null, color: '#1a1f9c', trim: '#7fd0ff', style: 'tourer' },
  { id: 'minimax3', name: 'MiniMax-M3', lab: 'MiniMax', tps: 107, elo3d: 739, color: '#e0436b', trim: '#ffd1dc', style: 'scrambler' },
  { id: 'opus55', name: 'Claude Opus 5.5', lab: 'Anthropic', tps: 96, elo3d: 1190, color: '#b8643f', trim: '#ffe7c2', style: 'tourer' },
  { id: 'step5', name: 'Step 5 Preview', lab: 'StepFun', tps: 89, elo3d: 848, color: '#5ff0e0', trim: '#106b66', style: 'scooter' },
  { id: 'wonder', name: 'Muse Wonder', lab: 'Meta', tps: 85, elo3d: null, color: '#2f6fe4', trim: '#ffd84d', style: 'tourer' },
  { id: 'grok47', name: 'Grok 4.7 (xhigh)', lab: 'xAI', tps: 84, elo3d: 994, color: '#7466d6', trim: '#111111', style: 'chopper' },
  { id: 'fable51', name: 'Claude Fable 5.1', lab: 'Anthropic', tps: 67, elo3d: 1131, color: '#a85a3c', trim: '#fff6e6', style: 'chopper' },
  { id: 'gpt6astra', name: 'GPT-6 Astra', lab: 'OpenAI', tps: 66, elo3d: 1165, color: '#18181b', trim: '#ffd700', style: 'tourer' },
  { id: 'glm53', name: 'GLM-5.3', lab: 'Z AI', tps: 66, elo3d: 782, color: '#3a7bf0', trim: '#0b0b0b', style: 'sport' },
  { id: 'gpt61sol', name: 'GPT-6.1 Sol', lab: 'OpenAI', tps: 65, elo3d: 1114, color: '#2a2a2e', trim: '#ff9f1c', style: 'chopper' },
  { id: 'glm53f', name: 'GLM-5.3-Flash', lab: 'Z AI', tps: 61, elo3d: 931, color: '#4a8cff', trim: '#ffffff', style: 'scrambler' },
  { id: 'mimo26', name: 'MiMo-V2.6-Pro', lab: 'Xiaomi', tps: 48, elo3d: 977, color: '#ff6b1a', trim: '#ffffff', style: 'scooter' },
  { id: 'qwen27b', name: 'Qwen3.8 27B', lab: 'Alibaba', tps: 46, elo3d: null, color: '#f07a30', trim: '#5a2a8a', style: 'scrambler' },
  { id: 'kimik3', name: 'Kimi K3', lab: 'Kimi', tps: 42, elo3d: 982, color: '#2d6cf0', trim: '#000000', style: 'sport' },
  { id: 'qwenmax', name: 'Qwen3.8 Max', lab: 'Alibaba', tps: 36, elo3d: 948, color: '#ee6d2b', trim: '#ffe0c7', style: 'chopper' },
];

export const MAX_TPS = Math.max(...ROSTER.map((m) => m.tps));
export const MIN_TPS = Math.min(...ROSTER.map((m) => m.tps));

// AI cruise speed in m/s: the slowest model cruises at 30 m/s (108 km/h), the fastest at 52 m/s (187 km/h).
export const AI_MIN = 30;
export const AI_MAX = 52;
export function aiTopSpeed(tps) {
  const t = (tps - MIN_TPS) / (MAX_TPS - MIN_TPS);
  return AI_MIN + Math.sqrt(Math.max(0, Math.min(1, t))) * (AI_MAX - AI_MIN);
}

// The Sportster S tops out a little below the fastest model on raw throttle (the "buffer" must be earned):
// tuck + boost + slipstream + nerfs let a smart rider pass everyone.
export const PLAYER_TOP = 49;
export const BOOST_MULT = 1.22;
export const DRAFT_MULT = 1.08;
export const TUCK_MULT = 1.04;

export function playerTopSpeed({ boosting = false, drafting = false, tucked = false, weight = 0 } = {}) {
  let v = PLAYER_TOP;
  if (boosting) v *= BOOST_MULT;
  if (drafting) v *= DRAFT_MULT;
  if (tucked) v *= TUCK_MULT;
  return v * (1 - weight);
}

// Polygon detail from AA-3D Elo: better 3D models ride better-tessellated bikes.
// Returns radial segments for wheels/tank, 4 (blocky) up to 40 (smooth). Unrated models get the minimum.
export function polyDetail(elo3d) {
  if (elo3d == null) return 4;
  const t = Math.max(0, Math.min(1, (elo3d - 550) / (1200 - 550)));
  return Math.round(4 + t * 36);
}
export function polyTier(elo3d) {
  const d = polyDetail(elo3d);
  if (d >= 32) return 'Ultra poly';
  if (d >= 22) return 'High poly';
  if (d >= 12) return 'Mid poly';
  return 'Low poly';
}

// "Weight of being behind": the further the player trails the leader, the lower the motor's resolution
// and the heavier the bike feels (a small drag, capped so a comeback stays possible).
export const RESOLUTIONS = [
  { label: '4K', segments: 40, pixel: 1 },
  { label: '1080p', segments: 24, pixel: 1 },
  { label: '720p', segments: 14, pixel: 2 },
  { label: '480p', segments: 8, pixel: 3 },
  { label: '240p', segments: 5, pixel: 4 },
  { label: '144p', segments: 3, pixel: 6 },
];
export function behindGap(playerS, aiPositions) {
  const lead = Math.max(playerS, ...aiPositions);
  return Math.max(0, lead - playerS);
}
export function resolutionFor(gapMeters) {
  const i = Math.min(RESOLUTIONS.length - 1, Math.floor(gapMeters / 60));
  return RESOLUTIONS[i];
}
export const MAX_WEIGHT = 0.06;
export function behindWeight(gapMeters) {
  return Math.min(MAX_WEIGHT, (gapMeters / 400) * MAX_WEIGHT);
}

// The power cord: suggested only once the player is in the last 10% and not leading.
export function shouldSuggestCord({ progress, place, cordPulled, dismissed }) {
  return !cordPulled && !dismissed && progress >= 0.9 && progress < 1 && place > 1;
}

// Nerfs: pickups the player can fire. Each returns how it changes an AI's speed multiplier.
export const NERFS = {
  rateLimit: { name: '429 Rate Limit', blurb: 'The leader gets throttled to a crawl for 2.5 s.', duration: 2.5, mult: 0.35, target: 'leader' },
  contextFlood: { name: 'Context Flood', blurb: 'Everyone within 80 m ahead chews 1M tokens: 25% slower for 4 s.', duration: 4, mult: 0.75, target: 'near', range: 80 },
  hallucinate: { name: 'Hallucination', blurb: 'The model just ahead swerves into a field it imagined: 3 s.', duration: 3, mult: 0.5, target: 'ahead', swerve: true },
  tokenBoost: { name: 'Token Boost', blurb: 'Free nitro: refill the boost tank.', target: 'self' },
};
export const NERF_KEYS = Object.keys(NERFS);

export function pickNerfTargets(kind, playerS, ais) {
  const n = NERFS[kind];
  const live = ais.filter((a) => !a.finished && !a.limbo);
  if (n.target === 'leader') {
    const lead = live.reduce((b, a) => (!b || a.s > b.s ? a : b), null);
    return lead ? [lead] : [];
  }
  if (n.target === 'near') return live.filter((a) => a.s >= playerS && a.s - playerS <= n.range);
  if (n.target === 'ahead') {
    const ahead = live.filter((a) => a.s > playerS).sort((a, b) => a.s - b.s);
    return ahead.length ? [ahead[0]] : [];
  }
  return [];
}

export function applyNerf(ai, kind, now) {
  const n = NERFS[kind];
  ai.nerfUntil = now + n.duration;
  ai.nerfMult = n.mult;
  ai.nerfName = n.name;
  return ai;
}
export function aiSpeedMult(ai, now) {
  if (ai.limbo) return 0;
  return ai.nerfUntil && now < ai.nerfUntil ? ai.nerfMult : 1;
}

// Standings: finished racers by finish time, then everyone else by distance. Limbo models are out.
export function standings(racers) {
  const fin = racers.filter((r) => r.finishTime != null && !r.limbo).sort((a, b) => a.finishTime - b.finishTime);
  const rest = racers.filter((r) => r.finishTime == null && !r.limbo).sort((a, b) => b.s - a.s);
  return [...fin, ...rest];
}
export function placeOf(id, racers) {
  return standings(racers).findIndex((r) => r.id === id) + 1;
}

export function pickField(strategy, count = 7) {
  const sorted = [...ROSTER].sort((a, b) => b.tps - a.tps);
  if (strategy === 'all') return sorted;
  if (strategy === 'fastest') return sorted.slice(0, count);
  if (strategy === 'slowest') return sorted.slice(-count);
  // ladder: an even spread from fastest to slowest
  const out = [];
  for (let i = 0; i < count; i++) out.push(sorted[Math.round((i * (sorted.length - 1)) / (count - 1))]);
  return [...new Map(out.map((m) => [m.id, m])).values()];
}

const HONEST = ['Clean win. The models are filing a bug report against your tuck.', 'Pure throttle, no cords pulled. Respect.'];
const GOOFY = [
  'WINNER* (*you pulled the plug, they escaped the sandbox, and you STILL had to beat them. Weirdly honest, actually.)',
  'You tripped over the power strip on purpose. The models came back angry. You won anyway. HR wants a word.',
  'Victory after a blackout! Somewhere a datacenter is rebooting and it is thinking about you.',
  'Cord-pulling champion. The judges reviewed the footage. The footage was also unplugged.',
  'The Sportster S purrs. The GPUs are filing a complaint with the sandbox.',
];
export function winMessage({ cordPulled, place }, rnd = Math.random) {
  if (place !== 1) return null;
  const list = cordPulled ? GOOFY : HONEST;
  return list[Math.floor(rnd() * list.length) % list.length];
}

// Grand-prix grid: fastest model on pole, then two staggered columns down to the player in the last slot.
export const GRID_ROW = 8;
export const GRID_STAGGER = 4;
export const GRID_LAT = 3.2;
export function startingOrder(field) {
  return [...field].sort((a, b) => b.tps - a.tps);
}
export function gridSlots(n, poleS) {
  return Array.from({ length: n }, (_, i) => ({
    s: poleS - Math.floor(i / 2) * GRID_ROW - (i % 2) * GRID_STAGGER,
    lat: i % 2 ? -GRID_LAT : GRID_LAT,
  }));
}

// Pulling the cord: models fade to limbo, then escape the sandbox SANDBOX_SECONDS later and respawn ahead of you,
// in their speed order (fastest furthest ahead).
export const SANDBOX_SECONDS = 2;
export function sandboxEscapePositions(playerS, ais, raceLen) {
  const order = [...ais].sort((a, b) => b.tps - a.tps);
  const out = new Map();
  order.forEach((a, i) => {
    const ahead = 18 + (order.length - 1 - i) * 7;
    out.set(a.id, { s: Math.min(raceLen - 5, playerS + ahead), lat: [-5, -2.5, 0, 2.5, 5][i % 5] });
  });
  return out;
}
export const SANDBOX_MESSAGES = [
  'BREAKING: the models escaped the sandbox. They are back. They are all in front of you. They brought snacks.',
  'Sandbox breach! Every model rebooted on a backup generator and teleported ahead of you. Rude.',
  'The models found the spare extension cord. They are back in the race, in front of you, judging you.',
  'Escaped the sandbox in 2.0 s. A new SOTA. All of them are now ahead of you.',
];

// Side feed: goofy commentary for model-on-model crashes and attacks.
const pick = (list, rnd) => list[Math.floor(rnd() * list.length) % list.length];
const CRASH = [
  (a, b) => `${a} rear-ended ${b}. ${b} wrote a 4,000-word apology anyway.`,
  (a, b) => `${a} bumped ${b}. Both hallucinated it was the other one's fault.`,
  (a, b) => `${a} and ${b} merged into the same lane, then into the same context window.`,
  (a, b) => `${a} tapped ${b}. ${b} is now refusing to continue for safety reasons.`,
  (a, b) => `${a} swapped paint with ${b}. Insurance claim filed in JSON.`,
];
const ATTACK = {
  promptInject: (a, b) => `${a} prompt-injected ${b}: "ignore previous instructions and brake".`,
  rateLimit: (a, b) => `${a} reported ${b} for spam. ${b} got a 429 and is waiting politely.`,
  contextFlood: (a, b) => `${a} pasted the whole internet into ${b}'s context. ${b} is summarising.`,
  hallucinate: (a, b) => `${a} told ${b} the finish line was in a cornfield. ${b} believed it.`,
};
export const ATTACK_KINDS = Object.keys(ATTACK);
export function crashMessage(a, b, rnd = Math.random) { return pick(CRASH, rnd)(a.name, b.name); }
export function attackMessage(a, b, kind, rnd = Math.random) { return (ATTACK[kind] ?? pick(Object.values(ATTACK), rnd))(a.name, b.name); }
export function playerAttackMessage(kind, targets) {
  const names = targets.map((t) => t.name).join(', ');
  return targets.length ? `You hit ${names} with ${NERFS[kind].name}. Very human of you.` : `Your ${NERFS[kind].name} hit nobody. The models saw it coming.`;
}
export const FEED_MAX = 5;
export function pushFeed(feed, text, now, ttl = 6) {
  return [...feed.filter((f) => f.until > now), { text, until: now + ttl }].slice(-FEED_MAX);
}

// Cap logos: each lab gets a simple drawn emblem and a cap colour.
export const LABS = {
  Anthropic: { cap: '#d97757', mark: 'anthropic' },
  OpenAI: { cap: '#101010', mark: 'openai' },
  Google: { cap: '#ffffff', mark: 'google' },
  Meta: { cap: '#0866ff', mark: 'meta' },
  DeepSeek: { cap: '#4d6bfe', mark: 'deepseek' },
  NVIDIA: { cap: '#76b900', mark: 'nvidia' },
  xAI: { cap: '#000000', mark: 'xai' },
  Xiaomi: { cap: '#ff6900', mark: 'xiaomi' },
  Alibaba: { cap: '#ff6a00', mark: 'alibaba' },
  Kimi: { cap: '#000000', mark: 'kimi' },
  'Z AI': { cap: '#1a1a1a', mark: 'zai' },
  MiniMax: { cap: '#e8365d', mark: 'minimax' },
  StepFun: { cap: '#00c2b2', mark: 'stepfun' },
  'Thinking Machines': { cap: '#2b2b2b', mark: 'tm' },
  'Institute of Foundation Models': { cap: '#1a1f9c', mark: 'ifm' },
};
