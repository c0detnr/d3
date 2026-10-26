import { HavokPlugin, NullEngine, Ray, Scene, Vector3, type PhysicsEngineV2 } from '@babylonjs/core';
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
  private hp: [number, number] = [100, 100];
  private phase: MatchPhase = 'waiting';
  private winner: Slot | null = null;
  private tick = 0;
  private accumulator = 0;
  private disposed = false;
  private inputs = slots.map(() => ({ ...neutral, sequence: -1, lastTick: -Infinity, fire: false, elevation: 0 }));
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
          // Havok owns terrain and hull collision, but the articulated turret is visual-only.
          // At most eight shells per player query triangles of only the other tank.
          const opponent = sim.tanks[slot === 0 ? 1 : 0];
          const meshes = new Set(opponent.tank.assets.meshes.filter(mesh =>
            mesh.isVisible && mesh.isEnabled() && mesh.visibility > 0 && mesh.getTotalVertices() > 0));
          for (const mesh of meshes) mesh.computeWorldMatrix(true);
          const segment = to.subtract(from), distance = segment.length();
          if (distance === 0) return worldHit;
          const picked = sim.scene.pickWithRay(new Ray(from, segment.scale(1 / distance), distance),
            mesh => meshes.has(mesh), false);
          if (picked?.hit && picked.pickedPoint && (!worldHit || picked.distance < worldHit.distance)) {
            return { point: picked.pickedPoint.clone(), normal: picked.getNormal(true) ?? Vector3.Up(),
              body: opponent.vehicle.body, distance: picked.distance };
          }
          return worldHit;
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
    Object.assign(input, { throttle: cmd.throttle, steer: cmd.steer, brake: cmd.brake, turn: cmd.turn, lastTick: this.tick });
    // One-shot fields are consumed once, never replayed by a held latest input.
    input.fire ||= cmd.fire;
    input.elevation = Math.max(-MAX_ELEVATION_DELTA, Math.min(MAX_ELEVATION_DELTA, input.elevation + cmd.elevation));
  }
  private clearInput(slot: Slot) {
    Object.assign(this.inputs[slot], neutral, { fire: false, elevation: 0, lastTick: -Infinity });
  }
  private reset() {
    this.hp = [100, 100]; this.winner = null;
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
      tank.turret.fixedUpdateManual(input.turn, input.elevation, DT);
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
    for (const slot of slots) this.shells[slot].fixedUpdate(DT, hit => {
      const other: Slot = slot === 0 ? 1 : 0;
      if (hit.body === this.tanks[other].vehicle.body) this.hp[other] = Math.max(0, this.hp[other] - 25);
    });
    for (const [shell] of this.ids) if (!shell.alive) this.ids.delete(shell);
    if (this.hp.some(hp => hp === 0)) {
      this.phase = 'finished';
      this.winner = this.hp[0] === 0 ? (this.hp[1] === 0 ? null : 1) : 0;
      slots.forEach(slot => this.clearInput(slot));
      this.shells.forEach(shells => shells.reset()); this.ids.clear();
    }
  }
  snapshot(): ServerState {
    const tanks = this.tanks.map((tank, slot): TankState => ({
      position: tank.tank.anchor.position.asArray(), rotation: tank.tank.anchor.rotationQuaternion!.asArray(),
      ...tank.turret.angles, hp: this.hp[slot], reload: tank.weapon.reloadRemaining, shots: tank.weapon.shotsFired,
    })) as [TankState, TankState];
    return { type: 'state', tick: this.tick, phase: this.phase, winner: this.winner,
      ready: [...this.ready], connected: [...this.connected], tanks,
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
