import { PhysicsMotionType, PhysicsRaycastResult, Vector3, type PhysicsBody, type PhysicsEngineV2, type Scene } from '@babylonjs/core';
import { DuelTank } from './DuelTank.ts';
import { EasyDuelAI, type AIContext } from './EasyDuelAI.ts';
import { FilmNavigation, NavigationAgent, FILM_NAV } from './FilmNavigation.ts';
import { EASY_AI_CONFIG, AI_TACTICS, type AIDifficulty } from './easyAIConfig.ts';
import { applyDamage, freshDamage, type DamageModule, type DamageState } from './DamageModel.ts';
import { ProjectileSystem, type ProjectileHit } from './ProjectileSystem.ts';
import { pickTankHit, tankDamageRegion, tankHitFacing } from './tankHit.ts';
import { IRON_DUST_01_WEAPON } from './WeaponDefinition.ts';
import { duelOutcome, KUL_TEAM_LAYOUT, type TeamDuelLayout, type TeamPoint, type DuelTeam } from './teamDuelLayout.ts';
import { chooseSpawn, seededRandom, spawnYaw } from './spawnSelection.ts';

import { WaveRules, waveDifficulty, WAVE_MAX_ALIVE } from '../core/waveRules.ts';
import { TeamMatchRules } from './teamMatchRules.ts';

export interface DuelParticipant {
  tank: DuelTank['tank']; vehicle: DuelTank['vehicle']; damage: DamageState; team: DuelTeam;
}
export interface TeamImpact {
  hit: ProjectileHit; victim?: DuelParticipant; playerShot: boolean; shooter: DuelParticipant;
  applied: boolean; module: DamageModule | null; disabled: boolean; destroyed: boolean;
}
interface Bot {
  active: boolean; actor: DuelTank; member: DuelParticipant; ai: EasyDuelAI; shells: ProjectileSystem;
  route: Vector3[]; waypoint: number; slot: number; target?: DuelParticipant;
  state?: ReturnType<EasyDuelAI['update']>; delay: number; context: AIContext; sensorIn: number; visible: boolean;
}

/** Owns the layout’s bots; the caller advances the shared physics world exactly once per step. */
export class TeamDuel {
  readonly scene: Scene;
  readonly player: DuelParticipant;
  readonly layout: TeamDuelLayout;
  readonly bots: Bot[] = [];
  result?: DuelTeam | 'draw';
  onImpact?: (impact: TeamImpact) => void;
  onShot?: (origin: Vector3, direction: Vector3) => void;
  blocksSight: (from: Vector3, to: Vector3) => boolean = () => false;
  rules?: TeamMatchRules;
  wave?: WaveRules;
  onWaveStart?: (wave: number) => void;
  onWaveBreak?: () => void;
  readonly feed: { killer: string; victim: string; team: DuelTeam; time: number }[] = [];
  onRespawn?: () => void;
  /** Player placed by the random spawn pool (match start, reset, respawn); yaw in radians. */
  onSpawn?: (yaw: number) => void;
  /** Maximum AI / marker sight distance in metres; weather lowers it. */
  sightRange = 180;
  navigation?: FilmNavigation;
  private readonly random: () => number;
  private readonly participants: DuelParticipant[];
  private readonly radio: { point: Vector3; pending: Vector3; due: number; expires: number }[] = [];
  private elapsed = 0;
  private pathTurn = 0;
  private readonly rayFrom = Vector3.Zero();
  private readonly threatDirection = Vector3.Zero();
  private readonly toObserver = Vector3.Zero();
  private readonly forwardAxis = new Vector3(0, 0, 1);
  private readonly rayTo = Vector3.Zero();
  private readonly sensorHit = new PhysicsRaycastResult();
  private readonly sightHit = new PhysicsRaycastResult();
  private perception = 0;
  private disposed = false;
  /** `seed` drives the random spawn pool deterministically; give each match a new one. */
  constructor(scene: Scene, player: DuelParticipant, layout: TeamDuelLayout = KUL_TEAM_LAYOUT, seed = 1, survival = false) {
    this.scene = scene; this.player = player; this.layout = layout; this.participants = [player]; this.random = seededRandom(seed);
    if (survival) this.wave = new WaveRules();
  }
  name(member: DuelParticipant) { return member === this.player ? `${member.team} · 01` : `${member.team} · ${String(this.bots.find(b => b.member === member)!.slot + 1).padStart(2, '0')}`; }
  private spawnPoint(team: DuelTeam, slot: number) { const p = this.layout.spawn(team, slot); return new Vector3(p.x, p.y, p.z); }
  /** True when an enemy at `threat` would see a tank at `point` (static colliders, terrain, smoke, range). */
  private exposed(threat: TeamPoint, point: TeamPoint, ignore?: PhysicsBody) {
    this.rayFrom.set(threat.x, threat.y + 1.2, threat.z); this.rayTo.set(point.x, point.y + 1.2, point.z);
    const distance = Vector3.Distance(this.rayFrom, this.rayTo);
    if (distance > this.sightRange || this.blocksSight(this.rayFrom, this.rayTo)) return false;
    (this.scene.getPhysicsEngine()! as PhysicsEngineV2).raycastToRef(this.rayFrom, this.rayTo, this.sightHit, ignore ? { ignoreBody: ignore } : undefined);
    return !this.sightHit.hasHit || this.sightHit.hitDistance > distance - 3;
  }
  private choose(team: DuelTeam, threats: { point: TeamPoint; body?: PhysicsBody }[], occupied: TeamPoint[]) {
    const bodies = new Map(threats.map(t => [t.point, t.body]));
    return chooseSpawn(this.layout.spawnPool!(team), { threats: threats.map(t => t.point), occupied, random: this.random,
      visible: (threat, point) => this.exposed(threat, point, bodies.get(threat)) });
  }
  private facing(at: TeamPoint, threats: readonly TeamPoint[]) {
    return spawnYaw(at, threats, this.layout.center ?? { x: 0, y: 0, z: 0 });
  }
  /** Whole-match placement: shuffled order, each tank avoids enemies already placed; every tank then faces its nearest enemy. */
  private planMatch() {
    const entries: { team: DuelTeam; slot: number; at?: TeamPoint; yaw?: number }[] = [];
    for (const team of ['A', 'B'] as const) for (let slot = 0; slot < this.layout.teamSize; slot++) entries.push({ team, slot });
    for (let i = entries.length - 1; i > 0; i--) { const j = Math.floor(this.random() * (i + 1)); [entries[i], entries[j]] = [entries[j], entries[i]]; }
    for (const entry of entries) {
      const placed = entries.filter(e => e.at);
      entry.at = this.choose(entry.team, placed.filter(e => e.team !== entry.team).map(e => ({ point: e.at! })), placed.map(e => e.at!));
    }
    for (const entry of entries) entry.yaw = this.facing(entry.at!, entries.filter(e => e.team !== entry.team).map(e => e.at!));
    return (team: DuelTeam, slot: number) => entries.find(e => e.team === team && e.slot === slot)!;
  }
  private place(member: DuelParticipant, at: TeamPoint, yaw: number) {
    member.vehicle.reset(new Vector3(at.x, at.y, at.z), yaw);
    const bot = this.bots.find(b => b.member === member);
    if (!bot) { this.onSpawn?.(yaw); return; }
    bot.actor.render(1);
    // Join the strategic route at its nearest waypoint instead of driving back to the base.
    let best = Infinity;
    bot.route.forEach((p, i) => { const d = (p.x - at.x) ** 2 + (p.z - at.z) ** 2; if (d < best) { best = d; bot.waypoint = i; } });
  }
  /** Current spawn of each member, for diagnostics and tests. */
  get spawnPoints() { return this.members.map(m => m.vehicle.node.position.clone()); }
  private makeRules() { this.rules = !this.wave && this.layout.respawn ? new TeamMatchRules(this.members.map(m => m.team)) : undefined; }
  private respawn(index: number) {
    const member = this.members[index], bot = this.bots.find(b => b.member === member);
    const contact = this.radio[index];
    if (contact) contact.due = contact.expires = 0;
    if (bot) {
      bot.context.report = undefined; bot.visible = false; bot.sensorIn = 0;
      bot.actor.reset(); bot.member.damage = bot.actor.damage;
      bot.ai.reset(); bot.context.navigation?.reset(); bot.shells.reset(); bot.target = undefined; bot.state = undefined; bot.waypoint = 0; bot.delay = bot.slot * .6;
    } else Object.assign(member.damage, freshDamage());
    if (this.layout.spawnPool) {
      const others = this.members.filter(m => m !== member);
      const threats = others.filter(m => m.team !== member.team && m.damage.hp > 0).map(m => ({ point: m.vehicle.node.position, body: m.vehicle.body }));
      const at = this.choose(member.team, threats, others.map(m => m.vehicle.node.position));
      this.place(member, at, this.facing(at, threats.map(t => t.point)));
    } else {
      const at = this.layout.spawn(member.team, bot?.slot ?? 0);
      member.vehicle.reset(new Vector3(at.x, at.y, at.z), this.layout.yaw(member.team));
    }
    if (!bot) this.onRespawn?.();
  }
  get members() { return this.participants; }
  setDifficulty(level: AIDifficulty) { if (this.wave) return; for (const bot of this.bots) bot.ai.difficulty = level; }
  get finished() { return this.result !== undefined; }
  alive(team: DuelTeam) { return this.members.filter(member => member.team === team && member.damage.hp > 0).length; }

  async load(source: string | Uint8Array) {
    try {
      if (this.layout.navigation === 'film') this.navigation = new FilmNavigation(this.scene);
      const plan = !this.wave && this.layout.spawnPool ? this.planMatch() : undefined;
      for (const team of ['A', 'B'] as const) for (let slot = 0; slot < (this.wave ? WAVE_MAX_ALIVE : this.layout.teamSize); slot++) {
        if (this.wave && team === this.player.team) continue;
        if (team === this.player.team && slot === 0) continue;
        const at = plan?.(team, slot).at;
        const actor = await DuelTank.load(this.scene, source, at ? new Vector3(at.x, at.y, at.z) : this.spawnPoint(team, slot % this.layout.teamSize));
        if (this.disposed) { actor.dispose(); return; }
        actor.vehicle.reset(actor.vehicle.spawn, plan?.(team, slot).yaw ?? this.layout.yaw(team)); actor.render(1);
        const member: DuelParticipant = { tank: actor.tank, vehicle: actor.vehicle, damage: actor.damage, team };
        const shells = new ProjectileSystem(this.scene, (from, to) => this.raycast(actor.vehicle.body, from, to), 3);
        this.participants.push(member);
        this.bots.push({ active: !this.wave, actor, member, shells, ai: new EasyDuelAI({}, 51723 + slot * 117 + (team === 'A' ? 0 : 700)), route: this.layout.route(team, slot % this.layout.teamSize).map(p => new Vector3(p.x, p.y, p.z)),
          waypoint: 0, slot, delay: slot * 1.8, visible: false, sensorIn: 0,
          context: { slot, playerVelocity: Vector3.Zero(), navigation: this.navigation ? new NavigationAgent(this.navigation) : undefined,
            sensors: this.navigation ? { front: 100, left: 100, right: 100, rear: 100 } : undefined } });
      }
      for (const bot of this.bots) bot.context.allies = this.members.filter(m => m !== bot.member && m.team === bot.member.team);
      if (plan) {
        for (const bot of this.bots) { const p = plan(bot.member.team, bot.slot); this.place(bot.member, p.at!, p.yaw!); }
        const own = plan(this.player.team, 0); this.place(this.player, own.at!, own.yaw!);
      }
      for (const _member of this.members) this.radio.push({ point: Vector3.Zero(), pending: Vector3.Zero(), due: 0, expires: 0 });
      this.makeRules();
      if (this.wave) {
        for (const bot of this.bots) this.parkWaveBot(bot);
        this.respawn(0);
        this.startWave();
      }
    } catch (error) { this.dispose(); throw error; }
  }

  private parkWaveBot(bot: Bot) {
    const wasActive = bot.active;
    bot.active = false; bot.member.damage.hp = 0; bot.state = undefined;
    bot.actor.tank.anchor.setEnabled(false);
    bot.actor.vehicle.body.shape = null;
    bot.actor.vehicle.body.setMotionType(PhysicsMotionType.STATIC);
    if (wasActive) this.updateWaveAllies();
  }
  private startWave() {
    const tuning = waveDifficulty(this.wave!.wave);
    for (const bot of this.bots) {
      bot.ai.difficulty = 'normal';
      bot.ai.config.fairness.reactionDelay = EASY_AI_CONFIG.fairness.reactionDelay * tuning.reaction;
      const base = EASY_AI_CONFIG.fairness.aimDispersion, spread = bot.ai.config.fairness.aimDispersion;
      spread.base = base.base * tuning.dispersion;
      spread.distanceFactor = base.distanceFactor * tuning.dispersion;
      spread.speedFactor = base.speedFactor * tuning.dispersion;
    }
    this.onWaveStart?.(this.wave!.wave);
    this.fillWave();
  }
  private fillWave() {
    let spawned = false;
    for (const bot of this.bots) if (!bot.active && this.wave!.takeSpawn()) {
      bot.actor.vehicle.body.shape = bot.actor.vehicle.shape;
      bot.actor.vehicle.body.setMotionType(PhysicsMotionType.DYNAMIC);
      bot.actor.vehicle.body.setMassProperties({ mass: bot.actor.vehicle.definition.mass });
      this.respawn(this.members.indexOf(bot.member));
      bot.active = true; bot.delay = .5; spawned = true;
      bot.actor.tank.anchor.setEnabled(true);
    }
    if (spawned) this.updateWaveAllies();
  }
  private updateWaveAllies() {
    for (const bot of this.bots) {
      const allies = bot.context.allies!; allies.length = 0;
      for (const other of this.bots) if (other !== bot && other.active) allies.push(other.member);
    }
  }

  raycast(shooter: PhysicsBody, from: Vector3, to: Vector3): ProjectileHit | undefined {
    const hit = this.scene.getPhysicsEngine()!.raycast(from, to, { ignoreBody: shooter, shouldHitTriggers: true });
    let closest: ProjectileHit | undefined = hit.hasHit
      ? { point: hit.hitPointWorld.clone(), normal: hit.hitNormalWorld.clone(), body: hit.body, distance: hit.hitDistance } : undefined;
    const segment = to.subtract(from), lengthSquared = segment.lengthSquared();
    for (const member of this.members) {
      if (member.vehicle.body === shooter || this.wave && member.damage.hp <= 0) continue;
      const t = lengthSquared ? Math.max(0, Math.min(1, Vector3.Dot(member.vehicle.node.position.subtract(from), segment) / lengthSquared)) : 0;
      // Only tanks close to this swept segment need a visual turret triangle query.
      if (Vector3.DistanceSquared(member.vehicle.node.position, from.add(segment.scale(t))) > 100) continue;
      closest = pickTankHit(this.scene, member, from, to, closest);
    }
    return closest;
  }

  canSee(observer: DuelParticipant, target: DuelParticipant) {
    this.rayFrom.copyFrom(observer.vehicle.node.position); this.rayFrom.y += 1.2;
    this.rayTo.copyFrom(target.vehicle.node.position); this.rayTo.y += 1.15;
    if (Vector3.DistanceSquared(this.rayFrom, this.rayTo) > this.sightRange ** 2 || this.blocksSight(this.rayFrom, this.rayTo)) return false;
    (this.scene.getPhysicsEngine()! as PhysicsEngineV2).raycastToRef(this.rayFrom, this.rayTo, this.sightHit, { ignoreBody: observer.vehicle.body });
    return !this.sightHit.hasHit || this.sightHit.body === target.vehicle.body;
  }

  private updateRadio() {
    for (let i = 0; i < this.radio.length; i++) {
      const r = this.radio[i];
      if (r.due > 0 && this.elapsed >= r.due) {
        r.point.copyFrom(r.pending); r.expires = this.elapsed + AI_TACTICS.memorySeconds; r.due = 0;
      }
    }
  }
  private observe(index: number, target: DuelParticipant) {
    const r = this.radio[index];
    if (!r.due) { r.pending.copyFrom(target.vehicle.node.position); r.due = this.elapsed + AI_TACTICS.radioDelaySeconds; }
  }
  private senseObstacles(bot: Bot) {
    const sensors = bot.context.sensors;
    if (!sensors) return;
    const p = bot.actor.vehicle.node.position;
    const q = bot.actor.vehicle.node.rotationQuaternion!;
    const heading = Math.atan2(2 * (q.x * q.z + q.w * q.y), 1 - 2 * (q.x * q.x + q.y * q.y));
    // Three forward hull-width whiskers and two angled rays; a rear ray protects reverse decisions.
    sensors.front = sensors.left = sensors.right = sensors.rear = 100;
    for (let i = 0; i < 6; i++) {
      const angle = heading + (i === 3 ? -.65 : i === 4 ? .65 : i === 5 ? Math.PI : 0);
      const lateral = i < 3 ? (i - 1) * 2 : 0;
      this.rayFrom.set(p.x + Math.cos(heading) * lateral, p.y, p.z - Math.sin(heading) * lateral);
      this.rayTo.set(this.rayFrom.x + Math.sin(angle) * 19, this.rayFrom.y, this.rayFrom.z + Math.cos(angle) * 19);
      (this.scene.getPhysicsEngine()! as PhysicsEngineV2).raycastToRef(this.rayFrom, this.rayTo, this.sensorHit, { ignoreBody: bot.actor.vehicle.body });
      if (this.sensorHit.hasHit && this.sensorHit.body?.transformNode.name !== 'natural-terrain') {
        const distance = this.sensorHit.hitDistance;
        if (i < 3) sensors.front = Math.min(sensors.front, distance);
        else if (i === 3) sensors.left = distance;
        else if (i === 4) sensors.right = distance;
        else sensors.rear = distance;
      }
    }
  }
  beforeStep(dt: number) {
    this.elapsed += dt;
    if (this.wave?.advance(dt, this.player.damage.hp > 0)) this.startWave();
    if (this.rules) {
      for (const index of this.rules.advance(dt)) this.respawn(index);
      this.result = this.rules.result;
    }
    this.updateRadio();
    this.perception -= dt;
    const sense = this.perception <= 0;
    if (sense) {
      this.perception += AI_TACTICS.perceptionSeconds;
      for (const enemy of this.members) if (enemy.team !== this.player.team && enemy.damage.hp > 0 && this.canSee(this.player, enemy)) {
        this.observe(0, enemy); break;
      }
    }
    for (let index = 0; index < this.bots.length; index++) {
      const bot = this.bots[index];
      if (this.wave && !bot.active) continue;
      if (this.finished || bot.member.damage.hp === 0) { bot.state = undefined; bot.actor.beforeStep(dt); continue; }
      bot.delay = Math.max(0, bot.delay - dt);
      if (bot.delay > 0) { bot.state = undefined; bot.actor.beforeStep(dt); continue; }
      if (sense) {
        let chosen: DuelParticipant | undefined, best = -Infinity;
        for (const m of this.members) {
          if (m.team === bot.member.team || m.damage.hp <= 0 || !this.canSee(bot.member, m)) continue;
          const distance = Vector3.Distance(m.vehicle.node.position, bot.member.vehicle.node.position);
          const muzzle = m.tank.assets.transformNodes.find(n => n.metadata?.gltf?.extras?.asset_node_id === 'MuzzlePoint');
          m.vehicle.node.position.subtractToRef(bot.member.vehicle.node.position, this.toObserver); this.toObserver.scaleInPlace(-1).normalize();
          if (muzzle) { muzzle.computeWorldMatrix(true); muzzle.getDirectionToRef(this.forwardAxis, this.threatDirection); this.threatDirection.normalize(); }
          const aiming = muzzle ? Math.max(0, Vector3.Dot(this.threatDirection, this.toObserver)) ** 12 : 0;
          let assigned = 0;
          for (const other of this.bots) if (other !== bot && other.member.team === bot.member.team && other.target === m) assigned++;
          const score = (1 - distance / this.sightRange) * 2 + (1 - m.damage.hp / 100) + aiming * 1.5
            + (m === bot.target ? .25 : 0) - assigned * 1.3;
          if (score > best) { chosen = m; best = score; }
        }
        if (chosen) { bot.target = chosen; this.observe(index + 1, chosen); }
        else if (bot.target?.damage.hp === 0) bot.target = undefined;
        // Only refresh velocity after a direct observation; this cached value is never applied to hidden aim.
        if (chosen) bot.context.playerVelocity!.copyFrom(chosen.vehicle.body.getLinearVelocity());
        bot.context.report = undefined;
        let latest = 0;
        for (let i = 0; i < this.members.length; i++) {
          const r = this.radio[i];
          if (i !== index + 1 && this.members[i].team === bot.member.team && r.expires > this.elapsed && r.expires > latest) {
            bot.context.report = r.point; latest = r.expires;
          }
        }
      }
      const position = bot.actor.vehicle.node.position;
      let destination = bot.route[bot.waypoint];
      if (Math.hypot(position.x - destination.x, position.z - destination.z) < 9 && bot.waypoint < bot.route.length - 1) destination = bot.route[++bot.waypoint];
      // Immediate LOS loss gates shooting, independent of slower target selection / radio.
      bot.visible = !!bot.target && this.canSee(bot.member, bot.target);
      bot.context.health = bot.member.damage.hp;
      bot.sensorIn -= dt;
      if (bot.sensorIn <= 0) { this.senseObstacles(bot); bot.sensorIn += FILM_NAV.sensorSeconds; }
      bot.state = bot.ai.update(bot.actor, bot.target ?? this.player, bot.visible, dt, destination, bot.context);
      bot.actor.beforeStep(dt, bot.state.drive);
    }
    // Global per-fixed-step budget, rotated for fairness. No unbounded search in a render frame.
    let budget = FILM_NAV.expansionsPerStep;
    for (let i = 0; i < this.bots.length && budget > 0; i++) {
      const bot = this.bots[(i + this.pathTurn) % this.bots.length];
      if (this.wave && !bot.active) continue;
      budget -= bot.context.navigation?.step(Math.min(32, budget)) ?? 0;
    }
    this.pathTurn = (this.pathTurn + 1) % Math.max(1, this.bots.length);
  }

  afterStep(dt: number) {
    for (const bot of this.bots) {
      if (this.wave && !bot.active) continue;
      let aim = bot.state?.target;
      if (aim && bot.target && bot.visible) {
        const distance = Vector3.Distance(bot.actor.turret.getMuzzleRay().origin, aim);
        const time = distance / IRON_DUST_01_WEAPON.ammo.muzzleVelocity;
        // Bound target lead and compensate gravity using the same training shell speed.
        aim = aim.add(bot.context.playerVelocity!.scale(Math.min(.65, time)));
        aim.y += .5 * 9.81 * time * time;
      }
      bot.actor.afterStep(dt, bot.member.damage.modules.turret > 0 ? aim ?? bot.state?.look ?? null : null);
      if (this.finished || bot.member.damage.hp === 0 || bot.member.damage.modules.turret === 0 || !aim || !bot.target
        || bot.target.damage.hp === 0 || !bot.ai.canShoot || !bot.actor.weapon.ready || bot.delay > 0) continue;
      const ray = bot.actor.turret.getMuzzleRay();
      const direction = aim.subtract(ray.origin).normalize();
      if (Vector3.Dot(ray.direction, direction) < .999) continue;
      const targetPoint = bot.target.vehicle.node.position.add(new Vector3(0, 1.15, 0));
      const obstruction = this.scene.getPhysicsEngine()!.raycast(ray.origin, targetPoint, { ignoreBody: bot.actor.vehicle.body });
      if ((obstruction.hasHit && obstruction.body !== bot.target.vehicle.body) || this.blocksSight(ray.origin, targetPoint)) continue;
      let friendlyBlocked = false;
      // Conservative swept ally hull around the full muzzle-to-target segment, including visual turret overhang.
      const segment = targetPoint.subtract(ray.origin), lengthSquared = segment.lengthSquared();
      for (const ally of bot.context.allies ?? []) {
        const delta = ally.vehicle.node.position.subtract(ray.origin);
        const t = Vector3.Dot(delta, segment) / lengthSquared;
        if (t > 0 && t < 1 && Vector3.DistanceSquared(ally.vehicle.node.position, ray.origin.add(segment.scale(t))) < 30) { friendlyBlocked = true; break; }
      }
      if (friendlyBlocked) continue;
      const shot = bot.actor.weapon.fire();
      if (shot) {
        bot.shells.spawn(shot.origin, shot.direction, IRON_DUST_01_WEAPON.ammo.muzzleVelocity);
        bot.ai.shotFired(); this.onShot?.(shot.origin, shot.direction);
      }
    }
    // All shells, including shells from newly destroyed tanks, advance before the result is resolved.
    for (const bot of this.bots) bot.shells.fixedUpdate(dt, hit => this.impact(bot.member, hit));
  }

  playerImpact(hit: ProjectileHit) { this.impact(this.player, hit); }
  private impact(shooter: DuelParticipant, hit: ProjectileHit) {
    if (this.finished) return;
    const victim = this.members.find(m => m.vehicle.body === hit.body);
    const module = victim ? tankDamageRegion(victim, hit.point) : null;
    const protectedSpawn = !!victim && (this.rules?.members[this.members.indexOf(victim)].protection ?? 0) > 0;
    const applied = !!victim && !protectedSpawn && victim.team !== shooter.team && applyDamage(victim.damage, module, tankHitFacing(victim, hit.point));
    if (applied && victim!.damage.hp === 0 && this.rules?.eliminate(this.members.indexOf(victim!), this.members.indexOf(shooter))) {
      this.feed.unshift({ killer: this.name(shooter), victim: this.name(victim!), team: shooter.team, time: this.rules.elapsed });
      this.feed.length = Math.min(4, this.feed.length);
    }
    if (applied && victim) this.bots.find(b => b.member === victim)?.ai.onDamage(hit.point);
    this.onImpact?.({ hit, victim, shooter, playerShot: shooter === this.player, module, applied,
      disabled: applied && !!module && victim!.damage.modules[module] === 0,
      destroyed: applied && victim!.damage.hp === 0 });
  }
  finishStep() {
    if (this.finished) return;
    if (this.wave) {
      const playerAlive = this.player.damage.hp > 0;
      for (const bot of this.bots) if (bot.active && bot.member.damage.hp <= 0) {
        this.parkWaveBot(bot);
        if (this.wave.killed()) {
          for (const other of this.bots) other.shells.reset();
          if (playerAlive) this.onWaveBreak?.();
        }
      }
      // Count simultaneous kills, but never heal or advance after the player's death.
      this.wave.advance(0, playerAlive);
      if (this.wave.finished) {
        this.result = 'B';
        for (const bot of this.bots) bot.shells.reset();
        return;
      }
      this.fillWave();
      return;
    }
    this.result = this.rules ? this.rules.resolve() : duelOutcome(this.alive('A'), this.alive('B'));
    if (this.finished) for (const bot of this.bots) bot.shells.reset();
  }
  render(alpha: number) { for (const bot of this.bots) { if (!this.wave || bot.active) bot.actor.render(alpha); bot.shells.render(alpha); } }
  reset() {
    this.result = undefined; this.perception = 0; this.elapsed = 0; this.pathTurn = 0;
    for (const r of this.radio) { r.due = r.expires = 0; }
    this.feed.length = 0; this.makeRules();
    for (const bot of this.bots) {
      bot.actor.reset(); bot.actor.vehicle.reset(bot.actor.vehicle.spawn, this.layout.yaw(bot.member.team));
      bot.actor.render(1); bot.member.damage = bot.actor.damage; bot.ai.reset(); bot.context.navigation?.reset(); bot.shells.reset();
      bot.target = undefined; bot.state = undefined; bot.context.report = undefined; bot.visible = false; bot.sensorIn = 0; bot.waypoint = 0; bot.delay = bot.slot * 1.8;
    }
    Object.assign(this.player.damage, freshDamage());
    if (this.layout.spawnPool) {
      const plan = this.planMatch();
      for (const bot of this.bots) { const p = plan(bot.member.team, bot.slot); this.place(bot.member, p.at!, p.yaw!); }
      const own = plan(this.player.team, 0); this.place(this.player, own.at!, own.yaw!);
    }
  }
  dispose() {
    this.disposed = true;
    for (const bot of this.bots) { bot.shells.dispose(); bot.actor.dispose(); }
    this.bots.length = 0; this.participants.length = 1; this.radio.length = 0; this.navigation = undefined;
  }
}
