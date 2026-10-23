import type { AudioDefinition } from './AudioDefinition.ts';

export interface VehicleAudioContact {
  speed: number;
  sideSpeed: number;
  grounded: boolean;
}

export interface VehicleAudioSnapshot {
  speed: number;
  forwardSpeed: number;
  driveForce: number;
  traction: number;
  contacts: readonly VehicleAudioContact[];
  sides: readonly number[];
}

export interface TrackSideState {
  rate: number;
  level: number;
}

export interface VehicleAudioState {
  engineRpm: number;
  engineLoad: number;
  trackLeft: TrackSideState;
  trackRight: TrackSideState;
  windLevel: number;
}

const clamp = (value: number, min: number, max: number) =>
  Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min;
const clamp01 = (value: number) => clamp(value, 0, 1);

const idleState = (): VehicleAudioState => ({
  engineRpm: 0.16,
  engineLoad: 0,
  trackLeft: { rate: 0, level: 0 },
  trackRight: { rate: 0, level: 0 },
  windLevel: 0.05,
});

export function resolveVehicleAudio(
  input: VehicleAudioSnapshot,
  definition: Readonly<AudioDefinition>,
): VehicleAudioState {
  const forward = Math.max(1e-3, input.forwardSpeed);
  const traction = Math.max(1, input.traction);
  const stats = { left: { total: 0, grounded: 0, max: 0 }, right: { total: 0, grounded: 0, max: 0 } };
  for (let index = 0; index < input.contacts.length; index++) {
    const side = input.sides[index] === 1 ? stats.right : stats.left;
    side.total++;
    const contact = input.contacts[index];
    if (!contact.grounded) continue;
    side.grounded++;
    side.max = Math.max(side.max, Math.hypot(contact.speed, contact.sideSpeed * 0.5));
  }
  const trackSide = (side: typeof stats.left): TrackSideState => {
    if (side.total === 0 || side.grounded === 0) return { rate: 0, level: 0 };
    const groundedFraction = side.grounded / side.total;
    const motion = clamp01((side.max - 0.25) / 1.5);
    if (motion <= 0) return { rate: 0, level: 0 };
    return {
      rate: clamp(side.max / Math.max(0.05, definition.tracks.linkPitch), 0, definition.tracks.maxRate),
      level: motion * groundedFraction,
    };
  };
  const speedNorm = clamp01(Math.abs(input.speed) / forward);
  const engineLoad = clamp01(Math.abs(input.driveForce) / traction + speedNorm * 0.2);
  const engineRpm = clamp01(0.16 + speedNorm * 0.64 + engineLoad * 0.2);
  return {
    engineRpm,
    engineLoad,
    trackLeft: trackSide(stats.left),
    trackRight: trackSide(stats.right),
    windLevel: clamp(0.05 + speedNorm * 0.55, 0, 0.6),
  };
}

export class VehicleAudioModel {
  private current = idleState();
  get state() { return this.current; }
  update(input: VehicleAudioSnapshot) {
    this.current = resolveVehicleAudio(input, this.definition);
    return this.current;
  }
  reset() { this.current = idleState(); return this.current; }
  private readonly definition: Readonly<AudioDefinition>;
  constructor(definition: Readonly<AudioDefinition>) { this.definition = definition; }
}
