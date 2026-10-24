import { Color3, MeshBuilder, Quaternion, StandardMaterial, Vector3, type Mesh, type PhysicsBody, type Scene } from '@babylonjs/core';

import { TRAINING_BALLISTICS } from './WeaponDefinition.ts';

export interface ProjectileHit {
  point: Vector3;
  normal: Vector3;
  body?: PhysicsBody;
  distance: number;
}

export interface ProjectileState {
  previous: Vector3;
  position: Vector3;
  velocity: Vector3;
  traveled: number;
  age: number;
  alive: boolean;
}

export type ProjectileRaycast = (from: Vector3, to: Vector3) => ProjectileHit | undefined;


/** Kinematic projectiles: no rigid body per shell, swept segment queries prevent tunnelling. */
export class ProjectileSystem {
  readonly scene: Scene;
  readonly raycast: ProjectileRaycast;
  readonly capacity: number;
  readonly projectiles: ProjectileState[] = [];
  private readonly tracers: Mesh[];
  private readonly material: StandardMaterial;
  constructor(scene: Scene, raycast: ProjectileRaycast, capacity = 8) {
    this.scene = scene;
    this.raycast = raycast;
    this.capacity = capacity;
    this.material = new StandardMaterial('projectile-tracer', scene);
    this.material.disableLighting = true;
    this.material.emissiveColor = new Color3(1, 0.72, 0.28);
    this.tracers = Array.from({ length: capacity }, (_, index) => {
      const tracer = MeshBuilder.CreateCylinder(`projectile-tracer-${index}`,
        { height: 1, diameter: TRAINING_BALLISTICS.diameter, tessellation: 6 }, scene);
      tracer.material = this.material;
      tracer.rotationQuaternion = Quaternion.Identity();
      tracer.isPickable = false;
      tracer.isVisible = false;
      return tracer;
    });
  }
  get active() { return this.projectiles.filter(projectile => projectile.alive); }
  spawn(origin: Vector3, direction: Vector3, speed: number): ProjectileState | undefined {
    const index = this.projectiles.length < this.capacity
      ? this.projectiles.length
      : this.projectiles.findIndex(projectile => !projectile.alive);
    if (index < 0) return undefined;
    const state: ProjectileState = {
      previous: origin.clone(),
      position: origin.clone(),
      velocity: direction.normalizeToNew().scale(speed),
      traveled: 0,
      age: 0,
      alive: true,
    };
    if (index === this.projectiles.length) this.projectiles.push(state);
    else this.projectiles[index] = state;
    return state;
  }
  fixedUpdate(dt: number, onImpact?: (hit: ProjectileHit, projectile: ProjectileState) => void) {
    for (const projectile of this.projectiles) {
      if (!projectile.alive) continue;
      projectile.previous.copyFrom(projectile.position);
      projectile.age += dt;
      projectile.velocity.y += TRAINING_BALLISTICS.gravity * dt;
      const distance = Math.min(projectile.velocity.length() * dt, TRAINING_BALLISTICS.maxRange - projectile.traveled);
      const to = projectile.position.add(projectile.velocity.normalizeToNew().scale(distance));
      const hit = this.raycast(projectile.position, to);
      if (hit) {
        projectile.position.copyFrom(hit.point);
        projectile.traveled += projectile.position.subtract(projectile.previous).length();
        projectile.alive = false;
        onImpact?.(hit, projectile);
        continue;
      }
      projectile.position.copyFrom(to);
      projectile.traveled += projectile.position.subtract(projectile.previous).length();
      if (projectile.traveled >= TRAINING_BALLISTICS.maxRange || projectile.age >= TRAINING_BALLISTICS.maxAge || projectile.position.y < -60) projectile.alive = false;
    }
  }
  render(alpha: number) {
    this.projectiles.forEach((projectile, index) => {
      const tracer = this.tracers[index];
      tracer.isVisible = projectile.alive;
      if (!projectile.alive) return;
      Vector3.LerpToRef(projectile.previous, projectile.position, alpha, tracer.position);
      const direction = projectile.velocity.normalizeToNew();
      const length = Math.min(TRAINING_BALLISTICS.trailLength, projectile.velocity.length() * TRAINING_BALLISTICS.trailSeconds, projectile.traveled);
      tracer.scaling.y = length;
      tracer.position.subtractInPlace(direction.scale(length / 2));
      Quaternion.FromUnitVectorsToRef(Vector3.Up(), direction, tracer.rotationQuaternion!);
    });
  }
  reset() {
    this.projectiles.forEach(projectile => { projectile.alive = false; });
    this.tracers.forEach(tracer => { tracer.isVisible = false; });
  }
  dispose() {
    this.tracers.forEach(tracer => tracer.dispose());
    this.material.dispose();
    this.projectiles.length = 0;
  }
}
