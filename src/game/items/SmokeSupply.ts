import { Color3, LoadAssetContainerAsync, MeshBuilder, StandardMaterial, TransformNode, Vector3, type AssetContainer, type InstantiatedEntries, type Scene } from '@babylonjs/core';
import { registerBuiltInLoaders } from '@babylonjs/loaders/dynamic.js';
import { SMOKE, SmokeModel } from './SmokeModel.ts';
import { SmokeParticles } from '../effects/SmokeParticles.ts';
import { smokeSound } from '../audio/SmokeAudio.ts';
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

/** World-space launcher pose follows turret yaw and the hull's current slope. */
export function turretLauncherPose(pivot: TransformNode) {
  const world = pivot.computeWorldMatrix(true);
  return { origin: Vector3.TransformCoordinates(new Vector3(0, .35, .8), world),
    forward: pivot.getDirection(Vector3.Forward()).normalize() };
}

export class SmokeSupply {
  readonly model = new SmokeModel();
  readonly supplies: Supply[] = [];
  private readonly capsules: Capsule[] = [];
  private readonly screen: SmokeScreen;
  private readonly particles: SmokeParticles;
  private readonly markers: ReturnType<typeof MeshBuilder.CreateTorus>[] = [];
  private readonly markerMaterial: StandardMaterial;
  private time = 0;
  /** Integration may supply real turret launcher position/direction; legacy hull callers still work. */
  launcherPose?: () => { origin: Vector3; forward: Vector3 };
  private readonly scene: Scene;
  private readonly height: (x: number, z: number) => number;
  private readonly supplyAssets: AssetContainer;
  private readonly capsuleAssets: AssetContainer;

  private constructor(scene: Scene, supplyAssets: AssetContainer, capsuleAssets: AssetContainer, height: (x: number, z: number) => number) {
    this.scene = scene; this.supplyAssets = supplyAssets; this.capsuleAssets = capsuleAssets; this.height = height;
    this.screen = new SmokeScreen(scene, this.model);
    this.particles = new SmokeParticles(scene);
    this.markerMaterial = new StandardMaterial('smoke-supply-marker', scene);
    this.markerMaterial.disableLighting = true;
    this.markerMaterial.emissiveColor = new Color3(.68, .78, .42);
    this.markerMaterial.alpha = .65;
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
        const marker = MeshBuilder.CreateTorus('smoke-supply-beacon', { diameter: 1.5, thickness: .045, tessellation: 24 }, scene);
        marker.position.copyFrom(position); marker.position.y += .08;
        marker.isPickable = false; marker.material = system.markerMaterial;
        system.markers.push(marker);
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
    this.markers[this.supplies.indexOf(supply)].setEnabled(false);
    smokeSound('pickup');
    return true;
  }

  fire(origin: Vector3, forward: Vector3, clip: (from: Vector3, to: Vector3) => Vector3) {
    const pose = this.launcherPose?.();
    origin = pose?.origin ?? origin; forward = pose?.forward ?? forward;
    const direction = new Vector3(forward.x, 0, forward.z);
    if (direction.lengthSquared() < 1e-8) return false;
    direction.normalize();
    const right = new Vector3(direction.z, 0, -direction.x);
    const origins: Vector3[] = [];
    const centers = Array.from({ length: SMOKE.salvo }, (_, index) => {
      const side = index / (SMOKE.salvo - 1) * 2 - 1;
      const launcher = origin.add(right.scale(side < 0 ? -1 : 1)).add(direction.scale(.3));
      origins.push(launcher);
      const target = origin.add(direction.scale(SMOKE.distance - Math.abs(side))).add(right.scale(side * SMOKE.spread));
      const clipped = clip(launcher, target).clone();
      clipped.y = this.height(clipped.x, clipped.z) + SMOKE.cloudHeight;
      return clipped;
    });
    if (!this.model.fire(centers)) return false;
    this.particles.launch(origins); smokeSound('launch');
    for (const [index, center] of centers.entries()) {
      const nodes = this.capsuleAssets.instantiateModelsToScene(name => `fired-${name}`, false);
      const anchor = placeInstance(this.scene, nodes, origins[index]);
      anchor.scaling.setAll(.65);
      this.capsules.push({ nodes, anchor, origin: origins[index].clone(), target: center.clone(), age: 0 });
    }
    return true;
  }

  fixedUpdate(dt: number) {
    this.model.fixedUpdate(dt); this.particles.fixedUpdate(dt); this.time += dt;
    this.markerMaterial.alpha = .5 + Math.sin(this.time * 2) * .15;
    // shortcut: Capsule flight is visual; add swept flight collision when low ceilings require it.
    for (let i = this.capsules.length - 1; i >= 0; i--) {
      const capsule = this.capsules[i]; capsule.age += dt;
      if (capsule.age >= SMOKE.flight) { if (i === 0) smokeSound('burst'); capsule.nodes.dispose(); capsule.anchor.dispose(); this.capsules.splice(i, 1); continue; }
      const t = capsule.age / SMOKE.flight;
      const position = Vector3.Lerp(capsule.origin, capsule.target, t);
      position.y += 4 * t * (1 - t) * SMOKE.arcHeight;
      capsule.anchor.position.copyFrom(position); capsule.anchor.rotation.x = t * Math.PI * 3;
    }
  }

  render() { this.particles.update(this.model); this.screen.update(); }
  reset() {
    this.model.reset(); this.screen.dispose(); this.particles.reset();
    this.capsules.forEach(c => { c.nodes.dispose(); c.anchor.dispose(); }); this.capsules.length = 0;
    this.supplies.forEach(s => { s.collected = false; s.anchor.setEnabled(true); });
    this.markers.forEach(m => m.setEnabled(true));
  }
  dispose() {
    this.reset(); this.supplies.forEach(s => { s.nodes.dispose(); s.anchor.dispose(); }); this.supplies.length = 0;
    this.markers.forEach(m => m.dispose()); this.markerMaterial.dispose(); this.particles.dispose();
    this.supplyAssets.dispose(); this.capsuleAssets.dispose();
  }
}
