"""Original smoke supply. Run in a separate Blender background process, never the open editor."""
import bpy, math, json
from pathlib import Path
from mathutils import Vector

BASE = Path(__file__).resolve().parents[2]
OUT = BASE / 'assets/items/smoke_supply_01'
OUT.mkdir(parents=True, exist_ok=True)
assert bpy.app.background, 'Protect the interactive Blender session'
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.name = 'IRON_DUST_SMOKE_SUPPLY_01'
scene.unit_settings.system = 'METRIC'

def mat(name, color, metallic=0.0):
    m = bpy.data.materials.new(name); m.diffuse_color = (*color, 1); m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metallic; p.inputs['Roughness'].default_value = .78
    return m

olive = mat('SMK_Olive', (.075, .105, .075), .25)
edge = mat('SMK_Edge', (.14, .18, .12), .3)
steel = mat('SMK_Graphite', (.035, .045, .045), .5)
white = mat('SMK_WhiteBand', (.65, .63, .51))
foam = mat('SMK_Interior', (.018, .025, .019))
parts = []

def box(name, pos, size, material, bevel=.006):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    o = bpy.context.object; o.name = name; o.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material)
    if bevel:
        mod = o.modifiers.new('Small chamfer', 'BEVEL'); mod.width = bevel; mod.segments = 1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    parts.append(o)
    return o

def tube(name, pos, radius, height, material):
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=radius, depth=height, location=pos)
    o = bpy.context.object; o.name = name; o.data.materials.append(material); parts.append(o)
    return o

# Open top, thick walls and foam recesses. Blender Z up; glTF exports Y up.
box('Base', (0, 0, .035), (.8, .45, .07), olive)
box('Front', (0, -.212, .16), (.8, .026, .25), olive)
box('Back', (0, .212, .16), (.8, .026, .25), olive)
for x in [-.387, .387]:
    box('Side', (x, 0, .16), (.026, .45, .25), olive)
    box('Handle', (x * 1.055, 0, .20), (.025, .16, .045), steel)
    for y in [-.19, .19]: box('CornerGuard', (x, y, .15), (.038, .045, .28), edge)
box('FoamInsert', (0, 0, .082), (.73, .38, .035), foam)
for x in [-.24, 0, .24]:
    tube('SmokeTube', (x, 0, .205), .073, .245, olive)
    tube('WhiteBand', (x, 0, .263), .074, .045, white)
    tube('Cap', (x, 0, .338), .078, .025, steel)
    box('CapGrip', (x, 0, .358), (.045, .025, .016), edge, .002)
    box('Cradle', (x, 0, .112), (.18, .25, .04), foam)
# Lid lifted behind the crate, intentionally readable from the tank camera.
lid = box('Lid', (0, .30, .42), (.81, .035, .30), olive)
lid.rotation_euler.x = math.radians(-24)
for x in [-.22, .22]:
    box('Latch', (x, -.235, .22), (.055, .025, .085), steel)
    box('LidRib', (x, .273, .43), (.028, .025, .23), edge).rotation_euler.x = math.radians(-24)
box('WhiteLabel', (0, -.229, .175), (.18, .005, .09), white, .001)
bpy.ops.object.text_add(location=(0, -.234, .15), rotation=(math.pi/2, 0, 0))
label = bpy.context.object; label.name = 'SMK_Stencil'; label.data.body = 'SMK'; label.data.align_x = 'CENTER'; label.data.size = .058
label.data.materials.append(steel); bpy.ops.object.convert(target='MESH'); parts.append(bpy.context.object)

root = bpy.data.objects.new('SmokeSupplyRoot', None); scene.collection.objects.link(root)
for o in parts: o.parent = root
for o in parts:
    bpy.context.view_layer.objects.active = o
    tri = o.modifiers.new('Export triangles', 'TRIANGULATE'); bpy.ops.object.modifier_apply(modifier=tri.name)
triangles = sum(len(o.data.polygons) for o in parts)
assert triangles < 3500
bpy.ops.object.select_all(action='DESELECT')
for o in parts + [root]: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'smoke_supply_01.glb'), export_format='GLB', use_selection=True)

# Independent capsule for launch animation, using the same material/silhouette.
bpy.ops.object.select_all(action='DESELECT')
capsule = tube('SmokeCapsule', (0, 0, .12), .073, .24, olive)
band = tube('SmokeCapsuleBand', (0, 0, .18), .074, .045, white)
cap = tube('SmokeCapsuleCap', (0, 0, .25), .078, .025, steel)
bpy.ops.object.select_all(action='DESELECT')
for o in [capsule, band, cap]: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'smoke_capsule_01.glb'), export_format='GLB', use_selection=True)
for o in [capsule, band, cap]: bpy.data.objects.remove(o, do_unlink=True)

scene.render.engine = 'CYCLES'; scene.cycles.samples = 24
scene.render.resolution_x = 1000; scene.render.resolution_y = 800; scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'; scene.render.film_transparent = True
scene.world = bpy.data.worlds.new('StudioWorld'); scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.45, .49, .55, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .5
for name, loc, power, size in [('Key', (1, -2, 3), 220, 3), ('Rim', (-2, 1, 2), 180, 2)]:
    data = bpy.data.lights.new(name, 'AREA'); data.energy = power; data.shape = 'DISK'; data.size = size
    o = bpy.data.objects.new(name, data); scene.collection.objects.link(o); o.location = loc
    o.rotation_euler = (Vector((0, 0, .2)) - o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(1.15, -1.55, 1.18))
camera = bpy.context.object; camera.rotation_euler = (Vector((0, .04, .23))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type = 'ORTHO'; camera.data.ortho_scale = 1.42; scene.camera = camera
scene.render.filepath = str(OUT/'preview.png')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'smoke_supply_01.blend'))
bpy.ops.render.render(write_still=True)
(OUT/'model-info.json').write_text(json.dumps({'triangles': triangles, 'units': 'metres', 'source': 'Original IRON DUST asset; generated in Blender', 'external_assets': []}, indent=2)+'\n')
print('SMOKE_SUPPLY_EXPORT_PASS', triangles)
