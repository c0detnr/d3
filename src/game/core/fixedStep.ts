/** A single owner advances Havok. Seconds; bounded catch-up, no hidden-tab debt. */
export class FixedStep {
  readonly dt = 1 / 60;
  readonly maxSteps = 5;
  private accumulator = 0;
  reset() { this.accumulator = 0; }
  advance(seconds: number, step: (dt: number) => void) {
    this.accumulator = Math.min(this.accumulator + Math.max(0, seconds), this.dt * this.maxSteps);
    let count = 0;
    while (this.accumulator + 1e-10 >= this.dt && count < this.maxSteps) {
      step(this.dt);
      this.accumulator -= this.dt;
      count++;
    }
    return Math.max(0, this.accumulator / this.dt);
  }
}
