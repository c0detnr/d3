/** JSON wire contract shared by the LAN server and desktop clients. */
export type Slot = 0 | 1;
export type MatchPhase = 'waiting' | 'playing' | 'finished' | 'cancelled';
export type ClientCommand = {
  type: 'input'; sequence: number; throttle: number; steer: number; brake: number;
  /** Normalized yaw velocity; elevation is a one-command delta in radians. */
  turn: number; elevation: number; fire: boolean;
} | { type: 'ready' };
export interface TankState {
  /** Visual tank anchor, not rigid-body center. Quaternion order is x,y,z,w. */
  position: number[]; rotation: number[]; yaw: number; elevation: number;
  hp: number; reload: number; shots: number;
}
export interface ProjectileState { id: number; position: number[] }
export interface ServerState {
  type: 'state'; tick: number; phase: MatchPhase; winner: Slot | null;
  ready: [boolean, boolean]; connected: [boolean, boolean];
  tanks: [TankState, TankState]; projectiles: ProjectileState[];
}
export const MAX_ELEVATION_DELTA = 0.15;
export function parseCommand(value: unknown): ClientCommand | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const v = value as Record<string, unknown>;
  if (v.type === 'ready') return { type: 'ready' };
  const inRange = (n: unknown, min: number, max: number): n is number =>
    typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
  if (v.type !== 'input' || !Number.isSafeInteger(v.sequence) || (v.sequence as number) < 0
    || !inRange(v.throttle, -1, 1) || !inRange(v.steer, -1, 1)
    || !inRange(v.brake, 0, 1) || !inRange(v.turn, -1, 1)
    || !inRange(v.elevation, -MAX_ELEVATION_DELTA, MAX_ELEVATION_DELTA) || typeof v.fire !== 'boolean') return undefined;
  return { type: 'input', sequence: v.sequence as number, throttle: v.throttle, steer: v.steer,
    brake: v.brake, turn: v.turn, elevation: v.elevation, fire: v.fire };
}
