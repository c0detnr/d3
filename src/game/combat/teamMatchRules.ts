export type MatchTeam = 'A' | 'B';
export interface MatchMember { id: string; team: MatchTeam; alive: boolean; kills: number; deaths: number; respawn: number; protection: number }
export const TEAM_MATCH = { scoreLimit: 15, duration: 360, respawn: 5, protection: 3 } as const;
/** Render-independent authority; advance only with the shared fixed physics step. */
export class TeamMatchRules {
  elapsed = 0;
  score = { A: 0, B: 0 };
  result?: MatchTeam | 'draw';
  readonly members: MatchMember[];
  constructor(teams: readonly MatchTeam[]) {
    this.members = teams.map((team, i) => ({ id: String(i), team, alive: true, kills: 0, deaths: 0, respawn: 0, protection: TEAM_MATCH.protection }));
  }
  get remaining() { return Math.max(0, TEAM_MATCH.duration - this.elapsed); }
  eliminate(victim: number, shooter?: number) {
    const member = this.members[victim], killer = shooter === undefined ? undefined : this.members[shooter];
    if (this.result || !member.alive || member.protection > 0 || killer?.team === member.team) return false;
    member.alive = false; member.deaths++; member.respawn = TEAM_MATCH.respawn;
    this.score[member.team === 'A' ? 'B' : 'A']++;
    if (killer) killer.kills++;
    return true;
  }
  advance(dt: number) {
    if (!Number.isFinite(dt) || dt < 0) throw new RangeError('Invalid match step');
    if (this.result) return [];
    this.elapsed = Math.min(TEAM_MATCH.duration, this.elapsed + dt);
    if (this.remaining < 1e-8) this.elapsed = TEAM_MATCH.duration;
    const respawned: number[] = [];
    this.members.forEach((member, i) => {
      if (member.alive) member.protection = member.protection - dt < 1e-8 ? 0 : member.protection - dt;
      else {
        member.respawn = Math.max(0, member.respawn - dt);
        if (member.respawn < 1e-8) {
          member.respawn = 0; member.alive = true; member.protection = TEAM_MATCH.protection; respawned.push(i);
        }
      }
    });
    this.resolve();
    return this.result ? [] : respawned;
  }
  resolve() {
    if (!this.result && (this.score.A >= TEAM_MATCH.scoreLimit || this.score.B >= TEAM_MATCH.scoreLimit || this.remaining < 1e-8))
      this.result = this.score.A === this.score.B ? 'draw' : this.score.A > this.score.B ? 'A' : 'B';
    return this.result;
  }
}
