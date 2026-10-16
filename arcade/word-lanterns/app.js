import { drawHome, drawStrip, drawComplete } from "./art.js";
import { Sound, TRACKS, GENRES } from "./audio.js";
import { Fx } from "./fx.js";
import * as L from "./logic.js";
import { Pulse, drawScene, generateScene } from "./scenery.js";

const SAVE_KEY = "wordLanterns.v1";
const START_HINTS = 5;
const HINT_EVERY = 3;
const COLORS = ["#f6c453", "#8fd3f4", "#a8e6a1", "#f7a8b8", "#c9b6f2", "#ffb27a", "#9ee0d0", "#e9c6a0"];

const $ = (id) => document.getElementById(id);

// ---- Core (wasm) ----
const wasm = await WebAssembly.instantiate(await (await fetch("game.wasm")).arrayBuffer(), {});
const core = wasm.instance.exports;
const bytes = () => new Uint8Array(core.memory.buffer);
const text = (ptr, len) => String.fromCharCode(...bytes().subarray(ptr, ptr + len));
const THEMES = Array.from({ length: core.themeCount() }, (_, t) => text(core.themeNamePtr(t), core.themeNameLen(t)));

// ---- State ----
const defaults = () => ({
  round: 1,
  level: 1,
  boardMax: 0,
  seed: newSeed(),
  boardTheme: 0,
  found: [],
  hintsUsed: 0,
  mascotHelps: 0,
  hintWord: -1,
  elapsed: 0,
  boards: 0,
  hints: START_HINTS,
  themePref: "mix",
  track: "evening",
  music: true,
  volume: 40,
  sfx: true,
  vibrate: true,
  rotation: 0,
  text: "normal",
  adsRemoved: false,
  ownedThemes: [],
  ownedTracks: [],
  started: false,
});

function newSeed() {
  return (crypto.getRandomValues(new Uint32Array(1))[0] || 1) >>> 0;
}

function load() {
  return L.loadSave(defaults(), localStorage.getItem(SAVE_KEY));
}

let state = load();
const save = () => localStorage.setItem(SAVE_KEY, JSON.stringify(state));

const sound = new Sound();
sound.volume = state.volume / 100;
sound.sfx = state.sfx;

const ownsTheme = (t) => L.ownsTheme(state, t);
const ownsTrack = (id) => id === "evening" || state.ownedTracks.includes(id);

const chooseTheme = () => L.chooseTheme(state, THEMES.length);

// ---- Board ----
let size = 6;
let words = [];
let pending = -1;
let drag = null;
let cellEls = [];
let selectionCount = 0;
let startDegree = 0;
let combo = 0;
let lastFind = 0;

const cellsEl = $("cells");
const marksEl = $("marks");
const marksG = $("marksG");
const boardEl = $("board");
const fx = new Fx($("fx"));
const buzz = (pattern) => {
  if (state.vibrate && navigator.vibrate && navigator.userActivation?.hasBeenActive !== false) navigator.vibrate(pattern);
};

const categoryFor = () => L.categoryFor(THEMES[state.boardTheme], state.seed);

function loadBoard(animate = true) {
  if (!state.boardMax) state.boardMax = readableMax();
  core.newBoard(state.seed, state.round, state.level, state.boardTheme, state.boardMax);
  sound.setGenre(THEMES[state.boardTheme]);
  scene = generateScene(THEMES[state.boardTheme], state.seed);
  size = core.gridSize();
  const count = core.wordCount();
  words = Array.from({ length: count }, (_, i) => ({
    text: text(core.wordPtr(i), core.wordLen(i)),
    found: false,
    a: 0,
    b: 0,
  }));
  for (const f of state.found) {
    if (f.i < count) {
      core.markFound(f.i, f.a, f.b);
      Object.assign(words[f.i], { found: true, a: f.a, b: f.b });
    }
  }
  pending = -1;
  combo = 0;
  renderBoard(animate);
  // The word card can grow once words are shown and shrink the board; on a fresh board, rebuild once at the
  // smaller readable size so letters keep at least MIN_CELL px.
  const fits = readableMax();
  if (!state.found.length && fits && fits < core.gridSize()) {
    state.boardMax = fits;
    save();
    return loadBoard(animate);
  }
  drawScenery();
  mascotLeave(true);
  touchActivity();
  const left = words.filter((w) => !w.found).length;
  banner(state.found.length ? `Welcome back! ${left} to go` : `Level ${state.level}: ${categoryFor()}`, "big");
}

// Grid cap for this screen, so letters stay readable; stored with the board so a reload rebuilds the same board.
function readableMax() {
  layout();
  return boardPx ? L.maxGridFor(boardPx) : 0;
}

function startNewBoard() {
  state.seed = newSeed();
  state.boardMax = readableMax();
  state.boardTheme = chooseTheme();
  state.found = [];
  state.hintsUsed = 0;
  state.mascotHelps = 0;
  state.hintWord = -1;
  state.elapsed = 0;
  save();
  loadBoard();
}

// Rotation: the board is drawn turned clockwise `state.rotation` times; the core always uses unturned cells.
const toLogical = (dx, dy) => L.toLogical(dx, dy, size, state.rotation);

function renderBoard(animate = false) {
  const letters = bytes().subarray(core.gridPtr(), core.gridPtr() + size * size);
  boardEl.style.setProperty("--n", size);
  cellsEl.replaceChildren();
  cellEls = new Array(size * size);
  for (let d = 0; d < size * size; d++) {
    const dc = d % size, dr = Math.floor(d / size);
    const p = toLogical(dc + 0.5, dr + 0.5);
    const i = Math.floor(p.y) * size + Math.floor(p.x);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "cell";
    b.role = "gridcell";
    b.dataset.i = i;
    b.dataset.d = d;
    b.tabIndex = d === 0 ? 0 : -1;
    b.style.setProperty("--d", `${(dr * 0.035 + dc * 0.012).toFixed(3)}s`);
    const ch = String.fromCharCode(letters[i]);
    b.textContent = ch;
    b.setAttribute("aria-label", `${ch}, row ${dr + 1}, column ${dc + 1}`);
    cellsEl.append(b);
    cellEls[i] = b;
  }
  cellsEl.classList.toggle("drop", animate);
  if (animate) setTimeout(() => cellsEl.classList.remove("drop"), 1200);
  marksEl.setAttribute("viewBox", `0 0 ${size} ${size}`);
  marksG.setAttribute("transform", `rotate(${90 * (state.rotation || 0)} ${size / 2} ${size / 2})`);
  $("boardLabel").textContent = L.levelLabelShort(state.round, state.level);
  $("boardLabel").title = L.levelLabel(state.round, state.level);
  $("category").innerHTML = `<small></small><span></span>`;
  const genre = GENRES[THEMES[state.boardTheme]];
  $("category").querySelector("small").textContent = genre ? `${THEMES[state.boardTheme]} · ${genre.name}` : THEMES[state.boardTheme];
  $("category").querySelector("span").textContent = categoryFor();
  renderWords();
  renderMarks();
  renderHint();
  layout();
}

function renderWords() {
  const list = $("wordList");
  list.replaceChildren(
    ...words.map((w, i) => {
      const li = document.createElement("li");
      li.textContent = w.text;
      li.id = `word-${i}`;
      if (w.found) {
        li.classList.add("found");
        li.style.setProperty("--chip", COLORS[i % COLORS.length]);
        li.setAttribute("aria-label", `${w.text}, found`);
      }
      if (i === state.hintWord && !w.found) li.classList.add("hinted");
      return li;
    }),
  );
  const found = words.filter((w) => w.found).length;
  $("foundCount").textContent = `${found}/${words.length}`;
  drawLanterns();
  $("hintCount").textContent = state.hints;
}

// ---- Lantern animation: twinkling stars, candle flicker, fireflies and a flare when a lantern lights ----
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const animClock = () => (reducedMotion.matches ? 0 : performance.now() / 1000);
let flare = null;

function drawLanterns() {
  const t = animClock();
  const f = flare ? { index: flare.index, age: t - flare.at } : null;
  drawStrip($("lanternStrip"), words.length, words.filter((w) => w.found).length, t, f);
}

// ---- Scenery: the theme's parallax backdrop, breathing softly with the notes ----
const sceneryEl = $("scenery");
const sceneryCtx = sceneryEl.getContext("2d");
const pulse = new Pulse();
let scene = null;
sound.onNote = (count) => pulse.kick(count > 1 ? 0.2 : 0.12);

function drawScenery(t = animClock()) {
  if (!scene || !sceneryEl.width) return;
  const dpr = sceneryEl.width / Math.max(sceneryEl.clientWidth, 1);
  sceneryCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawScene(sceneryCtx, scene, sceneryEl.clientWidth, sceneryEl.clientHeight, t, t ? pulse.value : 0);
}

let lastStrip = 0;
let lastScene = 0;
function animate(now) {
  requestAnimationFrame(animate);
  if (reducedMotion.matches || document.visibilityState !== "visible") return;
  if (!$("game").hidden && words.length) {
    if (now - lastScene >= 33) {
      pulse.step((now - lastScene) / 1000);
      lastScene = now;
      drawScenery(now / 1000);
    }
    if (now - lastStrip >= 80) {
      lastStrip = now;
      drawLanterns();
    }
  } else if (!$("home").hidden && now - lastStrip >= 80) {
    lastStrip = now;
    drawHome($("homeScene"), state.boards, now / 1000);
  }
}
requestAnimationFrame(animate);

const center = (i) => L.center(i, size);

function line(a, b, cls, color) {
  const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
  const [x1, y1] = center(a);
  const [x2, y2] = center(b);
  Object.entries({ x1, y1, x2, y2, class: cls, "stroke-width": 0.78 }).forEach(([k, v]) => l.setAttribute(k, v));
  if (color) l.setAttribute("stroke", color);
  return l;
}

const pathCells = (a, b) => L.pathCells(a, b, size);

let newMark = -1;
function renderMarks() {
  const lines = words.flatMap((w, i) =>
    w.found ? [line(w.a, w.b, i === newMark ? "found new" : "found", COLORS[i % COLORS.length])] : [],
  );
  if (drag && drag.end !== drag.start) lines.push(line(drag.start, drag.end, "live"));
  marksG.replaceChildren(...lines);
  cellsEl.querySelectorAll(".start, .sel").forEach((c) => c.classList.remove("start", "sel"));
  if (drag) pathCells(drag.start, drag.end).forEach((c) => cellEls[c]?.classList.add("sel"));
  else if (pending >= 0) cellEls[pending]?.classList.add("start");
}

function renderHint() {
  cellsEl.querySelectorAll(".hint").forEach((c) => c.classList.remove("hint"));
  const i = state.hintWord;
  if (i >= 0 && words[i] && !words[i].found) cellEls[core.wordStart(i)]?.classList.add("hint");
}

// ---- Layout ----
let boardPx = 0;
function layout() {
  const zone = $("boardZone");
  // The column is as wide as the screen allows; the board fills the height left in it, up to that width.
  const column = Math.floor(Math.min(zone.clientWidth - 24, 620));
  const s = Math.max(200, Math.floor(Math.min(column, zone.clientHeight - 14)));
  $("game").style.setProperty("--column", `${column}px`);
  // Small changes are ignored so the word card and board settle instead of oscillating.
  if (Math.abs(s - boardPx) > 2) {
    boardPx = s;
    $("game").style.setProperty("--board", `${s}px`);
  }
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  const sw = Math.round(sceneryEl.clientWidth * dpr);
  const sh = Math.round(sceneryEl.clientHeight * dpr);
  if (sw && (sceneryEl.width !== sw || sceneryEl.height !== sh)) {
    sceneryEl.width = sw;
    sceneryEl.height = sh;
    drawScenery();
  }
  const strip = $("lanternStrip");
  const w = Math.max(80, Math.round((20 * strip.clientWidth) / Math.max(strip.clientHeight, 1)));
  if (strip.width !== w) {
    strip.width = w;
    if (words.length) drawLanterns();
  }
}
new ResizeObserver(layout).observe($("boardZone"));
new ResizeObserver(layout).observe(sceneryEl);

// ---- Messages on the lantern strip ----
let bannerTimer;
function banner(msg, kind = "") {
  const el = $("banner");
  $("bannerText").textContent = msg;
  el.className = `banner ${kind}`;
  void el.offsetWidth;
  el.classList.add("show");
  $("stripWrap").classList.remove("glow");
  void $("stripWrap").offsetWidth;
  $("stripWrap").classList.add("glow");
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.classList.remove("show"), 2700);
}

function praise(msg) {
  const el = $("praise");
  el.textContent = msg;
  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
}

// ---- Selection ----
function pointToCell(e) {
  const r = cellsEl.getBoundingClientRect();
  const dx = Math.min(Math.max(((e.clientX - r.left) / r.width) * size, 0), size - 0.001);
  const dy = Math.min(Math.max(((e.clientY - r.top) / r.height) * size, 0), size - 0.001);
  const p = toLogical(dx, dy);
  return { x: Math.min(Math.max(p.x, 0), size - 0.001), y: Math.min(Math.max(p.y, 0), size - 0.001) };
}

const snap = (start, p) => L.snap(start, p, size);
const clampSteps = (start, ux, uy, k) => L.clampSteps(start, ux, uy, k, size);
const cellAt = (start, ux, uy, k) => L.cellAt(start, ux, uy, k, size);

function beginSelection() {
  selectionCount++;
  startDegree = (selectionCount * 3) % 7;
  sound.letter(0, startDegree);
  buzz(8);
}

function submit(a, b, snapInfo) {
  const tries = [b];
  if (snapInfo && snapInfo.k > 0) {
    // Forgiving swipes: also accept a line one letter longer or shorter.
    const { ux, uy, k } = snapInfo;
    if (clampSteps(a, ux, uy, k + 1) === k + 1) tries.push(cellAt(a, ux, uy, k + 1));
    if (k - 1 >= 1) tries.push(cellAt(a, ux, uy, k - 1));
  }
  let result = -1;
  let end = b;
  for (const t of tries) {
    const r = core.trySelect(a, t);
    if (r >= 0) {
      result = r;
      end = t;
      break;
    }
    if (r === -2) result = -2;
  }
  if (result >= 0) {
    onFound(result, a, end);
  } else if (result === -2) {
    banner("You already found that one");
  } else if (a !== b) {
    sound.effect("miss");
    boardEl.classList.remove("shake");
    void boardEl.offsetWidth;
    boardEl.classList.add("shake");
  }
}

function onFound(i, a, b) {
  mascotLeave();
  Object.assign(words[i], { found: true, a, b });
  state.found.push({ i, a, b });
  if (state.hintWord === i) state.hintWord = -1;
  save();

  const now = performance.now();
  combo = now - lastFind < 12000 ? combo + 1 : 0;
  lastFind = now;
  const word = words[i].text;
  const level = L.praiseLevel(combo, word.length);

  sound.cadence(level);
  flare = { index: words.filter((w) => w.found).length - 1, at: animClock() };
  buzz([30, 40, 30, 40, 70]);
  newMark = i;
  renderWords();
  renderMarks();
  renderHint();
  newMark = -1;

  pathCells(a, b).forEach((c, k) => {
    const el = cellEls[c];
    if (!el) return;
    el.style.setProperty("--d", `${(k * 0.05).toFixed(2)}s`);
    el.classList.remove("burst");
    void el.offsetWidth;
    el.classList.add("burst");
    setTimeout(() => {
      const r = el.getBoundingClientRect();
      fx.burst(r.left + r.width / 2, r.top + r.height / 2, 8 + level * 2, 0.8 + level * 0.1);
      el.classList.remove("burst");
    }, k * 50 + 150);
  });
  const chip = $(`word-${i}`);
  chip?.classList.add("pop");
  praise(L.PRAISE[level]);

  const left = words.filter((w) => !w.found).length;
  if (left === 0) setTimeout(completeBoard, 900);
  else banner(left === 1 ? `${word}! Just one more to go` : `${word}! ${left} to go`, "good");
}

function tapCell(i) {
  if (pending < 0) {
    pending = i;
    beginSelection();
  } else if (pending === i) {
    pending = -1;
  } else {
    const a = pending;
    const straight = L.isStraight(a, i, size);
    pending = -1;
    if (straight) {
      sound.chord(pathCells(a, i).length, startDegree);
      buzz(8);
      submit(a, i);
    } else {
      pending = i;
      beginSelection();
    }
  }
  renderMarks();
}

boardEl.addEventListener("pointerdown", (e) => {
  if (e.button > 0) return;
  const p = pointToCell(e);
  const start = Math.floor(p.y) * size + Math.floor(p.x);
  e.preventDefault();
  touchActivity();
  boardEl.setPointerCapture(e.pointerId);
  drag = { start, end: start, moved: false, info: null, len: 1 };
  if (pending < 0) beginSelection();
  renderMarks();
});

boardEl.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const info = snap(drag.start, pointToCell(e));
  if (info.end !== drag.start) drag.moved = true;
  if (info.end !== drag.end) {
    drag.end = info.end;
    drag.info = info;
    const len = info.k + 1;
    const turned = drag.info && info.k > 0 && drag.len > 1 && (info.ux !== drag.ux || info.uy !== drag.uy);
    if (len !== drag.len || turned) {
      // One note per letter as the line grows. When it jumps several letters or swings to a new direction,
      // all the notes of the selection play together as a chord.
      if (turned || Math.abs(len - drag.len) > 1) sound.chord(len, startDegree);
      else sound.letter(len - 1, startDegree);
      buzz(len > drag.len + 1 || turned ? [6, 20, 6] : 6);
      drag.len = len;
    }
    drag.ux = info.ux;
    drag.uy = info.uy;
    renderMarks();
  }
});

function endDrag(e) {
  if (!drag) return;
  const d = drag;
  drag = null;
  if (e.type === "pointercancel") return renderMarks();
  if (d.moved && d.end !== d.start) {
    pending = -1;
    submit(d.start, d.end, d.info);
    renderMarks();
  } else if (d.moved) {
    renderMarks();
  } else {
    tapCell(d.start);
  }
}
boardEl.addEventListener("pointerup", endDrag);
boardEl.addEventListener("pointercancel", endDrag);
boardEl.addEventListener("contextmenu", (e) => e.preventDefault());

// Keyboard: arrows move between letters as shown, Enter or Space works like a tap.
cellsEl.addEventListener("keydown", (e) => {
  touchActivity();
  const cell = e.target.closest(".cell");
  if (!cell) return;
  const d = Number(cell.dataset.d);
  const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -size, ArrowDown: size };
  if (e.key in moves) {
    e.preventDefault();
    const j = d + moves[e.key];
    const sameRow = Math.floor(j / size) === Math.floor(d / size);
    if (j < 0 || j >= size * size || ((e.key === "ArrowLeft" || e.key === "ArrowRight") && !sameRow)) return;
    cell.tabIndex = -1;
    const next = cellsEl.children[j];
    next.tabIndex = 0;
    next.focus();
  } else if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    tapCell(Number(cell.dataset.i));
  } else if (e.key === "Escape") {
    pending = -1;
    renderMarks();
  }
});

// ---- Controls ----
function wiggle(id) {
  const b = $(id);
  b.classList.remove("wiggle");
  void b.offsetWidth;
  b.classList.add("wiggle");
}

$("hintBtn").addEventListener("click", () => {
  touchActivity();
  wiggle("hintBtn");
  const current = state.hintWord;
  if (current >= 0 && words[current] && !words[current].found) {
    banner(`Look for ${words[current].text}: its first letter glows`);
    return;
  }
  if (state.hints <= 0) {
    banner("No hints left. You earn one every few boards");
    openSheet("shop");
    return;
  }
  const i = core.hintWord();
  if (i < 0) return;
  state.hints--;
  state.hintsUsed++;
  state.hintWord = i;
  save();
  sound.effect("hint");
  buzz(20);
  renderWords();
  renderHint();
  banner(`Look for ${words[i].text}: its first letter glows`);
});

$("rotateBtn").addEventListener("click", () => {
  touchActivity();
  mascotLeave(true);
  wiggle("rotateBtn");
  state.rotation = ((state.rotation || 0) + 1) % 4;
  save();
  pending = -1;
  renderBoard(false);
  boardEl.classList.remove("spin");
  void boardEl.offsetWidth;
  boardEl.classList.add("spin");
  sound.effect("coin");
  buzz(10);
});

// ---- Mascot: Lumi walks over and knocks on a letter when the player has been still for a while ----
const mascotEl = $("mascot");
let lastActivity = performance.now();
let mascotBusy = false;
let mascotWord = -1;
const touchActivity = () => {
  lastActivity = performance.now();
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function zoneRect(el) {
  const z = $("boardZone").getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { x: r.left - z.left, y: r.top - z.top, w: r.width, h: r.height };
}

function moveMascot(x, y) {
  const cx = parseFloat(mascotEl.style.left) || 0;
  const cy = parseFloat(mascotEl.style.top) || 0;
  const dur = reducedMotion.matches ? 0 : Math.min(3, Math.max(0.3, Math.hypot(x - cx, y - cy) / 110));
  if (Math.abs(x - cx) > 1) mascotEl.classList.toggle("flip", x < cx);
  mascotEl.classList.toggle("walking", dur > 0);
  mascotEl.style.transition = dur ? `left ${dur}s linear, top ${dur}s linear` : "none";
  mascotEl.style.left = `${x}px`;
  mascotEl.style.top = `${y}px`;
  return wait(dur * 1000).then(() => mascotEl.classList.remove("walking"));
}

async function mascotHelp() {
  const current = state.hintWord;
  const i = current >= 0 && words[current] && !words[current].found ? current : core.hintWord();
  if (i < 0) return;
  mascotBusy = true;
  mascotWord = i;
  state.hintWord = i;
  state.mascotHelps++;
  save();
  const cell = cellEls[core.wordStart(i)];
  const zone = $("boardZone");
  const c = zoneRect(cell);
  const ground = zone.clientHeight - 76;
  const fromLeft = c.x + c.w / 2 < zone.clientWidth / 2;
  const standLeft = c.x >= 56;
  mascotEl.style.transition = "none";
  mascotEl.style.left = `${fromLeft ? -70 : zone.clientWidth + 6}px`;
  mascotEl.style.top = `${ground}px`;
  mascotEl.hidden = false;
  void mascotEl.offsetWidth;
  const tx = standLeft ? c.x - 54 : c.x + c.w - 10;
  await moveMascot(tx, ground);
  if (mascotWord !== i) return;
  await moveMascot(tx, c.y + c.h / 2 - 44);
  if (mascotWord !== i) return;
  mascotEl.classList.toggle("flip", !standLeft);
  mascotEl.classList.add("knock");
  cell.classList.remove("knocked");
  void cell.offsetWidth;
  cell.classList.add("knocked");
  renderWords();
  renderHint();
  banner(`Knock knock! Try ${words[i].text}`, "good");
  for (let k = 0; k < 3 && mascotWord === i; k++) {
    sound.knock();
    buzz(12);
    await wait(360);
  }
  mascotEl.classList.remove("knock");
  mascotBusy = false;
}

async function mascotLeave(instant = false) {
  mascotWord = -1;
  mascotBusy = false;
  mascotEl.classList.remove("knock");
  if (mascotEl.hidden) return;
  if (instant || reducedMotion.matches) {
    mascotEl.hidden = true;
    return;
  }
  const x = parseFloat(mascotEl.style.left) || 0;
  const zw = $("boardZone").clientWidth;
  await moveMascot(x < zw / 2 ? -80 : zw + 10, parseFloat(mascotEl.style.top) || 0);
  if (mascotWord < 0) mascotEl.hidden = true;
}

setInterval(async () => {
  const playing = !$("game").hidden && $("complete").hidden && !document.querySelector(".overlay.sheet-open");
  if (!playing || mascotBusy || document.visibilityState !== "visible" || !words.some((w) => !w.found)) return;
  if (performance.now() - lastActivity < L.idleDelayFor(L.progressIndex(state.round, state.level)) * 1000) return;
  touchActivity();
  if (!mascotEl.hidden) await mascotLeave();
  mascotHelp();
}, 1000);

// ---- Ads ----
function updateAds() {
  $("adBar").hidden = state.adsRemoved;
  layout();
}
$("adBarRemove").addEventListener("click", () => openSheet("shop"));

// ---- Board complete ----
function completeBoard() {
  if (!$("complete").hidden) return;
  const count = words.length;
  const finished = { round: state.round, level: state.level };
  const roundDone = finished.level >= L.LEVELS;
  Object.assign(state, L.nextLevel(finished));
  state.boards++;
  let note = roundDone
    ? `You found all ${count} words and finished round ${finished.round}. Round ${state.round} brings bigger, trickier boards.`
    : `You found all ${count} words. Next: level ${state.level}, with more words to find.`;
  if (state.boards % HINT_EVERY === 0) {
    state.hints++;
    note += " You earned a hint.";
  }
  state.found = [];
  state.seed = newSeed();
  state.boardMax = 0;
  state.boardTheme = chooseTheme();
  state.hintsUsed = 0;
  state.mascotHelps = 0;
  state.hintWord = -1;
  state.elapsed = 0;
  save();
  sound.effect("complete");
  buzz([60, 50, 60, 50, 140]);
  fx.confetti();
  banner(roundDone ? `Round ${finished.round} complete!` : "Every lantern is lit!", "big");
  $("completeTitle").textContent = roundDone ? `Round ${finished.round} complete!` : `Level ${finished.level} complete!`;
  if (roundDone) setTimeout(() => fx.confetti(), 700);
  $("completeNote").textContent = note;
  $("adSlot").hidden = state.adsRemoved;
  drawComplete($("completeArt"));
  $("complete").hidden = false;
  $("nextBtn").focus();
}

$("nextBtn").addEventListener("click", () => {
  $("complete").hidden = true;
  loadBoard();
});
$("adRemove").addEventListener("click", () => openSheet("shop"));

// ---- Time on board (only while playing and visible) ----
setInterval(() => {
  if (!$("game").hidden && $("complete").hidden && document.visibilityState === "visible") {
    state.elapsed += 1;
    if (Math.round(state.elapsed) % 5 === 0) save();
  }
}, 1000);

// ---- Screens ----
function showHome() {
  $("game").hidden = true;
  $("home").hidden = false;
  drawHome($("homeScene"), state.boards);
  $("playBtn").textContent = state.started ? "Continue" : "Play";
  $("homeProgress").textContent = state.boards
    ? `${L.levelLabel(state.round, state.level)} · ${state.boards} ${state.boards === 1 ? "board" : "boards"} lit`
    : "Your road is waiting.";
}

function showGame() {
  state.started = true;
  save();
  $("home").hidden = true;
  $("game").hidden = false;
  loadBoard();
  if (state.music) sound.play(state.track);
}

$("playBtn").addEventListener("click", showGame);
$("backBtn").addEventListener("click", showHome);

// ---- Sheets ----
let lastFocus = null;
function openSheet(id) {
  document.querySelectorAll(".overlay.sheet-open").forEach((o) => {
    o.hidden = true;
    o.classList.remove("sheet-open");
  });
  lastFocus = document.activeElement;
  if (id === "settings") fillSettings();
  if (id === "shop") fillShop();
  const el = $(id);
  el.hidden = false;
  el.classList.add("sheet-open");
  el.querySelector("[data-close]").focus();
}
function closeSheets() {
  document.querySelectorAll(".overlay.sheet-open").forEach((o) => {
    o.hidden = true;
    o.classList.remove("sheet-open");
  });
  lastFocus?.focus?.();
}
document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeSheets));
document.querySelectorAll("#settings, #shop").forEach((o) =>
  o.addEventListener("click", (e) => {
    if (e.target === o) closeSheets();
  }),
);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.querySelector(".overlay.sheet-open")) closeSheets();
});
$("settingsBtn").addEventListener("click", () => openSheet("settings"));
$("homeSettings").addEventListener("click", () => openSheet("settings"));
$("homeShop").addEventListener("click", () => openSheet("shop"));
$("openShop").addEventListener("click", () => openSheet("shop"));

function fillSettings() {
  const themeSel = $("themeSelect");
  themeSel.replaceChildren(
    new Option("Mix of my themes", "mix"),
    ...THEMES.map((name, t) => {
      const o = new Option(ownsTheme(t) ? name : `${name} (in shop)`, String(t));
      o.disabled = !ownsTheme(t);
      return o;
    }),
  );
  themeSel.value = String(state.themePref);
  const trackSel = $("trackSelect");
  trackSel.replaceChildren(
    ...Object.entries(TRACKS).map(([id, t]) => {
      const o = new Option(ownsTrack(id) ? t.name : `${t.name} (in shop)`, id);
      o.disabled = !ownsTrack(id);
      return o;
    }),
  );
  trackSel.value = state.track;
  $("textSelect").value = state.text;
  $("musicToggle").checked = state.music;
  $("volumeRange").value = state.volume;
  $("sfxToggle").checked = state.sfx;
  $("vibrateToggle").checked = state.vibrate;
  $("newBoardBtn").hidden = $("game").hidden;
}

$("themeSelect").addEventListener("change", (e) => {
  state.themePref = e.target.value;
  save();
  toast("New theme starts with the next board");
});
$("trackSelect").addEventListener("change", (e) => {
  state.track = e.target.value;
  save();
  if (state.music) {
    sound.stop();
    sound.play(state.track);
  }
});
$("textSelect").addEventListener("change", (e) => {
  state.text = e.target.value;
  applyText();
  save();
});
$("musicToggle").addEventListener("change", (e) => {
  state.music = e.target.checked;
  save();
  if (state.music) sound.play(state.track);
  else sound.stop();
});
$("volumeRange").addEventListener("input", (e) => {
  state.volume = Number(e.target.value);
  sound.setVolume(state.volume / 100);
  save();
});
$("sfxToggle").addEventListener("change", (e) => {
  state.sfx = e.target.checked;
  sound.sfx = state.sfx;
  save();
});
$("vibrateToggle").addEventListener("change", (e) => {
  state.vibrate = e.target.checked;
  save();
  buzz(30);
});
$("newBoardBtn").addEventListener("click", () => {
  state.boardTheme = chooseTheme();
  closeSheets();
  startNewBoard();
});
$("resetBtn").addEventListener("click", () => {
  if (!confirm("Reset all progress, hints and test purchases in this browser?")) return;
  state = defaults();
  save();
  applyText();
  updateAds();
  sound.stop();
  closeSheets();
  showHome();
});

function applyText() {
  document.documentElement.dataset.text = state.text;
}

// ---- Test store ----
const PRODUCTS = () => [
  { id: "noads", name: "Remove ads", desc: "One-time purchase. No more ads between boards.", owned: state.adsRemoved, buy: () => (state.adsRemoved = true) },
  { id: "hints10", name: "10 hints", desc: "Consumable. Adds 10 hints.", buy: () => (state.hints += 10) },
  { id: "hints30", name: "30 hints", desc: "Consumable. Adds 30 hints.", buy: () => (state.hints += 30) },
  ...THEMES.map((name, t) => ({ t, name })).filter(({ t }) => t >= L.FREE_THEMES).map(({ t, name }) => ({
    id: `theme-${t}`,
    name: `${name} theme`,
    desc: "One-time purchase. New words for your road.",
    owned: ownsTheme(t),
    buy: () => state.ownedThemes.push(t),
  })),
  ...Object.entries(TRACKS).filter(([id]) => id !== "evening").map(([id, t]) => ({
    id: `track-${id}`,
    name: `${t.name} soundtrack`,
    desc: "One-time purchase. A new relaxing music loop.",
    owned: ownsTrack(id),
    buy: () => state.ownedTracks.push(id),
  })),
];

function fillShop() {
  $("shopList").replaceChildren(
    ...PRODUCTS().map((p) => {
      const li = document.createElement("li");
      const info = document.createElement("span");
      info.className = "info";
      info.innerHTML = `<span class="name"></span><span class="desc"></span>`;
      info.querySelector(".name").textContent = p.name;
      info.querySelector(".desc").textContent = p.desc;
      li.append(info);
      if (p.owned) {
        const s = document.createElement("span");
        s.className = "owned";
        s.textContent = "Owned";
        li.append(s);
      } else {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "btn small";
        b.textContent = "Test buy";
        b.setAttribute("aria-label", `Test buy ${p.name}`);
        b.addEventListener("click", () => {
          if (!confirm(`Test purchase: ${p.name}. Nothing will be charged. Continue?`)) return;
          p.buy();
          save();
          updateAds();
          sound.effect("coin");
          toast(`${p.name}: added`);
          $("hintCount").textContent = state.hints;
          fillShop();
        });
        li.append(b);
      }
      return li;
    }),
  );
}
$("restoreBtn").addEventListener("click", () => toast("Purchases are restored from this browser's saved progress"));

// ---- Feedback ----
let toastTimer;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

document.addEventListener("visibilitychange", () => {
  if (!sound.ctx) return;
  if (document.visibilityState === "hidden") sound.ctx.suspend();
  else if (state.music) sound.ctx.resume();
});

window.addEventListener("resize", () => {
  if (!$("home").hidden) drawHome($("homeScene"), state.boards);
});

applyText();
updateAds();
showHome();

// Test hook for driving the mascot and state from browser automation: open with ?debug.
if (new URLSearchParams(location.search).has("debug")) window.wordLanterns = { mascotHelp, mascotLeave, state: () => state };
