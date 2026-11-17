/** Wave numbers are one-based. Counts and timing are independent of rendering / physics. */
export const WAVE_BREAK_SECONDS = 10;
export const WAVE_MAX_ALIVE = 6;
export const WAVE_HEAL = 30;
export function waveEnemies(wave: number) { return 1 + Math.max(1, Math.floor(wave)); }
export function waveDifficulty(wave: number) {
  const progress = Math.max(0, wave - 1);
  return { reaction: Math.max(.55, 1.55 - progress * .06), dispersion: Math.max(.55, 1.55 - progress * .05) };
}
export class WaveRules {
  wave = 1;
  remaining = waveEnemies(1);
  pending = this.remaining;
  kills = 0;
  breakSeconds = 0;
  finished = false;
  takeSpawn() {
    if (this.finished || this.breakSeconds > 0 || this.pending <= 0) return false;
    this.pending--; return true;
  }
  killed() {
    if (this.finished || this.remaining <= 0) return false;
    this.kills++; this.remaining--;
    if (this.remaining > 0) return false;
    this.breakSeconds = WAVE_BREAK_SECONDS;
    return true;
  }
  /** Returns true only when a new wave starts. Death wins over an expiring break. */
  advance(dt: number, alive: boolean) {
    if (!alive) this.finished = true;
    if (this.finished || this.breakSeconds <= 0) return false;
    this.breakSeconds = Math.max(0, this.breakSeconds - Math.max(0, dt));
    if (this.breakSeconds > 1e-8) return false;
    this.breakSeconds = 0; this.wave++;
    this.remaining = this.pending = waveEnemies(this.wave);
    return true;
  }
}
