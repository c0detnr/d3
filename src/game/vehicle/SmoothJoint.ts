const clamp = (value: number, max: number) => Math.max(-max, Math.min(max, value));

/** Angular velocity in rad/s; exact exponential integration for a held command. */
export class SmoothJoint {
  velocity = 0;
  reset() { this.velocity = 0; }
  advanceVelocity(target: number, response: number, dt: number) {
    if (dt <= 0) return 0;
    const decay = Math.exp(-dt / response);
    const distance = target * dt + (this.velocity - target) * response * (1 - decay);
    this.velocity = target + (this.velocity - target) * decay;
    return distance;
  }
  advanceTarget(error: number, maxSpeed: number, response: number, dt: number) {
    const distance = this.advanceVelocity(clamp(error / response, maxSpeed), response / 3, dt);
    // Stop exactly at the target, including a mechanical limit, without ringing.
    if (distance * error >= 0 && Math.abs(distance) >= Math.abs(error)) {
      this.reset(); return error;
    }
    if (Math.abs(error) < 1e-8 && Math.abs(this.velocity) < 1e-7) {
      this.reset(); return error;
    }
    return distance;
  }
}
