import { JAMMER_EFFECT } from '../world/jammerLayout.ts';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core';

export type FlightMode = 'ASSIST' | 'ACRO';
export interface FlightControls { forward: number; right: number; lift: number; yaw: number; pitch: number; roll: number }
export const neutralFlight = (): FlightControls => ({ forward: 0, right: 0, lift: 0, yaw: 0, pitch: 0, roll: 0 });
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Metres, seconds, radians. ACRO integrates body angular rates and local thrust. */
export class FpvFlight {
  active = false;
  signalQuality = 1;
  controlLost = false;
  private signalLostSeconds = 0;
  mode: FlightMode = 'ASSIST';
  readonly position = Vector3.Zero();
  readonly previous = Vector3.Zero();
  readonly velocity = Vector3.Zero();
  readonly rotation = Quaternion.Identity();
  readonly previousRotation = Quaternion.Identity();
  elapsed = 0;
  throttle = .36;
  yaw = 0;
  pitch = 0;
  roll = 0;
  private readonly matrix = Matrix.Identity();

  launch(position: Vector3, yaw: number) {
    if (this.active) return false;
    this.signalQuality = 1; this.controlLost = false; this.signalLostSeconds = 0;
    this.active = true; this.position.copyFrom(position); this.previous.copyFrom(position);
    this.velocity.setAll(0); this.yaw = yaw; this.pitch = 0; this.roll = 0; this.elapsed = 0; this.throttle = 9.81 / 28;
    this.rotation.copyFrom(Quaternion.RotationYawPitchRoll(yaw, 0, 0)); this.previousRotation.copyFrom(this.rotation);
    return true;
  }
  look(dx: number, dy: number) {
    if (!this.active || this.controlLost || this.mode !== 'ASSIST') return;
    this.yaw += dx * .0025; this.pitch = clamp(this.pitch + dy * .0025, -1.35, 1.35);
  }
  step(dt: number, input: FlightControls, quality = 1) {
    if (!this.active || dt <= 0) return;
    this.signalQuality = clamp(quality, 0, 1);
    this.signalLostSeconds = this.signalQuality === 0 ? this.signalLostSeconds + dt : 0;
    if (this.signalLostSeconds + 1e-9 >= JAMMER_EFFECT.disconnectSeconds) this.controlLost = true;
    this.previous.copyFrom(this.position); this.previousRotation.copyFrom(this.rotation); this.elapsed += dt;
    if (this.controlLost) {
      this.throttle = 0; this.velocity.y -= 9.81 * dt;
    } else if (this.mode === 'ASSIST') {
      this.yaw += input.yaw * dt * 1.8;
      const forward = new Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), -Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
      const right = new Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      const desired = forward.scale(input.forward).add(right.scale(input.right));
      if (desired.lengthSquared() > 1) desired.normalize();
      desired.scaleInPlace(26); desired.y += input.lift * 12;
      const response = 1 - Math.exp(-dt * 3.5);
      const brakeHorizontal = input.forward === 0 && input.right === 0;
      const horizontalResponse = brakeHorizontal ? 1 - Math.exp(-dt * 12) : response;
      const verticalResponse = desired.y === 0 ? 1 - Math.exp(-dt * 12) : response;
      this.velocity.x += (desired.x - this.velocity.x) * horizontalResponse;
      this.velocity.z += (desired.z - this.velocity.z) * horizontalResponse;
      this.velocity.y += (desired.y - this.velocity.y) * verticalResponse;
      if (brakeHorizontal && Math.hypot(this.velocity.x, this.velocity.z) < .05) this.velocity.x = this.velocity.z = 0;
      if (desired.y === 0 && Math.abs(this.velocity.y) < .05) this.velocity.y = 0;
      this.roll += (-input.right * .3 - this.roll) * response;
      this.rotation.copyFrom(Quaternion.RotationYawPitchRoll(this.yaw, this.pitch, this.roll));
      this.throttle = clamp(.35 + this.velocity.length() / 90 + input.lift * .12, .1, 1);
    } else {
      this.throttle = clamp(this.throttle + input.lift * dt * .45, 0, 1);
      this.rotation.multiplyInPlace(Quaternion.RotationYawPitchRoll(input.yaw * dt * 2.1, input.pitch * dt * 2.4, input.roll * dt * 2.8));
      this.rotation.normalize(); this.rotation.toRotationMatrix(this.matrix);
      const thrust = Vector3.TransformNormal(Vector3.Up(), this.matrix).scale(this.throttle * 28);
      thrust.y -= 9.81;
      this.velocity.addInPlace(thrust.scale(dt)); this.velocity.scaleInPlace(Math.exp(-.13 * dt));
      const euler = this.rotation.toEulerAngles(); this.pitch = euler.x; this.yaw = euler.y; this.roll = euler.z;
    }
    this.position.addInPlace(this.velocity.scale(dt));
  }
  end() { const wasActive = this.active; this.active = false; return wasActive; }
  // Cosmetic load sag only: there is deliberately no energy budget or flight timeout.
  get voltage() { return 25.2 - this.throttle * 1.5; }
  get batteryPercent() { return Math.round(94 + (1 - this.throttle) * 6); }
}
