import type { SoldierProfile } from './soldierProfiles.ts';

/** One seven-second reading window per casualty, including simultaneous blasts. */
export class SoldierProfileQueue {
  private readonly pending: SoldierProfile[] = [];
  private current: SoldierProfile | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private disposed = false;
  private readonly onChange: (profile: SoldierProfile | undefined) => void;

  constructor(onChange: (profile: SoldierProfile | undefined) => void) { this.onChange = onChange; }

  enqueue(profiles: readonly SoldierProfile[]) {
    if (this.disposed) return;
    this.pending.push(...profiles);
    if (!this.current && this.pending.length) this.dismiss();
  }

  dismiss() {
    if (this.disposed) return;
    clearTimeout(this.timer);
    this.current = this.pending.shift();
    this.onChange(this.current);
    this.timer = this.current ? setTimeout(() => this.dismiss(), 7500) : undefined;
  }

  dispose() {
    this.disposed = true;
    clearTimeout(this.timer);
    this.pending.length = 0;
    this.current = undefined;
  }
}
