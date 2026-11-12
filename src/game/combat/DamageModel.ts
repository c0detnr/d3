import { IRON_DUST_01_AMMO } from './WeaponDefinition.ts';

/**
 * Gameplay tuning, not a real vehicle damage simulation. HP and module integrity: 0..100; times in seconds.
 * Facing multipliers scale the base shell damage: thick front plate, weak rear deck.
 */
export const DAMAGE = Object.freeze({
  hp: 100, shell: 25, module: 50,
  facing: Object.freeze({ front: .7, side: 1, rear: 1.4 }),
  /** A module knocked to 0 is field-repaired to `repairTo` after `repairSeconds`. */
  repairSeconds: 8, repairTo: 50,
  /** A destroyed engine burns for `fireSeconds`, `fireDamage` HP every `fireTick`; fire alone never finishes the tank. */
  fireSeconds: 6, fireDamage: 2, fireTick: 1,
});
export const MODULES = ['leftTrack', 'rightTrack', 'engine', 'turret'] as const;
export type DamageModule = typeof MODULES[number];
export type HitFacing = keyof typeof DAMAGE.facing;
export interface DamageState {
  hp: number;
  modules: Record<DamageModule, number>;
  /** Seconds until each destroyed module is back in service; 0 = no repair pending. */
  repair: Record<DamageModule, number>;
  /** Seconds of engine fire left. */
  fire: number;
  fireClock: number;
}
export const MODULE_LABELS: Record<DamageModule, string> = {
  leftTrack: 'Sol palet', rightTrack: 'Sağ palet', engine: 'Motor', turret: 'Kule mekanizması',
};
export function freshDamage(): DamageState {
  return { hp: DAMAGE.hp, modules: { leftTrack: 100, rightTrack: 100, engine: 100, turret: 100 },
    repair: { leftTrack: 0, rightTrack: 0, engine: 0, turret: 0 }, fire: 0, fireClock: 0 };
}
/** Hit coordinates in the unrotated tank anchor frame, metres; forward = +Z. */
export function damageRegion(point: { x: number; y: number; z: number }, size: { x: number; z: number }): DamageModule | null {
  if (point.y < 1.15 && Math.abs(point.x) > size.x * 0.36) return point.x < 0 ? 'leftTrack' : 'rightTrack';
  if (point.y > 1.65) return 'turret';
  if (point.z < -size.z * 0.23) return 'engine';
  return null;
}
/** Which hull face was struck, from the hit point in the same anchor frame; compares normalised half-extents. */
export function hitFacing(point: { x: number; z: number }, size: { x: number; z: number }): HitFacing {
  const along = point.z / (size.z / 2), across = Math.abs(point.x) / (size.x / 2);
  if (Math.abs(along) <= across) return 'side';
  return along > 0 ? 'front' : 'rear';
}
/** A shell striking steeper than the ammo's ricochet angle from the surface normal glances off and deals no damage. */
export function ricochets(direction: { x: number; y: number; z: number }, normal: { x: number; y: number; z: number }) {
  const along = Math.abs(direction.x * normal.x + direction.y * normal.y + direction.z * normal.z)
    / ((Math.hypot(direction.x, direction.y, direction.z) * Math.hypot(normal.x, normal.y, normal.z)) || 1);
  return Math.acos(Math.min(1, along)) > IRON_DUST_01_AMMO.ricochetAngle;
}
export function applyDamage(state: DamageState, module: DamageModule | null, facing: HitFacing = 'side') {
  if (state.hp <= 0) return false;
  state.hp = Math.max(0, state.hp - Math.round(DAMAGE.shell * DAMAGE.facing[facing]));
  if (module) {
    const before = state.modules[module];
    state.modules[module] = Math.max(0, before - DAMAGE.module);
    if (before > 0 && state.modules[module] === 0) {
      state.repair[module] = DAMAGE.repairSeconds;
      if (module === 'engine') { state.fire = DAMAGE.fireSeconds; state.fireClock = 0; }
    }
  }
  if (state.hp === 0) { state.fire = 0; MODULES.forEach(m => { state.repair[m] = 0; }); }
  return true;
}
/** Advances fire and field repair on the fixed physics step. Returns true when anything visible changed. */
export function tickDamage(state: DamageState, dt: number) {
  if (state.hp <= 0) return false;
  let changed = false;
  for (const module of MODULES) {
    if (state.repair[module] <= 0) continue;
    const before = Math.ceil(state.repair[module]);
    state.repair[module] = Math.max(0, state.repair[module] - dt);
    if (state.repair[module] === 0) state.modules[module] = DAMAGE.repairTo;
    if (Math.ceil(state.repair[module]) !== before) changed = true;
  }
  if (state.fire > 0) {
    state.fire = Math.max(0, state.fire - dt); state.fireClock += dt;
    while (state.fireClock + 1e-9 >= DAMAGE.fireTick) {
      state.fireClock -= DAMAGE.fireTick;
      const hp = Math.max(1, state.hp - DAMAGE.fireDamage);
      if (hp !== state.hp) { state.hp = hp; changed = true; }
    }
    if (state.fire === 0) { state.fireClock = 0; changed = true; }
  }
  return changed;
}
/** A single lost track keeps the tank limping on the other one; it is immobile only when both are gone. */
export function driveDisabled(state: DamageState) {
  return state.hp === 0 || state.modules.engine === 0 || (state.modules.leftTrack === 0 && state.modules.rightTrack === 0);
}
/** Per-track drive share: a broken track drags; damaged tracks and engine deliver reduced thrust. */
export function trackPower(state: DamageState) {
  const engine = state.modules.engine === 0 ? 0 : .55 + .45 * state.modules.engine / 100;
  const track = (hp: number) => hp === 0 ? 0 : (.6 + .4 * hp / 100) * engine;
  return { left: track(state.modules.leftTrack), right: track(state.modules.rightTrack) };
}
/** Turret traverse speed multiplier; a wrecked ring still creeps by hand crank. */
export function turretTraverse(state: DamageState) {
  return state.modules.turret === 0 ? .2 : .5 + .5 * state.modules.turret / 100;
}
