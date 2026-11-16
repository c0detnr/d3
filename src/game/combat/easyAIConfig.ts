import { IRON_DUST_01_WEAPON } from './WeaponDefinition.ts';
export type AIDifficulty = 'easy' | 'normal' | 'hard';
/** Multipliers, dimensionless. No level grants sight through geometry or smoke. */
export const AI_DIFFICULTY = {
  easy: { reaction: 1.55, dispersion: 1.55, aggression: .75 },
  normal: { reaction: 1, dispersion: 1, aggression: 1 },
  hard: { reaction: .65, dispersion: .65, aggression: 1.2 },
} as const;
export const AI_TACTICS = {
  perceptionSeconds: .2, radioDelaySeconds: .65, memorySeconds: 7, lowHealth: 30,
  coverSearchSeconds: .8, maxCoverSeconds: 11, settledSeconds: 2.4,
  aimSampleSeconds: .4, ownSpeedSpread: .09, maxSpreadMetres: 7,
} as const;
export interface EasyAIConfig {
  /** Metres. */
  engagement: { min: number; max: number; desired: number };
  spacing: { separationDistance: number; repulsionStrength: number };
  /** Seconds, m/s and dimensionless throttle. */
  stuck: { detectTime: number; speedThreshold: number; reverseTime: number; turnTime: number; reverseThrottle: number };
  movement: { cautiousSpeed: number };
  damageReaction: { duration: number; reverseThrottle: number; turnAngle: number };
  fairness: { reactionDelay: number; ambushGracePeriod: number; reloadTime: number;
    /** Dispersion in m, m/m distance and m/(m/s) target speed. */
    aimDispersion: { base: number; distanceFactor: number; speedFactor: number } };
}
export const EASY_AI_CONFIG: EasyAIConfig = {
  engagement: { min: 28, max: 95, desired: 65 },
  spacing: { separationDistance: 14, repulsionStrength: 1.2 },
  stuck: { detectTime: 2.5, speedThreshold: .25, reverseTime: 1.4, turnTime: .9, reverseThrottle: -.4 },
  movement: { cautiousSpeed: 4.5 },
  damageReaction: { duration: 3, reverseThrottle: -.35, turnAngle: .3 },
  fairness: { reactionDelay: .85, ambushGracePeriod: 2, reloadTime: IRON_DUST_01_WEAPON.reloadSeconds,
    aimDispersion: { base: .35, distanceFactor: .012, speedFactor: .1 } },
};
