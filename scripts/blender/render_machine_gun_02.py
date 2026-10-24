"""MG02_VIEW seçimine göre tek kanıt renderı; kaynak dosyayı değiştirmez."""
import bpy,os,math
from pathlib import Path
from mathutils import Vector
out=Path(bpy.data.filepath).resolve().parent/'previews'
view=os.environ.get('MG02_VIEW','hero')
mounted=view.startswith(('mounted','pov'))
s=bpy.data.scenes['MG02_MountedPreview' if mounted else 'MG02_AssetStudio'];bpy.context.window.scene=s
cam=s.camera
views={'hero':((2.05,-2.65,1.65),(0,-.38,.35),52),'front':((0,-3.4,1.2),(0,-.35,.37),58),'side':((3.5,-.53,1.15),(0,-.53,.37),55),'detail':((1.2,-1.2,1.0),(0,-.22,.50),58),'mounted_third_person':((7,-9,7),(0,-.9,1.65),42),'mounted_close':((3.9,-4.7,4.9),(.65,-.7,2.9),58)}
if view.startswith('pov'):
    if view!='pov':
        _,y,e=view.split('_');s.objects['REF_MGYawPivot'].rotation_euler.z=math.radians(float(y));s.objects['REF_MGPitchPivot'].rotation_euler.x=-math.radians(float(e));bpy.context.view_layer.update()
    p=s.objects['REF_MGCameraPoint'];bpy.context.view_layer.update();cam.matrix_world=p.matrix_world.copy();cam.rotation_euler=(p.matrix_world.to_quaternion()@Vector((0,-1,0))).to_track_quat('-Z','Y').to_euler();cam.data.lens=cam.data.sensor_width/(2*math.tan(math.radians(68)/2));cam.data.clip_start=.005
else:
    loc,target,lens=views[view];cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=lens
s.render.resolution_x=640 if view.startswith('pov_') else 1280;s.render.resolution_y=360 if view.startswith('pov_') else 720;s.cycles.samples=12 if view.startswith('pov_') else 24;s.render.filepath=str(out/(view+'.png'))
bpy.ops.render.render(write_still=True)
result={'view':view,'path':s.render.filepath,'resolution':[s.render.resolution_x,s.render.resolution_y],'samples':s.cycles.samples,'camera_horizontal_fov_deg':math.degrees(cam.data.angle_x)}
