import { Matrix, Quaternion, Vector3, type TransformNode } from '@babylonjs/core';
import type { TankModel } from './tankRig.ts';
import { IRON_DUST_01, type VehicleDefinition } from './VehicleDefinition.ts';

export const wrapAngle = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Kinematic weapon joints, radians/seconds. Hull physics remains the sole rigid body. */
export class TurretController {
  readonly yawPivot: TransformNode;
  readonly pitchPivot: TransformNode;
  readonly barrel: TransformNode;
  readonly muzzle: TransformNode;
  readonly definition: Readonly<VehicleDefinition>;
  private readonly yawRest: Quaternion;
  private readonly pitchRest: Quaternion;
  private previous = { yaw: 0, elevation: 0 };
  private current = { yaw: 0, elevation: 0 };
  limited = false;
  constructor(tank: TankModel, definition: Readonly<VehicleDefinition> = IRON_DUST_01) {
    this.definition = definition;
    const nodes = [...tank.assets.transformNodes, ...tank.assets.meshes];
    const find = (id: string) => {
      const node = nodes.find(node => node.metadata?.gltf?.extras?.asset_node_id === id);
      if (!node) throw new Error(`Tank joint missing: ${id}`);
      return node;
    };
    this.yawPivot = find('TurretPivot'); this.pitchPivot = find('GunPitchPivot');
    this.barrel = find('Barrel'); this.muzzle = find('MuzzlePoint');
    this.yawRest = this.yawPivot.rotationQuaternion?.clone() ?? Quaternion.FromEulerVector(this.yawPivot.rotation);
    this.pitchRest = this.pitchPivot.rotationQuaternion?.clone() ?? Quaternion.FromEulerVector(this.pitchPivot.rotation);
  }
  get angles() { return { ...this.current }; }
  private apply(yaw: number, elevation: number) {
    this.yawPivot.rotationQuaternion = this.yawRest.multiply(Quaternion.RotationAxis(Vector3.Up(), yaw));
    this.pitchPivot.rotationQuaternion = this.pitchRest.multiply(Quaternion.RotationAxis(Vector3.Right(), -elevation));
    this.yawPivot.computeWorldMatrix(true); this.pitchPivot.computeWorldMatrix(true); this.muzzle.computeWorldMatrix(true);
  }
  private restDirection(pivot: TransformNode, rest: Quaternion, target: Vector3) {
    const parent = pivot.parent as TransformNode;
    parent.computeWorldMatrix(true);
    const local = Vector3.TransformCoordinates(target, Matrix.Invert(parent.getWorldMatrix())).subtract(pivot.position);
    return Vector3.TransformNormal(local, Matrix.Compose(Vector3.One(), rest.conjugate(), Vector3.Zero()));
  }
  /** Caller supplies the current fixed hull pose, never an interpolated render pose. */
  fixedUpdate(target: Vector3 | null, dt: number) {
    this.previous = { ...this.current };
    if (!target) { this.limited = false; this.apply(this.current.yaw, this.current.elevation); return; }
    const local = this.restDirection(this.yawPivot, this.yawRest, target);
    if (Math.hypot(local.x, local.z) > 1e-6) {
      const delta = wrapAngle(Math.atan2(local.x, local.z) - this.current.yaw);
      const max = this.definition.turretYawSpeed * dt;
      this.current.yaw = wrapAngle(this.current.yaw + clamp(delta, -max, max));
    }
    this.apply(this.current.yaw, this.current.elevation);
    const gun = this.restDirection(this.pitchPivot, this.pitchRest, target);
    // Resolve elevation independently of yaw lag; never raise the gun just because the target is behind.
    const desired = Math.atan2(gun.y, Math.max(1e-6, Math.hypot(gun.x, gun.z)));
    const constrained = clamp(desired, this.definition.gunMinElevation, this.definition.gunMaxElevation);
    this.limited = Math.abs(desired - constrained) > 1e-5;
    const max = this.definition.gunPitchSpeed * dt;
    this.current.elevation += clamp(constrained - this.current.elevation, -max, max);
    this.apply(this.current.yaw, this.current.elevation);
  }
  render(alpha: number) {
    this.apply(this.previous.yaw + wrapAngle(this.current.yaw - this.previous.yaw) * alpha,
      this.previous.elevation + (this.current.elevation - this.previous.elevation) * alpha);
  }
  getMuzzleRay() {
    this.muzzle.computeWorldMatrix(true);
    return { origin: this.muzzle.getAbsolutePosition().clone(),
      direction: Vector3.TransformNormal(Vector3.Forward(), this.muzzle.getWorldMatrix()).normalize() };
  }
  reset() { this.previous = { yaw: 0, elevation: 0 }; this.current = { ...this.previous }; this.limited = false; this.apply(0, 0); }
  dispose() { this.reset(); }
}
