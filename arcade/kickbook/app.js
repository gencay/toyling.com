// Kickbook page: the game hub, player cards, math training, letter games, "Who am I?", the penalty kick, the child's
// own FC-style card, the locker shop, the album and the grown-up corner. The rules live in core.js, club.js, math.js,
// letters.js and who.js. Offline and private: no network requests, no ads, no purchases, no accounts; the save
// (including the child's photo) stays in this browser.
// Real photos and team logos load from web/img/ (tools/fetch-images.sh; credited on the Credits screen from
// web/credits.js); a missing image falls back to the cartoon (photo) or the team name (logo).
import { COUNTRIES, PLAYERS, POSITIONS, TEAMS, UNLOCK_AFTER } from './content.js';
import { CR7, PACK_PRICE, answer, buyPack, cr7Stars, finishRound, loadState, moreClue, newState, next, offer, packable, player, readAloudBonus, startRound, startSession, streak } from './core.js';
import { ITEMS, POSITIONS as MY_POSITIONS, SLOTS, STATS, buy, equip, itemById, overall, stats, tier } from './club.js';
import { BONUS_TABLES, CORE_TABLES, MASTERY, factKey, tableMastered, tableOpen } from './math.js';
import { LANGS, t } from './i18n.js';
import { LANG_FLAG, arraySvg, coinSvg, flagSvg, goalSvg, itemSvg, mnemonicSvg, playerSvg, starSvg } from './art.js';
import { words } from './reading.js';
import { CREDITS } from './credits.js';
import { canSpeak, deviceVoices, say, voicesFor } from './voice.js';

const SAVE_KEY = 'kickbook.save';
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const READ_TO_ME_DELAY = DEBUG ? 0 : 5000;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let state = load();
let screen = 'home';
let readTimer = 0;
let resetArmed = false;
let shopSlot = 'boots';

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return loadState(raw);
  } catch {}
  return newState((Math.random() * 2 ** 32) >>> 0);
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch {} }

function today() {
  if (params.get('now')) return params.get('now').slice(0, 10);
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const L = () => state.lang ?? 'en';
const tr = (key, ...a) => t(L(), key, ...a);

// ---- sound: tiny tones, no files ----
let audio;
function tone(freqs, dur = 0.12) {
  if (!state.settings.sound) return;
  try {
    audio ??= new AudioContext();
    freqs.forEach((f, i) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      const at = audio.currentTime + i * dur;
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.2, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g).connect(audio.destination); o.start(at); o.stop(at + dur + 0.02);
    });
  } catch {}
}

// ---- speech: the most natural voice on the device (voice.js), offline ----
const speak = (text, opts = {}) => say(text, L(), { preferred: state.settings.voice?.[L()], ...opts });

/** Text as tappable words: tap one to hear it. */
function tappable(text) {
  return text.split(/(\s+)/).map((part) => {
    const w = words(part)[0];
    return w ? `<span class="w" data-say="${esc(w)}">${esc(part)}</span>` : esc(part);
  }).join('');
}
document.addEventListener('click', (e) => {
  const w = e.target.closest?.('.w');
  if (!w) return;
  speak(w.dataset.say, { word: true });
  w.classList.add('say');
  setTimeout(() => w.classList.remove('say'), 700);
});

// ---- real photos and logos, with fallbacks ----
/** The player's photo over the cartoon; if the photo is missing the cartoon shows. */
const portrait = (p) => `<span class="portrait">${playerSvg(p, { title: '' })}<img class="photo" src="img/players/${p.id}.jpg" alt="${esc(p.name)}"></span>`;
const logo = (id) => `<img class="crest" src="img/teams/${id}.png" alt="">`;
/** Team logos with their names; a missing logo leaves the name. */
const teamsHtml = (p) => `<div class="teams" aria-label="${tr('teams')}">${p.teams.map((id) => `<span class="team${TEAMS[id].national ? ' national' : ''}">${logo(id)}<span>${esc(TEAMS[id].name[L()])}</span></span>`).join('')}</div>`;
document.addEventListener('error', (e) => { if (e.target.matches?.('img.photo, img.crest')) e.target.remove(); }, true);
document.addEventListener('load', (e) => { if (e.target.matches?.('img.photo')) e.target.parentElement.classList.add('has-photo'); }, true);
const coinSvgInline = () => `<span class="inline-coin">${coinSvg()}</span>`;

// ---- the child's own FC-style card ----
const DARK = ['kitNavy', 'kitPurple', 'kitRed', 'kitBlack', 'kitGreen'];
function me() {
  const pr = state.profile;
  const shirt = itemById(state.equipped.shirt).color;
  return {
    name: pr.name || tr('defaultName'),
    number: pr.number ?? 10,
    look: { skin: pr.skin ?? 'skin2', hair: pr.hair ?? 'hairBlack', style: pr.style ?? 'short' },
    kit: { shirt, trim: DARK.includes(shirt) ? 'kitWhite' : 'kitNavy', shorts: itemById(state.equipped.shorts).color, number: DARK.includes(shirt) ? 'fcInkLight' : 'fcInk', boots: itemById(state.equipped.boots).color, ball: itemById(state.equipped.ball).color },
  };
}
let fcId = 0;
/** The FC card silhouette: a shield with a peaked top and swept corners, gold sheen and an inner line (our own drawing). */
function fcShape(id) {
  const outer = 'M150 4C178 22 226 26 282 20L296 34V356C296 377 285 390 266 400L150 436L34 400C15 390 4 377 4 356V34L18 20C74 26 122 22 150 4Z';
  const inner = 'M150 16C176 32 222 36 274 31L284 41V352C284 369 276 380 260 388L150 422L40 388C24 380 16 369 16 352V41L26 31C78 36 124 32 150 16Z';
  return `<svg class="fc-bg" viewBox="0 0 300 440" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="kbg${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--fc-a)"/><stop offset=".55" style="stop-color:var(--fc-a)"/><stop offset="1" style="stop-color:var(--fc-b)"/></linearGradient>
    <linearGradient id="kbs${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color:var(--chalk);stop-opacity:0"/><stop offset=".5" style="stop-color:var(--chalk);stop-opacity:.45"/><stop offset="1" style="stop-color:var(--chalk);stop-opacity:0"/></linearGradient>
    <clipPath id="kbc${id}"><path d="${outer}"/></clipPath></defs>
    <path d="${outer}" fill="url(#kbg${id})"/>
    <g clip-path="url(#kbc${id})"><path d="M-40 300L210 -40H290L40 300Z" fill="url(#kbs${id})" opacity=".6"/><path d="M0 250H300V440H0Z" style="fill:var(--fc-b)" opacity=".25"/></g>
    <path d="${inner}" fill="none" style="stroke:var(--fc-ink)" stroke-opacity=".35" stroke-width="2"/>
    <path d="M70 302H230" style="stroke:var(--fc-ink)" stroke-opacity=".35" stroke-width="2"/>
  </svg>`;
}
/** The child's card, laid out like a current FC card: rating and position top left, big picture, name, one row of six
 * stats, and the nation and club badges at the very bottom. */
function fcCard(size = 'big') {
  const st = stats(state);
  const ovr = overall(st);
  const frame = state.equipped.frame === 'frame-tier' ? `tier-${tier(ovr)}` : state.equipped.frame;
  const p = me();
  const pic = state.profile.photo ? `<img class="fc-photo" src="${esc(state.profile.photo)}" alt="">` : playerSvg(p, { title: '' });
  const club = state.profile.club;
  return `<div class="fc fc-${size} ${frame}" role="img" aria-label="${esc(p.name)} ${ovr}">
    ${fcShape(++fcId)}
    <div class="fc-top"><b class="fc-ovr">${ovr}</b><span class="fc-pos">${tr(`pos_${state.profile.position}`)}</span></div>
    <div class="fc-pic">${pic}</div>
    <div class="fc-name">${esc(p.name.toLocaleUpperCase(L()))}</div>
    <div class="fc-stats">${STATS.map((s) => `<span><small>${tr(`stat_${s}`)}</small><b>${st[s]}</b></span>`).join('')}</div>
    <div class="fc-badges">${flagSvg(state.profile.country, '')}${club ? `<span class="fc-club">${logo(club)}</span>` : ''}</div>
    <div class="fc-tier">${tr(`tier_${tier(ovr)}`)}</div>
  </div>`;
}

// ---- screens ----
const RENDER = {};
function show(name) {
  if (name !== 'kick') dropPenalty();
  screen = name;
  for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== `${name}Screen`;
  $('bar').hidden = name === 'lang';
  $('homeBtn').hidden = name === 'home';
  document.documentElement.lang = L();
  document.body.classList.toggle('calm', state.settings.motion === 'less');
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = tr(el.dataset.t);
  renderBar();
  RENDER[name]?.();
  window.scrollTo(0, 0);
}

function renderBar() {
  $('wallet').innerHTML = `${coinSvg()}<span id="coins">${state.coins}</span><span class="sr">${tr('coins')}</span>`;
  const other = L() === 'en' ? 'tr' : 'en';
  $('langBtn').innerHTML = `${flagSvg(LANG_FLAG[other], '')}<span>${other.toUpperCase()}</span>`;
  $('langBtn').setAttribute('aria-label', `${t(other, 'language')}: ${t(other, 'langName')}`);
}

RENDER.lang = () => {
  for (const b of document.querySelectorAll('.big-flag')) b.innerHTML = `${flagSvg(LANG_FLAG[b.dataset.lang], '')}<span>${t(b.dataset.lang, 'langName')}</span>`;
};

const meta = (p) => `<p class="meta">${flagSvg(p.country, COUNTRIES[p.country][L()])}<span>${esc(COUNTRIES[p.country][L()])} · ${esc(POSITIONS[p.position][L()])} · ${p.number}</span></p>`;

RENDER.home = () => {
  $('meBtn').innerHTML = `${fcCard('mini')}<span class="me-text"><b>${tr('myCard')}</b><span>${tr('myCardSub', overall(stats(state)))}</span></span>`;
  $('offer').innerHTML = offer(state).map((id) => {
    const p = player(id);
    const isNew = !state.stickers.includes(id);
    return `<button class="pick" type="button" data-card="${id}">${isNew ? `<span class="badge">${tr('newBadge')}</span>` : ''}${portrait(p)}<span>${esc(p.name)}</span>${flagSvg(p.country, COUNTRIES[p.country][L()])}</button>`;
  }).join('');
  const left = packable(state).length;
  const pack = $('packBtn');
  pack.disabled = !left || state.coins < PACK_PRICE;
  pack.innerHTML = !left ? tr('allPlayers') : `${tr('getPlayer')} · ${PACK_PRICE} ${coinSvgInline()}${state.coins < PACK_PRICE ? ` <small>(${tr('needCoins', PACK_PRICE - state.coins)})</small>` : ''}`;
  $('albumBtn').textContent = `${tr('album')} (${state.stickers.length}/${PLAYERS.length})`;
  renderCr7Panel();
  $('streak').textContent = tr('days', streak(state.days, today()));
};

function cardHtml(p, level) {
  const text = p.text[L()][level];
  return `<div class="art">${portrait(p)}</div>
    <div><h2>${esc(p.name)}</h2>${meta(p)}<p class="meta">${tr('born')}: ${esc(p.era)}</p></div>
    ${teamsHtml(p)}
    <p class="story">${text.map((s) => `<span class="s">${tappable(s)}</span>`).join('')}</p>`;
}

RENDER.read = () => {
  const r = state.current;
  const p = player(r.cardId);
  const card = $('card');
  card.className = `card level-${r.level}`;
  card.innerHTML = cardHtml(p, r.level);
  const btn = $('readToMeBtn');
  btn.hidden = !canSpeak;
  btn.disabled = true;
  clearTimeout(readTimer);
  readTimer = setTimeout(() => { btn.disabled = false; }, READ_TO_ME_DELAY);
};

// ---- questions: one renderer per game ----
const glyph = (key) => `<span class="glyph${key.endsWith('~') ? ' mirror' : ''}">${esc(key.replace('~', ''))}</span>`;

/** What the question says, and what the hear button reads. */
function questionText(r, q) {
  if (r.type === 'card') return player(r.cardId).questions.find((x) => x.id === q.id)[L()].q;
  const d = q.data;
  if (r.type === 'math') return d[L()].q;
  if (r.type === 'who') return d.clues.slice(0, q.shown).map((c) => c[L()]).join(' ');
  return { keeper: tr('qKeeper'), missing: tr('qMissing'), mirror: tr('qMirror', d.letter), find: tr('qFind', d.target) }[d.mode];
}

function optionHtml(r, q, o) {
  const cls = `btn answer${q.tried.includes(o) ? ' tried' : ''}`;
  const off = q.tried.includes(o) ? ' disabled' : '';
  if (r.type === 'card') {
    const src = player(r.cardId).questions.find((x) => x.id === q.id)[L()];
    const label = o === 'true' || o === 'false' ? tr(o) : o === 'a' ? src.a : src.wrong[Number(o.slice(1))];
    return `<button class="${cls}" type="button" data-opt="${o}"${off}>${esc(label)}</button>`;
  }
  if (r.type === 'math') return `<button class="${cls} num" type="button" data-opt="${o}"${off}>${esc(o)}</button>`;
  if (r.type === 'who') { const p = player(o); return `<button class="${cls} who-opt" type="button" data-opt="${o}"${off}>${portrait(p)}<span>${esc(p.name)}</span></button>`; }
  const d = q.data;
  if (d.mode === 'keeper') return `<button class="${cls} glove" type="button" data-opt="${o}"${off} aria-label="${o}">${mnemonicSvg(o)}${glyph(o)}</button>`;
  return `<button class="${cls} letter-opt" type="button" data-opt="${o}"${off} aria-label="${o.replace('~', '')}">${glyph(o)}</button>`;
}

function visualHtml(r, q) {
  const d = q.data;
  if (r.type === 'math' && d.array) return arraySvg(d.array.rows, d.array.cols);
  if (r.type === 'letters' && d.mode === 'keeper') return `<div class="letter-ball"><span>${esc(d.letter)}</span></div>`;
  if (r.type === 'letters' && d.mode === 'missing') return `<div class="picture-word"><span class="picture" aria-hidden="true">${d.picture}</span><span class="word"><span class="blank">_</span>${esc(d.rest)}</span></div>`;
  if (r.type === 'who') return `<ol class="clues">${d.clues.slice(0, q.shown).map((c, i) => `<li><small>${tr('clueOf', i + 1, d.clues.length)}</small> ${tappable(c[L()])}</li>`).join('')}</ol>`;
  return '';
}

RENDER.quiz = () => {
  const r = state.current;
  const q = r.questions[r.i];
  $('qProgress').textContent = tr('questionOf', r.i + 1, r.questions.length);
  $('qVisual').innerHTML = r.type === 'card' ? '' : visualHtml(r, q);
  $('qText').innerHTML = r.type === 'who' ? esc(tr('qWho')) : tappable(questionText(r, q));
  $('hearBtn').hidden = !canSpeak;
  if (q.kind === 'find') {
    const d = q.data;
    $('answers').className = 'answers find';
    $('answers').innerHTML = d.cells.map((c, i) => {
      const k = String(i), found = q.found.includes(k), tried = q.tried.includes(k);
      return `<button class="ball-btn${found ? ' found' : ''}${tried ? ' tried' : ''}" type="button" data-opt="${k}"${found || tried ? ' disabled' : ''} aria-label="${esc(c.replace('~', ''))}">${glyph(c)}</button>`;
    }).join('');
    $('feedback').textContent = q.tried.length && !q.found.length ? tr('tryAgain') : tr('findLeft', d.hits.length - q.found.length);
  } else {
    $('answers').className = `answers${r.type === 'letters' || r.type === 'who' ? ' answers-row' : ''}`;
    $('answers').innerHTML = q.options.map((o) => optionHtml(r, q, o)).join('');
    $('feedback').textContent = q.tried.length ? tr('tryAgain') : '';
  }
  $('clueBtn').hidden = !(r.type === 'who' && q.shown < q.data.clues.length);
  $('peekBtn').hidden = r.type !== 'card';
  $('peek').hidden = true;
  if (r.type === 'card') {
    const p = player(r.cardId);
    $('peekBtn').textContent = tr('rereadCard');
    $('peek').className = `card card-peek level-${r.level}`;
    $('peek').innerHTML = cardHtml(p, r.level);
  }
};

// The penalty: the 3D goal and goalkeeper (penalty3d.js, loaded on first use) when the device has WebGL, else the
// 2D goal. The 2D picture shows at once and the 3D scene replaces it when ready.
let penalty = null, penaltyMod = null;
const calmMotion = () => state.settings.motion === 'less' || matchMedia('(prefers-reduced-motion: reduce)').matches;
function dropPenalty() { penalty?.dispose(); penalty = null; }
RENDER.kick = () => {
  dropPenalty();
  const ballColor = itemById(state.equipped.ball).color;
  $('pitch').innerHTML = goalSvg(ballColor);
  $('pitch').classList.remove('is-3d');
  $('zones').hidden = false;
  $('shootLabel').hidden = false;
  $('scored').hidden = true;
  if (params.has('flat')) return;
  (penaltyMod ??= import('./penalty3d.js')).then((m) => {
    if (screen !== 'kick' || penalty || !m.webglAvailable() || !$('scored').hidden) return;
    try {
      penalty = m.createPenalty($('pitch'), { ballColor, reduced: calmMotion() });
      $('pitch').querySelector('svg.goal')?.remove();
      $('pitch').classList.add('is-3d');
    } catch { penalty = null; }
  }).catch(() => {});
};

function shoot(zone) {
  const r = state.current;
  const q = r.questions[r.i];
  const sides = ['left', 'middle', 'right'].filter((z) => z !== zone);
  const dive = sides[(r.round + r.i) % 2];
  $('zones').hidden = true;
  $('shootLabel').hidden = true;
  const done = () => {
    tone([523, 659, 784, 1047], 0.1);
    $('scored').hidden = false;
    $('plus').innerHTML = `${coinSvg()}${tr('plus', q.firstTry ? 2 : 1)}`;
    const last = r.i === r.questions.length - 1;
    $('nextBtn').textContent = last ? tr('finish') : tr('next');
    $('nextBtn').focus();
  };
  if (penalty) { penalty.shoot(zone, dive).then(done); return; }
  $('ball')?.classList.add(`to-${zone}`);
  $('keeper')?.classList.add(`dive-${dive}`);
  if (calmMotion()) done(); else setTimeout(done, 700);
}

RENDER.reward = () => {
  const r = state.current;
  const w = r.reward;
  const card = r.type === 'card';
  const line = (label, n) => `<div class="line"><span>${label}</span><b>+${n}</b></div>`;
  const after = overall(stats(state));
  $('reward').innerHTML = [
    card ? line(tr('rCard'), w.cardDone) : line(tr('rSession'), w.sessionDone), line(tr('rAnswers'), w.answers), w.reader ? line(tr('rReader'), w.reader) : '',
    w.readAloud ? `<div class="line"><span>${tr('readAloudDone')}</span><b>+${w.total}</b></div>` : '',
    `<div class="line sum"><span>${tr('total')}</span><b>${coinSvgInline()} ${w.total * (w.readAloud ? 2 : 1)}</b></div>`,
    w.newSticker ? `<p class="news">${tr('sticker')}</p>` : '',
    r.before != null && after > r.before ? `<p class="news">⬆️ ${tr('ratingUp', r.before, after)}</p>` : '',
    r.levelChange > 0 ? `<p class="news">${tr('levelUp')}</p>` : '',
    w.unlocked ? `<p class="news news-big">${portrait(player(w.unlocked))}<span>${tr('unlockedNews', esc(player(w.unlocked).name))}</span></p>` : '',
    ...(w.stars ?? []).map((id) => `<p class="news">${starSvg(true)} ${tr('starNews', tr(`star_${id}`))}</p>`),
    ...(w.items ?? []).map(() => `<p class="news">${tr('cr7CardNews')}</p>`),
  ].join('');
  $('fact').hidden = !card;
  if (card) $('fact').innerHTML = `<b>${tr('didYouKnow')}</b>${tappable(player(r.cardId).fact[L()])}`;
  $('aloudBtn').hidden = !card || w.readAloud;
  $('againBtn').hidden = card;
};

RENDER.album = () => {
  $('album').innerHTML = PLAYERS.map((p) => state.stickers.includes(p.id)
    ? `<div class="slot">${portrait(p)}<span>${esc(p.name)}</span>${flagSvg(p.country, COUNTRIES[p.country][L()])}<button class="btn" type="button" data-card="${p.id}">${tr('readAgain')}</button></div>`
    : `<div class="slot empty"><span class="q-mark" aria-hidden="true">?</span><span>${state.unlocked.includes(p.id) ? tr('newBadge') : p.id in UNLOCK_AFTER ? tr('lockedRonaldo') : tr('locked')}</span></div>`).join('');
};

RENDER.pack = () => {
  const p = player(state.lastPack);
  $('packReveal').innerHTML = `${portrait(p)}<span class="name">${esc(p.name)}</span>${meta(p)}`;
};

function renderCr7Panel() {
  const stars = cr7Stars(state);
  const n = stars.filter((x) => x.done).length;
  const open = state.unlocked.includes('ronaldo');
  const nextStar = stars.find((x) => !x.done);
  $('cr7Btn').classList.toggle('locked', !open);
  $('cr7Btn').innerHTML = `${portrait(player('ronaldo'))}<span class="cr7-text"><b>${tr('cr7Title')}</b>
    <span class="stars" aria-label="${tr('starsCount', n)}">${stars.map((x) => starSvg(x.done)).join('')}</span>
    <span>${!open ? tr('cr7Locked') : nextStar ? tr('cr7Next', tr(`star_${nextStar.id}`)) : tr('cr7Champion')}</span></span>`;
}

RENDER.cr7 = () => {
  const stars = cr7Stars(state);
  const n = stars.filter((x) => x.done).length;
  $('cr7Head').innerHTML = `${portrait(player('ronaldo'))}<p>${n === CR7.length ? tr('cr7Champion') : tr('cr7Lead')}</p><p class="stars">${stars.map((x) => starSvg(x.done)).join('')}</p>`;
  $('starsList').innerHTML = stars.map((x) => `<li class="${x.done ? 'done' : ''}">${starSvg(x.done)}<span>${tr(`star_${x.id}`)}</span><b>${x.have}/${x.need}</b></li>`).join('');
};

RENDER.math = () => {
  $('tables').innerHTML = [...CORE_TABLES, ...BONUS_TABLES].map((n) => {
    const open = tableOpen(n, state.facts);
    const learned = Array.from({ length: 10 }, (_, i) => i + 1).filter((a) => (state.facts[factKey(a, n)] ?? 0) >= MASTERY).length;
    const done = tableMastered(n, state.facts);
    return `<button class="table-btn${done ? ' done' : ''}" type="button" data-table="${n}"${open ? '' : ' disabled'}><b>×${n}</b><span class="meter" aria-hidden="true"><span style="width:${learned * 10}%"></span></span><small>${open ? (done ? tr('tableDone') : `${learned}/10`) : tr('tableLocked')}</small></button>`;
  }).join('');
  $('topics').innerHTML = ['add', 'sub', 'array', 'skip', 'story'].map((tp) => `<button class="btn topic" type="button" data-topic="${tp}">${tr(`topic_${tp}`)}</button>`).join('');
};

RENDER.letters = () => {
  $('tricks').innerHTML = ['b', 'd', 's'].map((l) => `<div class="trick">${mnemonicSvg(l)}<span class="glyph">${l}</span><span>${tr(`letter${l.toUpperCase()}`)}</span></div>`).join('');
  $('modes').innerHTML = ['keeper', 'missing', 'mirror', 'find', 'mix'].map((m) => `<button class="btn topic" type="button" data-mode="${m}">${tr(`mode_${m}`)}</button>`).join('');
};

RENDER.me = () => {
  $('fcBig').innerHTML = fcCard('big');
  $('grow').innerHTML = `<h3>${tr('howToGrow')}</h3>${STATS.map((s) => `<p><b>${tr(`stat_${s}`)}</b> ${tr(`grow_${s}`)}</p>`).join('')}`;
  const pr = state.profile;
  const seg = (name, opts, current) => `<div class="seg">${opts.map(([val, label]) => `<button class="btn" type="button" data-prof="${name}" data-val="${esc(val)}" aria-pressed="${String(val) === String(current)}">${label}</button>`).join('')}</div>`;
  const clubs = Object.keys(TEAMS).filter((id) => !TEAMS[id].national);
  $('editCard').innerHTML = `<h3>${tr('editCard')}</h3>
    <label class="field-label" for="nameInput">${tr('yourName')}</label>
    <input class="text-input" id="nameInput" type="text" maxlength="14" autocomplete="off" value="${esc(pr.name)}">
    <h3>${tr('photo')}</h3>
    <div class="row"><button class="btn btn-soft" type="button" id="addPhotoBtn">📷 ${tr('addPhoto')}</button>${pr.photo ? `<button class="btn" type="button" id="removePhotoBtn">${tr('removePhoto')}</button>` : ''}</div>
    <p class="note">${tr('photoNote')}</p>
    <h3>${tr('positionL')}</h3>${seg('position', MY_POSITIONS.map((p) => [p, tr(`pos_${p}`)]), pr.position)}
    <h3>${tr('numberL')}</h3>${seg('number', [7, 9, 10, 11, 23].map((n) => [n, n]), pr.number ?? 10)}
    <h3>${tr('countryL')}</h3>${seg('country', ['TUR', 'USA', 'BRA', 'ARG', 'POR', 'FRA', 'NOR'].map((c) => [c, `${flagSvg(c, '')}<span class="sr">${esc(COUNTRIES[c][L()])}</span>`]), pr.country)}
    <h3>${tr('clubL')}</h3>${seg('club', [['', tr('noClub')], ...clubs.map((c) => [c, `${logo(c)}<span>${esc(TEAMS[c].name[L()])}</span>`])], pr.club ?? '')}
    <h3>${tr('skinL')}</h3>${seg('skin', ['skin1', 'skin2', 'skin3', 'skin4'].map((s) => [s, `<span class="swatch" style="background:var(--${s.replace(/(\d)/, '-$1')})"></span>`]), pr.skin ?? 'skin2')}
    <h3>${tr('hairL')}</h3>${seg('hair', ['hairBlack', 'hairBrown', 'hairBlond'].map((h) => [h, `<span class="swatch" style="background:var(--${h.replace(/([A-Z])/g, '-$1').toLowerCase()})"></span>`]), pr.hair ?? 'hairBlack')}
    ${seg('style', ['short', 'shaved', 'long-band', 'bun', 'ponytail'].map((s) => [s, playerSvg({ ...me(), look: { ...me().look, style: s } }, { title: '' })]), pr.style ?? 'short')}`;
};

RENDER.shop = () => {
  $('fcShop').innerHTML = fcCard('small');
  $('slots').innerHTML = SLOTS.map((s) => `<button class="btn" type="button" data-slot="${s}" aria-pressed="${s === shopSlot}">${tr(`slot_${s}`)}</button>`).join('');
  $('shelf').innerHTML = ITEMS.filter((i) => i.slot === shopSlot).map((it) => {
    const owned = state.owned.includes(it.id);
    const worn = state.equipped[it.slot] === it.id;
    const bonus = Object.entries(it.bonus).map(([s, n]) => `+${n} ${tr(`stat_${s}`)}`).join(' ');
    const action = worn ? `<button class="btn" type="button" disabled>${tr('wearing')}</button>`
      : owned ? `<button class="btn btn-go" type="button" data-equip="${it.id}">${tr('wear')}</button>`
        : it.earn ? `<button class="btn" type="button" disabled>${tr('earnCr7')}</button>`
          : `<button class="btn btn-gold" type="button" data-buy="${it.id}"${state.coins < it.price ? ' disabled' : ''}>${tr('buyFor', it.price)} ${coinSvgInline()}</button>${state.coins < it.price ? `<small>${tr('needCoins', it.price - state.coins)}</small>` : ''}`;
    return `<div class="item${worn ? ' worn' : ''}">${it.slot === 'frame' ? `<span class="frame-swatch ${it.id === 'frame-tier' ? `tier-${tier(overall(stats(state)))}` : it.id}"></span>` : itemSvg(it)}<b>${esc(it.name[L()])}</b>${bonus ? `<span class="bonus">${bonus}</span>` : ''}${action}</div>`;
  }).join('');
};

RENDER.credits = () => {
  const row = (c) => `<li><b>${esc(c.name)}</b><span>${esc(c.author || c.owner || '')}${c.author || c.owner ? ' · ' : ''}${esc(c.license)}</span><small>${esc(c.source)}</small>${c.licenseUrl ? `<small>${esc(c.licenseUrl)}</small>` : ''}</li>`;
  $('creditsList').innerHTML = `<h3>${tr('creditsPhotos')}</h3><p class="note">${tr('creditsPhotosNote')}</p><ul>${CREDITS.filter((c) => c.kind === 'player').map(row).join('')}</ul><h3>${tr('creditsLogos')}</h3><p class="note">${tr('creditsLogosNote')}</p><ul>${CREDITS.filter((c) => c.kind === 'team').map(row).join('')}</ul>`;
};

RENDER.grown = () => {
  const seg = (name, opts, current) => `<div class="seg">${opts.map(([val, label]) => `<button class="btn" type="button" data-set="${name}" data-val="${val}" aria-pressed="${String(val) === String(current)}">${label}</button>`).join('')}</div>`;
  const levelVal = state.levelMode === 'auto' ? 'auto' : state.level;
  $('settings').innerHTML = `
    <div class="set"><h3>${tr('language')}</h3>${seg('lang', LANGS.map((l) => [l, t(l, 'langName')]), L())}</div>
    <div class="set"><h3>${tr('level')}</h3>${seg('level', [['auto', tr('levelAuto')], [1, tr('level1')], [2, tr('level2')]], levelVal)}<p>${tr('levelNow', state.level)}</p></div>
    ${canSpeak ? `<div class="set"><h3>${tr('voice')}</h3><p>${tr('voiceHint')}</p>${seg('voice', voicesFor(deviceVoices(), L()).slice(0, 4).map((v) => [v.name, esc(v.name)]), state.settings.voice?.[L()] ?? voicesFor(deviceVoices(), L())[0]?.name)}<button class="btn btn-soft" type="button" id="tryVoice">🔊 ${tr('tryVoice')}</button></div>` : ''}
    <div class="set"><h3>${tr('sound')}</h3>${seg('sound', [['on', tr('on')], ['off', tr('off')]], state.settings.sound ? 'on' : 'off')}</div>
    <div class="set"><h3>${tr('motion')}</h3>${seg('motion', [['less', tr('on')], ['system', tr('off')]], state.settings.motion)}</div>
    <div class="set"><h3>${tr('progress')}</h3><p>${tr('cardsRead', state.stickers.length, PLAYERS.length)}</p><p>${tr('roundsPlayed', state.rounds)}</p><p>${tr('daysRead', state.days.length)}</p><p>${tr('coinsEarned', state.earned)}</p><p>${tr('about')}</p></div>
    <div class="set"><button class="btn" type="button" id="resetBtn">${resetArmed ? tr('resetSure') : tr('reset')}</button></div>`;
};

// ---- parental gate ----
let gateThen = null, gateAnswer = 0;
function gate(then) {
  const a = 6 + Math.floor(Math.random() * 4), b = 6 + Math.floor(Math.random() * 4);
  gateAnswer = a * b;
  gateThen = then;
  for (const el of $('gate').querySelectorAll('[data-t]')) el.textContent = tr(el.dataset.t);
  $('gateQ').textContent = tr('gateQ', a, b);
  $('gateInput').value = '';
  $('gateMsg').textContent = '';
  $('gate').hidden = false;
  $('app').inert = true;
  $('bar').inert = true;
  $('gateInput').focus();
}
function closeGate() { $('gate').hidden = true; $('app').inert = false; $('bar').inert = false; gateThen = null; }
$('gateForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (Number($('gateInput').value) === gateAnswer) { const then = gateThen; closeGate(); then?.(); }
  else { $('gateMsg').textContent = tr('gateWrong'); $('gateInput').value = ''; }
});
$('gateCancel').addEventListener('click', closeGate);

// ---- photo: resized on the device and kept in the save, never sent anywhere ----
async function photoFrom(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = url; });
    const W = 240, H = 300;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const scale = Math.max(W / img.width, H / img.height);
    const w = img.width * scale, h = img.height * scale;
    c.getContext('2d').drawImage(img, (W - w) / 2, (H - h) / 3, w, h);
    return c.toDataURL('image/jpeg', 0.82);
  } finally { URL.revokeObjectURL(url); }
}
$('photoInput').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try { state.profile.photo = await photoFrom(file); save(); } catch {}
  e.target.value = '';
  show('me');
});

// ---- actions ----
function begin(fn) {
  const before = overall(stats(state));
  fn();
  state.current.before = before;
  save();
}
function play(cardId) { begin(() => startRound(state, cardId)); show('read'); }
function train(game, opts) { tone([440, 660]); begin(() => startSession(state, game, opts)); show('quiz'); }

document.addEventListener('click', (e) => {
  const el = e.target.closest?.('button');
  if (!el || el.disabled) return;
  const d = el.dataset;
  if (d.lang && screen === 'lang') { state.lang = d.lang; save(); show('home'); return; }
  if (d.card) { tone([440, 660]); play(d.card); return; }
  if (d.go) { show(d.go); return; }
  if (d.play) { train(d.play, {}); return; }
  if (d.table) { train('math', { topic: 'times', table: Number(d.table) }); return; }
  if (d.topic) { train('math', { topic: d.topic }); return; }
  if (d.mode) { train('letters', d.mode === 'mix' ? {} : { mode: d.mode }); return; }
  if (d.opt) {
    const res = answer(state, d.opt);
    save();
    if (res.correct && !res.partial) { tone([660, 880]); show('kick'); }
    else if (res.partial) { tone([660]); RENDER.quiz(); }
    else { tone([300, 240], 0.15); RENDER.quiz(); }
    return;
  }
  if (d.zone) { shoot(d.zone); return; }
  if (d.slot) { shopSlot = d.slot; RENDER.shop(); return; }
  if (d.buy) { if (buy(state, d.buy)) { tone([392, 523, 659, 784]); save(); show('shop'); } return; }
  if (d.equip) { equip(state, d.equip); tone([523, 784]); save(); show('shop'); return; }
  if (d.prof) {
    const v = d.prof === 'number' ? Number(d.val) : d.val || null;
    state.profile = { ...state.profile, [d.prof]: v };
    save(); RENDER.me(); return;
  }
  if (d.set) {
    const { set, val } = d;
    if (set === 'lang') state.lang = val;
    if (set === 'level') { if (val === 'auto') state.levelMode = 'auto'; else { state.levelMode = 'fixed'; state.level = Number(val); } }
    if (set === 'sound') state.settings.sound = val === 'on';
    if (set === 'motion') state.settings.motion = val;
    if (set === 'voice') { state.settings.voice = { ...(state.settings.voice ?? {}), [L()]: val }; speak(tr('voiceSample')); }
    save(); show('grown'); return;
  }
  if (el.id === 'addPhotoBtn') { $('photoInput').click(); return; }
  if (el.id === 'removePhotoBtn') { state.profile.photo = null; save(); show('me'); }
});
document.addEventListener('input', (e) => {
  if (e.target.id !== 'nameInput') return;
  state.profile.name = e.target.value.slice(0, 14);
  save();
  $('fcBig').innerHTML = fcCard('big');
});

$('homeBtn').addEventListener('click', () => { closeGate(); show('home'); });
$('langBtn').addEventListener('click', () => { state.lang = L() === 'en' ? 'tr' : 'en'; save(); show(screen); });
$('meBtn').addEventListener('click', () => show('me'));
$('readToMeBtn').addEventListener('click', () => { state.current.readToMe = true; save(); speak(player(state.current.cardId).text[L()][state.current.level].join(' ')); });
$('iReadBtn').addEventListener('click', () => { show('quiz'); });
$('hearBtn').addEventListener('click', () => {
  const r = state.current, q = r.questions[r.i];
  speak(r.type === 'letters' && q.data.mode === 'missing' ? q.data.word : questionText(r, q));
});
$('clueBtn').addEventListener('click', () => { moreClue(state); save(); RENDER.quiz(); });
$('peekBtn').addEventListener('click', () => { const p = $('peek'); p.hidden = !p.hidden; $('peekBtn').textContent = tr(p.hidden ? 'rereadCard' : 'hideCard'); });
$('nextBtn').addEventListener('click', () => {
  const r = state.current;
  if (r.i < r.questions.length - 1) { next(state); save(); show('quiz'); }
  else { finishRound(state, today()); save(); tone([523, 659, 784, 1047, 1319], 0.12); show('reward'); }
});
$('aloudBtn').addEventListener('click', () => gate(() => { readAloudBonus(state); save(); show('reward'); }));
$('againBtn').addEventListener('click', () => { const r = state.current; train(r.type, r.opts); });
$('backBtn').addEventListener('click', () => { state.current = null; save(); show('home'); });
$('albumBtn').addEventListener('click', () => show('album'));
$('creditsBtn').addEventListener('click', () => show('credits'));
$('cr7Btn').addEventListener('click', () => show('cr7'));
$('packBtn').addEventListener('click', () => { if (buyPack(state)) { tone([392, 523, 659, 784]); save(); show('pack'); } });
$('readNowBtn').addEventListener('click', () => play(state.lastPack));
$('grownBtn').addEventListener('click', () => gate(() => { resetArmed = false; show('grown'); }));
$('settings').addEventListener('click', (e) => {
  if (e.target.closest('#tryVoice')) { speak(tr('voiceSample')); return; }
  if (e.target.closest('#resetBtn')) {
    if (!resetArmed) { resetArmed = true; RENDER.grown(); return; }
    const lang = state.lang;
    state = newState((Math.random() * 2 ** 32) >>> 0);
    state.lang = lang;
    resetArmed = false;
    save(); show('home');
  }
});

// Resume where the child left off: a round in progress continues, a finished one shows its reward.
function resume() {
  if (!state.lang) return show('lang');
  const r = state.current;
  if (!r) return show('home');
  if (r.finished) return show('reward');
  if ((r.type ?? 'card') === 'card' && r.i === 0 && !r.questions[0].done && !r.questions[0].tried.length) return show('read');
  return show(r.questions[r.i].done ? 'kick' : 'quiz');
}
resume();

if (DEBUG) {
  window.__kb = {
    get state() { return state; },
    set(s) { state = loadState(s); save(); resume(); },
    show,
    screen: () => screen,
    gateAnswer: () => gateAnswer,
  };
}
