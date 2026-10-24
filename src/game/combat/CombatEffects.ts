import { Color3, Color4, Constants, PointLight, RawTexture, Sprite, SpriteManager, Texture, Vector3, type Scene } from '@babylonjs/core';
import { IMPACT_FEEDBACK, type ImpactSurface } from './ImpactSurface.ts';
import { seededRandom } from '../world/terrain.ts';

/** Original code-generated textures: sharp luminous core and irregular, translucent gas. */
function createTexture(scene: Scene, smoke: boolean) {
  const size = 64, pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = (x + 0.5) / size * 2 - 1, v = (y + 0.5) / size * 2 - 1;
    const angle = Math.atan2(v, u);
    const edge = smoke ? 0.81 + 0.08 * Math.sin(angle * 5 + 1) + 0.06 * Math.cos(angle * 7) : 1;
    const radial = Math.max(0, 1 - Math.hypot(u, v) / edge);
    const detail = 0.62 + 0.16 * Math.sin(u * 17 + Math.sin(v * 13))
      + 0.12 * Math.cos(v * 23 - u * 9) + 0.1 * Math.sin(u * 39 + v * 31);
    const alpha = smoke ? Math.min(1, radial * 3) * radial ** 0.4 * detail : radial ** 3;
    pixels.set([255, 255, 255, Math.round(alpha * 255)], (y * size + x) * 4);
  }
  const texture = RawTexture.CreateRGBATexture(pixels, size, size, scene, false, false, Texture.BILINEAR_SAMPLINGMODE);
  texture.name = smoke ? 'original-combat-turbulent-gas' : 'original-combat-flash';
  return texture;
}

type ParticleKind = 'flash' | 'smoke' | 'dust' | 'spark';
interface CombatParticle {
  previous: Vector3;
  position: Vector3;
  velocity: Vector3;
  age: number;
  previousAge: number;
  life: number;
  size: number;
  gravity: number;
  color: Color4;
  kind: ParticleKind;
  angle: number;
  spin: number;
}
export interface BlastGround { point: Vector3; normal: Vector3 }
export const COMBAT_PARTICLE_CAPACITY = 128;

/** Fixed-step world-space effects. Gas and dust use alpha blending; only flash/sparks emit light. */
export class CombatEffects {
  readonly particles: CombatParticle[] = [];
  private readonly managers: SpriteManager[];
  private readonly sprites: Sprite[][];
  private readonly random = seededRandom(9417);
  private cursor = 0;
  private readonly flashLight: PointLight;
  private flashAge = Infinity;
  constructor(scene: Scene) {
    this.flashLight = new PointLight('cannon-muzzle-light', Vector3.Zero(), scene);
    this.flashLight.diffuse = new Color3(1, 0.72, 0.42);
    this.flashLight.range = 12;
    this.flashLight.intensity = 0;
    this.managers = [false, true].map(smoke => {
      const manager = new SpriteManager(smoke ? 'combat-gas' : 'combat-flash', '', COMBAT_PARTICLE_CAPACITY, 64, scene);
      manager.texture = createTexture(scene, smoke);
      manager.isPickable = false;
      manager.disableDepthWrite = true;
      manager.blendMode = smoke ? Constants.ALPHA_COMBINE : Constants.ALPHA_ADD;
      manager.fogEnabled = smoke;
      return manager;
    });
    this.sprites = this.managers.map(manager => Array.from({ length: COMBAT_PARTICLE_CAPACITY }, (_, index) => {
      const sprite = new Sprite(`combat-effect-${manager.name}-${index}`, manager);
      sprite.isVisible = false;
      return sprite;
    }));
  }
  private spawn(position: Vector3, velocity: Vector3, life: number, size: number,
    color: Color4, gravity = 0, kind: ParticleKind = 'smoke') {
    const particle: CombatParticle = {
      previous: position.clone(), position: position.clone(), velocity: velocity.clone(),
      age: 0, previousAge: 0, life, size, gravity, color, kind,
      angle: this.random() * Math.PI * 2, spin: (this.random() - 0.5) * 0.5,
    };
    this.particles[this.cursor] = particle;
    this.cursor = (this.cursor + 1) % COMBAT_PARTICLE_CAPACITY;
  }
  muzzleFlash(origin: Vector3, direction: Vector3, ground?: BlastGround) {
    const forward = direction.normalizeToNew();
    this.flashLight.position.copyFrom(origin);
    this.flashAge = 0;
    const right = Vector3.Cross(Math.abs(forward.y) > 0.95 ? Vector3.Right() : Vector3.Up(), forward).normalize();
    const up = Vector3.Cross(forward, right).normalize();
    // A compact flash, gone before the lingering gas: no long-lived orange fireball.
    for (let i = 0; i < 3; i++) this.spawn(origin.add(forward.scale(0.15 + i * 0.4)),
      forward.scale(18 + i * 5), 0.035 + this.random() * 0.025,
      0.7 - i * 0.15, new Color4(1, 0.84, 0.52, 0.9), 0, 'flash');
    // Cone of hot gas: fast axial flow, lateral expansion, then drag and buoyancy.
    for (let i = 0; i < 24; i++) {
      const angle = this.random() * Math.PI * 2;
      const radial = right.scale(Math.cos(angle)).add(up.scale(Math.sin(angle)));
      const speed = 9 + this.random() * 16;
      const color = 0.57 + this.random() * 0.14;
      this.spawn(origin.add(forward.scale(this.random() * 0.6)),
        forward.scale(speed).add(radial.scale(1.5 + this.random() * 4)),
        0.8 + this.random() * 0.8, 0.65 + this.random() * 0.8,
        new Color4(color, color * 0.97, color * 0.89, 0.2 + this.random() * 0.12), 0.5, 'smoke');
    }
    if (ground) this.groundBlast(origin, forward, ground);
  }
  machineGunFlash(origin: Vector3, direction: Vector3) {
    this.spawn(origin, direction.scale(2), 0.035, 0.14, new Color4(1, 0.75, 0.3, 0.9), 0, 'flash');
  }
  private groundBlast(origin: Vector3, forward: Vector3, ground: BlastGround) {
    const height = Vector3.Distance(origin, ground.point);
    const strength = Math.max(0, 1 - height / 4.5);
    if (strength <= 0 || ground.normal.y < 0.45) return;
    const normal = ground.normal.normalizeToNew();
    const projected = forward.subtract(normal.scale(Vector3.Dot(forward, normal)));
    const tangent = projected.lengthSquared() > 1e-6 ? projected.normalize() : Vector3.Cross(normal, Vector3.Right()).normalize();
    const right = Vector3.Cross(normal, tangent).normalize();
    for (let i = 0; i < Math.ceil(20 * strength); i++) {
      const angle = this.random() * Math.PI * 2;
      const radial = tangent.scale(Math.cos(angle)).add(right.scale(Math.sin(angle)));
      const point = ground.point.add(normal.scale(0.12)).add(radial.scale(this.random() * 0.55));
      this.spawn(point, radial.scale((3 + this.random() * 6) * strength).add(normal.scale(0.5 + this.random() * 0.7)),
        0.75 + this.random() * 0.7, 0.65 + this.random() * 0.7,
        new Color4(0.58, 0.49, 0.36, 0.28 * strength), -0.25, 'dust');
    }
  }
  impact(point: Vector3, normal: Vector3, surface: ImpactSurface) {
    const outward = normal.normalizeToNew();
    const feedback = IMPACT_FEEDBACK[surface];
    for (let i = 0; i < feedback.sparks; i++) {
      const random = new Vector3(this.random() - 0.5, this.random() - 0.5, this.random() - 0.5).scale(9);
      this.spawn(point, outward.scale(3 + this.random() * 5).add(random), 0.16 + this.random() * 0.22,
        0.18 + this.random() * 0.22, new Color4(1, 0.82, 0.42, 1), -9.81, 'spark');
    }
    for (let i = 0; i < feedback.fragments; i++) {
      this.spawn(point.add(outward.scale(0.15)), outward.scale(0.6 + this.random()).add(new Vector3(0, 0.8, 0)),
        0.5 + this.random() * 0.45, 1.1 + this.random() * 1.2,
        new Color4(feedback.color[0], feedback.color[1], feedback.color[2], 0.5), 0, 'dust');
    }
  }
  fixedUpdate(dt: number) {
    this.flashAge += dt;
    this.flashLight.intensity = 14 * Math.max(0, 1 - this.flashAge / 0.065) ** 2;
    for (const particle of this.particles) {
      if (!particle || particle.age >= particle.life) continue;
      particle.previous.copyFrom(particle.position);
      particle.previousAge = particle.age;
      particle.age += dt;
      particle.velocity.y += particle.gravity * dt;
      particle.position.addInPlace(particle.velocity.scale(dt));
      const luminous = particle.kind === 'flash' || particle.kind === 'spark';
      particle.velocity.scaleInPlace(Math.exp(-(luminous ? 1.2 : 3.2) * dt));
      if (particle.kind === 'smoke') particle.velocity.addInPlace(new Vector3(0.6, 0.2, 0.15).scale(dt));
    }
  }
  render(alpha: number) {
    this.sprites[0].forEach((flash, index) => {
      const smoke = this.sprites[1][index];
      flash.isVisible = smoke.isVisible = false;
      const particle = this.particles[index];
      if (!particle || particle.age >= particle.life) return;
      const age = particle.previousAge + (particle.age - particle.previousAge) * alpha;
      const t = age / particle.life;
      if (t >= 1) return;
      const luminous = particle.kind === 'flash' || particle.kind === 'spark';
      const sprite = luminous ? flash : smoke;
      sprite.isVisible = true;
      Vector3.LerpToRef(particle.previous, particle.position, alpha, sprite.position);
      const growth = luminous ? 1 - t * 0.6 : 0.65 + t * 2.8;
      sprite.width = particle.size * growth;
      sprite.height = sprite.width * (luminous ? 0.8 : 0.85 + t * 0.15);
      sprite.angle = particle.angle + particle.spin * age;
      const fade = luminous ? (1 - t) ** 1.5 : Math.min(1, age / 0.045) * (1 - t) ** 1.4;
      sprite.color = new Color4(particle.color.r, particle.color.g, particle.color.b, particle.color.a * fade);
    });
  }
  reset() {
    this.cursor = 0;
    this.flashAge = Infinity;
    this.flashLight.intensity = 0;
    this.particles.length = 0;
    this.sprites.flat().forEach(sprite => { sprite.isVisible = false; });
  }
  dispose() { this.flashLight.dispose(); this.managers.forEach(manager => manager.dispose()); }
}
