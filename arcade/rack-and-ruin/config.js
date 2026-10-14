// Tuning that we expect to change while building the game. Edit here; the game applies it at startup.

// Pocket shape, in inches against a real 2.25 in pool ball. All six pockets are the same size: one mouth width and
// one hole for every pocket. The core derives the jaws so each cushion ends exactly on its hole.
//   mouth: width between the two jaw noses (BCA corner pocket: 4 7/8–5 1/8). Wider = easier.
//   hole:  radius of the hole behind the mouth. Larger = easier (and takes more rail).
//   cornerShelf / sideShelf: how far a ball must roll past the mouth before it drops (BCA: corner 1 5/8–1 7/8,
//          side 0–3/8). Longer = harder.
export const POCKETS = { mouth: 5.0, hole: 1.9, cornerShelf: 1.75, sideShelf: 0 };

export function applyPockets(core, p = POCKETS) {
  core.configurePockets(p.mouth, p.hole, p.cornerShelf, p.sideShelf);
}

// Musical collisions: each ball-on-ball contact (and each tick of the score count-up) plays the next note of the
// cue's song (see SONGS in web/music.js), harmonised a third below. Set enabled: false for clicks only.
export const MUSIC = { enabled: true };

// Cues: each cue has its own song, and an effect that will be configurable once cues can be bought or unlocked
// ("default" uses the cue's built-in effect). Only the House cue exists so far.
export const CUES = [{ id: "house", name: "House cue", song: "odeToJoy", effect: "default" }];
export const START_CUE = "house";

export function cueById(id) {
  return CUES.find((c) => c.id === id) ?? CUES[0];
}

// The carpet under the table (customizable). Each is drawn as a small pixel-art tile and repeated.
//   base: main colour; pile: fibre colours from dark to light; tuft: how long the fibre strands are (pixels);
//   density: fibres per pixel.
//   size: tile size in pixels (default 64); streaks: optional long, thick coloured lines laid across the pile, like the
//   loud carpets in a real billiard saloon ({ colors, count, width: [min, max] px, length: [min, max] share of the tile }).
export const CARPETS = {
  saloon: {
    name: "Billiard saloon", base: "#5d5f66", pile: ["#4a4c52", "#55575e", "#686a72", "#74767e"], tuft: 2, density: 0.5, size: 192,
    streaks: { colors: ["#1fb5a8", "#e0457b", "#f2c230", "#4f7de0", "#ef7d31"], count: 6, width: [3, 5], length: [0.55, 0.95] },
  },
  highPile: { name: "High pile shag", base: "#5a1c2c", pile: ["#3a0f1a", "#4a1524", "#6e2537", "#86304a"], tuft: 3, density: 0.55 },
  berber: { name: "Berber loop", base: "#b39a72", pile: ["#8f7a58", "#a28b66", "#c7b089", "#d6c29c"], tuft: 1, density: 0.7 },
  pubGreen: { name: "Pub green", base: "#1d3b2b", pile: ["#13281d", "#183325", "#25483a", "#2f5847"], tuft: 2, density: 0.45 },
};
export const CARPET = "saloon";
