import { Vector3 } from '@babylonjs/core';
import type { AmmoDefinition } from './WeaponDefinition.ts';

export type ArmorResultKind = 'penetrated' | 'ricochet' | 'no-penetration';

export interface ArmorResult {
  kind: ArmorResultKind;
  effectiveMm: number;
  penetrationMm: number;
  incidenceDegrees: number;
  marginMm: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Line-of-sight thickness grows as the plate turns away from the incoming shell. */
export function effectiveArmorMm(thicknessMm: number, incidenceRadians: number) {
  return thicknessMm / Math.max(0.05, Math.cos(incidenceRadians));
}

export function penetrationAtRangeMm(ammo: Readonly<AmmoDefinition>, rangeMeters: number) {
  const range = Math.max(0, rangeMeters);
  const linear = ammo.penetrationAtMuzzleMm
    + (ammo.penetrationAt1000mMm - ammo.penetrationAtMuzzleMm) * (range / 1000);
  return Math.max(ammo.penetrationAt1000mMm * 0.55, linear);
}

export function resolveArmor(ammo: Readonly<AmmoDefinition>, thicknessMm: number,
  normalWorld: Vector3, directionWorld: Vector3, rangeMeters: number): ArmorResult {
  const normal = normalWorld.normalizeToNew();
  const direction = directionWorld.normalizeToNew();
  const incidence = Math.acos(clamp(Math.abs(Vector3.Dot(normal, direction)), -1, 1));
  const effective = effectiveArmorMm(thicknessMm, incidence);
  const penetration = penetrationAtRangeMm(ammo, rangeMeters);
  const margin = penetration - effective;
  return {
    kind: incidence > ammo.ricochetAngle ? 'ricochet' : margin > 0 ? 'penetrated' : 'no-penetration',
    effectiveMm: effective,
    penetrationMm: penetration,
    incidenceDegrees: incidence * 180 / Math.PI,
    marginMm: margin,
  };
}
