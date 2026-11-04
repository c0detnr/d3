/** Prototype tuning: metres, seconds, m/s, Newtons. Total budget, not per wheel. */
export const MOVEMENT_DUST = Object.freeze({
  capacity: 320, maxBirthsPerSecond: 120,
  startSpeed: 0.25, stopSpeed: 0.15,
  startLoadRatio: 0.05, stopLoadRatio: 0.03,
  fullSpeed: 8, minLife: 0.9, maxLife: 2.6,
});
/** Mud clods thrown by the tracks: ballistic, visual only. */
export const MOVEMENT_MUD = Object.freeze({
  capacity: 160, maxBirthsPerSecond: 90,
  /** Track speed (m/s) where clods start; full rate at MOVEMENT_DUST.fullSpeed. */
  startSpeed: 1.5, minSurface: 0.5,
  minLife: 0.45, maxLife: 0.9, gravity: 9.81,
});
