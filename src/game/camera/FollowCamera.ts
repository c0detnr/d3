import { ArcRotateCamera, Matrix, Vector3, type Scene } from '@babylonjs/core';
import type { TankVehicle } from '../vehicle/TankVehicle.ts';

/** Mouse orbit, delayed heading recovery and physics obstruction queries. */
export class FollowCamera {
  readonly camera: ArcRotateCamera;
  private lastMouseTime = 0;
  private desiredRadius = 15;
  private overviewMode = false;
  private pointer = () => { this.lastMouseTime = performance.now(); this.overviewMode = false; };
  private wheel = (event: WheelEvent) => {
    event.preventDefault(); this.desiredRadius = Math.max(7, Math.min(32, this.desiredRadius + event.deltaY * 0.015));
    this.pointer();
  };
  constructor(readonly scene: Scene, readonly canvas: HTMLCanvasElement) {
    this.camera = new ArcRotateCamera('tank-follow', -Math.PI / 2, 1.1, 15, Vector3.Zero(), scene);
    this.camera.minZ = 0.15;
    this.camera.lowerBetaLimit = 0.25; this.camera.upperBetaLimit = 1.45;
    this.camera.panningSensibility = 0;
    this.camera.inputs.removeByType('ArcRotateCameraMouseWheelInput');
    this.camera.attachControl(canvas, true);
    canvas.addEventListener('pointerdown', this.pointer);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('wheel', this.wheel, { passive: false });
  }
  private onMove = (event: PointerEvent) => { if (event.buttons) this.pointer(); };
  follow() { this.overviewMode = false; this.camera.alpha = -Math.PI / 2; this.desiredRadius = 15; }
  overview() { this.overviewMode = true; this.camera.setTarget(Vector3.Zero()); this.camera.radius = 160; this.camera.beta = 0.6; }
  update(vehicle: TankVehicle, visualPosition: Vector3, dt: number) {
    if (this.overviewMode) return;
    const target = visualPosition.add(new Vector3(0, 1.8, 0));
    this.camera.setTarget(target);
    if (performance.now() - this.lastMouseTime > 1500 && Math.abs(vehicle.speed) > 0.6) {
      const forward = Vector3.TransformNormal(Vector3.Forward(), Matrix.FromQuaternion(vehicle.current.rotation));
      const desired = Math.atan2(-forward.z, -forward.x);
      const delta = Math.atan2(Math.sin(desired - this.camera.alpha), Math.cos(desired - this.camera.alpha));
      this.camera.alpha += delta * (1 - Math.exp(-dt * 2));
    }
    const beta = this.camera.beta, alpha = this.camera.alpha;
    const direction = new Vector3(Math.cos(alpha) * Math.sin(beta), Math.cos(beta), Math.sin(alpha) * Math.sin(beta));
    const physics = this.scene.getPhysicsEngine()!;
    let radius = this.desiredRadius;
    // Five rays approximate a camera volume and include invisible tree collision proxies.
    const right = Vector3.Cross(direction, Vector3.Up()).normalize();
    for (const offset of [Vector3.Zero(), right.scale(0.3), right.scale(-0.3), new Vector3(0, 0.3, 0), new Vector3(0, -0.3, 0)]) {
      const from = target.add(offset);
      const hit = physics.raycast(from, from.add(direction.scale(this.desiredRadius)), { ignoreBody: vehicle.body });
      if (hit.hasHit) radius = Math.min(radius, Math.max(0.5, Vector3.Distance(from, hit.hitPointWorld) - 0.45));
    }
    this.camera.radius = radius < this.camera.radius ? radius : this.camera.radius + (radius - this.camera.radius) * (1 - Math.exp(-dt * 5));
  }
  dispose() {
    this.canvas.removeEventListener('pointerdown', this.pointer); this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('wheel', this.wheel); this.camera.dispose();
  }
}
