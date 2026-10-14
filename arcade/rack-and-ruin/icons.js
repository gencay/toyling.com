// Pixel icons for every modifier: a small picture that says what it does at a glance.
// Each icon is 12×12 characters; each character is one pixel (see PALETTE, "." is transparent).

export const PALETTE = {
  k: "#14121c", // outline
  w: "#f4efe2", // cue ball / white
  y: "#f5c542", // 1 yellow
  b: "#2f5fd0", // 2 blue
  r: "#e0362c", // 3 red
  p: "#7b4bc4", // 4 purple
  o: "#f08a2c", // 5 orange
  g: "#2f9e5a", // 6 green
  m: "#7a2418", // 7 maroon
  f: "#1f7a5a", // felt
  F: "#145a40", // dark felt / cushion
  n: "#6b3f22", // wood
  N: "#3b200e", // dark wood
  c: "#3f6fd0", // chalk blue
  C: "#9fc0ff", // light chalk
  s: "#b9b0cc", // grey / motion trail
  t: "#ffd34e", // spark / star
  x: "#ff5a1f", // flame
};

export const ICONS = {
  // ---- shot types
  single: [ // one ball rolling into a pocket
    "........kkk.",
    ".......kkkkk",
    ".......kkkkk",
    "........kkk.",
    "......s.....",
    ".....s......",
    "..kkk.......",
    ".kyyyk......",
    ".kywyk......",
    ".kyyyk......",
    "..kkk.......",
    "............",
  ],
  double: [ // two balls heading for one pocket
    "........kkk.",
    ".......kkkkk",
    ".......kkkkk",
    "..kkk...kkk.",
    ".kbbbk.s....",
    ".kbwbks.....",
    ".kbbbk......",
    "..kkkkk.....",
    "....kyyyk...",
    "....kywyk...",
    "....kyyyk...",
    ".....kkk....",
  ],
  treble: [ // three balls in a triangle
    "............",
    "....kkk.....",
    "...kyyyk....",
    "...kywyk....",
    "...kyyyk....",
    "..kkkkkkk...",
    ".kbbbkrrrk..",
    ".kbwbkrwrk..",
    ".kbbbkrrrk..",
    "..kkk.kkk...",
    "............",
    "............",
  ],
  bank: [ // a ball bouncing off the cushion
    "nnF.........",
    "nnF.........",
    "nnF..s......",
    "nnF.s.s.....",
    "nnFs...s....",
    "nnF.....s...",
    "nnF......kkk",
    "nnF.....kooo",
    "nnF.....kowo",
    "nnF.....kooo",
    "nnF......kkk",
    "nnF.........",
  ],
  combo: [ // one ball knocking another into the pocket
    "........kkk.",
    ".......kkkkk",
    ".......kkkkk",
    "........kkk.",
    ".......s....",
    "....kkk.....",
    "...kgggk....",
    "...kgwgk....",
    ".kkkgggk....",
    "kpppkkk.....",
    "kpwpk.......",
    "kpppk.......",
  ],
  kiss: [ // the cue ball touching two balls, with a little heart
    ".....r.r....",
    "....rrrrr...",
    ".....rrr....",
    "......r.....",
    ".kkk.kkk.kkk",
    "kbbbkwwwkrrr",
    "kbwbkwwwkrwr",
    "kbbbkwwwkrrr",
    ".kkk.kkk.kkk",
    "............",
    "............",
    "............",
  ],
  long: [ // a long dotted run across the table
    "..........kk",
    ".........kkk",
    "..........kk",
    "........s...",
    "............",
    "......s.....",
    "............",
    "....s.......",
    ".kkk........",
    "kmmmk.......",
    "kmwmk.......",
    ".kkk........",
  ],
  clearance: [ // an empty table, sparkling clean
    "FFFFFFFFFFFF",
    "Ff..t.....fF",
    "Ff.ttt..t.fF",
    "Ff..t.....fF",
    "Ff........fF",
    "Ff.....t..fF",
    "Ff....ttt.fF",
    "Ff.t...t..fF",
    "Fftt......fF",
    "Ff.t......fF",
    "FffffffffffF",
    "FFFFFFFFFFFF",
  ],
  // ---- shop modifiers
  polish: [ // a ball with a shine
    "........t...",
    ".......ttt..",
    "....kkk.t...",
    "...kyyyyk...",
    "..kyywwyyk..",
    "..kywwyyyk..",
    "..kyyyyyyk..",
    "..kyyyyyyk..",
    "...kyyyyk...",
    "....kkkk....",
    "............",
    "............",
  ],
  hotPocket: [ // a pocket on fire
    ".....x......",
    "....xx..x...",
    "...xtx.xx...",
    "...xttxtx...",
    "..xxtttxx...",
    "..xttttx....",
    "...kkkkkk...",
    "..kkkkkkkk..",
    "..kkkkkkkk..",
    "...kkkkkk...",
    "..nnnnnnnn..",
    "............",
  ],
  mult: [ // a big red times sign
    "............",
    ".rr......rr.",
    ".rrr....rrr.",
    "..rrr..rrr..",
    "...rrrrrr...",
    "....rrrr....",
    "....rrrr....",
    "...rrrrrr...",
    "..rrr..rrr..",
    ".rrr....rrr.",
    ".rr......rr.",
    "............",
  ],
  extraShot: [ // a cue with a plus
    "..........cc",
    ".........wwc",
    "..t.....ww..",
    ".ttt...nn...",
    "..t...nn....",
    ".....nn.....",
    "....nn......",
    "...nn.......",
    "..NN........",
    ".NN.........",
    "NN..........",
    "N...........",
  ],
  newBall: [ // a new ball with a plus
    "..........t.",
    ".........ttt",
    "..........t.",
    "...kkkk.....",
    "..kppppk....",
    ".kppppppk...",
    ".kppwpppk...",
    ".kppppppk...",
    "..kppppk....",
    "...kkkk.....",
    "............",
    "............",
  ],
  chalk: [ // a cube of blue chalk
    "............",
    "....kkkkk...",
    "...kCCCCCk..",
    "..kCCCCCck..",
    "..kkkkkkcck.",
    "..kcccccck..",
    "..kcwccccck.",
    "..kccccccck.",
    "..kcccccck..",
    "..kkkkkkk...",
    "............",
    "............",
  ],
  pocketMult: [ // a pocket with a times sign
    "............",
    "...kkkkkk...",
    "..kkkkkkkk..",
    ".kkwkkkkwkk.",
    ".kkkwkkwkkk.",
    ".kkkkwwkkkk.",
    ".kkkkwwkkkk.",
    ".kkkwkkwkkk.",
    ".kkwkkkkwkk.",
    "..kkkkkkkk..",
    "...kkkkkk...",
    "............",
  ],
};

// Which icon goes with each core shot type (SINGLE = 0 … CLEARANCE = 7) and each shop offer kind.
export const SHOT_ICONS = ["single", "double", "treble", "bank", "combo", "kiss", "long", "clearance"];
export const OFFER_ICONS = ["polish", "hotPocket", "mult", "extraShot", "newBall", "chalk"];

const cache = new Map();

// Renders an icon to a PNG data URL (browser only), on a small felt tile with a dark border so black pockets and
// outlines stay visible on dark panels. 14×14: the 12×12 picture plus a 1-pixel frame. Scale it up with CSS
// `image-rendering: pixelated`.
export function iconURL(name) {
  if (cache.has(name)) return cache.get(name);
  const rows = ICONS[name];
  const c = document.createElement("canvas");
  c.width = c.height = 14;
  const g = c.getContext("2d");
  g.fillStyle = "#0b0a10";
  g.fillRect(1, 0, 12, 14);
  g.fillRect(0, 1, 14, 12);
  g.fillStyle = "#2a8d68";
  g.fillRect(1, 1, 12, 12);
  g.fillStyle = "#33a078";
  g.fillRect(1, 1, 12, 1); // lit top edge
  g.translate(1, 1);
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === ".") return;
      g.fillStyle = PALETTE[ch];
      g.fillRect(x, y, 1, 1);
    }),
  );
  const url = c.toDataURL();
  cache.set(name, url);
  return url;
}

export function iconImg(name, label = "") {
  const img = document.createElement("img");
  img.className = "icon";
  img.src = iconURL(name);
  img.alt = label;
  img.width = 36;
  img.height = 36;
  return img;
}

// ---------------------------------------------------------------- coins
// Modifiers are coins. Each kind has its own metal (rim and face colours) and its picture on the face, so coins
// are told apart at a glance, like Balatro's card faces. 20×20 pixels: a milled rim, a face, the 12×12 picture.
export const COIN_METALS = {
  1: { rim: "#b4562a", face: "#e2874c", dark: "#6e2f14", name: "copper" }, // Hot pocket
  2: { rim: "#a8232a", face: "#e2574c", dark: "#5e1016", name: "ruby" }, // Mult
  3: { rim: "#2d7a3e", face: "#5fd67e", dark: "#14401f", name: "jade" }, // Extra shot
  5: { rim: "#2f4fa8", face: "#7fa6ff", dark: "#162a63", name: "sapphire" }, // Chalk (special)
};

export function coinURL(kind) {
  const key = `coin${kind}`;
  if (cache.has(key)) return cache.get(key);
  const m = COIN_METALS[kind] ?? { rim: "#9a8a5a", face: "#d8c48a", dark: "#4a3f22" };
  const c = document.createElement("canvas");
  c.width = c.height = 20;
  const g = c.getContext("2d");
  const disc = (r, color) => {
    g.fillStyle = color;
    for (let y = 0; y < 20; y++)
      for (let x = 0; x < 20; x++) if (Math.hypot(x + 0.5 - 10, y + 0.5 - 10) <= r) g.fillRect(x, y, 1, 1);
  };
  disc(10, "#0b0a10"); // outline
  disc(9, m.rim);
  // milled edge: notches around the rim
  g.fillStyle = m.dark;
  for (let k = 0; k < 20; k++) {
    const a = (k / 20) * Math.PI * 2;
    g.fillRect(Math.floor(10 + Math.cos(a) * 8.6), Math.floor(10 + Math.sin(a) * 8.6), 1, 1);
  }
  disc(7.4, m.dark);
  disc(6.9, m.face);
  // shine on the upper left of the face
  g.fillStyle = "rgba(255,255,255,0.45)";
  g.fillRect(6, 5, 3, 1);
  g.fillRect(5, 6, 1, 2);
  // the picture, centred (12×12 into the middle; its transparent pixels show the face)
  const name = OFFER_ICONS[kind];
  const rows = ICONS[name];
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === "." || ch === "F" || ch === "f") return; // skip felt backgrounds so the metal shows
      g.fillStyle = PALETTE[ch];
      g.fillRect(x + 4, y + 4, 1, 1);
    }),
  );
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

export function coinImg(kind, label = "") {
  const img = document.createElement("img");
  img.className = "icon coin";
  img.src = coinURL(kind);
  img.alt = label;
  return img;
}
