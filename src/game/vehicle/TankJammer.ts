import { Color3, Mesh, MeshBuilder, StandardMaterial, Vector3, type Scene, type TransformNode } from '@babylonjs/core';

const SEGMENTS = 72;

/**
 * Visual-only roof jammer: procedural placeholder antenna on the tank anchor (no external assets)
 * and a terrain-hugging field ring. Gameplay effect lives in LaneDroneModel; radius in metres.
 */
export class TankJammer {
  readonly radius: number;
  private readonly parts: Mesh[] = [];
  private readonly materials: StandardMaterial[];
  private ring: Mesh;
  private readonly path: Vector3[];
  private readonly lamp: StandardMaterial;
  private elapsed = 0;
  private readonly scene: Scene;
  private readonly ground: (x: number, z: number) => number;

  constructor(scene: Scene, anchor: TransformNode, radius: number, ground: (x: number, z: number) => number) {
    this.scene = scene; this.radius = radius; this.ground = ground;
    const steel = new StandardMaterial('tank-jammer-steel', scene); steel.diffuseColor = Color3.FromHexString('#3d4540');
    steel.specularColor.set(.1, .1, .1);
    this.lamp = new StandardMaterial('tank-jammer-lamp', scene); this.lamp.disableLighting = true;
    const field = new StandardMaterial('tank-jammer-field', scene); field.disableLighting = true;
    field.emissiveColor = Color3.FromHexString('#e0a53a'); field.alpha = .55;
    this.materials = [steel, this.lamp, field];
    const part = (mesh: Mesh, position: Vector3, material: StandardMaterial) => {
      mesh.parent = anchor; mesh.position.copyFrom(position); mesh.material = material;
      mesh.isPickable = false; mesh.metadata = { temporaryAsset: true }; this.parts.push(mesh); return mesh;
    };
    // Rear-left deck, anchor frame: x right, y up from the ground contact, z forward (metres).
    const base = new Vector3(-.95, 1.72, -2.35);
    part(MeshBuilder.CreateBox('tank-jammer-box', { width: .5, height: .28, depth: .4 }, scene), base.add(new Vector3(0, .14, 0)), steel);
    part(MeshBuilder.CreateCylinder('tank-jammer-mast', { diameter: .05, height: 1.5, tessellation: 6 }, scene), base.add(new Vector3(0, 1.03, 0)), steel);
    for (const [i, y] of [.75, 1.15, 1.55].entries()) {
      part(MeshBuilder.CreateCylinder(`tank-jammer-whip-${i}`, { diameter: .02, height: .5 - i * .1, tessellation: 4 }, scene),
        base.add(new Vector3(0, y, 0)), steel).rotation.z = Math.PI / 2;
    }
    part(MeshBuilder.CreateSphere('tank-jammer-lamp', { diameter: .1, segments: 4 }, scene), base.add(new Vector3(0, 1.82, 0)), this.lamp);
    this.path = Array.from({ length: SEGMENTS + 1 }, () => Vector3.Zero());
    this.ring = MeshBuilder.CreateTube('tank-jammer-ring', { path: this.path, radius: .07, tessellation: 4, updatable: true }, scene);
    this.ring.material = field; this.ring.isPickable = false;
  }

  /** Render-rate visual follow; `active` false hides the field (destroyed tank). */
  render(center: Vector3, active: boolean) {
    this.elapsed += this.scene.getEngine().getDeltaTime() / 1000;
    this.ring.isVisible = active;
    this.lamp.emissiveColor.set(active && Math.sin(this.elapsed * 6) > 0 ? 1 : .12, active ? .62 : .05, .1);
    if (!active) return;
    for (let i = 0; i <= SEGMENTS; i++) {
      const a = i / SEGMENTS * Math.PI * 2, x = center.x + Math.sin(a) * this.radius, z = center.z + Math.cos(a) * this.radius;
      this.path[i].set(x, this.ground(x, z) + .12, z);
    }
    this.ring = MeshBuilder.CreateTube('tank-jammer-ring', { path: this.path, radius: .07, instance: this.ring });
    (this.ring.material as StandardMaterial).alpha = .4 + .15 * Math.sin(this.elapsed * 3);
  }

  dispose() { this.parts.forEach(m => m.dispose()); this.ring.dispose(); this.materials.forEach(m => m.dispose()); }
}
