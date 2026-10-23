import { FreeCamera, Vector3, type Scene } from '@babylonjs/core';
import type { AimSystem } from '../aim/AimSystem.ts';
import type { FollowCamera } from '../camera/FollowCamera.ts';
import type { TankModel } from '../vehicle/tankRig.ts';
import type { TurretController } from '../vehicle/TurretController.ts';

/** Hold right mouse to look through the gun; target intent is steered by right-drag. */
export class GunnerSight {
  readonly camera: FreeCamera;
  isActive = false;
  private readonly scene: Scene;
  private readonly canvas: HTMLCanvasElement;
  private readonly tank: TankModel;
  private readonly aim: AimSystem;
  private readonly turret: TurretController;
  private readonly follow: FollowCamera;
  private readonly savedVisibility: { mesh: { isVisible: boolean }; visible: boolean }[] = [];
  private readonly scope: HTMLElement | null;
  private dragging = false;
  private pointerId = -1;
  private sensitivity = 0.0011;
  constructor(scene: Scene, canvas: HTMLCanvasElement, tank: TankModel, aim: AimSystem,
    turret: TurretController, follow: FollowCamera) {
    this.scene = scene; this.canvas = canvas; this.tank = tank; this.aim = aim;
    this.turret = turret; this.follow = follow;
    this.scope = document.querySelector<HTMLElement>('#scope');
    this.camera = new FreeCamera('gunner-sight', Vector3.Zero(), scene);
    this.camera.fov = 0.22;
    this.camera.minZ = 0.1;
    this.camera.maxZ = 1600;
    this.camera.inputs.clear();
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerCancel);
    canvas.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('blur', this.exit);
    document.addEventListener('visibilitychange', this.onVisibility);
  }
  private onContextMenu = (event: Event) => event.preventDefault();
  private onVisibility = () => { if (document.hidden) this.exit(); };
  private onPointerDown = (event: PointerEvent) => {
    if (event.button !== 2) return;
    event.preventDefault();
    this.enter();
    this.dragging = true;
    this.pointerId = event.pointerId;
    this.canvas.setPointerCapture?.(event.pointerId);
  };
  private onPointerMove = (event: PointerEvent) => {
    if (!this.isActive || !this.dragging || event.pointerId !== this.pointerId) return;
    const ray = this.turret.getMuzzleRay();
    const target = this.aim.target;
    const forward = target.subtract(ray.origin);
    if (forward.lengthSquared() < 4) forward.copyFrom(ray.direction);
    forward.normalize();
    const right = Vector3.Cross(Vector3.Up(), forward).normalize();
    const up = Vector3.Cross(forward, right).normalize();
    const direction = forward
      .add(right.scale(event.movementX * this.sensitivity))
      .add(up.scale(-event.movementY * this.sensitivity))
      .normalize();
    target.copyFrom(ray.origin.add(direction.scale(800)));
  };
  private onPointerUp = (event: PointerEvent) => {
    if (event.button !== 2) return;
    this.dragging = false;
    this.canvas.releasePointerCapture?.(event.pointerId);
    this.exit();
  };
  private onPointerCancel = () => { this.dragging = false; this.exit(); };
  enter() {
    if (this.isActive) return;
    this.isActive = true;
    this.savedVisibility.length = 0;
    for (const mesh of this.tank.assets.meshes) {
      this.savedVisibility.push({ mesh, visible: mesh.isVisible });
      mesh.isVisible = false;
    }
    const ray = this.turret.getMuzzleRay();
    if (this.aim.target.subtract(ray.origin).lengthSquared() < 4) {
      this.aim.target.copyFrom(ray.origin.add(ray.direction.scale(800)));
    }
    this.follow.camera.detachControl();
    this.scene.activeCamera = this.camera;
    if (this.scope) this.scope.hidden = false;
    this.update();
  }
  exit() {
    if (!this.isActive) return;
    this.isActive = false;
    this.dragging = false;
    for (const saved of this.savedVisibility) saved.mesh.isVisible = saved.visible;
    this.savedVisibility.length = 0;
    this.scene.activeCamera = this.follow.camera;
    this.follow.camera.attachControl(this.canvas, true);
    if (this.scope) this.scope.hidden = true;
  }
  update() {
    if (!this.isActive) return;
    const ray = this.turret.getMuzzleRay();
    const direction = this.aim.target.subtract(ray.origin);
    if (direction.lengthSquared() < 1e-6) direction.copyFrom(ray.direction);
    this.camera.position.copyFrom(ray.origin.add(direction.normalizeToNew().scale(0.4)).add(new Vector3(0, 0.12, 0)));
    this.camera.setTarget(this.aim.target);
  }
  reset() { this.exit(); }
  dispose() {
    this.exit();
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('blur', this.exit);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.camera.dispose();
  }
}
