import { LoadAssetContainerAsync, Scene, TransformNode, Vector3 } from '@babylonjs/core';
import { registerBuiltInLoaders } from '@babylonjs/loaders/dynamic.js';

registerBuiltInLoaders();

/** Visual placement only; dynamic hull and suspension belong to M2. Units: metres. */
export async function loadTankModel(scene: Scene, source: string | Uint8Array, position: Vector3) {
  const assets = await LoadAssetContainerAsync(source, scene, { pluginExtension: '.glb' });
  if (scene.isDisposed) {
    assets.dispose();
    throw new Error('Tank loading completed after scene disposal.');
  }
  const anchor = new TransformNode('tank-placement', scene);
  try {
    assets.addAllToScene();
    // Preserve Babylon's glTF handedness conversion; exported +Z faces world +Z.
    for (const root of assets.rootNodes) root.parent = anchor;
    anchor.position.copyFrom(position);
    const visible = assets.meshes.filter((mesh) => {
      const extras = mesh.metadata?.gltf?.extras;
      if (extras?.collision_only || extras?.asset_node_id === 'COL_Hull') {
        mesh.isVisible = false;
        mesh.isPickable = false;
        return false;
      }
      return mesh.getTotalVertices() > 0;
    });
    if (!visible.length) throw new Error('Tank GLB contains no visible geometry.');
    const minY = Math.min(...visible.map((mesh) => {
      mesh.computeWorldMatrix(true);
      return mesh.getBoundingInfo().boundingBox.minimumWorld.y;
    }));
    // The exported root is at ground level; track bottoms start 0.0764 m above it.
    anchor.position.y += position.y - minY;
    for (const mesh of visible) mesh.computeWorldMatrix(true);
    return {
      anchor,
      groundPosition: position.clone(),
      assets,
      dispose() { assets.dispose(); anchor.dispose(); },
    };
  } catch (error) {
    assets.dispose();
    anchor.dispose();
    throw error;
  }
}
