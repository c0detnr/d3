/** All distances in metres; y is the antenna height above the terrain. */
export const JAMMER_EFFECT = { outerRadius: 120, innerRadius: 35, disconnectSeconds: .5 } as const;
export interface JammerPosition { x: number; y: number; z: number }
export const KUL_JAMMERS: readonly JammerPosition[] = [
  { x: -100, y: 15, z: -140 }, { x: 125, y: 15, z: 30 }, { x: -115, y: 15, z: 155 },
];
/** World-space antenna positions; overlapping fields use the worst link. */
export function signalQuality(dronePos: JammerPosition, jammers: readonly JammerPosition[]): number {
  let quality = 1;
  for (const jammer of jammers) {
    const distance = Math.hypot(dronePos.x - jammer.x, dronePos.y - jammer.y, dronePos.z - jammer.z);
    quality = Math.min(quality, Math.max(0, Math.min(1,
      (distance - JAMMER_EFFECT.innerRadius) / (JAMMER_EFFECT.outerRadius - JAMMER_EFFECT.innerRadius))));
  }
  return quality;
}
