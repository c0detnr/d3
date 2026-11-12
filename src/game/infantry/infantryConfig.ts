/** Metres, radians and hit points. Garrisons stay at spawn when tanks drive away. */
export const INFANTRY = {
  blastRadius: 7,
  hp: 100,
  maxGarrisons: 3,
  offsets: [
    { x: -4, z: 0, yaw: .4, state: 'alert' },
    { x: 4, z: 0, yaw: -.5, state: 'smoke' },
    { x: -3.5, z: 3, yaw: 1.2, state: 'alert' },
  ],
} as const;

export type InfantryState = 'alert' | 'smoke' | 'dead';
export interface InfantryTarget {
  position: { x: number; y: number; z: number };
  state: InfantryState;
  hp: number;
}

/** Pure spherical blast query; inclusive boundary, no mutation or repeated deaths. */
export function infantryBlastVictims<T extends InfantryTarget>(point: InfantryTarget['position'], npcs: readonly T[]): T[] {
  return npcs.filter(npc => npc.state !== 'dead' && npc.hp > 0 &&
    (npc.position.x - point.x) ** 2 + (npc.position.y - point.y) ** 2 +
    (npc.position.z - point.z) ** 2 <= INFANTRY.blastRadius ** 2);
}
