import { Vector3, type Scene, type PhysicsBody } from '@babylonjs/core';
import { LRF, rangeSample, type RangeSample } from './gunnerSightModel.ts';

/** Read-only physics query, consumed on a fixed step; no ballistic correction. */
export class LaserRangefinder {
  sample: RangeSample | undefined;
  measure(scene: Scene, body: PhysicsBody, origin: Vector3, direction: Vector3, now: number) {
    const hit = scene.getPhysicsEngine()!.raycast(origin, origin.add(direction.normalizeToNew().scale(LRF.maxRange)), { ignoreBody: body });
    this.sample = rangeSample(hit.hasHit ? Vector3.Distance(origin, hit.hitPointWorld) : null, now);
  }
  reset() { this.sample = undefined; }
}
