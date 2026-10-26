import { Matrix, Vector3 } from '@babylonjs/core';
import type { loadTankModel } from './loadTankModel.ts';
export type TankModel = Awaited<ReturnType<typeof loadTankModel>>;

/** Capture unanimated asset transforms before attaching visuals to a physics pose. */
export function extractTankRig(tank: TankModel) {
  const inverse = Matrix.Translation(-tank.groundPosition.x, -tank.groundPosition.y, -tank.groundPosition.z);
  const nodes = [...tank.assets.transformNodes, ...tank.assets.meshes];
  const proxy = tank.assets.meshes.find(mesh => mesh.metadata?.gltf?.extras?.asset_node_id === 'COL_Hull');
  if (!proxy) throw new Error('Tank collision proxy COL_Hull missing.');
  proxy.computeWorldMatrix(true);
  const bounds = proxy.getBoundingInfo().boundingBox;
  const min = Vector3.TransformCoordinates(bounds.minimumWorld, inverse);
  const max = Vector3.TransformCoordinates(bounds.maximumWorld, inverse);
  const center = min.add(max).scale(0.5);
  const wheels = nodes.filter(node => /^(Left|Right)_RoadWheel_\d\d$/.test(node.name)).map(node => {
    node.computeWorldMatrix(true);
    const origin = Vector3.TransformCoordinates(node.getAbsolutePosition(), inverse);
    return { node, origin, local: origin.subtract(center), basePosition: node.position.clone(), baseRotation: node.rotationQuaternion!.clone(),
      // Effective contact radius includes the track envelope below the road wheel.
      radius: origin.y, side: origin.x < 0 ? -1 : 1 };
  });
  const expected = nodes.find(node => node.metadata?.gltf?.extras?.asset_node_id === 'TankRoot')?.metadata?.gltf?.extras?.road_wheels ?? 12;
  if (![12, 14].includes(expected) || wheels.length !== expected) throw new Error('Tank suspension point count does not match asset.');
  const left = wheels.filter(wheel => wheel.side < 0).sort((a, b) => a.origin.z - b.origin.z);
  const right = wheels.filter(wheel => wheel.side > 0).sort((a, b) => a.origin.z - b.origin.z);
  if (left.length !== expected / 2 || right.length !== expected / 2 || left.some((wheel, i) =>
    Math.abs(wheel.origin.z - right[i].origin.z) > 0.001 || Math.abs(wheel.origin.x + right[i].origin.x) > 0.001)) {
    throw new Error('Tank suspension points must form matching left/right pairs.');
  }
  return { visualOffset: tank.anchor.position.subtract(tank.groundPosition), center, size: max.subtract(min), wheels };
}
export type TankRig = ReturnType<typeof extractTankRig>;
