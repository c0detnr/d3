import { FreeCamera, Vector3, type Scene } from '@babylonjs/core';
import type { TankVehicle } from '../vehicle/TankVehicle.ts';
import type { TurretController } from '../vehicle/TurretController.ts';

/** Camera tuning in metres, radians and seconds; independent intent never follows gun lag. */
export const AIM_CAMERA = Object.freeze({ right: 2.6, back: 4.6, height: 1.1,
  transitionRate: 9, clearance: 0.4, sensitivity: 0.002, kick: 0.025 });
export class FollowCamera {
  readonly camera: FreeCamera;
  private yaw = 0;
  private pitch = -0.09;
  private desiredRadius = 15;
  private overviewMode = false;
  private blend = 0;
  private kick = 0;
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
    canvas.addEventListener('wheel', this.wheel, { passive: false });
  }
  look(x: number, y: number) {
    if (this.overviewMode) return;
    this.yaw += x * AIM_CAMERA.sensitivity;
    this.pitch = Math.max(-1.15, Math.min(1.15, this.pitch - y * AIM_CAMERA.sensitivity));
  }
  private wheel = (e: WheelEvent) => {
    e.preventDefault();
    if (!this.aiming) this.desiredRadius = Math.max(7, Math.min(32, this.desiredRadius + e.deltaY * 0.015));
  };
  follow() { this.overviewMode = false; this.yaw = 0; this.pitch = -0.09; this.aiming = false; this.blend = 0; this.kick = 0; this.desiredRadius = 15; this.positioned = false; }
  overview() { this.overviewMode = true; this.aiming = false; this.camera.position.set(0, 120, -130); this.camera.setTarget(Vector3.Zero()); }
  impulse() { this.kick = AIM_CAMERA.kick; }
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
    const direction = this.direction;
    const anchor = visualPosition.add(new Vector3(0, 2.7, 0));
    const normal = anchor.subtract(direction.scale(this.desiredRadius));
    let close = normal;
    if (turret) {
      turret.yawPivot.computeWorldMatrix(true);
      const pivot = turret.yawPivot.getAbsolutePosition();
      // Real world bore defines the turret's right side, irrespective of asset node names/handedness.
      const forward = turret.getMuzzleRay().direction; forward.y = 0; forward.normalize();
      const right = Vector3.Cross(Vector3.Up(), forward).normalize();
      close = pivot.add(right.scale(AIM_CAMERA.right)).subtract(forward.scale(AIM_CAMERA.back)).add(new Vector3(0, AIM_CAMERA.height, 0));
    }
    const desired = Vector3.Lerp(normal, close, this.blend);
    let safe = this.safePosition(anchor, desired, vehicle);
    if (this.positioned) safe = this.safePosition(this.camera.position, safe, vehicle);
    this.camera.position.copyFrom(safe); this.positioned = true;
    this.kick *= Math.exp(-dt * 20);
    const view = new Vector3(direction.x, direction.y + this.kick, direction.z).normalize();
    this.camera.setTarget(safe.add(view.scale(800)));
  }
  dispose() { this.canvas.removeEventListener('wheel', this.wheel); this.camera.dispose(); }
}
