import { applyDamage, ricochets } from '../combat/DamageModel.ts';
import { pickTankHit, tankDamageRegion, tankHitFacing } from '../combat/tankHit.ts';
import { impactSurface } from '../combat/ImpactSurface.ts';
import type { ImpactEvent } from './protocol.ts';
import { HavokPlugin, NullEngine, Scene, Vector3, type PhysicsEngineV2 } from '@babylonjs/core';
import { DuelTank } from '../combat/DuelTank.ts';
import { ProjectileSystem, type ProjectileState as Shell } from '../combat/ProjectileSystem.ts';
import { SHOT_FEEDBACK } from '../combat/WeaponDefinition.ts';
import { createTestGround } from '../world/createTestGround.ts';
import { terrainHeight } from '../world/terrain.ts';
import { MAX_ELEVATION_DELTA, parseCommand, type ClientCommand, type MatchPhase, type ServerState, type Slot, type TankState } from './protocol.ts';

const DT = 1 / 60;
const slots = [0, 1] as const;
const neutral = { throttle: 0, steer: 0, brake: 1, turn: 0 };
/** Owns the only physics clock. No scene render loop, browser globals or asset URLs. */
export class DuelSimulation {
  private engine: NullEngine;
  private scene: Scene;
  private physics: PhysicsEngineV2;
  private world: ReturnType<typeof createTestGround> | undefined;
  private tanks: DuelTank[] = [];
  private shells: ProjectileSystem[] = [];
  private ids = new Map<Shell, number>();
  private nextId = 1;
  private connected: [boolean, boolean] = [false, false];
  private ready: [boolean, boolean] = [false, false];
  private impacts: ImpactEvent[] = [];
  private nextImpactId = 1;
  private phase: MatchPhase = 'waiting';
  private winner: Slot | null = null;
  private tick = 0;
  private accumulator = 0;
  private disposed = false;
  private inputs = slots.map(() => ({ ...neutral, sequence: -1, lastTick: -Infinity, fire: false, elevation: 0, aimDirection: undefined as number[] | undefined }));
  private constructor(havok: any) {
    this.engine = new NullEngine();
    this.scene = new Scene(this.engine);
    this.scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havok));
    this.scene.physicsEnabled = false;
    this.physics = this.scene.getPhysicsEngine() as PhysicsEngineV2;
    this.physics.setTimeStep(DT);
  }
  static async create(havok: any, sources: [Uint8Array, Uint8Array]): Promise<DuelSimulation> {
    const sim = new DuelSimulation(havok);
    try {
      sim.world = createTestGround(sim.scene);
      const spawns = [new Vector3(-34, 0, -42), new Vector3(-28, terrainHeight(-28, -42), -42)];
      for (const slot of slots) {
        sim.tanks.push(await DuelTank.load(sim.scene, sources[slot], spawns[slot]));
        sim.shells.push(new ProjectileSystem(sim.scene, (from, to) => {
          const hit = sim.physics.raycast(from, to, { ignoreBody: sim.tanks[slot].vehicle.body });
          const worldHit = hit.hasHit ? { point: hit.hitPointWorld.clone(), normal: hit.hitNormalWorld.clone(),
            body: hit.body, distance: hit.hitDistance } : undefined;
          return pickTankHit(sim.scene, sim.tanks[slot === 0 ? 1 : 0], from, to, worldHit);
        }));
      }
      sim.reset();
      return sim;
    } catch (error) { sim.dispose(); throw error; }
  }
  connect(slot: Slot) {
    if (this.disposed || !slots.includes(slot) || this.connected[slot]) return;
    this.connected[slot] = true;
    this.inputs[slot].sequence = -1;
    this.clearInput(slot);
  }
  disconnect(slot: Slot) {
    if (this.disposed || !slots.includes(slot) || !this.connected[slot]) return;
    this.connected[slot] = false;
    this.phase = 'cancelled'; this.winner = null; this.ready = [false, false];
    slots.forEach(s => this.clearInput(s));
    this.shells.forEach(shells => shells.reset()); this.ids.clear();
  }
  command(slot: Slot, command: ClientCommand) {
    if (this.disposed || !slots.includes(slot) || !this.connected[slot]) return;
    const cmd = parseCommand(command);
    if (!cmd) return;
    if (cmd.type === 'ready') {
      if (this.phase === 'playing') return;
      this.ready[slot] = true;
      if (this.connected.every(Boolean) && this.ready.every(Boolean)) {
        this.reset(); this.phase = 'playing'; this.ready = [false, false];
      }
      return;
    }
    const input = this.inputs[slot];
    if (cmd.sequence <= input.sequence) return;
    input.sequence = cmd.sequence;
    if (this.phase !== 'playing') return;
    Object.assign(input, { throttle: cmd.throttle, steer: cmd.steer, brake: cmd.brake, turn: cmd.turn, aimDirection: cmd.aimDirection, lastTick: this.tick });
    // One-shot fields are consumed once, never replayed by a held latest input.
    input.fire ||= cmd.fire;
    input.elevation = Math.max(-MAX_ELEVATION_DELTA, Math.min(MAX_ELEVATION_DELTA, input.elevation + cmd.elevation));
  }
  private clearInput(slot: Slot) {
    Object.assign(this.inputs[slot], neutral, { fire: false, elevation: 0, aimDirection: undefined, lastTick: -Infinity });
  }
  private reset() {
    this.impacts = []; this.winner = null;
    slots.forEach(slot => {
      this.clearInput(slot);
      const tank = this.tanks[slot]; tank.reset();
      tank.vehicle.reset(tank.vehicle.spawn, slot === 0 ? 0 : Math.PI); tank.render(1);
      this.shells[slot].reset();
    });
    this.ids.clear();
  }
  /** Accumulates elapsed time but always advances both hulls in one 60 Hz step. */
  step(dt = DT) {
    if (this.disposed) return;
    if (!Number.isFinite(dt) || dt < 0 || dt > 1) throw new RangeError('step dt must be between 0 and 1 second');
    this.accumulator += dt;
    while (this.accumulator + 1e-10 >= DT) {
      this.accumulator = Math.max(0, this.accumulator - DT); this.fixedStep();
    }
  }
  private fixedStep() {
    this.tick++;
    if (this.phase !== 'playing') return;
    for (const slot of slots) {
      const input = this.inputs[slot];
      if (this.tick - input.lastTick > 15) this.clearInput(slot);
      this.tanks[slot].beforeStep(DT, input);
    }
    this.physics._step(DT);
    for (const slot of slots) {
      const tank = this.tanks[slot], input = this.inputs[slot];
      tank.vehicle.afterStep();
      tank.visual.fixedUpdate(tank.vehicle, DT);
      tank.visual.syncHull(tank.vehicle, 1);
      tank.weapon.fixedUpdate(DT);
      if (input.aimDirection && !input.turn && !input.elevation && tank.damage.modules.turret > 0) {
        tank.turret.yawPivot.computeWorldMatrix(true);
        tank.turret.fixedUpdate(tank.turret.yawPivot.getAbsolutePosition()
          .add(Vector3.FromArray(input.aimDirection).scale(10000)), DT);
      } else tank.turret.fixedUpdateManual(tank.damage.modules.turret === 0 ? 0 : input.turn,
        tank.damage.modules.turret === 0 ? 0 : input.elevation, DT);
      input.elevation = 0;
      if (input.fire) {
        const shot = tank.weapon.fire();
        if (shot) {
          const shell = this.shells[slot].spawn(shot.origin, shot.direction, tank.weapon.definition.ammo.muzzleVelocity);
          if (shell) this.ids.set(shell, this.nextId++);
          tank.vehicle.body.applyImpulse(shot.direction.scale(-SHOT_FEEDBACK.hullImpulse),
            tank.vehicle.node.position.add(new Vector3(0, 1.1, 0)));
        }
      }
      input.fire = false;
    }
    // Resolve all shells together, so simultaneous lethal shots can draw (winner null).
    for (const slot of slots) this.shells[slot].fixedUpdate(DT, (hit, shell) => {
      const other: Slot = slot === 0 ? 1 : 0;
      const target = hit.body === this.tanks[other].vehicle.body ? other : null;
      const module = target === null ? null : tankDamageRegion(this.tanks[target], hit.point);
      const ricochet = target !== null && ricochets(shell.velocity, hit.normal);
      const applied = target !== null && !ricochet && applyDamage(this.tanks[target].damage, ricochet ? null : module, tankHitFacing(this.tanks[target], hit.point));
      this.impacts.push({ id: this.nextImpactId++, tick: this.tick, shooter: slot, target,
        point: hit.point.asArray(), normal: hit.normal.asArray(), source: shell.previous.asArray(),
        surface: target === null ? impactSurface(hit.body) : 'metal', module: ricochet ? null : module, ricochet,
        destroyed: !!applied && target !== null && this.tanks[target].damage.hp === 0 });
      // Repeat a bounded event tail in snapshots so 20 Hz delivery cannot miss a 60 Hz hit.
      this.impacts = this.impacts.slice(-32);
    });
    for (const [shell] of this.ids) if (!shell.alive) this.ids.delete(shell);
    if (this.tanks.some(tank => tank.damage.hp === 0)) {
      this.phase = 'finished';
      this.winner = this.tanks[0].damage.hp === 0 ? (this.tanks[1].damage.hp === 0 ? null : 1) : 0;
      slots.forEach(slot => this.clearInput(slot));
      this.shells.forEach(shells => shells.reset()); this.ids.clear();
    }
  }
  snapshot(): ServerState {
    const tanks = this.tanks.map((tank): TankState => ({
      position: tank.tank.anchor.position.asArray(), rotation: tank.tank.anchor.rotationQuaternion!.asArray(),
      ...tank.turret.angles, hp: tank.damage.hp, modules: { ...tank.damage.modules }, reload: tank.weapon.reloadRemaining, shots: tank.weapon.shotsFired,
    })) as [TankState, TankState];
    return { type: 'state', tick: this.tick, phase: this.phase, winner: this.winner,
      ready: [...this.ready], connected: [...this.connected], tanks,
      impacts: this.impacts.map(hit => ({ ...hit, point: [...hit.point], normal: [...hit.normal], source: [...hit.source] })),
      projectiles: [...this.ids].map(([shell, id]) => ({ id, position: shell.position.asArray() })) };
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.shells.forEach(shells => shells.dispose()); this.ids.clear();
    this.tanks.forEach(tank => tank.dispose()); this.world?.dispose();
    this.scene.dispose(); this.engine.dispose();
  }
}
