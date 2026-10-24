/** Presentation only, radians/seconds. Never feeds back into aiming or physics. */
export const SHOT_CAMERA = Object.freeze({ duration: 0.5, decay: 13, pitch: 0.014, yaw: 0.004, roll: 0.004 });

export class ShotCameraMotion {
  private age = Infinity;
  private side = 0;
  impulse(side = 0) { this.age = 0; this.side = Math.max(-1, Math.min(1, side)); }
  update(dt: number) {
    this.age += Math.max(0, dt);
    const t = this.age;
    if (t >= SHOT_CAMERA.duration) return { pitch: 0, yaw: 0, roll: 0 };
    const attack = 1 - Math.exp(-t * 160);
    const decay = Math.exp(-t * SHOT_CAMERA.decay) * (1 - t / SHOT_CAMERA.duration) ** 2;
    return {
      pitch: SHOT_CAMERA.pitch * attack * decay * Math.cos(t * 27),
      yaw: SHOT_CAMERA.yaw * attack * decay * Math.sin(t * 39 + this.side),
      roll: SHOT_CAMERA.roll * attack * decay * Math.sin(t * 31) * (0.35 + this.side * 0.65),
    };
  }
  reset() { this.age = Infinity; }
}
