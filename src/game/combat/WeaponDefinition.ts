/** Prototype weapon tuning, SI units (m, s, kg, rad). Not a real tank specification. */
export interface AmmoDefinition {
  id: string;
  label: string;
  caliberMm: number;
  muzzleVelocity: number;
  projectileMass: number;
  penetrationAtMuzzleMm: number;
  penetrationAt1000mMm: number;
  ricochetAngle: number;
}

export interface WeaponDefinition {
  reloadSeconds: number;
  recoilDistance: number;
  recoilKickSeconds: number;
  recoilReturnSeconds: number;
  ammo: Readonly<{ id: string; label: string; muzzleVelocity: number; projectileMass: number }>;
}

export const IRON_DUST_01_AMMO: Readonly<AmmoDefinition> = Object.freeze({
  id: 'ap-120',
  label: '120 mm AP',
  caliberMm: 120,
  muzzleVelocity: 900,
  projectileMass: 7.1,
  penetrationAtMuzzleMm: 220,
  penetrationAt1000mMm: 140,
  ricochetAngle: 70 * Math.PI / 180,
});

export const IRON_DUST_01_WEAPON: Readonly<WeaponDefinition> = Object.freeze({
  reloadSeconds: 5,
  recoilDistance: 0.42,
  recoilKickSeconds: 0.065,
  recoilReturnSeconds: 0.72,
  ammo: Object.freeze({ id: 'training', label: 'DENEME', muzzleVelocity: 180, projectileMass: 7.1 }),
});

/** Deliberately readable training ballistics, not real ammunition performance. */
export const TRAINING_BALLISTICS = Object.freeze({ gravity: -9.81, maxRange: 900, maxAge: 8,
  trailSeconds: 0.025, trailLength: 4.5, diameter: 0.09 });

export const SHOT_FEEDBACK = Object.freeze({ hullImpulse: 16000 }); // N·s
