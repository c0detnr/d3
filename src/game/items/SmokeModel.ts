import { Vector3 } from '@babylonjs/core';
import type { TranslationKey } from '../i18n/tr.ts';

/** Gameplay units: metres and seconds. These are initial tuning values. */
export const SMOKE = {
  capacity: 3, initialCharges: 2, cooldown: 12, flight: .8, growth: 1, hold: 14, fade: 5,
  salvo: 5, distance: 12, spread: 6, arcHeight: 2.4, cloudHeight: 2.1,
  windX: .14, windZ: .055, particlesPerCloud: 24, maxClouds: 10,
  sightTransmission: .2, insideOpacity: .68,
  radius: 6, verticalScale: .7, density: .65, pickupRange: 8,
} as const;
export const smokeLifetime = SMOKE.flight + SMOKE.growth + SMOKE.hold + SMOKE.fade;

export interface SmokeCloud { center: Vector3; age: number }

// Growth and dissipation are independent: an old cloud thins rather than implodes.
export function smokeRadius(age: number) {
  const elapsed = Math.max(0, age - SMOKE.flight);
  const bloom = 1 - (1 - Math.min(1, elapsed / SMOKE.growth)) ** 3;
  return SMOKE.radius * (.15 + .75 * bloom + .1 * Math.min(1, elapsed / (SMOKE.growth + SMOKE.hold + SMOKE.fade)));
}
export function smokeCenter(cloud: SmokeCloud) {
  const elapsed = Math.max(0, cloud.age - SMOKE.flight);
  return cloud.center.add(new Vector3(SMOKE.windX * elapsed, 0, SMOKE.windZ * elapsed));
}

export function smokeStrength(age: number) {
  if (age < SMOKE.flight || age >= smokeLifetime) return 0;
  const elapsed = age - SMOKE.flight;
  return Math.min(1, elapsed / SMOKE.growth, (smokeLifetime - age) / SMOKE.fade);
}

/**
 * Soft cloud: density falls as 1.5 * (1 - r²/R²), so edges thin out while a
 * ray through the centre keeps the old uniform optical depth. Integrates that
 * profile along the ray (|q(s)|² = a s² + 2 b s + c in scaled space).
 */
export function smokeProfileIntegral(start: number, end: number, a: number, b: number, c: number, radius: number) {
  const r2 = radius * radius;
  const value = (end - start) * (1 - c / r2) - b * (end * end - start * start) / r2
    - a * (end ** 3 - start ** 3) / (3 * r2);
  return Math.max(0, 1.5 * value);
}

/** Same ellipsoid and optical density as the rendering shader, including camera/target inside smoke. */
export function smokeOpticalDepth(from: Vector3, to: Vector3, clouds: readonly SmokeCloud[]) {
  const delta = to.subtract(from), distance = delta.length();
  if (distance < 1e-6) return 0;
  const direction = delta.scale(1 / distance);
  let density = 0;
  for (const cloud of clouds) {
    const strength = smokeStrength(cloud.age);
    if (strength <= 0) continue;
    const radius = smokeRadius(cloud.age);
    const offset = from.subtract(smokeCenter(cloud));
    offset.y /= SMOKE.verticalScale;
    const ray = direction.clone(); ray.y /= SMOKE.verticalScale;
    const a = Vector3.Dot(ray, ray), b = Vector3.Dot(offset, ray);
    const discriminant = b * b - a * (Vector3.Dot(offset, offset) - radius * radius);
    if (discriminant <= 0) continue;
    const root = Math.sqrt(discriminant);
    const start = Math.max(0, (-b - root) / a), end = Math.min(distance, (-b + root) / a);
    if (end <= start) continue;
    density += smokeProfileIntegral(start, end, a, b, Vector3.Dot(offset, offset), radius) * SMOKE.density * strength;
  }
  return density;
}

export class SmokeModel {
  count: number = SMOKE.initialCharges;
  cooldown = 0;
  readonly clouds: SmokeCloud[] = [];
  feedback: { key: TranslationKey; seconds?: number } | null = null;
  feedbackTime = 0;
  notify(key: TranslationKey, seconds?: number) { this.feedback = { key, seconds }; this.feedbackTime = 2; }

  collect() {
    if (this.count >= SMOKE.capacity) return false;
    this.count++; this.notify('smokeCollected'); return true;
  }

  fire(centers: readonly Vector3[]) {
    if (this.count <= 0) { this.notify('smokeEmpty'); return false; }
    if (this.cooldown > 1e-6) { this.notify('smokePreparing', Math.ceil(this.cooldown)); return false; }
    if (centers.length !== SMOKE.salvo) return false;
    this.count--; this.cooldown = SMOKE.cooldown; this.notify('smokeDeployed');
    this.clouds.push(...centers.map(center => ({ center: center.clone(), age: 0 })));
    return true;
  }

  fixedUpdate(dt: number) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.feedbackTime = Math.max(0, this.feedbackTime - dt);
    for (const cloud of this.clouds) cloud.age += dt;
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      if (this.clouds[i].age >= smokeLifetime) this.clouds.splice(i, 1);
    }
  }

  blocksSight(from: Vector3, to: Vector3) {
    return smokeOpticalDepth(from, to, this.clouds) >= -Math.log(SMOKE.sightTransmission);
  }

  reset() { this.count = SMOKE.initialCharges; this.cooldown = 0; this.clouds.length = 0; this.feedback = null; this.feedbackTime = 0; }
}
