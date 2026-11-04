import { Color4, Constants, Sprite, SpriteManager, Texture, Vector3, type Scene } from '@babylonjs/core';
import type { TankVehicle } from '../vehicle/TankVehicle.ts';
import { DustSimulation, type DustParticle } from './DustSimulation.ts';
import { MOVEMENT_DUST, MOVEMENT_MUD } from './MovementEffectsDefinition.ts';

/** 8x8 pre-lit billowing cloud; frames advance over each particle's life. */
const DUST_FLIPBOOK = new URL('../../../assets/vfx/brackeys/runtime/cloud_01_8x8.png', import.meta.url).href;
const MUD_TEXTURE = new URL('../../../assets/vfx/brackeys/particles/alpha/dirt_02_a.png', import.meta.url).href;
const FLIPBOOK_FRAMES = 64;
/** Dry topsoil to darker damp dirt (linear 0..1). */
const DUST_LIGHT = [0.82, 0.73, 0.58], DUST_DARK = [0.62, 0.53, 0.41];
const MUD_LIGHT = [0.36, 0.29, 0.21], MUD_DARK = [0.2, 0.16, 0.12];

function createManager(name: string, url: string, capacity: number, cellSize: number, scene: Scene) {
  const manager = new SpriteManager(name, url, capacity, cellSize, scene, 0.01, Texture.TRILINEAR_SAMPLINGMODE);
  manager.blendMode = Constants.ALPHA_COMBINE;
  manager.fogEnabled = true;
  manager.isPickable = false;
  manager.disableDepthWrite = true;
  return manager;
}
function createSprites(manager: SpriteManager, particles: readonly DustParticle[], prefix: string) {
  return particles.map((_, index) => {
    const sprite = new Sprite(`${prefix}-${index}`, manager);
    sprite.color = new Color4(1, 1, 1, 0);
    sprite.isVisible = false;
    return sprite;
  });
}
const mix = (a: number[], b: number[], t: number, color: Color4) => {
  color.r = a[0] + (b[0] - a[0]) * t; color.g = a[1] + (b[1] - a[1]) * t; color.b = a[2] + (b[2] - a[2]) * t;
};

export class MovementEffects {
  readonly simulation = new DustSimulation();
  private readonly managers: SpriteManager[];
  private readonly dust: Sprite[];
  private readonly mud: Sprite[];
  private readonly sides: number[];
  enabled = true;
  constructor(scene: Scene, vehicle: TankVehicle) {
    this.sides = vehicle.rig.wheels.map(wheel => wheel.side);
    // Clods render first so the dust cloud veils them.
    const mud = createManager('track-mud', MUD_TEXTURE, MOVEMENT_MUD.capacity, 512, scene);
    const dust = createManager('track-dust', DUST_FLIPBOOK, MOVEMENT_DUST.capacity, 128, scene);
    this.managers = [mud, dust];
    this.mud = createSprites(mud, this.simulation.clods, 'mud');
    this.dust = createSprites(dust, this.simulation.particles, 'dust');
  }
  fixedUpdate(vehicle: TankVehicle, dt: number) {
    const cameraDistance = Vector3.Distance(vehicle.node.position, vehicle.scene.activeCamera!.globalPosition);
    const density = !this.enabled || cameraDistance > 350 ? 0 : cameraDistance > 80 ? 0.25 : 1;
    this.simulation.step(dt, vehicle.contacts, this.sides, vehicle.definition.mass * 9.81 / vehicle.contacts.length, density);
  }
  render(alpha: number) {
    const lag = (1 - alpha) / 60;
    this.simulation.particles.forEach((p, index) => {
      const sprite = this.dust[index];
      const age = Math.max(0, p.age - lag);
      const t = p.life > 0 ? age / p.life : 1;
      sprite.isVisible = this.enabled && t < 1;
      if (!sprite.isVisible) return;
      Vector3.LerpToRef(p.previous, p.position, alpha, sprite.position);
      // Fast early puff, then slow billowing spread.
      sprite.size = p.size * (0.45 + 1.6 * (1 - (1 - t) ** 2.2));
      sprite.angle = p.angle + age * (p.shade - 0.5) * 0.5;
      sprite.cellIndex = Math.min(FLIPBOOK_FRAMES - 1, Math.floor(t * FLIPBOOK_FRAMES));
      // Fresh dust is denser/darker; it lightens as it thins out.
      mix(DUST_DARK, DUST_LIGHT, Math.min(1, p.shade * 0.6 + t * 0.6), sprite.color);
      sprite.color.a = Math.min(1, t / 0.08) * (1 - t) ** 1.6 * 0.8;
    });
    this.simulation.clods.forEach((p, index) => {
      const sprite = this.mud[index];
      const age = Math.max(0, p.age - lag);
      const t = p.life > 0 ? age / p.life : 1;
      sprite.isVisible = this.enabled && t < 1;
      if (!sprite.isVisible) return;
      Vector3.LerpToRef(p.previous, p.position, alpha, sprite.position);
      sprite.size = p.size;
      sprite.angle = p.angle + age * (p.shade - 0.5) * 14;
      mix(MUD_DARK, MUD_LIGHT, p.shade, sprite.color);
      sprite.color.a = Math.min(1, (1 - t) / 0.15);
    });
  }
  reset() {
    this.simulation.reset();
    [...this.dust, ...this.mud].forEach(sprite => { sprite.isVisible = false; });
  }
  dispose() { this.managers.forEach(manager => manager.dispose()); }
}
