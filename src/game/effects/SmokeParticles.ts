import { Color4, Constants, DirectionalLight, Sprite, SpriteManager, Texture, Vector3, type Scene } from '@babylonjs/core';
import { SMOKE, smokeCenter, smokeRadius, smokeStrength, type SmokeCloud, type SmokeModel } from '../items/SmokeModel.ts';
import { seededRandom } from '../world/terrain.ts';

/** Two shared texture batches; no per-cloud textures, materials or lights. */
export class SmokeParticles {
  private readonly manager: SpriteManager;
  private readonly flashes: SpriteManager;
  private readonly puffs: { sprite: Sprite; offset: Vector3; size: number; angle: number; spin: number; frame: number }[];
  private readonly flashSprites: Sprite[];
  private flashAge = Infinity;
  private readonly cloudSlots = new Map<SmokeCloud, number>();
  private readonly scene: Scene;
  constructor(scene: Scene) {
    this.scene = scene;
    this.manager = new SpriteManager('smoke-billows', new URL('../../../assets/vfx/brackeys/runtime/cloud_01_8x8.png', import.meta.url).href,
      SMOKE.maxClouds * SMOKE.particlesPerCloud, 128, scene, .01, Texture.TRILINEAR_SAMPLINGMODE);
    this.manager.disableDepthWrite = true; this.manager.isPickable = false;
    this.manager.blendMode = Constants.ALPHA_COMBINE;
    this.flashes = new SpriteManager('smoke-launch-flashes', new URL('../../../assets/vfx/brackeys/particles/alpha/muzzle_02_a.png', import.meta.url).href,
      SMOKE.salvo, 512, scene);
    this.flashes.disableDepthWrite = true; this.flashes.isPickable = false; this.flashes.blendMode = Constants.ALPHA_ADD;
    const random = seededRandom(36171);
    this.puffs = Array.from({ length: SMOKE.maxClouds * SMOKE.particlesPerCloud }, (_, index) => {
      const sprite = new Sprite(`smoke-puff-${index}`, this.manager); sprite.isVisible = false;
      const azimuth = random() * Math.PI * 2, y = random() * 2 - 1;
      const r = Math.cbrt(random()) * .62, horizontal = Math.sqrt(1 - y * y);
      return { sprite, offset: new Vector3(Math.cos(azimuth) * horizontal * r, y * r, Math.sin(azimuth) * horizontal * r),
        size: .55 + random() * .45, angle: random() * Math.PI * 2, spin: (random() - .5) * .18, frame: Math.floor(random() * 64) };
    });
    this.flashSprites = Array.from({ length: SMOKE.salvo }, (_, i) => {
      const sprite = new Sprite(`smoke-flash-${i}`, this.flashes); sprite.isVisible = false; return sprite;
    });
  }
  launch(origins: readonly Vector3[]) {
    this.flashAge = 0;
    origins.forEach((origin, i) => this.flashSprites[i].position.copyFrom(origin));
  }
  update(model: SmokeModel) {
    const sun = this.scene.lights.find(light => light instanceof DirectionalLight) as DirectionalLight | undefined;
    const lightDirection = sun?.direction.normalizeToNew().negate() ?? new Vector3(-.5, .7, .4);
    const eye = this.scene.activeCamera?.globalPosition;
    for (const cloud of this.cloudSlots.keys()) if (!model.clouds.includes(cloud)) this.cloudSlots.delete(cloud);
    for (const cloud of model.clouds) if (!this.cloudSlots.has(cloud)) {
      const used = new Set(this.cloudSlots.values());
      const slot = Array.from({ length: SMOKE.maxClouds }, (_, i) => i).find(i => !used.has(i));
      if (slot !== undefined) this.cloudSlots.set(cloud, slot);
    }
    const slots: (SmokeCloud | undefined)[] = [];
    for (const [cloud, slot] of this.cloudSlots) slots[slot] = cloud;
    this.puffs.forEach((puff, index) => {
      const cloud = slots[Math.floor(index / SMOKE.particlesPerCloud)], sprite = puff.sprite;
      const strength = cloud ? smokeStrength(cloud.age) : 0;
      sprite.isVisible = strength > .001;
      if (!cloud || !sprite.isVisible) return;
      const age = Math.max(0, cloud.age - SMOKE.flight), radius = smokeRadius(cloud.age);
      const center = smokeCenter(cloud);
      sprite.position.set(center.x + puff.offset.x * radius, center.y + puff.offset.y * radius * SMOKE.verticalScale,
        center.z + puff.offset.z * radius);
      sprite.width = radius * puff.size; sprite.height = sprite.width * (.85 + puff.size * .15);
      sprite.angle = puff.angle + age * puff.spin;
      sprite.cellIndex = (puff.frame + Math.floor(age * 2)) % 64;
      const shade = .60 + .18 * Math.max(0, Vector3.Dot(puff.offset.normalizeToNew(), lightDirection));
      // Close quads dissolve before intersecting the eye; the depth veil supplies readable interior haze.
      const nearFade = eye ? Math.min(1, Math.max(0, (Vector3.Distance(eye, sprite.position) - 1) / 3)) : 1;
      const interiorOffset = eye?.subtract(center); if (interiorOffset) interiorOffset.y /= SMOKE.verticalScale;
      const interior = interiorOffset ? Math.min(1, Math.max(0, radius - interiorOffset.length())) : 0;
      sprite.color = new Color4(shade, shade * .99, shade * .95, strength * .16 * nearFade * (1 - interior * .85));
    });
    for (const sprite of this.flashSprites) {
      sprite.isVisible = this.flashAge < .09;
      sprite.width = sprite.height = .45 + this.flashAge * 2;
      sprite.color = new Color4(1, .72, .32, Math.max(0, 1 - this.flashAge / .09));
    }
  }
  fixedUpdate(dt: number) { this.flashAge += dt; }
  reset() { this.cloudSlots.clear(); this.flashAge = Infinity; [...this.puffs.map(p => p.sprite), ...this.flashSprites].forEach(s => { s.isVisible = false; }); }
  dispose() { this.manager.dispose(); this.flashes.dispose(); }
}
