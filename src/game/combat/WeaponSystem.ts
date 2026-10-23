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
  private recoilVelocity = 0;
  private readonly barrelBase: Vector3;
  private readonly muzzleBase: Vector3;
  private readonly spawnOffset = 0.35;
  constructor(turret: TurretController, definition: Readonly<WeaponDefinition> = IRON_DUST_01_WEAPON) {
    this.turret = turret;
    this.definition = definition;
    this.barrelBase = turret.barrel.position.clone();
    this.muzzleBase = turret.muzzle.position.clone();
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
    this.recoilOffset = this.definition.recoilDistance;
    this.recoilVelocity = 0;
    this.shotsFired++;
    const ray = this.turret.getMuzzleRay();
    return {
      origin: ray.origin.add(ray.direction.scale(this.spawnOffset)),
      direction: ray.direction.clone(),
    };
  }
  fixedUpdate(dt: number) {
    if (this.reloadRemaining > 0) this.reloadRemaining = Math.max(0, this.reloadRemaining - dt);
    const acceleration = -this.definition.recoilStiffness * this.recoilOffset
      - this.definition.recoilDamping * this.recoilVelocity;
    this.recoilVelocity += acceleration * dt;
    this.recoilOffset += this.recoilVelocity * dt;
    if (Math.abs(this.recoilOffset) < 1e-5 && Math.abs(this.recoilVelocity) < 1e-4) {
      this.recoilOffset = 0;
      this.recoilVelocity = 0;
    }
    this.applyRecoil();
  }
  private applyRecoil() {
    this.turret.barrel.position.copyFrom(this.barrelBase);
    this.turret.muzzle.position.copyFrom(this.muzzleBase);
    this.turret.barrel.position.z -= this.recoilOffset;
    this.turret.muzzle.position.z -= this.recoilOffset;
    this.turret.barrel.computeWorldMatrix(true);
    this.turret.muzzle.computeWorldMatrix(true);
  }
  reset() {
    this.reloadRemaining = 0;
    this.recoilOffset = 0;
    this.recoilVelocity = 0;
    this.shotsFired = 0;
    this.applyRecoil();
  }
}
