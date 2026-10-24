import { Vector3 } from '@babylonjs/core';
import type { ContactState } from '../vehicle/TankVehicle.ts';
import { pathWeight, seededRandom } from '../world/terrain.ts';
import { MOVEMENT_DUST as D } from './MovementEffectsDefinition.ts';

export interface DustParticle {
  position: Vector3; previous: Vector3; velocity: Vector3;
  age: number; life: number; size: number; angle: number;
}
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
/** Visual classification only; does not affect traction. */
export function dustSurfaceFactor(name: string, point: Vector3) {
  if (name === 'natural-terrain') return 0.35 + pathWeight(point.x, point.z) * 0.65;
  if (name === 'side-slope-test') return 1;
  if (name.startsWith('boulder-')) return 0.05;
  if (name.startsWith('tree-')) return 0;
  return 0.25;
}

/** Fixed-step, world-space pool. No physics bodies and no render-frame emission. */
export class DustSimulation {
  readonly debris = Array.from({ length: D.debrisCapacity }, () => ({
    position: Vector3.Zero(), previous: Vector3.Zero(), velocity: Vector3.Zero(),
    origin: Vector3.Zero(), normal: Vector3.Up(), age: 0, life: 0, size: 0, angle: 0,
  }));
  readonly particles: DustParticle[] = Array.from({ length: D.capacity }, () => ({
    position: Vector3.Zero(), previous: Vector3.Zero(), velocity: Vector3.Zero(),
    age: 0, life: 0, size: 0, angle: 0,
  }));
  emitted = 0;
  debrisEmitted = 0;
  brakeEvents = 0;
  landingEvents = 0;
  private previousSpeed: number | undefined;
  private deceleration = 0;
  private brakeLatched = false;
  private brakePuff = 0;
  private brakeStrength = 0;
  private brakeCooldown = 0;
  private tracks = new Map<number, { air: number; cooldown: number; puff: number; strength: number }>();
  private debrisFractions: number[] = [];
  private debrisCursor = 0;
  private random = seededRandom(17431);
  private active: boolean[] = [];
  private fractions: number[] = [];
  private cursor = 0;
  get liveCount() { return this.particles.filter(p => p.age < p.life).length; }
  reset() {
    this.particles.forEach(p => { p.life = 0; p.age = 0; });
    this.active = []; this.fractions = []; this.cursor = 0; this.emitted = 0;
    this.random = seededRandom(17431);
    this.debris.forEach(p => { p.life = 0; p.age = 0; });
    this.debrisFractions = []; this.debrisCursor = 0; this.debrisEmitted = 0;
    this.previousSpeed = undefined; this.deceleration = 0; this.brakeLatched = false; this.brakePuff = 0;
    this.tracks.clear(); this.brakeEvents = 0; this.landingEvents = 0; this.brakeCooldown = 0; this.brakeStrength = 0;
  }
  step(dt: number, contacts: readonly ContactState[], sides: readonly number[], staticLoad: number, density = 1, brake = 0, speed = 0) {
    const slowing = this.previousSpeed === undefined ? 0 : (Math.abs(this.previousSpeed) - Math.abs(speed)) / dt;
    this.previousSpeed = speed;
    this.deceleration += (slowing - this.deceleration) * (1 - Math.exp(-dt / D.brakeFilterTime));
    this.brakePuff = Math.max(0, this.brakePuff - dt);
    this.brakeCooldown = Math.max(0, this.brakeCooldown - dt);
    if (brake <= 0) this.brakeLatched = false;
    const loaded = (c: ContactState) => c.grounded && c.load > staticLoad * D.startLoadRatio;
    if (brake > 0 && !this.brakeLatched && this.brakeCooldown === 0 && Math.abs(speed) > D.brakeMinSpeed
      && this.deceleration > D.brakeDeceleration && contacts.some(loaded) && density > 0) {
      this.brakeLatched = true; this.brakePuff = D.puffDuration; this.brakeCooldown = D.brakeCooldown; this.brakeEvents++;
      this.brakeStrength = clamp01(Math.abs(speed) / D.fullSpeed) * clamp01(this.deceleration / D.brakeFullDeceleration);
    }
    for (const side of new Set(sides)) {
      let track = this.tracks.get(side);
      if (!track) { track = { air: 0, cooldown: 0, puff: 0, strength: 0 }; this.tracks.set(side, track); }
      track.cooldown = Math.max(0, track.cooldown - dt); track.puff = Math.max(0, track.puff - dt);
      const hits = contacts.filter((c, i) => sides[i] === side && loaded(c));
      if (!hits.length) { track.air += dt; continue; }
      const impact = Math.max(...hits.map(c => c.approachSpeed));
      if (track.air >= D.landingAirTime && impact > D.landingMinSpeed && track.cooldown === 0 && density > 0) {
        track.puff = D.puffDuration; track.strength = clamp01(impact / 5);
        track.cooldown = D.landingCooldown; this.landingEvents++;
      }
      track.air = 0;
    }
    for (const p of this.debris) {
      p.previous.copyFrom(p.position);
      if (p.age >= p.life) continue;
      p.age += dt; p.velocity.y -= 9.81 * dt;
      p.position.addInPlace(p.velocity.scale(dt));
      if (Vector3.Dot(p.position.subtract(p.origin), p.normal) < 0) p.age = p.life;
    }
    for (const p of this.particles) {
      p.previous.copyFrom(p.position);
      if (p.age >= p.life) continue;
      p.age += dt;
      p.position.addInPlace(p.velocity.scale(dt));
      p.velocity.scaleInPlace(Math.exp(-1.4 * dt));
      p.velocity.y += 0.15 * dt;
    }
    const rates = contacts.map((c, i) => {
      const speed = Math.hypot(c.speed, c.sideSpeed);
      this.active[i] = c.grounded && c.load > staticLoad * (this.active[i] ? D.stopLoadRatio : D.startLoadRatio)
        && speed > (this.active[i] ? D.stopSpeed : D.startSpeed);
      if ((!this.active[i] && !loaded(c)) || density <= 0) { this.fractions[i] = 0; return 0; }
      const motion = clamp01(speed / D.fullSpeed);
      const turning = clamp01(Math.abs(c.sideSpeed) / 2);
      const track = this.tracks.get(sides[i]);
      const puff = (this.brakePuff > 0 && speed > D.brakeMinSpeed ? 18 + 22 * this.brakeStrength : 0)
        + (track && track.puff > 0 ? 35 * track.strength : 0);
      return ((this.active[i] ? 4 + 14 * motion + 6 * turning : 0) + puff) * dustSurfaceFactor(c.surfaceName, c.point)
        * clamp01(c.load / staticLoad) * density;
    });
    const total = rates.reduce((sum, rate) => sum + rate, 0);
    const scale = total > D.maxBirthsPerSecond ? D.maxBirthsPerSecond / total : 1;
    contacts.forEach((c, i) => {
      this.fractions[i] = (this.fractions[i] ?? 0) + rates[i] * scale * dt;
      while (this.fractions[i] >= 1) {
        this.fractions[i]--;
        const p = this.particles[this.cursor];
        // Full pool: drop births, never increase the allocation.
        if (p.age < p.life) continue;
        this.cursor = (this.cursor + 1) % this.particles.length;
        const motion = clamp01(Math.hypot(c.speed, c.sideSpeed) / D.fullSpeed);
        p.life = D.minLife + (D.maxLife - D.minLife) * (0.3 * this.random() + 0.7 * motion);
        p.age = 0;
        p.size = 0.4 + motion * 0.9 + this.random() * 0.3;
        p.angle = this.random() * Math.PI * 2;
        // Start above the contact, then move against local slip and outward from each track.
        p.position.copyFrom(c.point).addInPlace(c.normal.scale(0.06));
        p.position.addInPlace(c.lateral.scale((this.random() - 0.5) * 0.25));
        p.previous.copyFrom(p.position);
        p.velocity.copyFrom(c.velocity.scale(-0.13));
        p.velocity.addInPlace(c.lateral.scale((sides[i] ?? 1) * (0.22 + this.random() * 0.25)));
        p.velocity.addInPlace(c.normal.scale(0.28 + this.random() * 0.25));
        if (this.brakePuff > 0) {
          p.life = 0.5 + this.random() * 0.4; p.size = 0.8 + 0.8 * this.brakeStrength + this.random() * 0.4;
          p.velocity.addInPlace(c.velocity.scale(0.25));
        }
        const track = this.tracks.get(sides[i]);
        if (track && track.puff > 0) {
          p.life = 0.4 + this.random() * 0.6;
          p.size = 1 + track.strength + this.random() * 0.4;
          p.velocity.addInPlace(c.lateral.scale((sides[i] ?? 1) * (0.8 + 2 * track.strength)));
        }
        this.emitted++;
      }
    });
    const debrisRates = contacts.map((c, i) => {
      const speed = Math.hypot(c.speed, c.sideSpeed);
      const soil = c.surfaceName === 'natural-terrain' || c.surfaceName === 'side-slope-test';
      if (!soil || !loaded(c) || speed < D.debrisMinSpeed || density <= 0) { this.debrisFractions[i] = 0; return 0; }
      return 2 * clamp01(speed / D.fullSpeed) * dustSurfaceFactor(c.surfaceName, c.point) * density;
    });
    const debrisTotal = debrisRates.reduce((sum, rate) => sum + rate, 0);
    const debrisScale = debrisTotal > D.debrisBirthsPerSecond ? D.debrisBirthsPerSecond / debrisTotal : 1;
    contacts.forEach((c, i) => {
      this.debrisFractions[i] = (this.debrisFractions[i] ?? 0) + debrisRates[i] * debrisScale * dt;
      while (this.debrisFractions[i] >= 1) {
        this.debrisFractions[i]--;
        const p = this.debris[this.debrisCursor];
        if (p.age < p.life) continue;
        this.debrisCursor = (this.debrisCursor + 1) % this.debris.length;
        p.age = 0; p.life = D.debrisMinLife + this.random() * (D.debrisMaxLife - D.debrisMinLife);
        p.size = 0.01 + this.random() * 0.03; p.angle = this.random() * Math.PI * 2;
        p.origin.copyFrom(c.point); p.normal.copyFrom(c.normal);
        p.position.copyFrom(c.point).addInPlace(c.normal.scale(0.05)); p.previous.copyFrom(p.position);
        p.velocity.copyFrom(c.velocity.scale(-0.1)).addInPlace(c.normal.scale(1.4 + this.random() * 1.2))
          .addInPlace(c.lateral.scale((sides[i] ?? 1) * (0.4 + this.random() * 0.6)));
        this.debrisEmitted++;
      }
    });
  }
}
