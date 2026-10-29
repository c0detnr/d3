import { FreeCamera, Vector3, type Scene } from '@babylonjs/core';
import { ShotCameraMotion } from './ShotCameraMotion.ts';
import type { TankVehicle } from '../vehicle/TankVehicle.ts';
import type { TurretController } from '../vehicle/TurretController.ts';

/** Camera tuning in metres, radians and seconds; free look stays independent; close aim follows the real bore. */
export const AIM_CAMERA = Object.freeze({ right: 2.6, back: 4.6, height: 1.1,
  transitionRate: 9, clearance: 0.4, sensitivity: 0.002 });
export class FollowCamera {
  readonly camera: FreeCamera;
  private yaw = 0;
  private pitch = -0.09;
  private desiredRadius = 15;
  private overviewMode = false;
  private blend = 0;
  private readonly shotMotion = new ShotCameraMotion();
  private positioned = false;
  aiming = false;
  get isOverview() { return this.overviewMode; }
  get direction() { return new Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch)); }
  readonly scene: Scene;
  readonly canvas: HTMLCanvasElement;
  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this.scene = scene; this.canvas = canvas;
    this.camera = new FreeCamera('tank-follow', Vector3.Zero(), scene);
    this.camera.minZ = 0.15; this.camera.fov = 0.8; this.camera.inputs.clear();
  }
  look(x: number, y: number) {
    if (this.overviewMode) return;
    this.yaw += x * AIM_CAMERA.sensitivity;
    this.pitch = Math.max(-1.15, Math.min(1.15, this.pitch - y * AIM_CAMERA.sensitivity));
  }
  follow(yaw = 0) { this.overviewMode = false; this.yaw = yaw; this.pitch = -0.09; this.aiming = false; this.blend = 0; this.shotMotion.reset(); this.desiredRadius = 15; this.positioned = false; }
  overview() { this.overviewMode = true; this.aiming = false; this.camera.position.set(0, 120, -130); this.camera.setTarget(Vector3.Zero()); }
  impulse(direction = this.direction, strength = 1) {
    const right = Vector3.Cross(Vector3.Up(), this.direction).normalize();
    this.shotMotion.impulse(Vector3.Dot(direction, right), strength);
  }
  /** Five offset rays approximate the camera volume; sweep the transition as well as the boom. */
  private safePosition(from: Vector3, to: Vector3, vehicle: TankVehicle) {
    const direction = to.subtract(from), length = direction.length();
    if (length < 1e-5) return to;
    direction.scaleInPlace(1 / length);
    let distance = length;
    const c = AIM_CAMERA.clearance;
    const right = Vector3.Cross(Vector3.Up(), direction).normalize().scale(c);
    for (const offset of [Vector3.Zero(), right, right.negate(), new Vector3(0, c, 0), new Vector3(0, -c, 0)]) {
      const start = from.add(offset);
      const hit = this.scene.getPhysicsEngine()!.raycast(start, to.add(offset), { ignoreBody: vehicle.body });
      if (hit.hasHit) distance = Math.min(distance, Math.max(0, Vector3.Distance(start, hit.hitPointWorld) - c));
    }
    return from.add(direction.scale(distance));
  }
  update(vehicle: TankVehicle, visualPosition: Vector3, dt: number, turret?: TurretController) {
    if (this.overviewMode) return;
    this.blend += ((this.aiming ? 1 : 0) - this.blend) * (1 - Math.exp(-dt * AIM_CAMERA.transitionRate));
    const freeDirection = this.direction;
    const bore = turret?.getMuzzleRay().direction;
    // Blend angles over the shortest arc, including when free look faces backwards.
    const aimYaw = bore ? Math.atan2(bore.x, bore.z) : this.yaw;
    const yawDelta = Math.atan2(Math.sin(aimYaw - this.yaw), Math.cos(aimYaw - this.yaw));
    const yaw = this.yaw + yawDelta * this.blend;
    const aimPitch = bore ? Math.asin(Math.max(-1, Math.min(1, bore.y))) : this.pitch;
    const pitch = this.pitch + (aimPitch - this.pitch) * this.blend;
    const direction = new Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    const anchor = visualPosition.add(new Vector3(0, 2.7, 0));
    const normal = anchor.subtract(freeDirection.scale(this.desiredRadius));
    let close = normal;
    if (turret) {
      turret.yawPivot.computeWorldMatrix(true);
      const pivot = turret.yawPivot.getAbsolutePosition();
      // Keep the shoulder behind and to the right of the actual turret.
      const forward = new Vector3(bore!.x, 0, bore!.z).normalize();
      const right = Vector3.Cross(Vector3.Up(), forward).normalize();
      close = pivot.add(right.scale(AIM_CAMERA.right)).subtract(forward.scale(AIM_CAMERA.back)).add(new Vector3(0, AIM_CAMERA.height, 0));
    }
    const desired = Vector3.Lerp(normal, close, this.blend);
    let safe = this.safePosition(anchor, desired, vehicle);
    if (this.positioned) {
      const currentDistance = Vector3.Distance(anchor, this.camera.position);
      const offset = safe.subtract(anchor), distance = offset.length();
      if (distance > currentDistance && distance > 1e-5) {
        safe = anchor.add(offset.scale((currentDistance + (distance - currentDistance) * (1 - Math.exp(-dt * 5))) / distance));
      }
      safe = this.safePosition(this.camera.position, safe, vehicle);
    }
    this.camera.position.copyFrom(safe); this.positioned = true;
    const motion = this.shotMotion.update(dt);
    const right = Vector3.Cross(Vector3.Up(), direction).normalize();
    const up = Vector3.Cross(direction, right).normalize();
    const view = direction.add(up.scale(motion.pitch)).add(right.scale(motion.yaw)).normalize();
    this.camera.setTarget(safe.add(view.scale(800)));
    this.camera.rotation.z = motion.roll;
  }
  dispose() { this.camera.dispose(); }
}
