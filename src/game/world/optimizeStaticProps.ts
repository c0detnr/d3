import { Mesh, PBRMaterial, ShaderMaterial, StandardMaterial, TransformNode, type Scene, type AbstractMesh } from '@babylonjs/core';

/** Pulsing colors/opacity need live bindings; shader defines stay live. */
export function freezeSceneMaterials(scene: Scene) {
  const live = new Set(['thermal-hot', 'thermal-cold', 'tank-jammer-lamp', 'jammer-beacon',
    'tank-jammer-field', 'smoke-supply-marker', 'mission-checkpoint']);
  for (const material of scene.materials) {
    if (material instanceof ShaderMaterial || live.has(material.name) || material.name.startsWith('kul-low-fog-')) {
      if (material.isFrozen) material.unfreeze();
      continue;
    }
    material.freeze();
  }
  const lightsChanged = () => {
    for (const material of scene.materials) if (material.isFrozen) material.markDirty(true);
  };
  scene.onNewLightAddedObservable.add(lightsChanged);
  scene.onLightRemovedObservable.add(lightsChanged);
}

/** Only call after placement is final; animated nodes and glow-layer members must be excluded. */
export function optimizeStaticProps(meshes: AbstractMesh[], casters: AbstractMesh[], excluded: readonly AbstractMesh[] = []) {
  const shadowSet = new Set(casters);
  const animated = new Set(meshes[0]?.getScene().animationGroups.flatMap(group => group.targetedAnimations.map(a => a.target)) ?? []);
  const staticHierarchy = (mesh: AbstractMesh) => {
    for (let node: TransformNode | null = mesh; node; node = node.parent as TransformNode | null) {
      if (!(node instanceof TransformNode) || node.animations.length || animated.has(node) ||
          node.getScene().getAllAnimatablesByTarget(node).length || /smoke-placement|^loot-|^fired-/.test(node.name) ||
          node.physicsBody || (node !== mesh && node instanceof Mesh && node.getTotalVertices() > 0)) return false;
    }
    return true;
  };
  const rootOf = (mesh: AbstractMesh) => {
    let root = mesh.parent;
    while (root?.parent) root = root.parent;
    return root;
  };
  const groups = new Map<string, Mesh[]>();
  for (const mesh of meshes) {
    if (excluded.includes(mesh) || mesh.name.startsWith('natural-terrain') || mesh.isDisposed() || !staticHierarchy(mesh)) continue;
    if (mesh.material && !(mesh.material instanceof ShaderMaterial) && mesh.material.alpha === 1 && !mesh.material.needAlphaBlending()) mesh.material.freeze();
    if (mesh.skeleton || mesh instanceof Mesh && (mesh.hasThinInstances || mesh.morphTargetManager)) continue;
    mesh.freezeWorldMatrix();
    mesh.doNotSyncBoundingInfo = true;
    if (!(mesh instanceof Mesh) || !(mesh.material instanceof StandardMaterial || mesh.material instanceof PBRMaterial) || mesh.physicsBody ||
        mesh.getChildren().length || mesh.instances.length || !mesh.isVisible || !mesh.getTotalVertices() ||
        mesh.material.alpha !== 1 || mesh.material.needAlphaBlending() || mesh.material.needAlphaTesting() || mesh.getBoundingInfo().boundingSphere.radiusWorld > 20) continue;
    const center = mesh.getBoundingInfo().boundingSphere.centerWorld;
    // Local batches retain culling, picking/surface semantics and shadow membership.
    const { gltf: _gltf, ...surfaceMetadata } = mesh.metadata ?? {};
    const key = JSON.stringify([rootOf(mesh)?.uniqueId, mesh.material.uniqueId, Math.floor(center.x / 128), Math.floor(center.z / 128),
      mesh.isPickable, mesh.receiveShadows, shadowSet.has(mesh), mesh.sideOrientation, mesh.getVerticesDataKinds().sort(), surfaceMetadata]);
    const parts = groups.get(key) ?? [];
    parts.push(mesh); groups.set(key, parts);
  }
  for (const parts of groups.values()) {
    if (parts.length < 2) continue;
    const first = parts[0];
    const parent = rootOf(first);
    const radius = Math.max(...parts.map(mesh => mesh.getBoundingInfo().boundingSphere.radiusWorld));
    const merged = Mesh.MergeMeshes(parts, true, true);
    if (!merged) continue;
    // MergeMeshes bakes each world matrix, including glTF handedness and placement.
    if (parent instanceof TransformNode) merged.setParent(parent);
    merged.name = `${first.name}-batch`;
    merged.isPickable = first.isPickable;
    merged.receiveShadows = first.receiveShadows;
    merged.sideOrientation = first.sideOrientation;
    // Merging small decorations must not promote them to large shadow casters.
    merged.metadata = { ...first.metadata, staticShadowRadius: radius };
    merged.freezeWorldMatrix(); merged.doNotSyncBoundingInfo = true;
    meshes.push(merged);
    if (shadowSet.has(first)) casters.push(merged);
  }
  for (let i = meshes.length - 1; i >= 0; i--) if (meshes[i].isDisposed()) meshes.splice(i, 1);
  for (let i = casters.length - 1; i >= 0; i--) if (casters[i].isDisposed()) casters.splice(i, 1);
}
