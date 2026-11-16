import { optimizeStaticProps } from './optimizeStaticProps.ts';
import { Color3, LoadAssetContainerAsync, Matrix, Mesh, MeshBuilder, PBRMaterial, PhysicsAggregate, PhysicsShapeType, Quaternion, StandardMaterial, TransformNode, Vector3, VertexData, type AssetContainer, type Scene } from '@babylonjs/core';
import { registerBuiltInLoaders } from '@babylonjs/loaders/dynamic.js';
import {
  DRAGON_TOOTH, HEDGEHOG, KUL_DRAGON_TEETH_ROWS, KUL_HEDGE_ROWS, KUL_HEDGEHOG_GROUPS, KUL_POLE_LINES, KUL_SANDBAG_LINES, KUL_SUPPLY_DUMPS, KUL_WIRE_LINES,
  POLE, SANDBAG, dumpBarrels, dumpCrates, hedgePlants, hedgehogPositions, lineSegments, toothPositions, type FieldPropKind,
} from './kulFieldPropsLayout.ts';
import { kulTerrainHeight, type MapPoint } from './kulVadisiLayout.ts';

registerBuiltInLoaders();
/** Quaternius Stylized Nature MegaKit (CC0); see assets/environment/quaternius_nature/README.md. */
export const fieldPropSources = {
  bushFlowers: new URL('../../../assets/environment/quaternius_nature/Bush_Common_Flowers.glb', import.meta.url).href,
  tallGrass: new URL('../../../assets/environment/quaternius_nature/Grass_Common_Tall.glb', import.meta.url).href,
};

type Surface = 'concrete' | 'metal' | 'soil' | 'foliage';
const UP = Vector3.Up();

/**
 * Fixed field obstacles and story dressing. Hard cover (teeth, hedgehogs, sandbag lines, poles) gets
 * static Havok bodies; hedges, dumps, wire and cables are visual only and never stop tanks or shells.
 */
export async function createKulFieldProps(scene: Scene, sources: Record<keyof typeof fieldPropSources, string | Uint8Array> = fieldPropSources) {
  const meshes: Mesh[] = [], materials: StandardMaterial[] = [], bodies: PhysicsAggregate[] = [], assets: AssetContainer[] = [];
  const dispose = () => {
    bodies.forEach(b => b.dispose()); meshes.forEach(m => m.dispose());
    materials.forEach(m => m.dispose()); assets.forEach(a => a.dispose());
    bodies.length = meshes.length = materials.length = assets.length = 0;
  };
  const material = (name: string, color: string) => {
    const m = new StandardMaterial(name, scene); m.diffuseColor = Color3.FromHexString(color); m.specularColor = Color3.Black(); materials.push(m); return m;
  };
  const setup = (m: Mesh, prop: FieldPropKind | 'cable', hardCover: boolean, surface: Surface, mat: StandardMaterial | null) => {
    if (mat) m.material = mat;
    m.metadata = { battlefield: true, hardCover, surface, prop };
    m.isPickable = false; m.receiveShadows = true; meshes.push(m); return m;
  };
  const solid = (m: Mesh, shape = PhysicsShapeType.MESH) => {
    m.isPickable = true; bodies.push(new PhysicsAggregate(m, shape, { mass: 0, friction: 0.85, restitution: 0 }, scene));
  };
  const merge = (name: string, parts: Mesh[]) => {
    const merged = Mesh.MergeMeshes(parts, true, true);
    if (!merged) throw new Error(`Field prop merge failed: ${name}`);
    merged.name = merged.id = name; return merged;
  };
  /** Static repeated pieces: one merged mesh from a template and world matrices (works without instancing support). */
  const bake = (name: string, template: Mesh, matrices: Matrix[]) => {
    const base = VertexData.ExtractFromMesh(template, true, true); template.dispose();
    const [first, ...rest] = matrices.map(m => { const d = new VertexData(); d.positions = base.positions!.slice(); d.normals = base.normals!.slice(); d.uvs = base.uvs?.slice() ?? null; d.indices = base.indices!.slice(); return d.transform(m); });
    const mesh = new Mesh(name, scene); first.merge(rest, true).applyToMesh(mesh); return mesh;
  };
  const lowestGround = (points: MapPoint[]) => Math.min(...points.map(p => kulTerrainHeight(p.x, p.z)));
  const around = (p: MapPoint, r: number) => [p, ...[0, 1, 2, 3].map(i => ({ x: p.x + Math.cos(i * Math.PI / 2) * r, z: p.z + Math.sin(i * Math.PI / 2) * r }))];

  try {
    // Mat, faded Industrial Low Poly tones matching createKulBattlefield.
    const concrete = material('field-props-concrete', '#7F7E70');
    const steel = material('field-props-steel', '#524C45');
    const burlap = material('field-props-sandbag', '#8A7B5C');
    const rust = material('field-props-barrel-rust', '#6E4E3A');
    const olive = material('field-props-barrel-olive', '#5E5F45');
    const wood = material('field-props-wood', '#7A6849');
    const poleWood = material('field-props-pole', '#5E4F3E');
    const wire = material('field-props-wire', '#3F3B37');

    // a) Dragon teeth: one merged, flat-shaded concrete mesh and one static triangle body per row.
    KUL_DRAGON_TEETH_ROWS.forEach((row, r) => {
      const teeth = toothPositions(row).map((p, i) => {
        const height = DRAGON_TOOTH.height * (1 - (i % 3) * 0.06);
        const tooth = MeshBuilder.CreateCylinder(`tooth-${r}-${i}`, {
          height, tessellation: 4, diameterBottom: DRAGON_TOOTH.base * Math.SQRT2, diameterTop: DRAGON_TOOTH.top * Math.SQRT2,
        }, scene);
        tooth.rotation.set(((i * 7) % 5 - 2) * 0.02, row.yaw + Math.PI / 4 + ((i * 3) % 4 - 1.5) * 0.05, ((i * 5) % 3 - 1) * 0.03);
        // Sunk 0.15 m below the lowest base corner so slopes leave no gap.
        tooth.position.set(p.x, lowestGround(around(p, DRAGON_TOOTH.base * 0.71)) + height / 2 - 0.15, p.z);
        return tooth;
      });
      const mesh = merge(`field-dragon-teeth-${r}`, teeth); mesh.convertToFlatShadedMesh();
      setup(mesh, 'dragon-teeth', true, 'concrete', concrete); solid(mesh);
    });

    // a) Czech hedgehogs: three crossed I-beams, a cube diagonal stood upright → three legs on the ground.
    const diagonal = new Vector3(1, 1, 1).normalize();
    const tilt = Quaternion.RotationAxis(Vector3.Cross(diagonal, UP).normalize(), Math.acos(Vector3.Dot(diagonal, UP)));
    const halfHeight = HEDGEHOG.beam / 2 / Math.sqrt(3);
    KUL_HEDGEHOG_GROUPS.forEach((group, r) => {
      const parts: Mesh[] = [], nodes: TransformNode[] = [];
      hedgehogPositions(group).forEach((p, i) => {
        const node = new TransformNode(`hedgehog-${r}-${i}`, scene); nodes.push(node);
        node.rotationQuaternion = Quaternion.RotationAxis(UP, p.yaw).multiply(tilt);
        node.position.set(p.x, lowestGround(around(p, HEDGEHOG.radius)) + halfHeight - 0.12, p.z);
        for (const axis of [new Vector3(0, 0, Math.PI / 2), Vector3.Zero(), new Vector3(Math.PI / 2, 0, 0)]) {
          const f = HEDGEHOG.flange, L = HEDGEHOG.beam;
          for (const [w, d, offset] of [[f, 0.025, f * 0.45], [f, 0.025, -f * 0.45], [0.02, f * 0.9, 0]] as const) {
            const plate = MeshBuilder.CreateBox(`hedgehog-plate-${r}-${i}`, { width: w, height: L, depth: d }, scene);
            const beam = new TransformNode('hedgehog-beam', scene); nodes.push(beam);
            beam.parent = node; beam.rotation.copyFrom(axis);
            plate.parent = beam; plate.position.z = offset; parts.push(plate);
          }
        }
      });
      nodes.forEach(n => n.computeWorldMatrix(true)); parts.forEach(p => p.computeWorldMatrix(true));
      const mesh = merge(`field-hedgehogs-${r}`, parts); nodes.forEach(n => n.dispose());
      setup(mesh, 'hedgehogs', true, 'metal', steel); solid(mesh);
    });

    // b) Sandbag lines: one thin-instanced bag mesh; one hidden box collider per straight segment.
    const bag = MeshBuilder.CreateBox('field-sandbag-template', { width: SANDBAG.length, height: SANDBAG.height, depth: SANDBAG.depth }, scene);
    {
      // Pinch the top and bottom faces for a filled-bag silhouette; keep faceted normals.
      const pos = bag.getVerticesData('position')!;
      for (let i = 0; i < pos.length; i += 3) if (Math.abs(pos[i + 1]) > SANDBAG.height * 0.49) { pos[i] *= 0.9; pos[i + 2] *= 0.8; }
      const normals: number[] = []; VertexData.ComputeNormals(pos, bag.getIndices()!, normals);
      bag.updateVerticesData('position', pos); bag.updateVerticesData('normal', normals);
    }
    const bagMatrices: Matrix[] = [];
    KUL_SANDBAG_LINES.forEach((line, r) => lineSegments(line.points).forEach((s, k) => {
      const n = Math.max(1, Math.round(s.length / (SANDBAG.length * 0.95))), step = s.length / n;
      for (let layer = 0; layer < SANDBAG.layers; layer++) {
        const across = layer < 2 ? [-SANDBAG.depth / 2, SANDBAG.depth / 2] : [0];
        const shift = layer % 2 ? step / 2 : 0;
        for (let j = 0; j < n + (layer % 2 ? -1 : 0); j++) for (const side of across) {
          const along = -s.length / 2 + step * (j + 0.5) + shift;
          const c = Math.cos(s.yaw), sn = Math.sin(s.yaw);
          const x = s.x + along * c + side * sn, z = s.z - along * sn + side * c;
          const seed = (r * 131 + k * 37 + layer * 11 + j * 7 + (side > 0 ? 3 : 0)) % 17;
          const y = kulTerrainHeight(x, z) - 0.06 + layer * (SANDBAG.height - 0.01) + SANDBAG.height / 2;
          bagMatrices.push(Matrix.Compose(new Vector3(1 + (seed % 3) * 0.04, 1, 1 - (seed % 2) * 0.05),
            Quaternion.FromEulerAngles((seed % 5 - 2) * 0.03, s.yaw + (seed % 7 - 3) * 0.04, (seed % 3 - 1) * 0.04), new Vector3(x, y, z)));
        }
      }
      const samples = [0, 0.25, 0.5, 0.75, 1].map(t => kulTerrainHeight(s.a.x + (s.b.x - s.a.x) * t, s.a.z + (s.b.z - s.a.z) * t));
      const bottom = Math.min(...samples) - 0.5, top = samples.reduce((a, b) => a + b) / samples.length + SANDBAG.layers * SANDBAG.height - 0.05;
      const collider = MeshBuilder.CreateBox(`field-sandbags-${r}-collider-${k}`, { width: s.length + 0.3, depth: SANDBAG.depth * 2, height: top - bottom }, scene);
      collider.position.set(s.x, (top + bottom) / 2, s.z); collider.rotation.y = s.yaw; collider.isVisible = false;
      setup(collider, 'sandbags', true, 'soil', null); collider.metadata.collider = true; solid(collider, PhysicsShapeType.BOX); collider.isPickable = false;
    }));
    setup(bake('field-sandbags', bag, bagMatrices), 'sandbags', true, 'soil', burlap);

    // c) Hedges: MegaKit bush/tall grass baked into one mesh per source primitive; no physics.
    const plants = { bushFlowers: [] as (MapPoint & { yaw: number; size: number })[], tallGrass: [] as (MapPoint & { yaw: number; size: number })[] };
    KUL_HEDGE_ROWS.forEach(row => hedgePlants(row).forEach(p => plants[p.bush ? 'bushFlowers' : 'tallGrass'].push(p)));
    for (const key of Object.keys(fieldPropSources) as (keyof typeof fieldPropSources)[]) {
      const container = await LoadAssetContainerAsync(sources[key], scene, { pluginExtension: '.glb' }); assets.push(container);
      if (scene.isDisposed) throw new Error('Field props loaded after scene disposal.');
      for (const m of container.materials) if (m instanceof PBRMaterial) {
        m.roughness = 1; m.metallic = 0; m.albedoColor.multiplyInPlace(Color3.FromHexString('#A6A783'));
      }
      const geometry = container.meshes.filter((m): m is Mesh => m instanceof Mesh && m.getTotalVertices() > 0);
      if (!geometry.length) throw new Error(`Missing field prop geometry: ${key}`);
      geometry.forEach(m => m.computeWorldMatrix(true));
      const min = geometry.reduce((v, m) => Vector3.Minimize(v, m.getBoundingInfo().boundingBox.minimumWorld), new Vector3(Infinity, Infinity, Infinity));
      const max = geometry.reduce((v, m) => Vector3.Maximize(v, m.getBoundingInfo().boundingBox.maximumWorld), new Vector3(-Infinity, -Infinity, -Infinity));
      geometry.forEach((source, g) => {
        const parts = plants[key].map(p => {
          const s = p.size / (max.y - min.y);
          const place = Matrix.Translation(-(min.x + max.x) / 2, -min.y, -(min.z + max.z) / 2)
            .multiply(Matrix.Scaling(s, s, s)).multiply(Matrix.RotationY(p.yaw)).multiply(Matrix.Translation(p.x, kulTerrainHeight(p.x, p.z) - 0.05, p.z));
          const data = VertexData.ExtractFromMesh(source, true, true); data.transform(source.getWorldMatrix().multiply(place)); return data;
        });
        const [first, ...rest] = parts;
        const mesh = new Mesh(`field-hedge-${key}-${g}`, scene);
        first.merge(rest, true).applyToMesh(mesh);
        setup(mesh, 'hedge', false, 'foliage', null); mesh.material = source.material;
      });
    }

    // d) Supply dumps: rusty barrels (some tipped) and crates; thin instances, no physics.
    const barrels: Matrix[][] = [[], []], crates: Matrix[] = [], planks: Matrix[] = [];
    KUL_SUPPLY_DUMPS.forEach((d, r) => {
      dumpBarrels(d).forEach((b, i) => {
        const g = kulTerrainHeight(b.x, b.z);
        const rotation = b.tipped ? Quaternion.FromEulerAngles(Math.PI / 2, b.yaw, 0) : Quaternion.FromEulerAngles(0, b.yaw, (i % 3 - 1) * 0.04);
        barrels[(r + i) % 2].push(Matrix.Compose(Vector3.One(), rotation, new Vector3(b.x, g + (b.tipped ? 0.28 : 0.41), b.z)));
      });
      dumpCrates(d).forEach((c, i) => {
        const g = kulTerrainHeight(c.x, c.z);
        if (!c.broken) {
          crates.push(Matrix.Compose(Vector3.One(), Quaternion.FromEulerAngles(0, c.yaw, 0), new Vector3(c.x, g + 0.32, c.z)));
          return;
        }
        // Broken crate: crushed low body tipped on one edge and loose planks.
        crates.push(Matrix.Compose(new Vector3(1, 0.5, 1), Quaternion.FromEulerAngles(0.18, c.yaw, 0.12), new Vector3(c.x, g + 0.14, c.z)));
        for (let k = 0; k < 3; k++) {
          const a = c.yaw + k * 2.1 + i, x = c.x + Math.cos(a) * 1.0, z = c.z + Math.sin(a) * 1.0;
          planks.push(Matrix.Compose(Vector3.One(), Quaternion.FromEulerAngles(0.05 * k, a, k === 1 ? 0.3 : 0), new Vector3(x, kulTerrainHeight(x, z) + 0.03 + (k === 1 ? 0.12 : 0), z)));
        }
      });
    });
    [rust, olive].forEach((mat, i) => setup(bake(`field-barrels-${i}`, MeshBuilder.CreateCylinder('barrel-template', { height: 0.88, diameter: 0.6, tessellation: 10 }, scene), barrels[i]), 'barrels', false, 'metal', mat));
    setup(bake('field-crates', MeshBuilder.CreateBox('crate-template', { width: 1, height: 0.7, depth: 0.8 }, scene), [...crates, ...planks.map(m => Matrix.Scaling(1.1, 0.057, 0.19).multiply(m))]), 'crates', false, 'soil', wood);

    // d) Leaning telephone poles with sagging cables; a slim static body per pole line.
    const cables: Mesh[] = [];
    const tube = (name: string, path: Vector3[]) => cables.push(MeshBuilder.CreateTube(name, { path, radius: 0.022, tessellation: 4 }, scene));
    KUL_POLE_LINES.forEach((line, r) => {
      const parts: Mesh[] = [], nodes: TransformNode[] = [], armEnds: Vector3[][] = [];
      line.points.forEach((p, i) => {
        const node = new TransformNode(`pole-${r}-${i}`, scene); nodes.push(node);
        const axis = new Vector3(Math.cos(p.leanYaw), 0, -Math.sin(p.leanYaw));
        node.rotationQuaternion = Quaternion.RotationAxis(axis, p.lean).multiply(Quaternion.RotationAxis(UP, p.leanYaw));
        node.position.set(p.x, kulTerrainHeight(p.x, p.z) - 0.4, p.z);
        const shaft = MeshBuilder.CreateCylinder(`pole-shaft-${r}-${i}`, { height: POLE.height, diameterTop: POLE.diameter * 0.8, diameterBottom: POLE.diameter, tessellation: 6 }, scene);
        shaft.parent = node; shaft.position.y = POLE.height / 2;
        const arm = MeshBuilder.CreateBox(`pole-arm-${r}-${i}`, { width: POLE.arm, height: 0.12, depth: 0.12 }, scene);
        arm.parent = node; arm.position.y = POLE.height - 0.6; arm.rotation.z = (i % 2 ? 0.12 : -0.08);
        parts.push(shaft, arm); node.computeWorldMatrix(true);
        armEnds.push([-1, 1].map(side => Vector3.TransformCoordinates(new Vector3(side * POLE.arm * 0.42, POLE.height - 0.5, 0), node.getWorldMatrix())));
      });
      for (let i = 1; i < armEnds.length; i++) for (const side of [0, 1]) {
        const a = armEnds[i - 1][side], b = armEnds[i][side], sag = 1 + Vector3.Distance(a, b) * 0.08;
        tube(`cable-${r}-${i}-${side}`, Array.from({ length: 15 }, (_, k) => {
          const t = k / 14, p = Vector3.Lerp(a, b, t); p.y -= 4 * sag * t * (1 - t); return p;
        }));
      }
      // Torn cables drape from the outer pole onto the ground beyond it.
      const last = line.points[line.points.length - 1], prev = line.points[line.points.length - 2];
      const dir = new Vector3(last.x - prev.x, 0, last.z - prev.z).normalize();
      armEnds[armEnds.length - 1].forEach((top, side) => tube(`cable-${r}-loose-${side}`, Array.from({ length: 14 }, (_, k) => {
        const t = k / 13, x = top.x + dir.x * t * 7 + side * 0.5 * t, z = top.z + dir.z * t * 7 - side * 0.4 * t;
        const ground = kulTerrainHeight(x, z) + 0.03;
        return new Vector3(x, Math.max(ground, top.y - (top.y - ground) * Math.min(1, t * 1.8) ** 1.5), z);
      })));
      nodes.forEach(n => n.computeWorldMatrix(true)); parts.forEach(p => p.computeWorldMatrix(true));
      const mesh = merge(`field-poles-${r}`, parts); nodes.forEach(n => n.dispose());
      mesh.convertToFlatShadedMesh(); setup(mesh, 'pole', true, 'soil', poleWood); solid(mesh);
    });

    // d) Barbed wire: steel pickets, a concertina coil and a sagging top strand; no physics.
    KUL_WIRE_LINES.forEach((line, r) => {
      const posts: Vector3[] = [];
      lineSegments(line.points).forEach((s, k) => {
        const n = Math.max(1, Math.round(s.length / 2.5));
        for (let j = k ? 1 : 0; j <= n; j++) {
          const x = s.a.x + (s.b.x - s.a.x) * j / n, z = s.a.z + (s.b.z - s.a.z) * j / n;
          posts.push(new Vector3(x, kulTerrainHeight(x, z), z));
        }
        const c = Math.cos(s.yaw), sn = Math.sin(s.yaw), path: Vector3[] = [];
        for (let t = 0; t <= s.length; t += 0.06) {
          const turn = t / 0.4 * Math.PI * 2, side = Math.cos(turn) * 0.38, along = t - s.length / 2 + Math.sin(turn) * 0.08;
          const x = s.x + along * c + side * sn, z = s.z - along * sn + side * c;
          path.push(new Vector3(x, kulTerrainHeight(x, z) + 0.4 + Math.sin(turn) * 0.36, z));
        }
        cables.push(MeshBuilder.CreateTube(`wire-coil-${r}-${k}`, { path, radius: 0.012, tessellation: 3 }, scene));
      });
      const pickets = posts.map((p, i) => {
        const picket = MeshBuilder.CreateBox(`wire-picket-${r}-${i}`, { width: 0.07, height: 1.3, depth: 0.07 }, scene);
        picket.position.set(p.x, p.y + 0.5, p.z); picket.rotation.set((i % 3 - 1) * 0.08, i, (i % 2 ? 0.06 : -0.05)); return picket;
      });
      for (let i = 1; i < posts.length; i++) {
        const a = posts[i - 1].add(new Vector3(0, 1.08, 0)), b = posts[i].add(new Vector3(0, 1.08, 0));
        cables.push(MeshBuilder.CreateTube(`wire-strand-${r}-${i}`, { path: Array.from({ length: 6 }, (_, k) => {
          const t = k / 5, p = Vector3.Lerp(a, b, t); p.y -= 0.4 * t * (1 - t); return p;
        }), radius: 0.01, tessellation: 3 }, scene));
      }
      setup(merge(`field-barbed-wire-${r}`, pickets), 'barbed-wire', false, 'metal', steel);
    });
    setup(merge('field-cables-and-wire', cables), 'cable', false, 'metal', wire);

    optimizeStaticProps(meshes, []);
    return { meshes, shadowCasters: meshes.filter(m => m.isVisible && m.metadata.prop !== 'cable' && m.metadata.prop !== 'barbed-wire'), dispose };
  } catch (error) { dispose(); throw error; }
}
