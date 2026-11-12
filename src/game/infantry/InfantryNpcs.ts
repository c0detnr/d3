import { LoadAssetContainerAsync, TransformNode, Vector3, type AssetContainer, type InstantiatedEntries, type Scene } from '@babylonjs/core';
import { registerBuiltInLoaders } from '@babylonjs/loaders/dynamic.js';
import { INFANTRY, infantryBlastVictims, type InfantryTarget } from './infantryConfig.ts';

import { soldierProfileAt, type SoldierProfile } from './soldierProfiles.ts';

registerBuiltInLoaders();
const CLIPS = { alert: 'Idle_Alert', smoke: 'Idle_Smoke', dead: 'Death_Fall' } as const;
export interface InfantryGarrison { position: Vector3; yaw: number }
interface InfantryNpc extends InfantryTarget {
  profile: SoldierProfile;
  position: Vector3;
  yaw: number;
  anchor: TransformNode;
  nodes: InstantiatedEntries;
  cigarettes: TransformNode[];
}

/** Non-blocking scenery actors. No physics bodies or per-frame UI state. */
export class InfantryNpcs {
  readonly npcs: InfantryNpc[] = [];
  private disposed = false;
  private readonly assets: AssetContainer;
  private constructor(assets: AssetContainer) { this.assets = assets; }

  static async load(scene: Scene, sources: { rigged?: string | Uint8Array; fallback: string | Uint8Array },
    garrisons: readonly InfantryGarrison[], height: (x: number, z: number) => number) {
    let assets: AssetContainer | undefined;
    if (sources.rigged) {
      try {
        assets = await LoadAssetContainerAsync(sources.rigged, scene, { pluginExtension: '.glb' });
        if (!Object.values(CLIPS).every(name => assets!.animationGroups.some(group => group.name === name))) {
          assets.dispose(); assets = undefined;
        }
      } catch (error) {
        if (scene.isDisposed) throw error;
        console.warn('Piyade rig yüklenemedi; statik model kullanılacak.', error);
      }
    }
    if (scene.isDisposed) { assets?.dispose(); throw new Error('Piyade yüklenirken sahne kapandı.'); }
    assets ??= await LoadAssetContainerAsync(sources.fallback, scene, { pluginExtension: '.glb' });
    const system = new InfantryNpcs(assets);
    try {
      if (scene.isDisposed) throw new Error('Piyade yüklenirken sahne kapandı.');
      for (const garrison of garrisons.slice(0, INFANTRY.maxGarrisons)) {
        for (const offset of INFANTRY.offsets) {
          const id = `infantry-${system.npcs.length}-`;
          const nodes = assets.instantiateModelsToScene(name => id + name, false, { doNotInstantiate: true });
          const anchor = new TransformNode(id + 'placement', scene);
          nodes.rootNodes.forEach(node => { node.parent = anchor; });
          const { yaw, position } = garrison;
          anchor.position.set(position.x + offset.x * Math.cos(yaw) + offset.z * Math.sin(yaw), 0,
            position.z + offset.z * Math.cos(yaw) - offset.x * Math.sin(yaw));
          anchor.position.y = height(anchor.position.x, anchor.position.z);
          anchor.rotation.y = yaw + offset.yaw;
          anchor.getChildMeshes().forEach(mesh => { mesh.isPickable = false; mesh.receiveShadows = true; });
          const npc: InfantryNpc = { position: anchor.position, yaw: anchor.rotation.y, state: offset.state,
            hp: INFANTRY.hp, profile: soldierProfileAt(system.npcs.length), anchor, nodes,
            cigarettes: anchor.getDescendants().filter((node): node is TransformNode =>
              node instanceof TransformNode && node.name === id + 'Cigarette') };
          system.npcs.push(npc);
          system.play(npc, true);
        }
      }
      return system;
    } catch (error) { system.dispose(); throw error; }
  }

  private play(npc: InfantryNpc, randomOffset = false) {
    npc.nodes.animationGroups.forEach(group => group.stop());
    npc.cigarettes.forEach(node => node.setEnabled(npc.state === 'smoke'));
    const clip = npc.nodes.animationGroups.find(group => group.name.endsWith(CLIPS[npc.state]));
    if (!clip) {
      if (npc.state === 'dead') npc.anchor.rotation.x = Math.PI / 2;
      return;
    }
    clip.start(npc.state !== 'dead', 1, clip.from, clip.to);
    if (randomOffset) clip.goToFrame(clip.from + Math.random() * (clip.to - clip.from));
    // Babylon leaves non-looping animation targets on their last frame.
  }

  detonate(point: Vector3) {
    if (this.disposed) return [];
    const victims = infantryBlastVictims(point, this.npcs);
    for (const npc of victims) { npc.hp = 0; npc.state = 'dead'; this.play(npc); }
    return victims;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const npc of this.npcs) { npc.nodes.dispose(); npc.anchor.dispose(); }
    this.npcs.length = 0;
    this.assets.dispose();
  }
}
