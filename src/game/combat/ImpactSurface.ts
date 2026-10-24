import type { PhysicsBody } from '@babylonjs/core';
export type ImpactSurface = 'soil' | 'concrete' | 'metal';
export function impactSurface(body?: PhysicsBody): ImpactSurface {
  const surface = body?.transformNode.metadata?.surface;
  return surface === 'metal' || surface === 'concrete' ? surface : 'soil';
}
export const IMPACT_FEEDBACK = Object.freeze({
  soil: { sparks: 0, fragments: 7, color: [0.43, 0.31, 0.19], frequency: 180, duration: 0.38 },
  concrete: { sparks: 2, fragments: 8, color: [0.65, 0.65, 0.6], frequency: 600, duration: 0.26 },
  metal: { sparks: 9, fragments: 2, color: [0.55, 0.53, 0.48], frequency: 1700, duration: 0.2 },
});
