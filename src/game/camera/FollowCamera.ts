import { FreeCamera, Mesh, Ray, Vector3, type Scene } from '@babylonjs/core';
import { sightMagnification } from '../aim/gunnerSightModel.ts';
import { ShotCameraMotion } from './ShotCameraMotion.ts';
import type { TankVehicle } from '../vehicle/TankVehicle.ts';
import type { TurretController } from '../vehicle/TurretController.ts';

/** Camera tuning in metres, radians and seconds; mouse aim stays independent; touch aim follows the real bore. */
export const AIM_CAMERA = Object.freeze({ right: 2.6, back: 4.6, height: 1.1,
  viewDrop: 0.12, transitionRate: 9, clearance: 0.4, sensitivity: 0.002 });
export class FollowCamera {
  readonly camera: FreeCamera;
  private yaw = 0;
  private pitch = 0;
  private desiredRadius = 15;
  private aimFov = 0.5;
  private overviewMode = false;
  private blend = 0;
  private readonly shotMotion = new ShotCameraMotion();
  private positioned = false;
  aiming = false;
  get magnification() { return sightMagnification(this.camera.fov); }
  get isOverview() { return this.overviewMode; }
  get direction() { return new Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch)); }
  readonly scene: Scene;
  readonly canvas: HTMLCanvasElement;
  private readonly manualAim: boolean;
  constructor(scene: Scene, canvas: HTMLCanvasElement, manualAim = false) {
    this.manualAim = manualAim;
    this.pitch = manualAim ? -0.09 : 0;
    this.scene = scene; this.canvas = canvas;
    this.camera = new FreeCamera('tank-follow', Vector3.Zero(), scene);
    this.camera.minZ = 0.15; this.camera.fov = 0.8; this.camera.inputs.clear();
  }
  look(x: number, y: number) {
    if (this.overviewMode) return;
    this.yaw += x * AIM_CAMERA.sensitivity;
    this.pitch = Math.max(-1.15, Math.min(1.15, this.pitch - y * AIM_CAMERA.sensitivity));
  }
  zoom(notches: number) {
    if (this.overviewMode) return;
    if (this.aiming) this.aimFov = Math.max(0.2, Math.min(0.7, this.aimFov + notches * 0.05));
    else this.desiredRadius = Math.max(6, Math.min(35, this.desiredRadius + notches * 1.5));
  }
  aimTarget(vehicle: TankVehicle) {
    const from = this.camera.position;
    const to = from.add(this.direction.scale(1000));
    const hit = this.scene.getPhysicsEngine()!.raycast(from, to, { ignoreBody: vehicle.body });
    return hit.hasHit ? hit.hitPointWorld.clone() : to;
  }
  follow(yaw = 0) { this.overviewMode = false; this.yaw = yaw; this.pitch = this.manualAim ? -0.09 : 0; this.aiming = false; this.blend = 0; this.shotMotion.reset(); this.desiredRadius = 15; this.aimFov = 0.5; this.positioned = false; }
  overview() { this.overviewMode = true; this.aiming = false; this.camera.position.set(0, 120, -130); this.camera.setTarget(Vector3.Zero()); }
  /** Results never interpolate out of a gunner camera or squeeze the boom inside the hull. */
  resultOrbit(vehicle: TankVehicle, visualPosition: Vector3, angle: number) {
    this.overviewMode = true; this.aiming = false;
    this.camera.fov = 0.8;
    const target = visualPosition.add(new Vector3(0, 2.7, 0));
    // Forest physics covers trunks only; include the instanced crowns in result framing.
    const crowns = this.scene.meshes.filter((mesh): mesh is Mesh => mesh instanceof Mesh && (mesh.name === 'pine-crowns' || mesh.name === 'broadleaf-crowns'));
    for (const mesh of crowns) mesh.thinInstanceEnablePicking = true;
    const sightTargets = [target, target.add(new Vector3(0, 1, 0)), target.add(new Vector3(3, 0, 0)), target.add(new Vector3(-3, 0, 0))];
    let best = this.safePosition(target, target.add(new Vector3(Math.sin(angle) * 20, 40, -Math.cos(angle) * 20)), vehicle);
    let occlusions = Infinity;
    for (const height of [8, 16, 28]) {
      for (const offset of [0, .6, -.6, 1.2, -1.2, Math.PI]) {
        const desired = target.add(new Vector3(Math.sin(angle + offset) * 20, height, -Math.cos(angle + offset) * 20));
        const safe = this.safePosition(target, desired, vehicle);
        const distance = Vector3.Distance(target, safe);
        if (distance < 14) continue;
        // A tank parked under a crown may be partly covered from every angle; keep the clearest exterior view.
        const count = crowns.length ? sightTargets.filter(end => {
          const ray = end.subtract(safe);
          return this.scene.pickWithRay(new Ray(safe, ray.normalizeToNew(), ray.length()), mesh => crowns.some(crown => crown === mesh))?.hit;
        }).length : 0;
        if (count < occlusions) { best = safe; occlusions = count; }
        if (occlusions === 0) break;
      }
      if (occlusions === 0) break;
    }
    this.camera.position.copyFrom(best);
    // Keep the tank below the centered result card, with the whole hull in frame.
    this.camera.setTarget(target.add(new Vector3(0, 3, 0)));
    this.camera.rotation.z = 0;
  }
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
    // Lower the desktop view without lowering the aim ray; fade out in shoulder view.
    const viewPitch = this.pitch - AIM_CAMERA.viewDrop * (1 - this.blend);
    const viewDirection = this.manualAim ? freeDirection : new Vector3(Math.sin(this.yaw) * Math.cos(viewPitch), Math.sin(viewPitch), Math.cos(this.yaw) * Math.cos(viewPitch));
    const bore = turret?.getMuzzleRay().direction;
    // Mouse intent remains independent of turret lag, including in gunner view.
    let direction = viewDirection;
    if (this.manualAim && bore) {
      const aimYaw = Math.atan2(bore.x, bore.z);
      const yaw = this.yaw + Math.atan2(Math.sin(aimYaw - this.yaw), Math.cos(aimYaw - this.yaw)) * this.blend;
      const pitch = this.pitch + (Math.asin(Math.max(-1, Math.min(1, bore.y))) - this.pitch) * this.blend;
      direction = new Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    }
    if (!this.manualAim) this.camera.fov = 0.8 + (this.aimFov - 0.8) * this.blend;
    const anchor = visualPosition.add(new Vector3(0, 2.7, 0));
    const normal = anchor.subtract(viewDirection.scale(this.desiredRadius));
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
