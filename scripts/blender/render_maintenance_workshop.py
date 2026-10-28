"""Preview the workshop with the actual IRON DUST 02 tank, via Blender MCP.
VIEW: blockout, front, rear. Preview objects never enter the GLB export.
"""
import bpy, math
from pathlib import Path
from mathutils import Vector
BASE=Path('/home/mami/Projects/d3');OUT=BASE/'assets/environment/maintenance_workshop_01'
scene=bpy.context.scene
assert scene.name=='IRON_DUST_MAINTENANCE_WORKSHOP_01'
preview=bpy.data.collections.get('MW01_Preview')
if preview is None:
    preview=bpy.data.collections.new('MW01_Preview');scene.collection.children.link(preview)
    world=bpy.data.worlds.new('MW01_StudioWorld');world.use_nodes=True
    world.node_tree.nodes['Background'].inputs[0].default_value=(.32,.37,.43,1)
    world.node_tree.nodes['Background'].inputs[1].default_value=.55;scene.world=world
    d=bpy.data.lights.new('MW01_Sun','SUN');d.energy=2.8;d.angle=math.radians(12)
    o=bpy.data.objects.new(d.name,d);preview.objects.link(o);o.rotation_euler=(.4,-.5,-.4)
    d=bpy.data.lights.new('MW01_Softbox','AREA');d.energy=25000;d.shape='DISK';d.size=18
    o=bpy.data.objects.new(d.name,d);preview.objects.link(o);o.location=(10,-25,28)
    o.rotation_euler=(Vector((0,0,3))-o.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.mesh.primitive_plane_add(size=180)
    o=bpy.context.object;o.name='MW01_PreviewGround';o.location.z=-.03
    for c in list(o.users_collection):c.objects.unlink(o)
    preview.objects.link(o)
    m=bpy.data.materials.new('MW01_PreviewGroundMaterial');m.diffuse_color=(.16,.18,.16,1);o.data.materials.append(m)
    d=bpy.data.cameras.new('MW01_PreviewCamera');o=bpy.data.objects.new(d.name,d);preview.objects.link(o);scene.camera=o
camera=scene.camera
before=set(scene.objects)
bpy.ops.import_scene.gltf(filepath=str(BASE/'assets/tanks/iron_dust_02/iron_dust_02.glb'))
tank=set(scene.objects)-before
for o in tank:
    for c in list(o.users_collection):c.objects.unlink(o)
    preview.objects.link(o)
    if not o.parent:o.location+=Vector((-2,-15,0))
    if o.get('collision_only') or o.name.startswith('COL_'):o.hide_render=True
views={'blockout':((32,-43,25),(2,-1,2.5),36),'front':((32,-43,23),(2,-1,2.5),36),'rear':((-32,43,25),(2,0,2.5),36)}
loc,target,scale=views[VIEW];camera.location=loc;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=scale;camera.data.clip_end=300
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.render.threads_mode='FIXED';scene.render.threads=4
scene.cycles.device='CPU'
scene.render.resolution_x=1400;scene.render.resolution_y=950;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
(OUT/'previews').mkdir(exist_ok=True)
scene.render.filepath=str(OUT/'previews'/(VIEW+'.png'));bpy.ops.render.render(write_still=True)
# Keep the source independent of the tank reference.
for o in tank:bpy.data.objects.remove(o,do_unlink=True)
preview.hide_viewport=True
bpy.data.orphans_purge(do_recursive=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'maintenance_workshop_01.blend'))
result={'view':VIEW,'path':scene.render.filepath,'tank_reference':'iron_dust_02.glb','tank_exported':False}
