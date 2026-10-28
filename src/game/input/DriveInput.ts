export interface DriveKeys { forward: boolean; reverse: boolean; left: boolean; right: boolean; brake: boolean }
export interface DriveCommand { throttle: number; steer: number; brake: number }
export const releasedKeys = (): DriveKeys => ({ forward: false, reverse: false, left: false, right: false, brake: false });

/** Reverse delay is measured in physics time, starting only after forward motion stops. */
export class DriveInput {
  private reverseHeld = 0;
  reset() { this.reverseHeld = 0; }
  resolve(keys: DriveKeys, speed: number, dt: number, reverseDelay = 0.25): DriveCommand {
    const steer = Number(keys.right) - Number(keys.left);
    if (keys.brake || (keys.forward && keys.reverse)) {
      this.reset();
      return { throttle: 0, steer: 0, brake: 1 };
    }
    if (keys.reverse) {
      if (speed > 0.15) this.reverseHeld = 0;
      else this.reverseHeld += dt;
      return this.reverseHeld + 1e-9 >= reverseDelay
        ? { throttle: -1, steer, brake: 0 }
        : { throttle: 0, steer: 0, brake: 1 };
    }
    this.reset();
    if (keys.forward && speed < -0.15) return { throttle: 0, steer: 0, brake: 1 };
    return { throttle: Number(keys.forward), steer, brake: 0 };
  }
}

export function bindDriveKeys(target: Window, resetVehicle: () => void, enabled: () => boolean = () => true) {
  const keys = releasedKeys();
  const mapping: Record<string, keyof DriveKeys> = {
    KeyW: 'forward', KeyS: 'reverse', KeyA: 'left', KeyD: 'right', ShiftLeft: 'brake',
  };
  const clear = () => Object.assign(keys, releasedKeys());
  const down = (event: KeyboardEvent) => {
    if (!enabled()) return;
    if ((event.target as HTMLElement)?.closest('input, textarea, select, button, [contenteditable="true"]')) return;
    if (mapping[event.code]) { event.preventDefault(); keys[mapping[event.code]] = true; }
    if (event.code === 'KeyR' && !event.repeat) { clear(); resetVehicle(); }
  };
  const up = (event: KeyboardEvent) => { if (mapping[event.code]) keys[mapping[event.code]] = false; };
  const visibility = () => { if (document.hidden) clear(); };
  target.addEventListener('keydown', down);
  target.addEventListener('keyup', up);
  target.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', visibility);
  return { keys, clear, dispose() {
    clear(); target.removeEventListener('keydown', down); target.removeEventListener('keyup', up);
    target.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', visibility);
  } };
}
