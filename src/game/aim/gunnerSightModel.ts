/** Optical magnification relative to the existing 0.8 rad day camera. */
export function sightMagnification(fov: number, referenceFov = 0.8): number {
  if (!Number.isFinite(fov) || fov <= 0 || fov >= Math.PI) return 1;
  return Math.tan(referenceFov / 2) / Math.tan(fov / 2);
}
export type SightMode = 'DAY' | 'WHT' | 'BHT';
export function nextSightMode(mode: SightMode): SightMode {
  return mode === 'DAY' ? 'WHT' : mode === 'WHT' ? 'BHT' : 'DAY';
}
export const LRF = Object.freeze({ maxRange: 5000, holdSeconds: 4 });
export interface RangeSample { meters: number | null; expiresAt: number }
export function rangeSample(distance: number | null, now: number): RangeSample {
  return { meters: distance !== null && Number.isFinite(distance) && distance >= 0 && distance <= LRF.maxRange
    ? Math.round(distance) : null, expiresAt: now + LRF.holdSeconds };
}
export function rangeVisible(sample: RangeSample | undefined, now: number): boolean {
  return !!sample && now < sample.expiresAt;
}
export function sightAzimuth(x: number, z: number): string {
  return String((Math.round(Math.atan2(x, z) * 180 / Math.PI) % 360 + 360) % 360).padStart(3, '0');
}
