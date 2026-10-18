// Read-aloud with the most natural voice the device has. Browsers list many voices; the first one is often a robotic
// "compact" voice. This ranks them (Premium, Enhanced, Natural and neural voices first; novelty and eSpeak voices last),
// reads sentence by sentence with short pauses, and lets a grown-up pick and try a voice.
// Better voices can be added for free on the device: iPhone and iPad: Settings > Accessibility > Spoken Content >
// Voices (English: Ava or Zoe Premium; Turkish: Yelda Enhanced); Mac: System Settings > Accessibility > Spoken Content.

const GOOD = [/premium/i, /enhanced/i, /natural/i, /neural/i, /\bsiri\b/i, /google/i, /online/i];
const KNOWN = { en: /\b(ava|zoe|samantha|allison|evan|nathan|joelle|noelle|aria|jenny|guy)\b/i, tr: /\b(yelda|emel|ahmet|cem|filiz)\b/i };
const BAD = /compact|espeak|robot|whisper|bells|bubbles|cellos|zarvox|trinoids|boing|bahh|jester|organ|superstar|wobble|albert|bad news|good news|hysterical|deranged|pipe|fred|junior|ralph|kathy|grandma|grandpa|rocko|shelley|flo|eddy|reed|sandy/i;

/** A score for how natural a voice is for a language (higher is better; -Infinity = wrong language). */
export function rankVoice(voice, lang) {
  const vl = (voice.lang ?? '').toLowerCase().replace('_', '-');
  if (!vl.startsWith(lang)) return -Infinity;
  let score = 0;
  GOOD.forEach((re, i) => { if (re.test(voice.name)) score += 40 - i * 4; });
  if (KNOWN[lang]?.test(voice.name)) score += 20;
  if (BAD.test(voice.name)) score -= 100;
  if (lang === 'en' && vl === 'en-us') score += 6;
  if (lang === 'tr' && vl === 'tr-tr') score += 6;
  if (voice.localService) score += 3; // works offline
  return score;
}

/** Voices for a language, most natural first. */
export function voicesFor(voices, lang) {
  return voices.map((v) => ({ v, s: rankVoice(v, lang) })).filter((x) => x.s > -Infinity).sort((a, b) => b.s - a.s).map((x) => x.v);
}

/** The chosen voice: the grown-up's pick if the device still has it, else the most natural one. */
export function pickVoice(voices, lang, preferred) {
  const list = voicesFor(voices, lang);
  return list.find((v) => v.name === preferred) ?? list[0] ?? null;
}

/** Text split into sentences, so each is read with its own natural fall and a short pause after it. */
export function sentences(text) {
  return text.match(/[^.!?…]+[.!?…]+["”’)]*|[^.!?…]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
}

const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
export const canSpeak = !!synth;
let cache = [];
const load = () => { cache = synth?.getVoices() ?? []; return cache; };
if (synth) { load(); synth.addEventListener?.('voiceschanged', load); }
export const deviceVoices = () => (cache.length ? cache : load());

const BCP = { en: 'en-US', tr: 'tr-TR' };

/**
 * Reads text aloud. `word` mode (one tapped word) is a little slower and clearer; sentence mode reads at a natural
 * pace with a pause between sentences.
 */
export function say(text, lang, { preferred, word = false } = {}) {
  if (!synth) return;
  try {
    synth.cancel();
    const voice = pickVoice(deviceVoices(), lang, preferred);
    const parts = word ? [text] : sentences(text);
    // Queued utterances: the engine ends each sentence naturally and pauses before the next.
    parts.forEach((part) => {
      const u = new SpeechSynthesisUtterance(part);
      u.lang = voice?.lang ?? BCP[lang];
      if (voice) u.voice = voice;
      u.rate = word ? 0.85 : 0.95;
      u.pitch = 1.05;
      synth.speak(u);
    });
  } catch {}
}
