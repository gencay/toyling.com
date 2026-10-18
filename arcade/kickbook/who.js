// "Who am I?" (Ben kimim?): clues about a player the child has unlocked appear one at a time; the child picks the
// player from 3 pictures. Guessing early earns more. Every clue comes from the player's card data, so the game only
// repeats what the child has read, and reading each clue is the game.
import { COUNTRIES, POSITIONS, TEAMS, PLAYERS } from './content.js';

const byId = new Map(PLAYERS.map((p) => [p.id, p]));
function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Clues from vague to clear, in both languages. */
export function clues(p) {
  const club = p.teams.find((t) => !TEAMS[t].national);
  const pos = POSITIONS[p.position];
  const list = [
    { en: `I am a ${pos.en.toLowerCase()}.`, tr: `Ben bir ${pos.tr.toLocaleLowerCase('tr')} oyuncusuyum.` },
    { en: `I wear the number ${p.number}.`, tr: `Formamda ${p.number} numara var.` },
    club ? { en: `I played for ${TEAMS[club].name.en}.`, tr: `${TEAMS[club].name.tr} takımında oynadım.` } : null,
    { en: `I play for ${COUNTRIES[p.country].en}.`, tr: `${COUNTRIES[p.country].tr} için oynuyorum.` },
  ].filter(Boolean);
  return list;
}

/** A "Who am I?" question from the child's unlocked players (at least 3). */
export function makeWhoQuestion(unlocked, rand) {
  const pool = unlocked.filter((id) => byId.has(id));
  const id = pool[Math.floor(rand() * pool.length)];
  const others = shuffle(pool.filter((x) => x !== id), rand);
  // Prefer look-alikes: other players from the same country or with the same number, so the clues matter.
  const p = byId.get(id);
  others.sort((a, b) => score(byId.get(b), p) - score(byId.get(a), p));
  return { mode: 'who', player: id, clues: clues(p), answer: id, options: shuffle([id, ...others.slice(0, 2)], rand) };
}
const score = (o, p) => (o.country === p.country ? 2 : 0) + (o.number === p.number ? 1 : 0);
