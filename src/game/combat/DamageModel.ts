/** Gameplay tuning, not a real vehicle damage simulation. HP and module integrity: 0..100. */
export const DAMAGE = Object.freeze({ hp: 100, shell: 25, module: 50 });
export const MODULES = ['leftTrack', 'rightTrack', 'engine', 'turret'] as const;
export type DamageModule = typeof MODULES[number];
export interface DamageState { hp: number; modules: Record<DamageModule, number> }
export const MODULE_LABELS: Record<DamageModule, string> = {
  leftTrack: 'Sol palet', rightTrack: 'Sağ palet', engine: 'Motor', turret: 'Kule mekanizması',
};
export function freshDamage(): DamageState {
  return { hp: DAMAGE.hp, modules: { leftTrack: 100, rightTrack: 100, engine: 100, turret: 100 } };
}
/** Hit coordinates in the unrotated tank anchor frame, metres; forward = +Z. */
export function damageRegion(point: { x: number; y: number; z: number }, size: { x: number; z: number }): DamageModule | null {
  if (point.y < 1.15 && Math.abs(point.x) > size.x * 0.36) return point.x < 0 ? 'leftTrack' : 'rightTrack';
  if (point.y > 1.65) return 'turret';
  if (point.z < -size.z * 0.23) return 'engine';
  return null;
}
export function applyDamage(state: DamageState, module: DamageModule | null) {
  if (state.hp <= 0) return false;
  state.hp = Math.max(0, state.hp - DAMAGE.shell);
  if (module) state.modules[module] = Math.max(0, state.modules[module] - DAMAGE.module);
  return true;
}
/** A single lost track keeps the tank limping on the other one; it is immobile only when both are gone. */
export function driveDisabled(state: DamageState) {
  return state.hp === 0 || state.modules.engine === 0 || (state.modules.leftTrack === 0 && state.modules.rightTrack === 0);
}
/** Per-track drive share: a broken track delivers no thrust and drags instead. */
export function trackPower(state: DamageState) {
  return { left: state.modules.leftTrack === 0 ? 0 : 1, right: state.modules.rightTrack === 0 ? 0 : 1 };
}
