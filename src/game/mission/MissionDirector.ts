/** Pure mission rules. World/UI adapters publish events; no rendering or physics here. */
export type ObjectiveKind = 'checkpoint' | 'hit' | 'destroy' | 'duration';
export interface MissionStep { id: string; kind: ObjectiveKind; targets?: readonly string[]; count: number; ordered?: boolean }
export interface MissionDefinition { id: string; steps: readonly MissionStep[]; timeTarget: number; damageTarget: number }
export type MissionState = 'briefing' | 'active' | 'victory' | 'defeat';
export type MissionEvent = { type: 'checkpoint' | 'hit' | 'destroy'; id: string } | { type: 'shot' } | { type: 'damage'; amount: number } | { type: 'playerDestroyed' };
export interface MissionScore { missionId: string; victory: boolean; seconds: number; shots: number; hits: number; damageTaken: number; stars: number }
export class MissionDirector {
  readonly definition: MissionDefinition;
  state: MissionState = 'briefing';
  stepIndex = 0;
  progress = 0;
  seconds = 0;
  shots = 0;
  hits = 0;
  damageTaken = 0;
  private readonly counted = new Set<string>();
  onStep?: (completed: MissionStep) => void;
  onFinish?: (score: MissionScore) => void;
  constructor(definition: MissionDefinition) { this.definition = definition; }
  get step() { return this.definition.steps[this.stepIndex]; }
  get active() { return this.state === 'active'; }
  start() { if (this.state === 'briefing') this.state = 'active'; }
  update(dt: number) {
    if (!this.active || !Number.isFinite(dt) || dt <= 0) return;
    this.seconds += dt;
    if (this.step?.kind === 'duration') { this.progress += dt; this.advance(); }
  }
  dispatch(event: MissionEvent) {
    if (!this.active) return;
    if (event.type === 'playerDestroyed') { this.finish(false); return; }
    if (event.type === 'shot') { this.shots++; return; }
    if (event.type === 'damage') { if (Number.isFinite(event.amount)) this.damageTaken += Math.max(0, event.amount); return; }
    // Hits count actual projectile contacts, independently of the active objective.
    if (event.type === 'hit') this.hits++;
    const step = this.step;
    if (!step || event.type !== step.kind || this.counted.has(event.id)) return;
    if (step.targets && (!step.targets.includes(event.id) || (step.ordered && step.targets[this.progress] !== event.id))) return;
    this.counted.add(event.id); this.progress++;
    this.advance();
  }
  private advance() {
    const completed = this.step;
    if (this.progress < completed.count) return;
    this.stepIndex++; this.progress = 0; this.counted.clear();
    this.onStep?.(completed);
    if (!this.step) this.finish(true);
  }
  private finish(victory: boolean) {
    this.state = victory ? 'victory' : 'defeat';
    this.onFinish?.(this.score());
  }
  score(): MissionScore {
    const victory = this.state === 'victory';
    return { missionId: this.definition.id, victory, seconds: this.seconds, shots: this.shots, hits: this.hits,
      damageTaken: this.damageTaken, stars: victory ? 1 + Number(this.seconds < this.definition.timeTarget) + Number(this.damageTaken < this.definition.damageTarget) : 0 };
  }
}
