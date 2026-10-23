import { Matrix, Vector3 } from '@babylonjs/core';
import type { loadTankModel } from './loadTankModel.ts';
export type TankModel = Awaited<ReturnType<typeof loadTankModel>>;

/** Capture unanimated asset transforms before attaching visuals to a physics pose. */
export function extractTankRig(tank: TankModel) {
  const inverse = Matrix.Invert(tank.anchor.computeWorldMatrix(true));
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
  if (wheels.length !== 12) throw new Error('Tank requires twelve suspension points.');
  return { center, size: max.subtract(min), wheels };
}
export type TankRig = ReturnType<typeof extractTankRig>;
