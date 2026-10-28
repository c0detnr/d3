"""Render the dedicated emplacement file via MCP. VIEW: blockout, front, rear, comparison."""
import bpy, math
from pathlib import Path
from mathutils import Vector
BASE=Path('/home/mami/Projects/d3');OUT=BASE/'assets/environment/concrete_emplacement_01'
scene=bpy.context.scene
assert scene.name=='IRON_DUST_CONCRETE_EMPLACEMENT_01'
preview=bpy.data.collections.get('CE01_Preview')
if preview is not None and not preview.objects:
    bpy.data.collections.remove(preview);preview=None
if preview is None:
    preview=bpy.data.collections.new('CE01_Preview');scene.collection.children.link(preview)
    world=bpy.data.worlds.new('CE01_StudioWorld');world.use_nodes=True
    world.node_tree.nodes['Background'].inputs[0].default_value=(.32,.37,.43,1)
    world.node_tree.nodes['Background'].inputs[1].default_value=.5;scene.world=world
    light=bpy.data.lights.new('CE01_Sun','SUN');light.energy=2.5;light.angle=math.radians(12)
    obj=bpy.data.objects.new(light.name,light);preview.objects.link(obj);obj.rotation_euler=(.5,-.5,-.4)
    light=bpy.data.lights.new('CE01_Softbox','AREA');light.energy=1800;light.size=9
    obj=bpy.data.objects.new(light.name,light);preview.objects.link(obj);obj.location=(3,-8,12)
    obj.rotation_euler=(Vector((0,0,1))-obj.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.mesh.primitive_plane_add(size=100)
    obj=bpy.context.object;obj.name='CE01_PreviewGround';obj.location.z=-.025
    for c in list(obj.users_collection):c.objects.unlink(obj)
    preview.objects.link(obj)
    mat=bpy.data.materials.new('CE01_PreviewGroundMaterial');mat.diffuse_color=(.13,.15,.125,1);obj.data.materials.append(mat)
    data=bpy.data.cameras.new('CE01_PreviewCamera');obj=bpy.data.objects.new(data.name,data);preview.objects.link(obj);scene.camera=obj
preview.hide_viewport=False
before=set(scene.objects)
if VIEW=='comparison':
    bpy.ops.import_scene.gltf(filepath=str(BASE/'assets/tanks/iron_dust_02/iron_dust_02.glb'))
    tank=set(scene.objects)-before
    for obj in tank:
        for c in list(obj.users_collection):c.objects.unlink(obj)
        preview.objects.link(obj)
        if not obj.parent:obj.location+=Vector((-8,0,0))
        if obj.get('collision_only') or obj.name.startswith('COL_'):obj.hide_render=True
else:tank=set()
views={'blockout':((10,-13,8),(0,.5,1),11),'front':((10,-13,7),(0,.5,1.1),11),'rear':((-10,13,8),(0,.5,1),11),'comparison':((14,-24,15),(-3,0,1.5),22)}
loc,target,scale=views[VIEW];camera=scene.camera;camera.location=loc
camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=scale;camera.data.clip_end=200
scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True;scene.cycles.device='CPU'
scene.render.threads_mode='FIXED';scene.render.threads=4
scene.render.resolution_x=1100;scene.render.resolution_y=750;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
(OUT/'previews').mkdir(exist_ok=True)
scene.render.filepath=str(OUT/'previews'/(VIEW+'.png'))
try:bpy.ops.render.render(write_still=True)
finally:
    for obj in tank:bpy.data.objects.remove(obj,do_unlink=True)
preview.hide_viewport=True
bpy.data.orphans_purge(do_recursive=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'concrete_emplacement_01.blend'))
result={'view':VIEW,'path':scene.render.filepath,'tank_reference':bool(tank),'tank_exported':False}
