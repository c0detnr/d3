import { Color3, Color4, MeshBuilder, RawTexture, Sprite, SpriteManager, StandardMaterial, Texture, Vector3, type Mesh, type Scene } from '@babylonjs/core';
import type { TankVehicle } from '../vehicle/TankVehicle.ts';
import { seededRandom } from '../world/terrain.ts';
import { DustSimulation } from './DustSimulation.ts';
import { MOVEMENT_DUST } from './MovementEffectsDefinition.ts';

/** Original procedural dust sprite; no downloaded artwork. Soft, irregular alpha lobes. */
function createDustTexture(scene: Scene) {
  const size = 64, pixels = new Uint8Array(size * size * 4);
  const random = seededRandom(482);
  const lobes = Array.from({ length: 9 }, () => ({
    x: (random() - 0.5) * 0.8, y: (random() - 0.5) * 0.8, radius: 0.35 + random() * 0.35,
  }));
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = (x + 0.5) / size * 2 - 1, v = (y + 0.5) / size * 2 - 1;
    let alpha = 0;
    for (const lobe of lobes) alpha = Math.max(alpha,
      Math.max(0, 1 - Math.hypot(u - lobe.x, v - lobe.y) / lobe.radius) ** 1.6);
    const edge = Math.max(0, 1 - Math.hypot(u, v)) ** 0.5;
    const offset = (y * size + x) * 4;
    pixels.set([255, 255, 255, Math.round(alpha * edge * (0.88 + random() * 0.12) * 255)], offset);
  }
  const texture = RawTexture.CreateRGBATexture(pixels, size, size, scene, false, false, Texture.BILINEAR_SAMPLINGMODE);
  texture.name = 'original-procedural-track-dust';
  return texture;
}

export class MovementEffects {
  readonly simulation = new DustSimulation();
  private readonly manager: SpriteManager;
  private readonly sprites: Sprite[];
  private readonly sides: number[];
  private readonly debrisMeshes: Mesh[];
  private readonly debrisMaterial: StandardMaterial;
  enabled = true;
  constructor(scene: Scene, vehicle: TankVehicle) {
    this.sides = vehicle.rig.wheels.map(wheel => wheel.side);
    this.manager = new SpriteManager('track-dust', '', MOVEMENT_DUST.capacity, 64, scene);
    this.manager.texture = createDustTexture(scene);
    this.manager.isPickable = false;
    this.manager.disableDepthWrite = true;
    this.sprites = this.simulation.particles.map((_, index) => {
      const sprite = new Sprite(`dust-${index}`, this.manager);
      sprite.color = new Color4(0.74, 0.67, 0.54, 0);
      sprite.isVisible = false;
      return sprite;
    });
    this.debrisMaterial = new StandardMaterial('original-procedural-track-gravel', scene);
    this.debrisMaterial.diffuseColor = new Color3(0.31, 0.24, 0.17);
    this.debrisMaterial.specularColor = Color3.Black();
    this.debrisMeshes = this.simulation.debris.map((_, index) => {
      const mesh = MeshBuilder.CreatePolyhedron(`track-gravel-${index}`, { type: 1, size: 0.5 }, scene);
      mesh.material = this.debrisMaterial; mesh.isPickable = false; mesh.setEnabled(false);
      return mesh;
    });
  }
  fixedUpdate(vehicle: TankVehicle, dt: number) {
    const cameraDistance = Vector3.Distance(vehicle.node.position, vehicle.scene.activeCamera!.globalPosition);
    const density = !this.enabled || cameraDistance > 350 ? 0 : cameraDistance > 80 ? 0.25 : 1;
    this.simulation.step(dt, vehicle.contacts, this.sides, vehicle.definition.mass * 9.81 / vehicle.contacts.length,
      density, vehicle.brake, vehicle.speed);
  }
  render(alpha: number) {
    this.simulation.debris.forEach((p, index) => {
      const mesh = this.debrisMeshes[index];
      mesh.setEnabled(this.enabled && p.age < p.life);
      if (!mesh.isEnabled()) return;
      Vector3.LerpToRef(p.previous, p.position, alpha, mesh.position);
      mesh.scaling.setAll(p.size * Math.min(1, (1 - p.age / p.life) * 5));
      mesh.rotation.set(p.angle + p.age * 9, p.angle + p.age * 5, p.age * 7);
    });
    this.simulation.particles.forEach((p, index) => {
      const sprite = this.sprites[index];
      const age = Math.max(0, p.age - (1 - alpha) / 60);
      const t = p.life > 0 ? age / p.life : 1;
      sprite.isVisible = this.enabled && t < 1;
      if (!sprite.isVisible) return;
      Vector3.LerpToRef(p.previous, p.position, alpha, sprite.position);
      sprite.size = p.size * (0.4 + t * 0.85);
      sprite.angle = p.angle + age * 0.12;
      sprite.color.a = Math.min(1, t / 0.12) * (1 - t) ** 1.4 * 0.65;
    });
  }
  reset() {
    this.simulation.reset(); this.sprites.forEach(sprite => { sprite.isVisible = false; });
    this.debrisMeshes.forEach(mesh => mesh.setEnabled(false));
  }
  dispose() { this.manager.dispose(); this.debrisMeshes.forEach(mesh => mesh.dispose()); this.debrisMaterial.dispose(); }
}
