import { Ray, Vector3, type Scene } from '@babylonjs/core';
import type { DuelTank } from './DuelTank.ts';
import type { ProjectileHit } from './ProjectileSystem.ts';
import { damageRegion } from './DamageModel.ts';

/** The visual turret has no Havok body. Test its triangles against the nearer world hit. */
export function pickTankHit(scene: Scene, tank: DuelTank, from: Vector3, to: Vector3, worldHit?: ProjectileHit): ProjectileHit | undefined {
  const meshes = new Set(tank.tank.assets.meshes.filter(mesh =>
    mesh.isVisible && mesh.isEnabled() && mesh.visibility > 0 && mesh.getTotalVertices() > 0));
  for (const mesh of meshes) mesh.computeWorldMatrix(true);
  const segment = to.subtract(from), distance = segment.length();
  if (distance === 0) return worldHit;
  const picked = scene.pickWithRay(new Ray(from, segment.scale(1 / distance), distance), mesh => meshes.has(mesh), false);
  if (picked?.hit && picked.pickedPoint && (!worldHit || picked.distance < worldHit.distance)) {
    return { point: picked.pickedPoint.clone(), normal: picked.getNormal(true) ?? Vector3.Up(), body: tank.vehicle.body, distance: picked.distance };
  }
  return worldHit;
}
export function tankDamageRegion(tank: DuelTank, point: Vector3) {
  const local = Vector3.TransformCoordinates(point, tank.tank.anchor.computeWorldMatrix(true).clone().invert());
  return damageRegion(local, tank.vehicle.rig.size);
}
