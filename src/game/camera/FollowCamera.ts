import { ArcRotateCamera, Matrix, Vector3, type Scene } from '@babylonjs/core';
import type { TankVehicle } from '../vehicle/TankVehicle.ts';

/** Mouse orbit, delayed heading recovery and physics obstruction queries. */
export class FollowCamera {
  readonly camera: ArcRotateCamera;
  private lastMouseTime = 0;
  private desiredRadius = 15;
  private overviewMode = false;
  aiming = false;
  private altHeld = false;
  private freeLookToggled = false;
  get freeLook() { return this.altHeld || this.freeLookToggled; }
  get isOverview() { return this.overviewMode; }
  private keyDown = (event: KeyboardEvent) => { if (event.code === 'AltLeft' || event.code === 'AltRight') { event.preventDefault(); this.altHeld = true; } if (event.code === 'KeyC' && !event.repeat) { event.preventDefault(); this.freeLookToggled = !this.freeLookToggled; } };
  private keyUp = (event: KeyboardEvent) => { if (event.code === 'AltLeft' || event.code === 'AltRight') this.altHeld = false; };
  private clearInput = () => { this.altHeld = false; this.freeLookToggled = false; };
  private pointer = () => { this.lastMouseTime = performance.now(); this.overviewMode = false; };
  private wheel = (event: WheelEvent) => {
    event.preventDefault(); this.desiredRadius = Math.max(7, Math.min(32, this.desiredRadius + event.deltaY * 0.015));
    this.pointer();
  };
  readonly scene: Scene;
  readonly canvas: HTMLCanvasElement;
  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this.scene = scene; this.canvas = canvas;
    this.camera = new ArcRotateCamera('tank-follow', -Math.PI / 2, 1.48, 15, Vector3.Zero(), scene);
    this.camera.minZ = 0.15;
    this.camera.lowerBetaLimit = 0.25; this.camera.upperBetaLimit = 1.8;
    this.camera.panningSensibility = 0;
    this.camera.inputs.removeByType('ArcRotateCameraMouseWheelInput');
    this.camera.attachControl(canvas, true);
    window.addEventListener('keydown', this.keyDown); window.addEventListener('keyup', this.keyUp);
    window.addEventListener('blur', this.clearInput);
    document.addEventListener('visibilitychange', this.clearInput);
    canvas.addEventListener('pointerdown', this.pointer);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('wheel', this.wheel, { passive: false });
  }
  private onMove = (event: PointerEvent) => { if (event.buttons) this.pointer(); };
  follow() { this.overviewMode = false; this.camera.alpha = -Math.PI / 2; this.camera.beta = 1.48; this.camera.inertialAlphaOffset = 0; this.camera.inertialBetaOffset = 0; this.clearInput(); this.desiredRadius = 15; }
  overview() { this.overviewMode = true; this.camera.setTarget(Vector3.Zero()); this.camera.radius = 160; this.camera.beta = 0.6; }
  update(vehicle: TankVehicle, visualPosition: Vector3, dt: number) {
    if (this.overviewMode) return;
    const target = visualPosition.add(new Vector3(0, this.aiming ? 3 : 1.8, 0));
    this.camera.setTarget(target, false, false, true);
    if (!this.aiming && !this.freeLook && performance.now() - this.lastMouseTime > 1500 && Math.abs(vehicle.speed) > 0.6) {
      const forward = Vector3.TransformNormal(Vector3.Forward(), Matrix.Compose(Vector3.One(), vehicle.current.rotation, Vector3.Zero()));
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
    window.removeEventListener('keydown', this.keyDown); window.removeEventListener('keyup', this.keyUp);
    window.removeEventListener('blur', this.clearInput);
    document.removeEventListener('visibilitychange', this.clearInput);
    this.canvas.removeEventListener('pointerdown', this.pointer); this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('wheel', this.wheel); this.camera.dispose();
  }
}
