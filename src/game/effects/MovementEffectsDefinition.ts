/** Prototype tuning: metres, seconds, m/s, Newtons. Total budget, not per wheel. */
export const MOVEMENT_DUST = Object.freeze({
  capacity: 320, maxBirthsPerSecond: 120,
  startSpeed: 0.25, stopSpeed: 0.15,
  startLoadRatio: 0.05, stopLoadRatio: 0.03,
  fullSpeed: 8, minLife: 0.8, maxLife: 1.8,
  brakeMinSpeed: 1, brakeDeceleration: 1.5, brakeFullDeceleration: 6, brakeFilterTime: 0.08, brakeCooldown: 0.4,
  puffDuration: 0.22, landingAirTime: 0.1, landingMinSpeed: 1, landingCooldown: 0.3,
  debrisCapacity: 24, debrisBirthsPerSecond: 18, debrisMinSpeed: 2,
  debrisMinLife: 0.25, debrisMaxLife: 0.7,
});
