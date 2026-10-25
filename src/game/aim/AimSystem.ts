import { Matrix, Vector3, type Scene } from '@babylonjs/core';
import type { FollowCamera } from '../camera/FollowCamera.ts';
import type { TankVehicle } from '../vehicle/TankVehicle.ts';
import type { TurretController } from '../vehicle/TurretController.ts';

/** Show the actual bore direction for manual aiming; no ballistic prediction. */
export class AimSystem {
  readonly scene: Scene;
  readonly camera: FollowCamera;
  readonly marker: HTMLElement;
  readonly label: HTMLElement;

  rangeMeters = 0;
  constructor(scene: Scene, camera: FollowCamera, marker: HTMLElement, label: HTMLElement) {
    this.scene = scene; this.camera = camera; this.marker = marker; this.label = label;
  }
  reset() { this.marker.hidden = true; }
  render(vehicle: TankVehicle, turret: Pick<TurretController, 'getMuzzleRay' | 'angles'>) {
    const hidden = this.camera.isOverview;
    document.querySelector<HTMLElement>('#aim-intent')!.hidden = true;
    this.label.hidden = hidden;
    if (hidden) { this.marker.hidden = true; return; }
    const ray = turret.getMuzzleRay();
    const hit = this.scene.getPhysicsEngine()!.raycast(ray.origin, ray.origin.add(ray.direction.scale(800)), { ignoreBody: vehicle.body });
    const point = hit.hasHit ? hit.hitPointWorld : ray.origin.add(ray.direction.scale(800));
    this.rangeMeters = hit.hasHit ? hit.hitDistance : 800;
    const camera = this.scene.activeCamera!;
    const inFront = Vector3.Dot(point.subtract(camera.globalPosition), camera.getForwardRay().direction) > 0;
    const engine = this.scene.getEngine();
    const width = engine.getRenderWidth(), height = engine.getRenderHeight();
    const projected = Vector3.Project(point, Matrix.Identity(), this.scene.getTransformMatrix(), camera.viewport.toGlobal(width, height));
    this.marker.hidden = !inFront || projected.z < 0 || projected.z > 1 || projected.x < 0 || projected.y < 0 || projected.x > width || projected.y > height;
    this.marker.style.left = `${projected.x / width * 100}%`;
    this.marker.style.top = `${projected.y / height * 100}%`;
    const blocked = hit.hasHit && Vector3.Distance(ray.origin, hit.hitPointWorld) < 12;
    this.marker.classList.toggle('blocked', blocked);
    const angles = turret.angles;
    const degrees = 180 / Math.PI;
    this.label.textContent = `${blocked ? 'YAKIN ENGEL · ' : ''}TARET ${(angles.yaw * degrees).toFixed(0)}° · NAMLU ${(angles.elevation * degrees).toFixed(1)}° · Halka: namlu doğrultusu`;
  }
  dispose() { this.marker.hidden = true; this.label.hidden = true; }
}
