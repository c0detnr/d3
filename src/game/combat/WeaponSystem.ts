import { Vector3 } from '@babylonjs/core';
import type { TurretController } from '../vehicle/TurretController.ts';
import { IRON_DUST_01_WEAPON, type WeaponDefinition } from './WeaponDefinition.ts';

export interface Shot {
  origin: Vector3;
  direction: Vector3;
}

/** Gun reload state and visual recoil; the hull remains the sole rigid body. */
export class WeaponSystem {
  readonly turret: TurretController;
  readonly definition: Readonly<WeaponDefinition>;
  reloadRemaining = 0;
  recoilOffset = 0;
  shotsFired = 0;
  private recoilTime = Infinity;
  private previousRecoil = 0;
  private readonly recoilParts: { node: TurretController['barrel']; rest: Vector3 }[];
  constructor(turret: TurretController, definition: Readonly<WeaponDefinition> = IRON_DUST_01_WEAPON) {
    this.turret = turret;
    this.definition = definition;
    this.recoilParts = turret.recoilParts.map(node => ({ node, rest: node.position.clone() }));
  }
  get ready() { return this.reloadRemaining <= 0; }
  get reloadFraction() {
    return this.definition.reloadSeconds > 0
      ? 1 - this.reloadRemaining / this.definition.reloadSeconds
      : 1;
  }
  /** Returns the shot pose before recoil is applied to the next render frame. */
  fire(): Shot | undefined {
    if (!this.ready) return undefined;
    this.reloadRemaining = this.definition.reloadSeconds;
    this.recoilTime = 0;
    this.previousRecoil = this.recoilOffset = 0;
    this.shotsFired++;
    const ray = this.turret.getMuzzleRay();
    return {
      origin: ray.origin.clone(),
      direction: ray.direction.clone(),
    };
  }
  fixedUpdate(dt: number) {
    if (this.reloadRemaining > 0) this.reloadRemaining = Math.max(0, this.reloadRemaining - dt < 1e-9 ? 0 : this.reloadRemaining - dt);
    this.previousRecoil = this.recoilOffset;
    this.recoilTime += dt;
    this.recoilOffset = this.offsetAt(this.recoilTime);
    this.applyRecoil();
  }
  /** Hydraulic-style stroke: rapid braking rearward, slow return to battery, no overshoot. */
  private offsetAt(seconds: number) {
    const { recoilDistance, recoilKickSeconds, recoilReturnSeconds } = this.definition;
    if (seconds <= recoilKickSeconds) {
      const t = Math.max(0, seconds / recoilKickSeconds);
      return recoilDistance * (1 - (1 - t) ** 3);
    }
    const t = Math.min(1, (seconds - recoilKickSeconds) / recoilReturnSeconds);
    return recoilDistance * (1 - t * t * (3 - 2 * t));
  }
  render(alpha: number) { this.applyRecoil(this.previousRecoil + (this.recoilOffset - this.previousRecoil) * alpha); }
  private applyRecoil(offset = this.recoilOffset) {
    for (const { node, rest } of this.recoilParts) {
      node.position.copyFrom(rest);
      node.position.z -= offset;
      node.computeWorldMatrix(true);
    }
  }
  reset() {
    this.reloadRemaining = 0;
    this.recoilOffset = 0;
    this.recoilTime = Infinity;
    this.previousRecoil = 0;
    this.shotsFired = 0;
    this.applyRecoil();
  }
}
