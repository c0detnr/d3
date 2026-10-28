import { Color4, Constants, Sprite, SpriteManager, Texture, Vector3, type Scene } from '@babylonjs/core';
import type { TankVehicle } from '../vehicle/TankVehicle.ts';
import { DustSimulation } from './DustSimulation.ts';
import { MOVEMENT_DUST } from './MovementEffectsDefinition.ts';

export class MovementEffects {
  readonly simulation = new DustSimulation();
  private readonly manager: SpriteManager;
  private readonly sprites: Sprite[];
  private readonly sides: number[];
  enabled = true;
  constructor(scene: Scene, vehicle: TankVehicle) {
    this.sides = vehicle.rig.wheels.map(wheel => wheel.side);
    this.manager = new SpriteManager('track-dust',
      new URL('../../../assets/vfx/brackeys/particles/alpha/smoke_01_a.png', import.meta.url).href,
      MOVEMENT_DUST.capacity, 512, scene, 0.01, Texture.BILINEAR_SAMPLINGMODE);
    this.manager.blendMode = Constants.ALPHA_COMBINE;
    this.manager.fogEnabled = true;
    this.manager.isPickable = false;
    this.manager.disableDepthWrite = true;
    this.sprites = this.simulation.particles.map((_, index) => {
      const sprite = new Sprite(`dust-${index}`, this.manager);
      sprite.color = new Color4(0.74, 0.67, 0.54, 0);
      sprite.isVisible = false;
      return sprite;
    });
  }
  fixedUpdate(vehicle: TankVehicle, dt: number) {
    const cameraDistance = Vector3.Distance(vehicle.node.position, vehicle.scene.activeCamera!.globalPosition);
    const density = !this.enabled || cameraDistance > 350 ? 0 : cameraDistance > 80 ? 0.25 : 1;
    this.simulation.step(dt, vehicle.contacts, this.sides, vehicle.definition.mass * 9.81 / vehicle.contacts.length, density);
  }
  render(alpha: number) {
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
  reset() { this.simulation.reset(); this.sprites.forEach(sprite => { sprite.isVisible = false; }); }
  dispose() { this.manager.dispose(); }
}
