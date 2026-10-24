import { Color4, RawTexture, Sprite, SpriteManager, Texture, Vector3, type Scene } from '@babylonjs/core';
import { IMPACT_FEEDBACK, type ImpactSurface } from './ImpactSurface.ts';
import { seededRandom } from '../world/terrain.ts';

function createFlareTexture(scene: Scene) {
  const size = 48, pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = (x + 0.5) / size * 2 - 1, v = (y + 0.5) / size * 2 - 1;
    const distance = Math.hypot(u, v);
    const core = Math.max(0, 1 - distance) ** 2.2;
    const halo = Math.max(0, 1 - distance / 0.95) ** 0.6;
    const offset = (y * size + x) * 4;
    pixels.set([255, 255, 255, Math.round(Math.min(1, core + halo * 0.55) * 255)], offset);
  }
  const texture = RawTexture.CreateRGBATexture(pixels, size, size, scene, false, false, Texture.BILINEAR_SAMPLINGMODE);
  texture.name = 'original-procedural-combat-flare';
  return texture;
}

interface CombatParticle {
  previous: Vector3;
  position: Vector3;
  velocity: Vector3;
  age: number;
  life: number;
  size: number;
  gravity: number;
  color: Color4;
}

const CAPACITY = 48;

/** Original pooled sprites for muzzle flash and impact feedback; sounds share the AudioSystem output. */
export class CombatEffects {
  readonly particles: CombatParticle[] = [];
  private readonly manager: SpriteManager;
  private readonly sprites: Sprite[];
  private readonly random = seededRandom(9417);
  private cursor = 0;
  constructor(scene: Scene) {
    this.manager = new SpriteManager('combat-effects', '', CAPACITY, 48, scene);
    this.manager.texture = createFlareTexture(scene);
    this.manager.isPickable = false;
    this.manager.disableDepthWrite = true;
    this.sprites = Array.from({ length: CAPACITY }, (_, index) => {
      const sprite = new Sprite(`combat-effect-${index}`, this.manager);
      sprite.isVisible = false;
      return sprite;
    });
  }
  private spawn(position: Vector3, velocity: Vector3, life: number, size: number,
    color: Color4, gravity = 0) {
    const particle: CombatParticle = {
      previous: position.clone(), position: position.clone(), velocity: velocity.clone(),
      age: 0, life, size, gravity, color,
    };
    const index = this.cursor;
    this.cursor = (this.cursor + 1) % CAPACITY;
    this.particles[index] = particle;
  }
  muzzleFlash(origin: Vector3, direction: Vector3) {
    const forward = direction.normalizeToNew();
    for (let i = 0; i < 4; i++) {
      const spread = new Vector3((this.random() - 0.5) * 2.2, (this.random() - 0.5) * 1.4, (this.random() - 0.5) * 2.2);
      this.spawn(origin, forward.scale(5 + this.random() * 5).add(spread), 0.07 + this.random() * 0.05,
        0.7 + this.random() * 0.8, new Color4(1, 0.78 + this.random() * 0.2, 0.38, 1));
    }
    for (let i = 0; i < 3; i++) this.spawn(origin.add(forward.scale(0.35)),
      forward.scale(1.5).add(new Vector3((this.random() - 0.5) * 0.7, 0.8, 0)),
      0.3 + this.random() * 0.2, 0.6 + this.random() * 0.4, new Color4(0.58, 0.56, 0.51, 0.22));
  }
  impact(point: Vector3, normal: Vector3, surface: ImpactSurface) {
    const outward = normal.normalizeToNew();
    const feedback = IMPACT_FEEDBACK[surface];
    const sparks = feedback.sparks;
    for (let i = 0; i < sparks; i++) {
      const random = new Vector3(this.random() - 0.5, this.random() - 0.5, this.random() - 0.5).scale(9);
      this.spawn(point, outward.scale(3 + this.random() * 5).add(random), 0.16 + this.random() * 0.22,
        0.18 + this.random() * 0.22, new Color4(1, 0.82, 0.42, 1), -9.81);
    }
    for (let i = 0; i < feedback.fragments; i++) {
      this.spawn(point.add(outward.scale(0.15)), outward.scale(0.6 + this.random()).add(new Vector3(0, 0.8, 0)),
        0.5 + this.random() * 0.45, 1.1 + this.random() * 1.2, new Color4(feedback.color[0], feedback.color[1], feedback.color[2], 0.5));
    }
  }
  fixedUpdate(dt: number) {
    for (const particle of this.particles) {
      if (!particle || particle.age >= particle.life) continue;
      particle.previous.copyFrom(particle.position);
      particle.age += dt;
      particle.velocity.y += particle.gravity * dt;
      particle.position.addInPlace(particle.velocity.scale(dt));
      particle.velocity.scaleInPlace(1 - Math.min(0.9, 2.4 * dt));
    }
  }
  render(alpha: number) {
    this.sprites.forEach((sprite, index) => {
      const particle = this.particles[index];
      const t = particle ? particle.age / particle.life : 1;
      sprite.isVisible = !!particle && t < 1;
      if (!particle || !sprite.isVisible) return;
      Vector3.LerpToRef(particle.previous, particle.position, alpha, sprite.position);
      sprite.size = particle.size * (particle.gravity < 0 ? 1 - t * 0.65 : 0.5 + t * 1.4);
      sprite.color = new Color4(particle.color.r, particle.color.g, particle.color.b, particle.color.a * (1 - t) ** 1.2);
    });
  }
  reset() {
    this.particles.length = 0;
    this.sprites.forEach(sprite => { sprite.isVisible = false; });
  }
  dispose() { this.manager.dispose(); }
}
