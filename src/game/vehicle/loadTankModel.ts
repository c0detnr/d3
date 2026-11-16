import { LoadAssetContainerAsync, Mesh, Scene, TransformNode, Vector3 } from '@babylonjs/core';
import { registerBuiltInLoaders } from '@babylonjs/loaders/dynamic.js';

registerBuiltInLoaders();

/** Compare actual buffers: separate glTF accessors need not share a Geometry object. */
function sameGeometry(a: Mesh, b: Mesh) {
  const equal = (x: ArrayLike<number> | null, y: ArrayLike<number> | null, tolerance = 0) =>
    x === y || !!x && !!y && x.length === y.length && Array.from(x).every((value, i) => Math.abs(value - y[i]) <= tolerance);
  const kinds = a.getVerticesDataKinds().sort();
  return kinds.join() === b.getVerticesDataKinds().sort().join() && equal(a.getIndices(), b.getIndices()) &&
    // Repeated exported wheels differ by float32 rounding (less than a micrometre).
    kinds.every(kind => equal(a.getVerticesData(kind), b.getVerticesData(kind), 1e-6)) &&
    JSON.stringify(a.subMeshes.map(s => [s.materialIndex, s.verticesStart, s.verticesCount, s.indexStart, s.indexCount])) ===
    JSON.stringify(b.subMeshes.map(s => [s.materialIndex, s.verticesStart, s.verticesCount, s.indexStart, s.indexCount]));
}

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
    const sources = new Map<string, Mesh[]>();
    for (const mesh of [...visible]) {
      if (!(mesh instanceof Mesh) || mesh.skeleton || mesh.morphTargetManager || mesh.animations.length) continue;
      let wheel: RegExpExecArray | null = null;
      for (let node: TransformNode | null = mesh; node && node !== anchor; node = node.parent as TransformNode | null) {
        wheel = /^(Left|Right)_(RoadWheel|Idler|Sprocket)(?:_\d+)?$/.exec(node.name);
        if (wheel) break;
      }
      if (!wheel) continue;
      const key = `${mesh.material?.uniqueId}`;
      const candidates = sources.get(key) ?? [];
      const source = candidates.find(candidate => candidate.material === mesh.material &&
        candidate.sideOrientation === mesh.sideOrientation && sameGeometry(candidate, mesh));
      if (!source) { candidates.push(mesh); sources.set(key, candidates); continue; }
      const instance = source.createInstance(mesh.name);
      instance.parent = mesh.parent;
      instance.position.copyFrom(mesh.position); instance.scaling.copyFrom(mesh.scaling);
      instance.rotation.copyFrom(mesh.rotation); instance.rotationQuaternion = mesh.rotationQuaternion?.clone() ?? null;
      instance.metadata = mesh.metadata; instance.isPickable = mesh.isPickable;
      instance.isVisible = mesh.isVisible; instance.visibility = mesh.visibility;
      instance.setEnabled(mesh.isEnabled(false));
      assets.meshes[assets.meshes.indexOf(mesh)] = instance;
      visible[visible.indexOf(mesh)] = instance;
      for (const child of mesh.getChildren()) child.parent = instance;
      mesh.dispose(true);
    }
    if (!visible.length) throw new Error('Tank GLB contains no visible geometry.');
    const minY = Math.min(...visible.map((mesh) => {
      mesh.computeWorldMatrix(true);
      return mesh.getBoundingInfo().boundingBox.minimumWorld.y;
    }));
    // The exported root is at ground level; track bottoms start 0.0764 m above it.
    anchor.position.y += position.y - minY;
    // Turret, gun and side skirts shade the hull and running gear.
    for (const mesh of visible) { mesh.computeWorldMatrix(true); mesh.receiveShadows = true; }
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
