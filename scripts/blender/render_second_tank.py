"""MCP render stages; VIEW=front/side/top/rear/three_quarter/detail/comparison."""
import bpy, math
from pathlib import Path
from mathutils import Vector
OUT=Path('/home/mami/Projects/d3/assets/tanks/iron_dust_02')
scene=bpy.data.scenes['IRON_DUST_02'];bpy.context.window.scene=scene
studio=bpy.data.collections.get('ID02_Studio')
if not studio:
    studio=bpy.data.collections.new('ID02_Studio');scene.collection.children.link(studio)
    world=bpy.data.worlds.new('ID02_StudioWorld');world.use_nodes=True
    world.node_tree.nodes['Background'].inputs[0].default_value=(.24,.28,.34,1)
    world.node_tree.nodes['Background'].inputs[1].default_value=.5;scene.world=world
    for name,loc,energy,size in [('Key',(5,-8,12),2600,7),('Fill',(-7,-4,7),1700,7),('Rim',(1,8,10),3400,6)]:
        d=bpy.data.lights.new('ID02_'+name,'AREA');d.energy=energy;d.shape='DISK';d.size=size
        o=bpy.data.objects.new(d.name,d);studio.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
    d=bpy.data.cameras.new('ID02_Camera');cam=bpy.data.objects.new('ID02_Camera',d);studio.objects.link(cam);scene.camera=cam
cam=scene.camera
views={'front':((0,-18,5),(0,-.5,1.3),11),'side':((18,0,4),(0,-1.5,1.6),13),'top':((0,0,22),(0,-1.5,0),18),'rear':((0,18,5),(0,0,1.5),11),'three_quarter':((12,-15,10),(0,-1.4,1.1),13),'detail':((7,-5,4),(0,-.5,1.5),7),'comparison':((17,-20,14),(3,-.8,1.4),20)}
loc,target,scale=views[VIEW];cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=scale;cam.data.clip_end=200
scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.render.resolution_x=1200;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False;scene.view_settings.view_transform='AgX'
folder=OUT/'previews'/('blockout' if BLOCKOUT else '');folder.mkdir(parents=True,exist_ok=True)
if VIEW=='comparison':
    before=set(scene.objects)
    bpy.ops.import_scene.gltf(filepath='/home/mami/Projects/d3/assets/tanks/iron_dust_01/iron_dust_01.glb')
    imported=set(scene.objects)-before
    for o in imported:
        if not o.parent:o.location.x+=5.2
        if o.get('collision_only'):o.hide_render=True
scene.render.filepath=str(folder/(VIEW+'.png'));bpy.ops.render.render(write_still=True)
if VIEW=='comparison':
    for o in imported:bpy.data.objects.remove(o,do_unlink=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'iron_dust_02.blend'))
result={'image':scene.render.filepath,'view':VIEW}
