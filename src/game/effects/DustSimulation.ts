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
  readonly particles: DustParticle[] = Array.from({ length: D.capacity }, () => ({
    position: Vector3.Zero(), previous: Vector3.Zero(), velocity: Vector3.Zero(),
    age: 0, life: 0, size: 0, angle: 0,
  }));
  emitted = 0;
  private random = seededRandom(17431);
  private active: boolean[] = [];
  private fractions: number[] = [];
  private cursor = 0;
  get liveCount() { return this.particles.filter(p => p.age < p.life).length; }
  reset() {
    this.particles.forEach(p => { p.life = 0; p.age = 0; });
    this.active = []; this.fractions = []; this.cursor = 0; this.emitted = 0;
    this.random = seededRandom(17431);
  }
  step(dt: number, contacts: readonly ContactState[], sides: readonly number[], staticLoad: number, density = 1) {
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
      if (!this.active[i] || density <= 0) { this.fractions[i] = 0; return 0; }
      const motion = clamp01(speed / D.fullSpeed);
      const turning = clamp01(Math.abs(c.sideSpeed) / 2);
      return (4 + 14 * motion + 6 * turning) * dustSurfaceFactor(c.surfaceName, c.point)
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
        this.emitted++;
      }
    });
  }
}
