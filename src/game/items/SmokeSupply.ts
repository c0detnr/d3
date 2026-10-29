import { LoadAssetContainerAsync, TransformNode, Vector3, type AssetContainer, type InstantiatedEntries, type Scene } from '@babylonjs/core';
import { registerBuiltInLoaders } from '@babylonjs/loaders/dynamic.js';
import { SMOKE, SmokeModel } from './SmokeModel.ts';
import { SmokeScreen } from './SmokeScreen.ts';
registerBuiltInLoaders();

interface Supply { position: Vector3; nodes: InstantiatedEntries; anchor: TransformNode; collected: boolean }
interface Capsule { origin: Vector3; target: Vector3; nodes: InstantiatedEntries; anchor: TransformNode; age: number }

function placeInstance(scene: Scene, nodes: InstantiatedEntries, position: Vector3) {
  // Keep the imported glTF handedness transform intact beneath our placement node.
  const anchor = new TransformNode('smoke-placement', scene);
  nodes.rootNodes.forEach(node => { node.parent = anchor; });
  anchor.position.copyFrom(position);
  anchor.getChildMeshes().forEach(mesh => { mesh.isPickable = false; });
  return anchor;
}

export class SmokeSupply {
  readonly model = new SmokeModel();
  readonly supplies: Supply[] = [];
  private readonly capsules: Capsule[] = [];
  private readonly screen: SmokeScreen;
  private readonly scene: Scene;
  private readonly height: (x: number, z: number) => number;
  private readonly supplyAssets: AssetContainer;
  private readonly capsuleAssets: AssetContainer;

  private constructor(scene: Scene, supplyAssets: AssetContainer, capsuleAssets: AssetContainer, height: (x: number, z: number) => number) {
    this.scene = scene; this.supplyAssets = supplyAssets; this.capsuleAssets = capsuleAssets; this.height = height;
    this.screen = new SmokeScreen(scene, this.model);
  }

  static async load(scene: Scene, supplyUrl: string | Uint8Array, capsuleUrl: string | Uint8Array,
    spawn: Vector3, height: (x: number, z: number) => number, yaw = 0) {
    const supplyAssets = await LoadAssetContainerAsync(supplyUrl, scene, { pluginExtension: '.glb' });
    let capsuleAssets: AssetContainer | undefined;
    try {
      capsuleAssets = await LoadAssetContainerAsync(capsuleUrl, scene, { pluginExtension: '.glb' });
      if (scene.isDisposed) throw new Error('Smoke supply loaded after scene disposal.');
      const system = new SmokeSupply(scene, supplyAssets, capsuleAssets, height);
      for (const [x, z] of [[6, 4], [-7, 15], [8, 26]]) {
        const position = spawn.add(new Vector3(x * Math.cos(yaw) + z * Math.sin(yaw), 0, z * Math.cos(yaw) - x * Math.sin(yaw)));
        position.y = height(position.x, position.z) + .03;
        const nodes = supplyAssets.instantiateModelsToScene(name => `loot-${system.supplies.length}-${name}`, false);
        const anchor = placeInstance(scene, nodes, position);
        anchor.rotation.y = yaw + .2 * system.supplies.length;
        anchor.getChildMeshes().forEach(mesh => { mesh.receiveShadows = true; });
        system.supplies.push({ position, nodes, anchor, collected: false });
      }
      return system;
    } catch (error) { supplyAssets.dispose(); capsuleAssets?.dispose(); throw error; }
  }

  nearest(position: Vector3) {
    return this.supplies.filter(s => !s.collected && Vector3.Distance(position, s.position) <= SMOKE.pickupRange)
      .sort((a, b) => Vector3.DistanceSquared(a.position, position) - Vector3.DistanceSquared(b.position, position))[0];
  }

  collect(position: Vector3, clearPath: (to: Vector3) => boolean) {
    const supply = this.nearest(position);
    if (!supply || !clearPath(supply.position.add(new Vector3(0, .6, 0))) || !this.model.collect()) return false;
    supply.collected = true;
    supply.anchor.setEnabled(false);
    return true;
  }

  fire(origin: Vector3, forward: Vector3, clip: (from: Vector3, to: Vector3) => Vector3) {
    const direction = new Vector3(forward.x, 0, forward.z).normalize();
    const right = new Vector3(direction.z, 0, -direction.x);
    const centers = [-1, 0, 1].map(side => {
      const target = origin.add(direction.scale(12)).add(right.scale(side * 6));
      const clipped = clip(origin, target);
      clipped.y = this.height(clipped.x, clipped.z) + 2.1;
      return clipped;
    });
    if (!this.model.fire(centers)) return false;
    for (const center of centers) {
      const nodes = this.capsuleAssets.instantiateModelsToScene(name => `fired-${name}`, false);
      const anchor = placeInstance(this.scene, nodes, origin);
      this.capsules.push({ nodes, anchor, origin: origin.clone(), target: center.subtract(new Vector3(0, 1.95, 0)), age: 0 });
    }
    return true;
  }

  fixedUpdate(dt: number) {
    this.model.fixedUpdate(dt);
    // shortcut: Capsule flight is visual; add swept flight collision when low ceilings require it.
    for (let i = this.capsules.length - 1; i >= 0; i--) {
      const capsule = this.capsules[i]; capsule.age += dt;
      if (capsule.age >= SMOKE.flight) { capsule.nodes.dispose(); capsule.anchor.dispose(); this.capsules.splice(i, 1); continue; }
      const t = capsule.age / SMOKE.flight;
      const position = Vector3.Lerp(capsule.origin, capsule.target, t);
      position.y += Math.sin(t * Math.PI) * 2;
      capsule.anchor.position.copyFrom(position); capsule.anchor.rotation.x = t * Math.PI * 3;
    }
  }

  render() { this.screen.update(); }
  reset() {
    this.model.reset(); this.screen.dispose();
    this.capsules.forEach(c => { c.nodes.dispose(); c.anchor.dispose(); }); this.capsules.length = 0;
    this.supplies.forEach(s => { s.collected = false; s.anchor.setEnabled(true); });
  }
  dispose() {
    this.reset(); this.supplies.forEach(s => { s.nodes.dispose(); s.anchor.dispose(); }); this.supplies.length = 0;
    this.supplyAssets.dispose(); this.capsuleAssets.dispose();
  }
}
