import { Color3, Matrix, Mesh, MeshBuilder, PhysicsBody, PhysicsMotionType, PhysicsShapeBox,
  Quaternion, StandardMaterial, TransformNode, Vector3, type InstancedMesh, type Scene } from '@babylonjs/core';
import { LANE_DRONES, LaneDroneModel, type DroneTarget, type DroneTeam, type LaneDrone } from './LaneDroneModel.ts';
import type { DamageState } from './DamageModel.ts';
import type { ProjectileHit } from './ProjectileSystem.ts';
import { kulTerrainHeight } from '../world/kulVadisiLayout.ts';

export interface DroneTank {
  vehicle: { node: TransformNode; body: PhysicsBody }; damage: DamageState; team: DroneTeam;
}
interface View { root: TransformNode; turret: TransformNode; meshes: InstancedMesh[]; body: PhysicsBody; shape: PhysicsShapeBox }
interface TankTarget extends DroneTarget { member: DroneTank }

/** Shared low-poly geometry; one ray-query-only animated body per drone, no track-link physics. */
export class LaneDrones {
  readonly model = new LaneDroneModel(kulTerrainHeight);
  private readonly views = new Map<string, View>();
  private readonly templates: Mesh[] = [];
  private readonly materials: StandardMaterial[] = [];
  private readonly parts: { source: Mesh; position: Vector3; turret: boolean }[] = [];
  private readonly stripes: Record<DroneTeam, Mesh>;
  private readonly tracers: Mesh[] = [];
  private tracerIndex = 0;
  private tracerAge = 0;
  blocksSight: (from: Vector3, to: Vector3) => boolean = () => false;
  onTankHit?: (member: DroneTank, point: Vector3, destroyed: boolean) => void;
  onImpact?: (point: Vector3, destroyed: boolean) => void;

  private readonly scene: Scene;
  private readonly tanks: () => readonly DroneTank[];

  constructor(scene: Scene, tanks: () => readonly DroneTank[]) {
    this.scene = scene; this.tanks = tanks;
    const material = (name: string, hex: string, emissive = false) => {
      const m = new StandardMaterial(`drone-${name}`, scene); m.diffuseColor = Color3.FromHexString(hex);
      m.specularColor.set(.08, .08, .08); if (emissive) { m.disableLighting = true; m.emissiveColor = m.diffuseColor; }
      this.materials.push(m); return m;
    };
    const hull = material('hull', '#656C56'), tracks = material('tracks', '#252B2A');
    const metal = material('metal', '#3B4645'), sensor = material('sensor', '#D8BD75', true);
    const teams = { A: material('A', '#84AEBC'), B: material('B', '#BA7959') };
    const part = (name: string, size: Vector3, position: Vector3, m: StandardMaterial, turret = false) => {
      const mesh = MeshBuilder.CreateBox(`drone-source-${name}`, { width: size.x, height: size.y, depth: size.z }, scene);
      mesh.material = m; mesh.isVisible = false; mesh.isPickable = false; this.templates.push(mesh);
      this.parts.push({ source: mesh, position, turret }); return mesh;
    };
    part('hull', new Vector3(1.45, .42, 2.05), new Vector3(0, .46, 0), hull);
    for (const side of [-1, 1]) {
      part(`track-${side}`, new Vector3(.38, .46, 2.35), new Vector3(side * .88, .25, 0), tracks);
      for (let wheel = 0; wheel < 3; wheel++) {
        const mesh = MeshBuilder.CreateCylinder(`drone-source-wheel-${side}-${wheel}`, { diameter: .33, height: .04, tessellation: 8 }, scene);
        mesh.bakeTransformIntoVertices(Matrix.RotationZ(Math.PI / 2));
        mesh.material = metal; mesh.isVisible = false; mesh.isPickable = false; this.templates.push(mesh);
        this.parts.push({ source: mesh, position: new Vector3(side * 1.08, .25, -.7 + wheel * .7), turret: false });
      }
    }
    part('turret', new Vector3(.68, .32, .72), new Vector3(0, 0, 0), hull, true);
    part('gun', new Vector3(.12, .12, .9), new Vector3(.18, .04, .68), metal, true);
    part('sensor', new Vector3(.25, .14, .15), new Vector3(-.18, .14, .34), sensor, true);
    // Team stripes share geometry within each side but keep their own material.
    const stripe = (team: DroneTeam) => {
      const mesh = MeshBuilder.CreateBox(`drone-source-stripe-${team}`, { width: .9, height: .035, depth: .2 }, scene);
      mesh.material = teams[team]; mesh.isVisible = false; mesh.isPickable = false; this.templates.push(mesh); return mesh;
    };
    this.stripes = { A: stripe('A'), B: stripe('B') };
    const tracer = material('tracer', '#FFD479', true);
    for (let i = 0; i < 36; i++) {
      const mesh = MeshBuilder.CreateCylinder(`drone-tracer-${i}`, { diameter: .035, height: 1, tessellation: 4 }, scene);
      mesh.material = tracer; mesh.rotationQuaternion = Quaternion.Identity(); mesh.isPickable = false; mesh.isVisible = false;
      this.tracers.push(mesh);
    }
  }

  private add(drone: LaneDrone) {
    const root = new TransformNode(drone.id, this.scene), turret = new TransformNode(`${drone.id}-turret`, this.scene);
    turret.parent = root; turret.position.y = .84;
    root.position.copyFrom(drone.position); root.rotationQuaternion = Quaternion.RotationYawPitchRoll(drone.yaw, 0, 0);
    const meshes = this.parts.map(part => {
      const mesh = part.source.createInstance(`${drone.id}-${part.source.name}`);
      mesh.parent = part.turret ? turret : root; mesh.position.copyFrom(part.position); mesh.isPickable = false;
      return mesh;
    });
    const stripe = this.stripes[drone.team].createInstance(`${drone.id}-stripe`);
    stripe.parent = root; stripe.position.set(0, .69, -.65); stripe.isPickable = false; meshes.push(stripe);
    const body = new PhysicsBody(root, PhysicsMotionType.ANIMATED, false, this.scene);
    const shape = new PhysicsShapeBox(new Vector3(0, .55, 0), Quaternion.Identity(), new Vector3(2.2, 1.1, 2.4), this.scene);
    shape.isTrigger = true;
    body.shape = shape; body.disablePreStep = false;
    this.views.set(drone.id, { root, turret, meshes, body, shape });
  }

  private remove(id: string) {
    const view = this.views.get(id); if (!view) return;
    view.body.dispose(); view.shape.dispose(); view.root.dispose(); this.views.delete(id);
  }

  private tankTargets(): TankTarget[] {
    return this.tanks().map((member, index) => ({ id: `tank-${index}`, team: member.team,
      position: member.vehicle.node.position.subtract(new Vector3(0, .6, 0)), hp: member.damage.hp, member }));
  }

  private visible(drone: LaneDrone, target: DroneTarget) {
    const from = drone.position.add(new Vector3(0, .95, 0));
    const to = target.position.add(new Vector3(0, .8, 0));
    if (this.blocksSight(from, to)) return false;
    const own = this.views.get(drone.id), other = this.views.get(target.id);
    const targetBody = other?.body ?? (target as TankTarget).member?.vehicle.body;
    const hit = this.scene.getPhysicsEngine()!.raycast(from, to, { ignoreBody: own?.body, shouldHitTriggers: true });
    return !hit.hasHit || hit.body === targetBody;
  }

  fixedUpdate(dt: number, stopped = false) {
    if (stopped) return;
    this.tracerAge += dt;
    if (this.tracerAge >= .08) { this.tracers.forEach(mesh => { mesh.isVisible = false; }); this.tracerAge = 0; }
    this.model.update(dt, this.tankTargets(), (drone, target) => this.visible(drone, target), (drone, to) => {
      const from = drone.position.add(new Vector3(0, .55, 0));
      const direction = to.subtract(drone.position).normalize();
      const hit = this.scene.getPhysicsEngine()!.raycast(from, to.add(direction.scale(1.25)).add(new Vector3(0, .55, 0)),
        { ignoreBody: this.views.get(drone.id)?.body, collideWith: 1 });
      return !hit.hasHit;
    }, ({ shooter, target }) => {
      const view = this.views.get(shooter.id);
      const offset = target.position.subtract(shooter.position);
      if (view) view.turret.rotation.y = Math.atan2(offset.x, offset.z) - shooter.yaw;
      const from = shooter.position.add(new Vector3(0, .95, 0)), to = target.position.add(new Vector3(0, .8, 0));
      const line = this.tracers[this.tracerIndex++ % this.tracers.length], direction = to.subtract(from);
      line.position.copyFrom(Vector3.Center(from, to)); line.scaling.y = direction.length();
      Quaternion.FromUnitVectorsToRef(Vector3.Up(), direction.normalize(), line.rotationQuaternion!); line.isVisible = true;
      const tank = (target as TankTarget).member;
      if (tank) {
        tank.damage.hp = Math.max(0, tank.damage.hp - LANE_DRONES.tankDamage); target.hp = tank.damage.hp;
        this.onTankHit?.(tank, to, tank.damage.hp === 0);
      } else {
        target.hp = Math.max(0, target.hp - LANE_DRONES.droneDamage);
        this.onImpact?.(to, target.hp === 0);
      }
    });
    const active = new Set(this.model.drones.map(drone => drone.id));
    for (const id of this.views.keys()) if (!active.has(id)) this.remove(id);
    for (const drone of this.model.drones) {
      if (!this.views.has(drone.id)) this.add(drone);
      const view = this.views.get(drone.id)!;
      // Physics owns the current fixed pose; interpolation is visual-only below.
      view.root.position.copyFrom(drone.position);
      view.root.rotationQuaternion!.copyFrom(Quaternion.RotationYawPitchRoll(drone.yaw, 0, 0));
      view.root.computeWorldMatrix(true);
      view.body.setTargetTransform(view.root.position, view.root.rotationQuaternion!);
    }
  }

  hit(hit: ProjectileHit, team: DroneTeam, amount: number) {
    const drone = this.model.drones.find(d => this.views.get(d.id)?.body === hit.body);
    if (!drone) return false;
    if (drone.team !== team && drone.hp > 0) {
      drone.hp = Math.max(0, drone.hp - amount);
      this.onImpact?.(hit.point, drone.hp === 0);
      if (drone.hp === 0) this.remove(drone.id);
    }
    return true;
  }

  render(alpha: number) {
    for (const drone of this.model.drones) {
      const view = this.views.get(drone.id); if (!view) continue;
      // Body roots keep their simulation pose; child visuals interpolate without moving ray targets.
      const delta = Vector3.Lerp(drone.previous, drone.position, alpha).subtract(drone.position);
      const c = Math.cos(drone.yaw), s = Math.sin(drone.yaw);
      const local = new Vector3(delta.x * c - delta.z * s, delta.y, delta.x * s + delta.z * c);
      this.parts.forEach((part, i) => { view.meshes[i].position.copyFrom(part.position); if (!part.turret) view.meshes[i].position.addInPlace(local); });
      view.turret.position.copyFrom(local.add(new Vector3(0, .84, 0)));
      view.meshes[view.meshes.length - 1].position.copyFrom(local.add(new Vector3(0, .69, -.65)));
    }
  }
  reset() { for (const id of this.views.keys()) this.remove(id); this.model.reset(); this.tracers.forEach(mesh => { mesh.isVisible = false; }); this.tracerAge = 0; this.tracerIndex = 0; }
  dispose() { this.reset(); this.templates.forEach(mesh => mesh.dispose()); this.tracers.forEach(mesh => mesh.dispose()); this.materials.forEach(m => m.dispose()); }
}

