import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

/**
 * Original procedural military march bed for the Leopard 2A6 reel (no samples, no external assets).
 * 120 BPM so every edit cut in docs/reels/leopard-2a6.md lands on a beat (beat = 0.5 s).
 * Usage: node --experimental-strip-types scripts/reel/music.ts [out.wav]
 */
const RATE = 48_000;
const LENGTH = 33;
const BEAT = 0.5;
const out = process.argv[2] ?? 'studio-out/music/leo2a6-march.wav';

const left = new Float32Array(RATE * LENGTH);
const right = new Float32Array(RATE * LENGTH);
let seed = 7;
const noise = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x3fffffff) - 1;
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** Adds a voice; fn gets seconds since onset and returns a sample. */
function voice(start: number, seconds: number, gain: number, pan: number, fn: (t: number) => number) {
  const from = Math.max(0, Math.round(start * RATE));
  const to = Math.min(left.length, Math.round((start + seconds) * RATE));
  const l = gain * Math.cos((pan + 1) * Math.PI / 4), r = gain * Math.sin((pan + 1) * Math.PI / 4);
  for (let i = from; i < to; i++) {
    const s = fn((i - from) / RATE);
    left[i] += s * l; right[i] += s * r;
  }
}

/** Band-limited saw-like tone; bright 0…1 opens the upper harmonics. */
function tone(f: number, t: number, bright: number, harmonics: number) {
  let s = 0;
  for (let k = 1; k <= harmonics && k * f < 16_000; k++) s += Math.sin(2 * Math.PI * k * f * t) / k * Math.exp(-k * (1 - bright) * 0.6);
  return s;
}

function kick(at: number, gain = 1) {
  voice(at, 0.6, gain, 0, t => Math.sin(2 * Math.PI * (45 * t + 90 * (1 - Math.exp(-t * 30)) / 30)) * Math.exp(-t * 7) + noise() * Math.exp(-t * 200) * 0.3);
}
function taiko(at: number, gain = 1) {
  voice(at, 1.6, gain, 0, t => Math.sin(2 * Math.PI * (38 * t + 70 * (1 - Math.exp(-t * 12)) / 12)) * Math.exp(-t * 2.6) + noise() * Math.exp(-t * 30) * 0.25);
}
function snare(at: number, gain = 1, pan = 0.15) {
  let prev = 0;
  voice(at, 0.25, gain, pan, t => {
    const n = noise(), hp = n - prev; prev = n;
    return hp * 0.55 * Math.exp(-t * 22) + Math.sin(2 * Math.PI * 190 * t) * 0.5 * Math.exp(-t * 35);
  });
}
function cymbal(at: number, gain = 1) {
  let prev = 0;
  voice(at, 3, gain, -0.2, t => { const n = noise(), hp = n - prev; prev = n; return hp * Math.exp(-t * 1.6); });
}
function brass(at: number, seconds: number, notes: number[], gain = 1, pan = 0) {
  for (const [i, note] of notes.entries()) for (const detune of [-0.003, 0.003]) {
    const f = hz(note) * (1 + detune);
    voice(at, seconds + 0.25, gain / notes.length, pan + (i - 1) * 0.25 + detune * 60, t => {
      const attack = Math.min(1, t / 0.06), release = t > seconds ? Math.max(0, 1 - (t - seconds) / 0.25) : 1;
      const vib = 1 + 0.004 * Math.sin(2 * Math.PI * 5.5 * t) * Math.min(1, t / 0.4);
      return tone(f * vib, t, 0.35 + 0.45 * attack * Math.exp(-t * 1.5), 14) * attack * release;
    });
  }
}
function strings(at: number, seconds: number, notes: number[], gain = 1) {
  for (const note of notes) for (const detune of [-0.004, 0, 0.004]) {
    const f = hz(note) * (1 + detune);
    voice(at, seconds, gain / notes.length / 3, detune * 150, t =>
      tone(f, t, 0.25, 8) * Math.min(1, t / 1.2) * Math.min(1, (seconds - t) / 0.8));
  }
}

// D minor epic loop: Dm – Bb – C – A, one bar (2 s) each.
const chords = [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]];
const melody: [number, number, number][][] = [ // [beat, beats, midi]
  [[0, 1.5, 69], [1.5, 0.5, 69], [2, 2, 74]],
  [[0, 1, 70], [1, 1, 74], [2, 1, 72], [3, 1, 70]],
  [[0, 1.5, 72], [1.5, 0.5, 67], [2, 2, 72]],
  [[0, 1, 69], [1, 1, 73], [2, 2, 76]],
];
// Military snare bar in 16ths: 2 = accent, 1 = ghost.
const snareBar = [2, 0, 0, 1, 2, 0, 1, 0, 2, 0, 0, 1, 2, 1, 1, 1];

function bar(at: number, index: number, layers: { drums?: number; snare?: number; brass?: number; melody?: number; strings?: number }) {
  const chord = chords[index % 4];
  if (layers.strings) strings(at, 2.1, chord.map(n => n - 12), layers.strings);
  if (layers.drums) for (let b = 0; b < 4; b++) kick(at + b * BEAT, layers.drums * (b % 2 ? 0.6 : 1));
  if (layers.snare) snareBar.forEach((hit, i) => hit && snare(at + i * BEAT / 4, layers.snare! * (hit === 2 ? 0.8 : 0.3)));
  if (layers.brass) for (const [beat, beats] of [[0, 1.4], [1.5, 0.22], [1.75, 0.22], [2, 1.9]]) brass(at + beat * BEAT, beats * BEAT, chord.map(n => n + 12), layers.brass);
  if (layers.melody) for (const [beat, beats, note] of melody[index % 4]) brass(at + beat * BEAT, beats * BEAT * 0.95, [note], layers.melody, 0.1);
}
function roll(from: number, to: number, start: number, end: number) {
  for (let t = from; t < to; t += BEAT / 8) snare(t, start + (end - start) * (t - from) / (to - from), 0.1);
}

// 0–2.5 hook: low drone only, engine sound carries the shot.
strings(0, 2.6, [38, 45], 0.25);
// 2.5–5.5 file card: music enters with a snare roll into the gun.
strings(2.5, 3.2, [38, 45, 50], 0.35);
bar(2.5, 0, { snare: 0.5, drums: 0.5 });
roll(4.5, 5.5, 0.15, 0.8);
// 5.5 gun fires: big hit.
taiko(5.5, 1.3); cymbal(5.5, 0.35); brass(5.5, 0.9, [38, 50, 57, 62], 1.2);
// 6.0–16.0 full march (5 bars).
for (let i = 0; i < 5; i++) bar(6 + i * 2, i, { drums: 0.9, snare: 0.7, brass: 0.55, strings: 0.35 });
// 16.0–19.5 drop: drone and a quiet ticking snare.
strings(16, 3.6, [38, 45, 50], 0.4);
for (let t = 16; t < 19.5; t += BEAT) snare(t, 0.12, 0.4);
taiko(16, 0.8);
// 19.5–22.5 back up.
taiko(19.5, 1.1); cymbal(19.5, 0.25);
bar(19.5, 0, { drums: 0.9, snare: 0.6, brass: 0.5, strings: 0.35 });
bar(21.5, 1, { drums: 0.9, snare: 0.6, brass: 0.5, strings: 0.35 });
// 22.5–25.5 quiet moment, building roll into the peak.
strings(22.5, 3.1, [46, 53], 0.35);
roll(23.5, 25.5, 0.05, 0.9);
// 25.5–29.5 peak: melody over the full march.
taiko(25.5, 1.3); cymbal(25.5, 0.4);
bar(25.5, 0, { drums: 1, snare: 0.75, brass: 0.45, melody: 0.6, strings: 0.4 });
bar(27.5, 1, { drums: 1, snare: 0.75, brass: 0.45, melody: 0.6, strings: 0.4 });
// 29.5–33 close: one more bar, then a single final hit.
bar(29.5, 2, { drums: 0.8, snare: 0.6, brass: 0.45, melody: 0.5, strings: 0.35 });
roll(31.5, 32, 0.3, 0.9);
taiko(32, 1.4); cymbal(32, 0.35); brass(32, 0.8, [38, 50, 57, 62], 1.2);

// Normalise and fade the last 0.3 s, then write 16-bit PCM WAV.
let peak = 0;
for (let i = 0; i < left.length; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
const pcm = Buffer.alloc(44 + left.length * 4);
pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + left.length * 4, 4); pcm.write('WAVEfmt ', 8);
pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(2, 22); pcm.writeUInt32LE(RATE, 24);
pcm.writeUInt32LE(RATE * 4, 28); pcm.writeUInt16LE(4, 32); pcm.writeUInt16LE(16, 34); pcm.write('data', 36); pcm.writeUInt32LE(left.length * 4, 40);
for (let i = 0; i < left.length; i++) {
  const fade = Math.min(1, (left.length - i) / (RATE * 0.3)) * 0.89 / peak;
  pcm.writeInt16LE(Math.round(left[i] * fade * 32767), 44 + i * 4);
  pcm.writeInt16LE(Math.round(right[i] * fade * 32767), 46 + i * 4);
}
const dir = out.slice(0, out.lastIndexOf('/'));
if (dir) mkdirSync(dir, { recursive: true });
const raw = out.replace(/\.wav$/, '.raw.wav');
writeFileSync(raw, pcm);
// Small room reverb and loudness for a music bed under SFX (-16 LUFS).
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-af',
  'aecho=0.8:0.55:37|61|89:0.22|0.16|0.11,loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', String(RATE), '-t', String(LENGTH), out]);
console.log(out);
