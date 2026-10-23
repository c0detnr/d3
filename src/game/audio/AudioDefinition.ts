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
  thumpGain: number;
  filterHz: number;
  filterQ: number;
  pan: number;
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
    linkPitch: 0.24, maxRate: 22,
    bedGain: 0.16, thumpGain: 0.11,
    filterHz: 640, filterQ: 0.9, pan: 0.42,
  },
  wind: { baseGain: 0.035, speedGain: 0.07, cutoffHz: 420, gustHz: 0.09 },
});
