import { Color3, Color4, Constants, PointLight, Sprite, SpriteManager, Texture, Vector3, type Scene } from '@babylonjs/core';
import { IMPACT_FEEDBACK, type ImpactSurface } from './ImpactSurface.ts';
import type { DamageState } from './DamageModel.ts';
import { seededRandom } from '../world/terrain.ts';

type ParticleKind = 'flash' | 'smoke' | 'dust' | 'clod' | 'spark' | 'fire' | 'explosion';
const EFFECT_TEXTURES = {
  flash: new URL('../../../assets/vfx/brackeys/particles/alpha/muzzle_02_a.png', import.meta.url).href,
  // 8x8 flipbooks: the gas curls and the dust billows over each particle's life.
  smoke: new URL('../../../assets/vfx/brackeys/runtime/wispy_smoke_01_8x8.png', import.meta.url).href,
  dust: new URL('../../../assets/vfx/brackeys/runtime/cloud_01_8x8.png', import.meta.url).href,
  clod: new URL('../../../assets/vfx/brackeys/particles/alpha/dirt_02_a.png', import.meta.url).href,
  spark: new URL('../../../assets/vfx/brackeys/particles/alpha/trace_01_a.png', import.meta.url).href,
  fire: new URL('../../../assets/vfx/brackeys/particles/alpha/flame_01_a.png', import.meta.url).href,
  explosion: new URL('../../../assets/vfx/brackeys/runtime/explosion_01.png', import.meta.url).href,
};
const PARTICLE_KINDS = Object.keys(EFFECT_TEXTURES) as ParticleKind[];
const isLuminous = (kind: ParticleKind) => kind === 'flash' || kind === 'spark' || kind === 'fire';
const isFlipbook = (kind: ParticleKind) => kind === 'smoke' || kind === 'dust';
const FLIPBOOK_FRAMES = 64;
/** The flipbook frames carry less alpha coverage than a single soft puff. */
const ALPHA_GAIN: Partial<Record<ParticleKind, number>> = { smoke: 1.5, dust: 1.2 };

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
  /** Clods only: y where the clod hits the ground and disappears. */
  floor: number;
}
export interface BlastGround { point: Vector3; normal: Vector3 }
export const COMBAT_PARTICLE_CAPACITY = 128;

/** Fixed-step world-space effects. Gas and dust use alpha blending; flashes, sparks and flames use additive blending. */
export class CombatEffects {
  readonly particles: CombatParticle[] = [];
  private readonly managers: SpriteManager[];
  private readonly sprites: Record<ParticleKind, Sprite[]>;
  private readonly random = seededRandom(9417);
  private cursor = 0;
  private readonly flashLight: PointLight;
  private flashAge = Infinity;
  constructor(scene: Scene) {
    this.flashLight = new PointLight('cannon-muzzle-light', Vector3.Zero(), scene);
    this.flashLight.diffuse = new Color3(1, 0.72, 0.42);
    this.flashLight.range = 12;
    this.flashLight.intensity = 0;
    this.sprites = {} as Record<ParticleKind, Sprite[]>;
    this.managers = PARTICLE_KINDS.map(kind => {
      // The source filename says 8x8, but this explosion actually contains 5x5 frames.
      const cellSize = kind === 'explosion' ? 1024 / 5 : isFlipbook(kind) ? 128 : 512;
      const manager = new SpriteManager(`combat-${kind}`, EFFECT_TEXTURES[kind],
        COMBAT_PARTICLE_CAPACITY, cellSize, scene, 0.01, Texture.TRILINEAR_SAMPLINGMODE);
      manager.isPickable = false;
      manager.disableDepthWrite = true;
      manager.blendMode = isLuminous(kind) ? Constants.ALPHA_ADD : Constants.ALPHA_COMBINE;
      manager.fogEnabled = !isLuminous(kind);
      this.sprites[kind] = Array.from({ length: COMBAT_PARTICLE_CAPACITY }, (_, index) => {
        const sprite = new Sprite(`combat-${kind}-${index}`, manager);
        sprite.isVisible = false;
        return sprite;
      });
      return manager;
    });
  }

  private spawn(position: Vector3, velocity: Vector3, life: number, size: number,
    color: Color4, gravity = 0, kind: ParticleKind = 'smoke') {
    const particle: CombatParticle = {
      previous: position.clone(), position: position.clone(), velocity: velocity.clone(),
      age: 0, previousAge: 0, life, size, gravity, color, kind,
      angle: this.random() * Math.PI * 2, spin: (this.random() - 0.5) * (kind === 'clod' ? 16 : 0.5),
      floor: -Infinity,
    };
    this.particles[this.cursor] = particle;
    this.cursor = (this.cursor + 1) % COMBAT_PARTICLE_CAPACITY;
    return particle;
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
    this.clods(ground.point, normal, Math.ceil(6 * strength), 2 + 3 * strength, tangent.scale(2 * strength));
  }
  /** Ballistic mud chunks; they disappear when they fall back to the launch height. */
  private clods(point: Vector3, normal: Vector3, count: number, speed: number, drift = Vector3.Zero()) {
    for (let i = 0; i < count; i++) {
      const scatter = new Vector3(this.random() - 0.5, 0, this.random() - 0.5).scale(speed * 0.9);
      const shade = 0.16 + this.random() * 0.14;
      const clod = this.spawn(point.add(normal.scale(0.1)), normal.scale(speed * (0.7 + this.random() * 0.6)).add(scatter).add(drift),
        1.4, 0.1 + this.random() * 0.22, new Color4(shade * 1.3, shade * 1.05, shade * 0.8, 1), -9.81, 'clod');
      clod.floor = point.y - 0.2;
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
    if (surface === 'soil') this.clods(point, outward, 10, 5);
  }
  armorImpact(point: Vector3, normal: Vector3, penetrated: boolean) {
    this.impact(point, normal, 'metal');
    const outward = normal.normalizeToNew();
    for (let i = 0; i < (penetrated ? 7 : 16); i++) {
      const scatter = new Vector3(this.random() - 0.5, this.random() * 0.7, this.random() - 0.5);
      const tangent = scatter.subtract(outward.scale(Vector3.Dot(scatter, outward)));
      this.spawn(point.add(outward.scale(0.06)), outward.scale(penetrated ? 2 : 6).add(tangent.scale(penetrated ? 6 : 17)),
        0.18 + this.random() * 0.3, 0.08 + this.random() * 0.09, new Color4(1, 0.7, 0.32, 1), -9.81, 'spark');
    }
    if (penetrated) for (let i = 0; i < 5; i++) this.spawn(point.add(outward.scale(0.12)),
      outward.scale(0.8).add(new Vector3(0, 0.8, 0)), 1.1 + this.random() * 0.7, 0.4 + this.random() * 0.4,
      new Color4(0.14, 0.15, 0.14, 0.65), 0.25, 'smoke');
  }
  destruction(point: Vector3) {
    this.flashLight.position.copyFrom(point); this.flashAge = 0;
    this.spawn(point, Vector3.Zero(), 1.25, 3.8, new Color4(1, 1, 1, 1), 0, 'explosion');
    this.armorImpact(point, Vector3.Up(), true);
  }
  /** Called at a fixed 20 Hz per vehicle; emitters follow the current engine deck. */
  damageTrail(point: Vector3, state: DamageState) {
    if (state.hp > 50 && state.modules.engine === 100) return;
    const destroyed = state.hp === 0;
    const critical = state.hp <= 25;
    const shade = destroyed || critical ? 0.075 : 0.22;
    this.spawn(point.add(new Vector3((this.random() - 0.5) * 0.8, 0.15, (this.random() - 0.5) * 0.8)),
      new Vector3(0.4, destroyed ? 2.6 : 1.3, 0.15), destroyed ? 4 : 2.5,
      destroyed ? 1.1 : 0.55, new Color4(shade, shade, shade * 0.94, destroyed ? 0.7 : 0.48), 1.2, 'smoke');
    if (destroyed || critical || state.fire > 0) {
      const flame = point.add(new Vector3((this.random() - 0.5) * 0.7, 0, (this.random() - 0.5) * 0.7));
      this.spawn(flame, new Vector3(0.1, 2.8, 0), 0.24 + this.random() * 0.3,
        destroyed ? 1.1 : 0.5, new Color4(1, 0.32 + this.random() * 0.2, 0.04, 0.55), 0, 'fire');
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
      if (particle.position.y < particle.floor) { particle.life = particle.age; continue; }
      const luminous = isLuminous(particle.kind);
      particle.velocity.scaleInPlace(Math.exp(-(luminous ? 1.2 : particle.kind === 'clod' ? 0.4 : 3.2) * dt));
      if (particle.kind === 'smoke') particle.velocity.addInPlace(new Vector3(0.6, 0.2, 0.15).scale(dt));
    }
  }
  render(alpha: number) {
    for (let index = 0; index < COMBAT_PARTICLE_CAPACITY; index++) {
      for (const kind of PARTICLE_KINDS) this.sprites[kind][index].isVisible = false;
      const particle = this.particles[index];
      if (!particle || particle.age >= particle.life) continue;
      const age = particle.previousAge + (particle.age - particle.previousAge) * alpha;
      const t = age / particle.life;
      if (t >= 1) continue;
      const luminous = isLuminous(particle.kind);
      const sprite = this.sprites[particle.kind][index];
      sprite.isVisible = true;
      Vector3.LerpToRef(particle.previous, particle.position, alpha, sprite.position);
      const growth = particle.kind === 'explosion' ? 1 + t * 0.4 : particle.kind === 'clod' ? 1
        : luminous ? 1 - t * 0.6 : 0.65 + 2.8 * (1 - (1 - t) ** 1.8);
      sprite.width = particle.size * growth;
      sprite.height = sprite.width * (particle.kind === 'fire' ? 1.6 : particle.kind === 'spark' ? 2.5 : 1);
      sprite.angle = particle.kind === 'fire' || particle.kind === 'explosion' ? 0 : particle.angle + particle.spin * age;
      sprite.cellIndex = particle.kind === 'explosion' ? Math.min(24, Math.floor(t * 25))
        : isFlipbook(particle.kind) ? Math.min(FLIPBOOK_FRAMES - 1, Math.floor(t * FLIPBOOK_FRAMES)) : 0;
      const fade = particle.kind === 'explosion' || particle.kind === 'clod' ? 1
        : luminous ? (1 - t) ** 1.5 : Math.min(1, age / 0.045) * (1 - t) ** 1.4;
      sprite.color = new Color4(particle.color.r, particle.color.g, particle.color.b,
        Math.min(1, particle.color.a * fade * (ALPHA_GAIN[particle.kind] ?? 1)));
    }
  }
  reset() {
    this.cursor = 0;
    this.flashAge = Infinity;
    this.flashLight.intensity = 0;
    this.particles.length = 0;
    Object.values(this.sprites).flat().forEach(sprite => { sprite.isVisible = false; });
  }
  dispose() { this.flashLight.dispose(); this.managers.forEach(manager => manager.dispose()); }
}
