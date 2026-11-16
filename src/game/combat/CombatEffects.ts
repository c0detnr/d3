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
export const COMBAT_PARTICLE_CAPACITY = 160;

/** Fixed-step world-space effects. Gas and dust use alpha blending; flashes, sparks and flames use additive blending. */
export class CombatEffects {
  readonly particles: CombatParticle[] = [];
  private readonly managers: SpriteManager[];
  private readonly sprites: Record<ParticleKind, Sprite[]>;
  private readonly random = seededRandom(9417);
  private cursor = 0;
  private readonly flashLight: PointLight;
  private flashAge = Infinity;
  private flashDuration = 0.09;
  private flashPeak = 30;
  constructor(scene: Scene) {
    this.flashLight = new PointLight('cannon-muzzle-light', Vector3.Zero(), scene);
    this.flashLight.diffuse = new Color3(1, 0.72, 0.42);
    this.flashLight.range = 22;
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
  private light(position: Vector3, peak: number, seconds: number, color: Color3) {
    this.flashLight.position.copyFrom(position);
    this.flashLight.diffuse.copyFrom(color);
    this.flashAge = 0; this.flashPeak = peak; this.flashDuration = seconds;
  }
  muzzleFlash(origin: Vector3, direction: Vector3, ground?: BlastGround) {
    const forward = direction.normalizeToNew();
    this.light(origin.add(forward.scale(1.2)), 30, 0.09, new Color3(1, 0.72, 0.42));
    const right = Vector3.Cross(Math.abs(forward.y) > 0.95 ? Vector3.Right() : Vector3.Up(), forward).normalize();
    const up = Vector3.Cross(forward, right).normalize();
    // Short main flame along the bore: large near the muzzle, tapering forward. Gone before the gas.
    for (let i = 0; i < 4; i++) this.spawn(origin.add(forward.scale(0.25 + i * 0.5)),
      forward.scale(22 + i * 6), 0.06 + this.random() * 0.03,
      3.4 - i * 0.6, new Color4(1, 0.82 - i * 0.06, 0.5 - i * 0.06, 1), 0, 'flash');
    // Muzzle-brake side jets: brief lateral flame and gas on both sides.
    for (const side of [-1, 1]) {
      const lateral = right.scale(side);
      this.spawn(origin.add(lateral.scale(0.3)), lateral.scale(15).add(forward.scale(4)), 0.05 + this.random() * 0.025,
        1.8, new Color4(1, 0.76, 0.42, 0.95), 0, 'flash');
      for (let i = 0; i < 3; i++) {
        const shade = 0.6 + this.random() * 0.1;
        this.spawn(origin.add(lateral.scale(0.25)), lateral.scale(7 + this.random() * 6).add(forward.scale(1 + this.random() * 2))
          .add(up.scale((this.random() - 0.3) * 2)), 0.7 + this.random() * 0.5, 0.55 + this.random() * 0.4,
          new Color4(shade, shade * 0.97, shade * 0.9, 0.22), 0.5, 'smoke');
      }
    }
    // Fast propellant gas jet: high axial speed, lateral expansion, then drag and buoyancy.
    for (let i = 0; i < 20; i++) {
      const angle = this.random() * Math.PI * 2;
      const radial = right.scale(Math.cos(angle)).add(up.scale(Math.sin(angle)));
      const speed = 14 + this.random() * 22;
      const color = 0.57 + this.random() * 0.14;
      this.spawn(origin.add(forward.scale(this.random() * 0.8)),
        forward.scale(speed).add(radial.scale(1.5 + this.random() * 4.5)),
        0.8 + this.random() * 0.8, 0.7 + this.random() * 0.8,
        new Color4(color, color * 0.97, color * 0.89, 0.22 + this.random() * 0.12), 0.5, 'smoke');
    }
    // Lingering cloud: slow, large, rises a little and drifts with the wind for a few seconds.
    for (let i = 0; i < 7; i++) {
      const shade = 0.7 + this.random() * 0.1;
      this.spawn(origin.add(forward.scale(1 + i * 0.9)).add(up.scale((this.random() - 0.5) * 0.4)),
        forward.scale(1.5 + this.random() * 2.5).add(right.scale((this.random() - 0.5) * 1.2)),
        2.6 + this.random() * 1.4, 2 + this.random() * 1.1,
        new Color4(shade, shade * 0.97, shade * 0.91, 0.34 + this.random() * 0.1), 0.35, 'smoke');
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
    const count = Math.ceil(18 * strength);
    for (let i = 0; i < count; i++) {
      // Even ring around the point under the muzzle, pushed harder in the firing direction.
      const angle = (i + this.random() * 0.6) / count * Math.PI * 2;
      const radial = tangent.scale(Math.cos(angle)).add(right.scale(Math.sin(angle)));
      const point = ground.point.add(normal.scale(0.12)).add(radial.scale(0.3 + this.random() * 0.5));
      const push = 1 + 0.6 * Math.max(0, Math.cos(angle));
      this.spawn(point, radial.scale((5 + this.random() * 5) * strength * push).add(normal.scale(0.4 + this.random() * 0.6)),
        0.75 + this.random() * 0.7, 0.65 + this.random() * 0.7,
        new Color4(0.58, 0.49, 0.36, 0.28 * strength), -0.25, 'dust');
    }
    this.clods(ground.point, normal, Math.ceil(6 * strength), 2 + 3 * strength, tangent.scale(2 * strength));
  }
  /** Ballistic mud chunks; they disappear when they fall back to the launch height. */
  private clods(point: Vector3, normal: Vector3, count: number, speed: number, drift = Vector3.Zero(), tint?: Color4) {
    for (let i = 0; i < count; i++) {
      const scatter = new Vector3(this.random() - 0.5, 0, this.random() - 0.5).scale(speed * 0.9);
      const shade = 0.16 + this.random() * 0.14;
      const clod = this.spawn(point.add(normal.scale(0.1)), normal.scale(speed * (0.7 + this.random() * 0.6)).add(scatter).add(drift),
        1.6, 0.1 + this.random() * 0.22, tint ? new Color4(tint.r * (0.7 + shade * 2), tint.g * (0.7 + shade * 2), tint.b * (0.7 + shade * 2), 1)
          : new Color4(shade * 1.3, shade * 1.05, shade * 0.8, 1), -9.81, 'clod');
      clod.floor = point.y - 0.2;
    }
  }
  private sparks(point: Vector3, direction: Vector3, count: number, speed: number, spread: number, life: number, color: Color4, size = 0.12) {
    for (let i = 0; i < count; i++) {
      const random = new Vector3(this.random() - 0.5, this.random() - 0.5, this.random() - 0.5).scale(spread);
      this.spawn(point, direction.scale(speed * (0.5 + this.random() * 0.7)).add(random), life * (0.6 + this.random() * 0.8),
        size * (0.7 + this.random() * 0.8), color, -9.81, 'spark');
    }
  }
  private puffs(point: Vector3, velocity: Vector3, count: number, scatter: number, life: number, size: number, color: Color4, gravity: number, kind: 'dust' | 'smoke' = 'dust') {
    for (let i = 0; i < count; i++) {
      const random = new Vector3(this.random() - 0.5, this.random() * 0.4, this.random() - 0.5).scale(scatter);
      this.spawn(point.add(random.scale(0.1)), velocity.scale(0.6 + this.random() * 0.7).add(random), life * (0.75 + this.random() * 0.5),
        size * (0.75 + this.random() * 0.6), color, gravity, kind);
    }
  }
  impact(point: Vector3, normal: Vector3, surface: ImpactSurface) {
    const outward = normal.normalizeToNew();
    const feedback = IMPACT_FEEDBACK[surface];
    const [r, g, b] = feedback.color;
    this.sparks(point, outward, feedback.sparks, 6, 9, 0.3, new Color4(1, 0.82, 0.42, 1), 0.2);
    if (surface === 'soil') {
      // Tall dust column thrown up, a low skirt spreading out and clods falling back.
      this.spawn(point.add(outward.scale(0.2)), outward.scale(4), 0.05, 1.1, new Color4(1, 0.7, 0.4, 0.7), 0, 'flash');
      this.puffs(point, outward.scale(7).add(new Vector3(0, 2, 0)), 7, 2, 1.8, 1.2, new Color4(r, g, b, 0.55), -3);
      this.puffs(point, new Vector3(0, 0.6, 0), feedback.fragments, 7, 1.3, 1.3, new Color4(r * 1.15, g * 1.15, b * 1.15, 0.4), 0);
      this.clods(point, outward, 14, 7);
    } else if (surface === 'concrete') {
      // Grey masonry dust and grey debris chunks.
      this.spawn(point.add(outward.scale(0.15)), Vector3.Zero(), 0.05, 0.9, new Color4(1, 0.85, 0.6, 0.8), 0, 'flash');
      this.puffs(point.add(outward.scale(0.2)), outward.scale(3).add(new Vector3(0, 0.8, 0)), feedback.fragments, 4, 1.6, 1.4,
        new Color4(r, g, b, 0.5), 0);
      this.clods(point, outward, 10, 5, Vector3.Zero(), new Color4(0.5, 0.5, 0.47, 1));
    } else {
      this.spawn(point.add(outward.scale(0.1)), Vector3.Zero(), 0.05, 1, new Color4(1, 0.86, 0.6, 0.9), 0, 'flash');
      this.puffs(point.add(outward.scale(0.15)), outward.scale(0.8).add(new Vector3(0, 0.8, 0)), feedback.fragments, 1.5, 0.9, 1.1,
        new Color4(r, g, b, 0.5), 0);
    }
  }
  /** Armour hit. `incoming` is the shell velocity; a non-penetrating hit streaks sparks along its deflection. */
  armorImpact(point: Vector3, normal: Vector3, penetrated: boolean, incoming?: Vector3) {
    const outward = normal.normalizeToNew();
    if (penetrated) {
      this.light(point.add(outward.scale(0.4)), 22, 0.12, new Color3(1, 0.62, 0.32));
      this.spawn(point.add(outward.scale(0.1)), Vector3.Zero(), 0.07, 1.6, new Color4(1, 0.9, 0.65, 1), 0, 'flash');
      // Bright spark burst, then slower glowing fragments and a dark smoke plume.
      this.sparks(point.add(outward.scale(0.06)), outward, 26, 11, 14, 0.35, new Color4(1, 0.78, 0.4, 1), 0.14);
      this.sparks(point.add(outward.scale(0.06)), outward, 7, 4, 5, 0.9, new Color4(1, 0.42, 0.12, 1), 0.2);
      this.puffs(point.add(outward.scale(0.15)), outward.scale(1).add(new Vector3(0, 1.2, 0)), 6, 1.2, 2.2, 0.8,
        new Color4(0.12, 0.12, 0.12, 0.7), 0.4, 'smoke');
      return;
    }
    // Deflection: mirror the incoming direction about the plate, otherwise pick one tangent streak.
    let streak: Vector3;
    if (incoming && incoming.lengthSquared() > 1e-6) {
      const d = incoming.normalizeToNew();
      streak = d.subtract(outward.scale(2 * Vector3.Dot(d, outward))).normalize();
    } else {
      const scatter = new Vector3(this.random() - 0.5, this.random() * 0.5, this.random() - 0.5);
      const tangent = scatter.subtract(outward.scale(Vector3.Dot(scatter, outward)));
      streak = (tangent.lengthSquared() > 1e-6 ? tangent.normalize() : Vector3.Up()).add(outward.scale(0.35)).normalize();
    }
    this.spawn(point.add(outward.scale(0.05)), Vector3.Zero(), 0.04, 0.8, new Color4(1, 0.92, 0.75, 1), 0, 'flash');
    this.sparks(point.add(outward.scale(0.06)), streak, 16, 26, 5, 0.22, new Color4(1, 0.8, 0.45, 1), 0.1);
    this.puffs(point.add(outward.scale(0.1)), outward.scale(0.5), 2, 0.8, 0.7, 0.7, new Color4(0.5, 0.48, 0.44, 0.45), 0);
  }
  destruction(point: Vector3) {
    this.light(point.add(new Vector3(0, 1.5, 0)), 40, 0.45, new Color3(1, 0.55, 0.25));
    this.spawn(point, Vector3.Zero(), 1.25, 3.8, new Color4(1, 1, 1, 1), 0, 'explosion');
    this.spawn(point.add(new Vector3(0, 1.4, 0)), new Vector3(0, 1.5, 0), 1.15, 5.2, new Color4(1, 0.9, 0.8, 0.85), 0, 'explosion');
    for (let i = 0; i < 8; i++) this.spawn(point.add(new Vector3((this.random() - 0.5) * 1.6, 0.2, (this.random() - 0.5) * 1.6)),
      new Vector3((this.random() - 0.5) * 3, 4 + this.random() * 4, (this.random() - 0.5) * 3), 0.5 + this.random() * 0.4,
      1.1 + this.random() * 0.8, new Color4(1, 0.4 + this.random() * 0.2, 0.06, 0.7), 0, 'fire');
    this.clods(point, Vector3.Up(), 10, 9, Vector3.Zero(), new Color4(0.12, 0.12, 0.11, 1));
    this.puffs(point.add(new Vector3(0, 1, 0)), new Vector3(0, 3.5, 0), 7, 2.5, 3.8, 1.8, new Color4(0.08, 0.08, 0.08, 0.7), 0.8, 'smoke');
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
    this.flashLight.intensity = this.flashPeak * Math.max(0, 1 - this.flashAge / this.flashDuration) ** 2;
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
