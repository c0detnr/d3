"""Shared helpers for the Kul Vadisi landmark builds (farmhouse ruin, armored wreck).

Run builds from the CLI, never inside a user's open Blender window:
  blender -b --factory-startup -P scripts/blender/build_<asset>.py
Contract: metres, Blender Z up, root origin on the ground at the footprint centre,
separate `collision_only=True` meshes, no camera/light/ground in the GLB, no textures.
"""
import bpy, bmesh, json, math
from pathlib import Path
from mathutils import Vector, Matrix

BASE = Path('/home/mami/Projects/d3')


class Builder:
    def __init__(self, asset_id, scene_name, prefix):
        self.asset_id, self.prefix = asset_id, prefix
        self.out = BASE / 'assets/environment' / asset_id
        self.out.mkdir(parents=True, exist_ok=True)
        # Fresh factory scene: drop the default cube/camera/light.
        for obj in list(bpy.data.objects): bpy.data.objects.remove(obj, do_unlink=True)
        self.scene = bpy.context.scene; self.scene.name = scene_name
        self.scene.unit_settings.system = 'METRIC'; self.scene.unit_settings.scale_length = 1
        self.asset = self._collection(prefix + '_Asset'); self.collision = self._collection(prefix + '_Collision')
        self.root = bpy.data.objects.new(f'{asset_id.title().replace("_", "")}Root', None)
        self.asset.objects.link(self.root)
        self.root['asset_id'] = asset_id; self.root['units'] = 'metres'; self.root['hard_cover'] = True

    def _collection(self, name):
        c = bpy.data.collections.new(name); self.scene.collection.children.link(c); return c

    def material(self, name, color, metal=0.0, rough=0.88):
        key = f'{self.prefix}_{name}'; m = bpy.data.materials.get(key)
        if m: return m
        rgb = [int(color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
        rgb = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb]
        m = bpy.data.materials.new(key); m.use_nodes = True; m.diffuse_color = (*rgb, 1)
        bs = m.node_tree.nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value = (*rgb, 1)
        bs.inputs['Roughness'].default_value = rough; bs.inputs['Metallic'].default_value = metal
        return m

    def mesh(self, name, verts, faces, mat, coll=None, recalc=True):
        data = bpy.data.meshes.new(name); data.from_pydata(verts, [], faces); data.update()
        if recalc:
            bm = bmesh.new(); bm.from_mesh(data); bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces)); bm.to_mesh(data); bm.free()
        obj = bpy.data.objects.new(name, data); (coll or self.asset).objects.link(obj)
        if mat: data.materials.append(mat)
        return obj

    def box(self, name, loc, size, mat, rot=(0, 0, 0), coll=None):
        x, y, z = [v / 2 for v in size]
        obj = self.mesh(name, [(-x, -y, -z), (x, -y, -z), (x, y, -z), (-x, y, -z), (-x, -y, z), (x, -y, z), (x, y, z), (-x, y, z)],
                        [(3, 2, 1, 0), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 6, 7)], mat, coll)
        obj.location = loc; obj.rotation_euler = rot; return obj

    def cylinder(self, name, loc, radius, depth, mat, sides=8, axis='Z', rot=None, radius2=None):
        r2 = radius if radius2 is None else radius2; n = sides
        ring = lambda r, h: [(r * math.cos(2 * math.pi * i / n + math.pi / n), r * math.sin(2 * math.pi * i / n + math.pi / n), h) for i in range(n)]
        verts = ring(radius, -depth / 2) + ring(r2, depth / 2)
        faces = [tuple(reversed(range(n))), tuple(range(n, 2 * n))] + [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
        obj = self.mesh(name, verts, faces, mat); obj.location = loc
        base = {'Z': (0, 0, 0), 'X': (0, math.pi / 2, 0), 'Y': (math.pi / 2, 0, 0)}[axis]
        obj.rotation_euler = rot if rot is not None else base
        return obj

    def prism(self, name, outline, axis, t0, t1, mat, top_mat=None, coll=None):
        """Extrude a 2D outline (u, z). axis 'x': u along X, thickness t0..t1 along Y; axis 'y': u along Y."""
        n = len(outline)
        pt = (lambda u, z, t: (u, t, z)) if axis == 'x' else (lambda u, z, t: (t, u, z))
        verts = [pt(u, z, t) for t in (t0, t1) for u, z in outline]
        faces = [tuple(reversed(range(n))), tuple(range(n, 2 * n))] + [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
        obj = self.mesh(name, verts, faces, mat, coll)
        if top_mat:
            obj.data.materials.append(top_mat)
            for p in obj.data.polygons:
                if p.normal.z > .25 and p.center.z > .4: p.material_index = 1
        return obj

    def loft(self, name, bottom, top, mat, top_mat=None):
        """Closed solid between two same-length XYZ rings (bottom, top)."""
        n = len(bottom)
        faces = [tuple(reversed(range(n))), tuple(range(n, 2 * n))] + [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
        obj = self.mesh(name, list(bottom) + list(top), faces, mat)
        if top_mat:
            obj.data.materials.append(top_mat); obj.data.polygons[1].material_index = 1
        return obj

    def beam(self, name, a, b, width, mat, height=None):
        a, b = Vector(a), Vector(b); d = b - a
        obj = self.box(name, (a + b) / 2, (width, height or width, d.length), mat)
        obj.rotation_euler = d.to_track_quat('Z', 'Y').to_euler(); return obj

    def collider(self, obj, name=None):
        copy = obj.copy(); copy.data = obj.data.copy(); copy.data.materials.clear()
        copy.name = name or 'COL_' + obj.name
        for c in list(copy.users_collection): c.objects.unlink(copy)
        self.collision.objects.link(copy); return self.mark_collider(copy)

    def mark_collider(self, obj):
        for c in list(obj.users_collection):
            if c != self.collision: c.objects.unlink(obj)
        if self.collision not in obj.users_collection: self.collision.objects.link(obj)
        obj.data.materials.clear(); obj['collision_only'] = True; obj.hide_render = True; obj.display_type = 'WIRE'
        return obj

    # ---- finalisation -------------------------------------------------------
    def _apply(self, objects):
        for obj in objects:
            obj.data = obj.data.copy() if obj.data.users > 1 else obj.data
            obj.data.transform(obj.matrix_basis); obj.matrix_basis = Matrix.Identity(4)

    def _join(self, objects, name):
        if len(objects) < 2:
            if objects: objects[0].name = name
            return
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects: o.select_set(True)
        bpy.context.view_layer.objects.active = objects[0]; bpy.ops.object.join(); bpy.context.view_layer.objects.active.name = name

    def finalize(self, extra_root_props=None):
        visible = [o for o in self.asset.objects if o.type == 'MESH']
        colliders = [o for o in self.collision.objects if o.type == 'MESH']
        self._apply(visible + colliders)
        # Group by material set: few draw calls, each material appears once.
        groups = {}
        for o in visible: groups.setdefault(tuple(m.name for m in o.data.materials), []).append(o)
        for key, objs in groups.items(): self._join(objs, key[0].replace(self.prefix + '_', '') + '_Geometry')
        visible = [o for o in self.asset.objects if o.type == 'MESH']
        for o in visible:
            bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5); bm.to_mesh(o.data); bm.free()
        pts = [o.matrix_world @ Vector(v) for o in visible for v in o.bound_box]
        lo = Vector([min(p[i] for p in pts) for i in range(3)]); hi = Vector([max(p[i] for p in pts) for i in range(3)])
        shift = Matrix.Translation(Vector((-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z)))
        for o in visible + colliders: o.data.transform(shift); o.data.update(); o.parent = self.root
        for k, v in (extra_root_props or {}).items(): self.root[k] = v
        bpy.context.view_layer.update()
        stats = self.stats()
        bpy.ops.object.select_all(action='DESELECT')
        for o in [self.root] + visible + colliders: o.select_set(True)
        bpy.context.view_layer.objects.active = self.root
        bpy.ops.export_scene.gltf(filepath=str(self.out / f'{self.asset_id}.glb'), export_format='GLB', use_selection=True,
                                  export_extras=True, export_cameras=False, export_lights=False, export_yup=True, export_apply=True)
        for o in colliders: o.hide_set(True)
        (self.out / 'model_stats.json').write_text(json.dumps(stats, indent=2) + '\n')
        bpy.ops.wm.save_as_mainfile(filepath=str(self.out / f'{self.asset_id}.blend'))
        print('STATS', json.dumps(stats))
        return stats

    def stats(self):
        visible = [o for o in self.asset.objects if o.type == 'MESH']; colliders = list(self.collision.objects)
        for o in visible + colliders: o.data.calc_loop_triangles()
        pts = [o.matrix_world @ Vector(v) for o in visible for v in o.bound_box]
        return {
            'stage': 'export', 'method': 'Blender 5.2 CLI background build',
            'visible_meshes': len(visible), 'visible_triangles': sum(len(o.data.loop_triangles) for o in visible),
            'materials': len({m for o in visible for m in o.data.materials}),
            'collision_meshes': len(colliders), 'collision_triangles': sum(len(o.data.loop_triangles) for o in colliders),
            'bounds_min': [min(p[i] for p in pts) for i in range(3)], 'bounds_max': [max(p[i] for p in pts) for i in range(3)],
            'background': bpy.app.background,
        }


def validate_glb(asset_id, expect_colliders, height_range, size_max, extra_checks=None, note=''):
    """Reimport the GLB into an empty factory scene and compare against model_stats.json."""
    out = BASE / 'assets/environment' / asset_id
    stats = json.loads((out / 'model_stats.json').read_text())
    for obj in list(bpy.data.objects): bpy.data.objects.remove(obj, do_unlink=True)
    bpy.ops.import_scene.gltf(filepath=str(out / f'{asset_id}.glb'))
    bpy.context.view_layer.update()
    objects = list(bpy.context.scene.objects)
    visible = [o for o in objects if o.type == 'MESH' and not o.get('collision_only')]
    colliders = [o for o in objects if o.type == 'MESH' and o.get('collision_only')]
    root = next(o for o in objects if o.get('asset_id') == asset_id)
    assert root.get('units') == 'metres' and root.get('hard_cover') is True
    assert len(colliders) == expect_colliders, len(colliders)
    for obj in visible + colliders:
        assert all(math.isfinite(c) for v in obj.data.vertices for c in v.co)
        assert all(abs(s - 1) < 1e-5 for s in obj.scale), obj.name
        assert not obj.modifiers
        obj.data.calc_loop_triangles()
    tris = sum(len(o.data.loop_triangles) for o in visible)
    assert tris == stats['visible_triangles'], (tris, stats['visible_triangles'])
    assert sum(len(o.data.loop_triangles) for o in colliders) == stats['collision_triangles']
    pts = [o.matrix_world @ Vector(v) for o in visible for v in o.bound_box]
    lo = [min(p[i] for p in pts) for i in range(3)]; hi = [max(p[i] for p in pts) for i in range(3)]
    assert all(abs(lo[i] - stats['bounds_min'][i]) < .001 and abs(hi[i] - stats['bounds_max'][i]) < .001 for i in range(3)), (lo, hi)
    assert abs(lo[2]) < 1e-4 and abs(lo[0] + hi[0]) < 1e-3 and abs(lo[1] + hi[1]) < 1e-3, 'ground/footprint-centre origin'
    assert height_range[0] <= hi[2] <= height_range[1], hi[2]
    assert hi[0] - lo[0] <= size_max[0] + 1e-4 and hi[1] - lo[1] <= size_max[1] + 1e-4, (hi[0] - lo[0], hi[1] - lo[1])
    assert not [o for o in objects if o.type in {'CAMERA', 'LIGHT'}]
    assert not [o for o in objects if o.get('asset_id', '').startswith('iron_dust') or o.name.startswith('TankRoot') or 'Preview' in o.name]
    mats = {m for o in visible for m in o.data.materials}
    assert len(mats) == stats['materials']
    assert not [n for m in mats for n in m.node_tree.nodes if n.type == 'TEX_IMAGE']
    assert all(m.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value >= .6 for m in mats)
    extra = extra_checks(visible, colliders) if extra_checks else {}
    report = {'status': 'passed', 'method': 'Blender 5.2 CLI GLB reimport (factory scene)', 'visible_triangles': tris,
              'visible_meshes': len(visible), 'materials': len(mats), 'collision_meshes': len(colliders),
              'collision_triangles': stats['collision_triangles'], 'bounds_min': lo, 'bounds_max': hi,
              'size_m': [hi[i] - lo[i] for i in range(3)], 'metre_scale': True, 'ground_origin': True,
              'external_textures': False, 'tank_in_export': False, **extra, 'collision_note': note}
    (out / 'validation.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
    print('VALIDATION', json.dumps(report))
    return report


def render_preview(asset_id, prefix, view, views, tank_offset, samples=16):
    """Render one preview of the already-open asset .blend. Preview rig is never saved or exported."""
    out = BASE / 'assets/environment' / asset_id; scene = bpy.context.scene
    preview = bpy.data.collections.new(prefix + '_Preview'); scene.collection.children.link(preview)
    world = bpy.data.worlds.new(prefix + '_StudioWorld'); world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (.32, .37, .43, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = .5; scene.world = world
    light = bpy.data.lights.new(prefix + '_Sun', 'SUN'); light.energy = 2.6; light.angle = math.radians(12)
    obj = bpy.data.objects.new(light.name, light); preview.objects.link(obj); obj.rotation_euler = (.55, -.45, -.5)
    light = bpy.data.lights.new(prefix + '_Softbox', 'AREA'); light.energy = 2600; light.size = 12
    obj = bpy.data.objects.new(light.name, light); preview.objects.link(obj); obj.location = (4, -10, 14)
    obj.rotation_euler = (Vector((0, 0, 1)) - obj.location).to_track_quat('-Z', 'Y').to_euler()
    data = bpy.data.meshes.new(prefix + '_PreviewGround'); data.from_pydata([(-80, -80, -.01), (80, -80, -.01), (80, 80, -.01), (-80, 80, -.01)], [], [(0, 1, 2, 3)])
    ground = bpy.data.objects.new(data.name, data); preview.objects.link(ground)
    mat = bpy.data.materials.new(prefix + '_PreviewGroundMaterial'); mat.use_nodes = True
    mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.36, .31, .23, 1); data.materials.append(mat)
    cam = bpy.data.cameras.new(prefix + '_PreviewCamera'); camobj = bpy.data.objects.new(cam.name, cam); preview.objects.link(camobj); scene.camera = camobj
    for o in scene.objects:
        if o.get('collision_only'): o.hide_render = True
    tank = set()
    if view == 'comparison':
        before = set(scene.objects)
        bpy.ops.import_scene.gltf(filepath=str(BASE / 'assets/tanks/iron_dust_01/iron_dust_01.glb'))
        tank = set(scene.objects) - before
        for o in tank:
            for c in list(o.users_collection): c.objects.unlink(o)
            preview.objects.link(o)
            if not o.parent: o.location += Vector(tank_offset)
            if o.get('collision_only') or o.name.startswith('COL_'): o.hide_render = True
    loc, target, scale = views[view]
    camobj.location = loc; camobj.rotation_euler = (Vector(target) - camobj.location).to_track_quat('-Z', 'Y').to_euler()
    cam.type = 'ORTHO'; cam.ortho_scale = scale; cam.clip_end = 300
    scene.render.engine = 'CYCLES'; scene.cycles.samples = samples; scene.cycles.use_denoising = True; scene.cycles.device = 'CPU'
    scene.render.threads_mode = 'FIXED'; scene.render.threads = 4
    scene.render.resolution_x = 1100; scene.render.resolution_y = 750; scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'; scene.view_settings.view_transform = 'AgX'
    (out / 'previews').mkdir(exist_ok=True); scene.render.filepath = str(out / 'previews' / (view + '.png'))
    bpy.ops.render.render(write_still=True)
    print('RENDERED', scene.render.filepath, 'tank_reference', bool(tank))
