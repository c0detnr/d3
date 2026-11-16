import { finishBuffer, lowNoise, noiseSource, pole } from './cannonBlast.ts';

/** Procedural impact one-shots generated once; Hz, seconds, decay rates in 1/s. No external recordings. */
export type ImpactSoundKind = 'soil' | 'concrete' | 'metal' | 'ricochet' | 'penetration' | 'destruction';
export const IMPACT_SOUND_KINDS: readonly ImpactSoundKind[] = ['soil', 'concrete', 'metal', 'ricochet', 'penetration', 'destruction'];

interface ImpactSpec {
  seconds: number;
  crack: { gain: number; decay: number; highpassHz: number };
  thump: { gain: number; startHz: number; endHz: number; sweep: number; decay: number };
  body: { gain: number; cutoffHz: number; decay: number };
  rumble: { gain: number; cutoffHz: number; decay: number };
  /** Inharmonic metal ring. */
  ring?: { gain: number; partialsHz: readonly number[]; decay: number };
  /** Falling debris / grit grains. */
  debris?: { count: number; start: number; end: number; highpassHz: number; gain: number };
  /** Deflected shell whizzing away. */
  whizz?: { gain: number; startHz: number; endHz: number; delay: number; seconds: number };
  /** Secondary crackles / cook-off pops. */
  crackles?: { count: number; start: number; end: number; gain: number };
}

export const IMPACT_SOUND_SPECS: Readonly<Record<ImpactSoundKind, ImpactSpec>> = Object.freeze({
  // Heavy dull thud, dirt thrown up and pattering back.
  soil: { seconds: 1.3, crack: { gain: 0.3, decay: 320, highpassHz: 1500 },
    thump: { gain: 1.0, startHz: 70, endHz: 38, sweep: 0.04, decay: 16 },
    body: { gain: 1.2, cutoffHz: 420, decay: 14 }, rumble: { gain: 0.7, cutoffHz: 200, decay: 4 },
    debris: { count: 26, start: 0.12, end: 0.95, highpassHz: 700, gain: 0.18 } },
  // Sharp crack, gritty mid body, crumbling masonry.
  concrete: { seconds: 1.3, crack: { gain: 0.85, decay: 210, highpassHz: 2200 },
    thump: { gain: 0.75, startHz: 85, endHz: 48, sweep: 0.03, decay: 20 },
    body: { gain: 1.0, cutoffHz: 1400, decay: 22 }, rumble: { gain: 0.55, cutoffHz: 260, decay: 4.5 },
    debris: { count: 34, start: 0.05, end: 0.9, highpassHz: 1800, gain: 0.22 } },
  // Shell striking a steel structure: crack plus a ringing clang.
  metal: { seconds: 1.4, crack: { gain: 0.8, decay: 260, highpassHz: 2600 },
    thump: { gain: 0.6, startHz: 90, endHz: 55, sweep: 0.03, decay: 22 },
    body: { gain: 0.6, cutoffHz: 1600, decay: 30 }, rumble: { gain: 0.35, cutoffHz: 260, decay: 5 },
    ring: { gain: 0.32, partialsHz: [410, 1035, 1790, 2710, 3620], decay: 4.5 } },
  // Non-penetrating armour hit: hard ping and a shell whizzing off.
  ricochet: { seconds: 1.1, crack: { gain: 0.9, decay: 380, highpassHz: 3000 },
    thump: { gain: 0.45, startHz: 110, endHz: 70, sweep: 0.02, decay: 30 },
    body: { gain: 0.35, cutoffHz: 2400, decay: 45 }, rumble: { gain: 0.15, cutoffHz: 300, decay: 7 },
    ring: { gain: 0.3, partialsHz: [1870, 2930, 4120, 5310], decay: 9 },
    whizz: { gain: 0.22, startHz: 3400, endHz: 900, delay: 0.02, seconds: 0.42 } },
  // Penetration: deep armour clang, heavy thump, internal crackle.
  penetration: { seconds: 1.6, crack: { gain: 0.85, decay: 240, highpassHz: 2000 },
    thump: { gain: 1.1, startHz: 80, endHz: 42, sweep: 0.05, decay: 11 },
    body: { gain: 1.0, cutoffHz: 900, decay: 16 }, rumble: { gain: 0.75, cutoffHz: 220, decay: 3.4 },
    ring: { gain: 0.3, partialsHz: [185, 430, 770, 1160, 1690], decay: 3.6 },
    crackles: { count: 7, start: 0.08, end: 0.6, gain: 0.25 } },
  // Tank destruction: long deep explosion with secondary cook-off pops.
  destruction: { seconds: 3.0, crack: { gain: 0.7, decay: 120, highpassHz: 1500 },
    thump: { gain: 1.2, startHz: 58, endHz: 28, sweep: 0.12, decay: 4.5 },
    body: { gain: 1.4, cutoffHz: 700, decay: 5 }, rumble: { gain: 1.3, cutoffHz: 170, decay: 1.5 },
    debris: { count: 30, start: 0.3, end: 2.2, highpassHz: 900, gain: 0.16 },
    crackles: { count: 14, start: 0.25, end: 2.1, gain: 0.35 } },
});

interface Grain { time: number; gain: number; decay: number }
function grains(random: () => number, count: number, start: number, end: number, gain: number, decay: number): Grain[] {
  return Array.from({ length: count }, () => {
    const u = (random() + 1) / 2;
    // Denser early, sparse late, like debris falling back.
    return { time: start + (end - start) * u * u, gain: gain * (0.35 + 0.65 * (random() + 1) / 2), decay: decay * (0.7 + 0.6 * (random() + 1) / 2) };
  });
}

export function createImpactSound(context: BaseAudioContext, kind: ImpactSoundKind, seed: number): AudioBuffer {
  const spec = IMPACT_SOUND_SPECS[kind], rate = context.sampleRate;
  const buffer = context.createBuffer(2, Math.ceil(rate * spec.seconds), rate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    const white = noiseSource(seed + channel * 7919);
    const scatter = noiseSource(seed * 3 + channel * 104729);
    const debris = spec.debris ? grains(scatter, spec.debris.count, spec.debris.start, spec.debris.end, spec.debris.gain, 90) : [];
    const crackles = spec.crackles ? grains(scatter, spec.crackles.count, spec.crackles.start, spec.crackles.end, spec.crackles.gain, 45) : [];
    const crackPole = pole(spec.crack.highpassHz, rate), debrisPole = pole(spec.debris?.highpassHz ?? 1000, rate);
    const bodyNoise = lowNoise(spec.body.cutoffHz, rate), rumbleNoise = lowNoise(spec.rumble.cutoffHz, rate);
    const crackleNoise = lowNoise(1200, rate);
    const detune = 1 + channel * 0.004;
    let crackLow = 0, debrisLow = 0, phase = 0, whizzPhase = 0;
    for (let i = 0; i < data.length; i++) {
      const t = i / rate, w = white();
      crackLow += (w - crackLow) * crackPole; debrisLow += (w - debrisLow) * debrisPole;
      const high = w - crackLow, grit = w - debrisLow;
      const { crack, thump, body, rumble } = spec;
      const frequency = thump.endHz + (thump.startHz - thump.endHz) * Math.exp(-t / thump.sweep);
      phase += 2 * Math.PI * frequency / rate;
      let sample = high * crack.gain * Math.exp(-t * crack.decay)
        + Math.sin(phase) * thump.gain * (1 - Math.exp(-t * 1800)) * Math.exp(-t * thump.decay)
        + bodyNoise(w) * 0.32 * body.gain * (1 - Math.exp(-t * 1500)) * Math.exp(-t * body.decay)
        + rumbleNoise(w) * 0.2 * rumble.gain * (1 - Math.exp(-t * 40)) * Math.exp(-t * rumble.decay);
      if (spec.ring) spec.ring.partialsHz.forEach((hz, index) => {
        sample += Math.sin(2 * Math.PI * hz * detune * t + index) * spec.ring!.gain / spec.ring!.partialsHz.length * 2
          * Math.exp(-t * spec.ring!.decay * (1 + index * 0.35));
      });
      for (const grain of debris) if (t > grain.time) {
        const local = t - grain.time; if (local < 0.08) sample += grit * grain.gain * Math.exp(-local * grain.decay);
      }
      if (crackles.length) {
        const pop = crackleNoise(w);
        for (const grain of crackles) if (t > grain.time) {
          const local = t - grain.time; if (local < 0.15) sample += pop * grain.gain * 0.4 * (1 - Math.exp(-local * 900)) * Math.exp(-local * grain.decay);
        }
      }
      if (spec.whizz && t > spec.whizz.delay && t < spec.whizz.delay + spec.whizz.seconds) {
        const u = (t - spec.whizz.delay) / spec.whizz.seconds;
        const hz = spec.whizz.startHz * (spec.whizz.endHz / spec.whizz.startHz) ** u;
        whizzPhase += 2 * Math.PI * hz * detune / rate;
        sample += (Math.sin(whizzPhase) * 0.7 + high * 0.3) * spec.whizz.gain * Math.sin(Math.PI * u) ** 2 * (1 - u * 0.6);
      }
      data[i] = Math.tanh(sample * 1.3) / 1.3;
    }
  }
  return finishBuffer(buffer, 0.2);
}
