export interface EngineTuning {
  lowIdleHz: number;
  lowMaxHz: number;
  filterIdleHz: number;
  filterMaxHz: number;
  idleGain: number;
  loadGain: number;
  harmonicGain: number;
  noiseGain: number;
}

export interface TrackTuning {
  linkPitch: number;
  maxRate: number;
  bedGain: number;
  filterHz: number;
  filterQ: number;
  pan: number;
  smoothing: number;
}

export interface WindTuning {
  baseGain: number;
  speedGain: number;
  cutoffHz: number;
  gustHz: number;
}

export interface AudioDefinition {
  masterGain: number;
  smoothing: number;
  limiter: { thresholdDb: number; kneeDb: number; ratio: number; attack: number; release: number };
  engine: EngineTuning;
  tracks: TrackTuning;
  wind: WindTuning;
}

export const IRON_DUST_AUDIO: Readonly<AudioDefinition> = Object.freeze({
  masterGain: 0.7,
  smoothing: 0.06,
  limiter: { thresholdDb: -6, kneeDb: 4, ratio: 12, attack: 0.004, release: 0.2 },
  engine: {
    lowIdleHz: 34, lowMaxHz: 92,
    filterIdleHz: 150, filterMaxHz: 520,
    idleGain: 0.1, loadGain: 0.16, harmonicGain: 0.035, noiseGain: 0.05,
  },
  tracks: {
    linkPitch: 0.24, maxRate: 16,
    bedGain: 0.075,
    filterHz: 420, filterQ: 0.55, pan: 0.32, smoothing: 0.16,
  },
  wind: { baseGain: 0.035, speedGain: 0.07, cutoffHz: 420, gustHz: 0.09 },
});

/** Selectable tank model; its cannon voice comes from the central profile below. */
export type TankAudioId = '01' | '02';

/** Procedural 120 mm report layers. Hz, seconds, decay rates in 1/s, normalised gains. */
export interface CannonAudioProfile {
  seconds: number;
  /** Broadband muzzle crack: very short high-passed noise. */
  crack: { gain: number; decay: number; highpassHz: number };
  /** Felt pressure thump: falling sine with saturation harmonics for small speakers. */
  thump: { gain: number; startHz: number; endHz: number; sweep: number; decay: number };
  /** Noise-based blast body. */
  body: { gain: number; cutoffHz: number; decay: number };
  /** Low rolling rumble and terrain reflections. */
  rumble: { gain: number; cutoffHz: number; attack: number; decay: number; echoes: readonly number[] };
  /** Breech/recoil mechanism after the blast. */
  mechanical: { gain: number; delay: number; partialsHz: readonly number[]; decay: number };
  /** Playback level before distance attenuation. */
  level: number;
}

export const CANNON_AUDIO: Readonly<Record<TankAudioId, Readonly<CannonAudioProfile>>> = Object.freeze({
  // Olive '01': sharper and slightly brighter, shorter tail.
  '01': Object.freeze({
    seconds: 1.7,
    crack: { gain: 1.2, decay: 230, highpassHz: 2600 },
    thump: { gain: 1.0, startHz: 92, endHz: 50, sweep: 0.05, decay: 13 },
    body: { gain: 1.25, cutoffHz: 950, decay: 20 },
    rumble: { gain: 1.0, cutoffHz: 260, attack: 0.03, decay: 3.4, echoes: [0.13, 0.29, 0.5] },
    mechanical: { gain: 0.07, delay: 0.14, partialsHz: [1380, 2150, 3020], decay: 38 },
    level: 0.95,
  }),
  // Sand heavy '02': deeper, heavier and longer rolling tail.
  '02': Object.freeze({
    seconds: 2.3,
    crack: { gain: 0.85, decay: 180, highpassHz: 1900 },
    thump: { gain: 1.15, startHz: 76, endHz: 39, sweep: 0.07, decay: 8.5 },
    body: { gain: 1.3, cutoffHz: 560, decay: 13 },
    rumble: { gain: 1.25, cutoffHz: 185, attack: 0.045, decay: 2.2, echoes: [0.17, 0.38, 0.66, 0.98] },
    mechanical: { gain: 0.08, delay: 0.19, partialsHz: [880, 1460, 2240], decay: 30 },
    level: 1.0,
  }),
});

/** Distance cues for cannon and impact one-shots. Metres, m/s, seconds, Hz. */
export const COMBAT_AUDIO_DISTANCE = Object.freeze({
  speedOfSound: 343,
  /** Keeps very distant reports from arriving long after the visual event. */
  maxDelay: 0.6,
  /** Full band inside this range (own shot, nearby tanks). */
  fullBandMeters: 20,
  lowpassNearHz: 18000,
  lowpassFarHz: 700,
  lowpassFalloffMeters: 120,
  gainFalloffMeters: 60,
  /** Concurrent cannon reports; the oldest fades out when exceeded. */
  maxShots: 4,
});

/** Lowpass cutoff and arrival delay for a one-shot heard at `distance` metres. */
export function combatDistanceCue(distance: number) {
  const d = Math.max(0, Number.isFinite(distance) ? distance : 0), cue = COMBAT_AUDIO_DISTANCE;
  const far = Math.max(0, d - cue.fullBandMeters);
  const cutoff = cue.lowpassFarHz + (cue.lowpassNearHz - cue.lowpassFarHz) * Math.exp(-far / cue.lowpassFalloffMeters);
  return { cutoff, delay: Math.min(cue.maxDelay, d / cue.speedOfSound), attenuation: 1 / (1 + d / cue.gainFalloffMeters) };
}
