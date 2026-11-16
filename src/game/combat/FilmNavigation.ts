import { AbstractMesh, Vector3, type PhysicsEngineV2, type Scene } from '@babylonjs/core';
import { filmSetHeight, riverCenterX, RIVER } from '../world/filmSetLayout.ts';

interface Obstacle { minX: number; maxX: number; minZ: number; maxZ: number; minY: number; maxY: number }
/** Conservative swept disk (metres): encloses either tank hull at every heading, plus steering margin. */
export const FILM_NAV = { step: 6, radius: 5.5, minX: -170, maxX: 170, minZ: -225, maxZ: 237,
  expansionsPerStep: 96, lookAhead: 12, sensorSeconds: .12, replanSeconds: .8, coverEyeHeight: 2.4 } as const;

/** Built once, after the map loads and before the bots load. Uses only actual static collider meshes. */
export class FilmNavigation {
  readonly nodes: Vector3[] = [];
  readonly edges: number[][] = [];
  readonly obstacles: Obstacle[] = [];
  readonly scene: Scene;
  constructor(scene: Scene) {
    this.scene = scene;
    for (const body of (scene.getPhysicsEngine()! as PhysicsEngineV2).getBodies()) {
      const mesh = body.transformNode;
      if (!(mesh instanceof AbstractMesh) || mesh.name === 'natural-terrain') continue;
      mesh.computeWorldMatrix(true);
      const box = mesh.getBoundingInfo().boundingBox;
      this.obstacles.push({ minX: box.minimumWorld.x, maxX: box.maximumWorld.x,
        minZ: box.minimumWorld.z, maxZ: box.maximumWorld.z, minY: box.minimumWorld.y, maxY: box.maximumWorld.y });
    }
    const grid = new Map<string, number>();
    for (let x = FILM_NAV.minX; x <= FILM_NAV.maxX; x += FILM_NAV.step)
      for (let z = FILM_NAV.minZ; z <= FILM_NAV.maxZ; z += FILM_NAV.step) {
        const p = new Vector3(x, filmSetHeight(x, z), z);
        if (!this.clearSegment(p, p)) continue;
        grid.set(`${x},${z}`, this.nodes.length); this.nodes.push(p); this.edges.push([]);
      }
    this.nodes.forEach((p, i) => {
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
        if (!dx && !dz) continue;
        const j = grid.get(`${p.x + dx * FILM_NAV.step},${p.z + dz * FILM_NAV.step}`);
        if (j !== undefined && this.clearSegment(p, this.nodes[j])) this.edges[i].push(j);
      }
    });
  }
  /** Rectangle slab intersection, inflated by hull radius. Terrain is checked independently. */
  clearSegment(a: Vector3, b: Vector3, radius = FILM_NAV.radius) {
    const dx = b.x - a.x, dz = b.z - a.z;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 3));
    let previousY = filmSetHeight(a.x, a.z);
    for (let i = 0; i <= steps; i++) {
      const x = a.x + dx * i / steps, z = a.z + dz * i / steps, y = filmSetHeight(x, z);
      if (x < FILM_NAV.minX || x > FILM_NAV.maxX || z < FILM_NAV.minZ || z > FILM_NAV.maxZ
        || Math.abs(x - riverCenterX(z)) < RIVER.waterHalf + radius + 7
        || Math.abs(y - previousY) > 1.5) return false;
      previousY = y;
    }
    const aY = filmSetHeight(a.x, a.z), bY = filmSetHeight(b.x, b.z);
    for (const o of this.obstacles) {
      if (o.maxY < Math.min(aY, bY) + .15 || o.minY > Math.max(aY, bY) + 3.5) continue;
      let lo = 0, hi = 1;
      for (let axis = 0; axis < 2; axis++) {
        const p = axis ? a.z : a.x, d = axis ? dz : dx;
        const min = (axis ? o.minZ : o.minX) - radius, max = (axis ? o.maxZ : o.maxX) + radius;
        if (Math.abs(d) < 1e-8) { if (p < min || p > max) { lo = 2; break; } }
        else { const t1 = (min - p) / d, t2 = (max - p) / d; lo = Math.max(lo, Math.min(t1, t2)); hi = Math.min(hi, Math.max(t1, t2)); }
      }
      if (lo <= hi) return false;
    }
    return true;
  }
  nearest(p: Vector3, connected = false) {
    let best = -1, distance = Infinity;
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i], d = (p.x - n.x) ** 2 + (p.z - n.z) ** 2;
      if (d < distance && (!connected || this.clearSegment(p, n))) { distance = d; best = i; }
    }
    return best;
  }
  /** Static cover LOS does not accidentally classify an allied tank as a durable shelter. */
  occluded(from: Vector3, threat: Vector3) {
    const dx = threat.x - from.x, dz = threat.z - from.z;
    const fromY = filmSetHeight(from.x, from.z) + FILM_NAV.coverEyeHeight, toY = threat.y + 1.2;
    for (const o of this.obstacles) {
      const cx = (o.minX + o.maxX) / 2, cz = (o.minZ + o.maxZ) / 2;
      const t = Math.max(0, Math.min(1, ((cx - from.x) * dx + (cz - from.z) * dz) / (dx * dx + dz * dz || 1)));
      const y = fromY + (toY - fromY) * t;
      if (y <= o.minY || y >= o.maxY) continue;
      // Exact uninflated slab test in XZ, using a vertical slice through the sight line.
      let lo = .02, hi = .98;
      for (let axis = 0; axis < 2; axis++) {
        const p = axis ? from.z : from.x, d = axis ? dz : dx;
        const min = axis ? o.minZ : o.minX, max = axis ? o.maxZ : o.maxX;
        if (Math.abs(d) < 1e-8) { if (p < min || p > max) { lo = 2; break; } }
        else { const u = (min - p) / d, v = (max - p) / d; lo = Math.max(lo, Math.min(u, v)); hi = Math.min(hi, Math.max(u, v)); }
      }
      if (lo <= hi) {
        // Confirm against Havok: open doors / holes in mesh colliders are not cover.
        const hit = this.scene.getPhysicsEngine()!.raycast(new Vector3(from.x, fromY, from.z), new Vector3(threat.x, toY, threat.z));
        if (hit.hasHit && hit.body?.transformNode.name !== 'tank-physics') return true;
      }
    }
    return false;
  }
  tacticalPoint(position: Vector3, threat: Vector3, cover: boolean, side: number, previous?: Vector3) {
    let best: Vector3 | undefined, score = Infinity;
    const tx = threat.x - position.x, tz = threat.z - position.z, length = Math.hypot(tx, tz) || 1;
    for (const n of this.nodes) {
      const dx = n.x - position.x, dz = n.z - position.z, d = Math.hypot(dx, dz);
      if (d < 9 || d > (cover ? 65 : 35) || previous && Vector3.DistanceSquared(n, previous) < 100) continue;
      const lateral = (dx * tz - dz * tx) / length * side;
      const value = d + (cover ? 0 : Math.abs(lateral - 17) * 2) + Math.max(0, (dx * tx + dz * tz) / length) * (cover ? 1.2 : 0);
      if (value < score && this.occluded(n, threat) === cover) { best = n; score = value; }
    }
    return best;
  }
}

/** Incremental A*: fixed expansion budget, reusable typed arrays, deterministic tie breaking. */
export class NavigationAgent {
  readonly path: number[] = [];
  private readonly g: Float64Array;
  private readonly parent: Int32Array;
  private readonly status: Uint8Array;
  private readonly open: number[] = [];
  private goal = -1;
  private cursor = 0;
  pending = false;
  expanded = 0;
  private readonly destination = new Vector3(Infinity, 0, Infinity);
  readonly graph: FilmNavigation;
  constructor(graph: FilmNavigation) {
    this.graph = graph;
    this.g = new Float64Array(graph.nodes.length); this.parent = new Int32Array(graph.nodes.length); this.status = new Uint8Array(graph.nodes.length);
  }
  reset() { this.path.length = this.open.length = 0; this.pending = false; this.goal = -1; this.destination.set(Infinity, 0, Infinity); }
  request(position: Vector3, goal: Vector3) {
    if (Vector3.DistanceSquared(goal, this.destination) < 16 && (this.pending || this.path.length)) return;
    this.destination.copyFrom(goal);
    const start = this.graph.nearest(position, true); this.goal = this.graph.nearest(goal);
    this.path.length = this.open.length = 0; this.cursor = this.expanded = 0;
    this.pending = start >= 0 && this.goal >= 0;
    if (!this.pending) return;
    this.g.fill(Infinity); this.parent.fill(-1); this.status.fill(0);
    this.g[start] = 0; this.status[start] = 1; this.open.push(start);
  }
  step(budget: number) {
    let used = 0;
    while (this.pending && this.open.length && used < budget) {
      let at = 0, best = Infinity;
      const target = this.graph.nodes[this.goal];
      for (let i = 0; i < this.open.length; i++) {
        const id = this.open[i], n = this.graph.nodes[id];
        const f = this.g[id] + Math.hypot(n.x - target.x, n.z - target.z);
        if (f < best) { best = f; at = i; }
      }
      const current = this.open[at]; this.open[at] = this.open[this.open.length - 1]; this.open.pop();
      this.status[current] = 2; used++; this.expanded++;
      if (current === this.goal) {
        for (let i = current; i >= 0; i = this.parent[i]) this.path.push(i);
        this.path.reverse(); this.pending = false; break;
      }
      for (const next of this.graph.edges[current]) {
        if (this.status[next] === 2) continue;
        const cost = this.g[current] + Vector3.Distance(this.graph.nodes[current], this.graph.nodes[next]);
        if (cost >= this.g[next]) continue;
        this.g[next] = cost; this.parent[next] = current;
        if (!this.status[next]) { this.status[next] = 1; this.open.push(next); }
      }
    }
    if (!this.open.length) this.pending = false;
    return used;
  }
  follow(position: Vector3, speed: number) {
    if (!this.path.length) return undefined;
    while (this.cursor < this.path.length - 1 && Vector3.DistanceSquared(position, this.graph.nodes[this.path[this.cursor]]) < 49) this.cursor++;
    let target = this.graph.nodes[this.path[this.cursor]];
    const distance = FILM_NAV.lookAhead + Math.abs(speed) * .6;
    for (let i = this.cursor + 1; i < this.path.length; i++) {
      const n = this.graph.nodes[this.path[i]];
      if (Vector3.DistanceSquared(position, n) > distance * distance || !this.graph.clearSegment(position, n)) break;
      target = n;
    }
    return target;
  }
}
