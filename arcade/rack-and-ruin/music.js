// Musical collisions: every ball-on-ball contact plays the next note of a classical melody, harmonised a diatonic
// third below so any run of hits sounds consonant. Pure logic only (no audio) so it can be tested.

const C_MAJOR = [0, 2, 4, 5, 7, 9, 11]; // pitch classes of the C major scale

// Melodies as MIDI note numbers (60 = middle C). Public-domain classics.
export const SONGS = {
  // Beethoven, Symphony No. 9, "Ode to Joy" theme
  odeToJoy: [
    64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62,
    64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 62, 60, 60,
    62, 62, 64, 60, 62, 64, 65, 64, 60, 62, 64, 65, 64, 62, 60, 62, 55,
    64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 62, 60, 60,
  ],
  // Bach (attr.), Minuet in G, transposed to C
  minuet: [
    67, 60, 62, 64, 65, 67, 60, 60, 69, 65, 67, 69, 71, 72, 60, 60,
    65, 67, 65, 64, 62, 64, 65, 64, 62, 60, 62, 64, 62, 60, 59, 60,
  ],
};

// The note a diatonic third below in C major (C->A, D->B, E->C, F->D, G->E, A->F, B->G).
export function thirdBelow(midi) {
  const pc = ((midi % 12) + 12) % 12;
  const deg = C_MAJOR.indexOf(pc);
  if (deg < 0) return midi - 3; // not in the scale: fall back to a minor third
  const below = C_MAJOR[(deg + 5) % 7]; // two scale steps down
  let interval = (pc - below + 12) % 12;
  return midi - interval;
}

export function midiToHz(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

// Steps through a melody, one note per call, wrapping at the end.
export function createMelody(name = "odeToJoy") {
  const notes = SONGS[name] ?? SONGS.odeToJoy;
  let i = 0;
  return {
    next() {
      const melody = notes[i % notes.length];
      i++;
      return { melody, harmony: thirdBelow(melody) };
    },
    reset() {
      i = 0;
    },
    get position() {
      return i % notes.length;
    },
    length: notes.length,
  };
}
