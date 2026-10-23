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
  recoilStiffness: number;
  recoilDamping: number;
  ammo: Readonly<AmmoDefinition>;
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
  reloadSeconds: 6.5,
  recoilDistance: 0.42,
  recoilStiffness: 150,
  recoilDamping: 18,
  ammo: IRON_DUST_01_AMMO,
});
