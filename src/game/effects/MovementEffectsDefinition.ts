/** Prototype tuning: metres, seconds, m/s, Newtons. Total budget, not per wheel. */
export const MOVEMENT_DUST = Object.freeze({
  capacity: 320, maxBirthsPerSecond: 120,
  startSpeed: 0.25, stopSpeed: 0.15,
  startLoadRatio: 0.05, stopLoadRatio: 0.03,
  fullSpeed: 8, minLife: 0.8, maxLife: 1.8,
});
