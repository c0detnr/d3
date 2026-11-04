/**
 * Builds studio takes (version 1) from readable drive segments instead of a live recording.
 * Units: seconds, turret turn in -1…1 of the tank's yaw speed, elevation in degrees per second,
 * hold = world direction (x, y, z) the turret stabiliser keeps while the hull moves.
 */
export interface DriveSegment {
  seconds: number;
  throttle?: number; steer?: number; brake?: number;
  turn?: number; elevation?: number;
  /** Seconds from the segment start at which the main gun fires. */
  fire?: number[];
  hold?: [number, number, number];
}
export interface Take { version: 1; id: string; scene: string; created: string; steps: number[][]; cuts: { step: number; shot: string; fov: number }[] }

const STEP_RATE = 60;

export function buildTake(id: string, scene: string, segments: DriveSegment[], shot = 'chase', fov = 0.9): Take {
  const steps: number[][] = [];
  for (const segment of segments) {
    const count = Math.round(segment.seconds * STEP_RATE);
    const fireSteps = new Set((segment.fire ?? []).map(t => Math.round(t * STEP_RATE)));
    const elevation = (segment.elevation ?? 0) * Math.PI / 180 / STEP_RATE;
    for (let i = 0; i < count; i++) {
      steps.push([segment.throttle ?? 0, segment.steer ?? 0, segment.brake ?? (segment.throttle ? 0 : 1),
        segment.turn ?? 0, elevation, fireSteps.has(i) ? 1 : 0, ...(segment.hold ?? [])]);
    }
  }
  return { version: 1, id, scene, created: new Date().toISOString(), steps, cuts: [{ step: 0, shot, fov }] };
}
