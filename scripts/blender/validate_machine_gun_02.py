"""MG02 Blender/GLB sözleşmesi ve örneklenmiş geometri açıklığı denetimi."""
import bpy,json,math,struct,itertools
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
BASE=Path(bpy.data.filepath).resolve().parents[3];OUT=BASE/'assets/weapons/iron_dust_mg_02'
s=bpy.data.scenes['MG02_AssetStudio'];bpy.context.window.scene=s;bpy.context.view_layer.update()
source=list(bpy.data.collections['MG02_Asset'].objects)
def identifier(o):return o.get('asset_node_id',o.name)
def snapshot(objects):
    return {identifier(o):{'parent':identifier(o.parent) if o.parent else None,'world':[list(r) for r in o.matrix_world],'materials':[m.name for m in o.data.materials] if o.type=='MESH' else []} for o in objects}
src=snapshot(source)
points=[o.matrix_world@Vector(v) for o in source if o.type=='MESH' for v in o.bound_box]
minimum=[min(v[i] for v in points) for i in range(3)];maximum=[max(v[i] for v in points) for i in range(3)]
raw=(OUT/'iron_dust_mg_02.glb').read_bytes();jlen,jtype=struct.unpack_from('<II',raw,12);g=json.loads(raw[20:20+jlen])
tris=sum(g['accessors'][p['indices']]['count']//3 for m in g['meshes'] for p in m['primitives'])
assert len({n['name'] for n in g['nodes']})==len(g['nodes'])
assert not any('camera' in n for n in g['nodes'])
assert not any('uri' in b for b in g['buffers'])
re=bpy.data.scenes.new('MG02_Roundtrip');bpy.context.window.scene=re
bpy.ops.import_scene.gltf(filepath=str(OUT/'iron_dust_mg_02.glb'));bpy.context.view_layer.update()
imp={identifier(o):o for o in re.objects};dst=snapshot(re.objects)
assert set(src)==set(dst),(set(src)-set(dst),set(dst)-set(src))
err=max(abs(src[k]['world'][i][j]-dst[k]['world'][i][j]) for k in src for i in range(4) for j in range(4))
assert err<1e-5,err
assert all(src[k]['parent']==dst[k]['parent'] for k in src)
assert all(len(src[k]['materials'])==len(dst[k]['materials']) for k in src)
# Both original and imported reference points must follow yaw/pitch; camera stays out of recoil.
def check_motion(objects):
    d={identifier(o):o for o in objects};yaw=d['MGYawPivot'];pitch=d['MGPitchPivot'];recoil=d['MGRecoilRoot'];cam=d['MGCameraPoint'];muzzle=d['MGMuzzlePoint']
    for o in [yaw,pitch,recoil]:o.rotation_mode='XYZ'
    bpy.context.view_layer.update();c0=cam.matrix_world.translation.copy();m0=muzzle.matrix_world.translation.copy()
    yaw.rotation_euler.z=math.radians(60);pitch.rotation_euler.x=-math.radians(45);bpy.context.view_layer.update()
    assert (cam.matrix_world.translation-c0).length>.1
    assert (muzzle.matrix_world.translation-m0).length>.3
    c1=cam.matrix_world.copy();m1=muzzle.matrix_world.translation.copy();recoil.location.y=.018;bpy.context.view_layer.update()
    assert max(abs(c1[i][j]-cam.matrix_world[i][j]) for i in range(4) for j in range(4))<1e-6
    assert abs((muzzle.matrix_world.translation-m1).length-.018)<1e-5
    yaw.rotation_euler.z=0;pitch.rotation_euler.x=0;recoil.location.y=0;bpy.context.view_layer.update()
    return True
import_motion=check_motion(re.objects)
bpy.context.window.scene=s;source_motion=check_motion(source)
# Mounted reference geometry collision tests; surfaces are compared as triangle BVHs.
mounted=bpy.data.scenes['MG02_MountedPreview'];bpy.context.window.scene=mounted;bpy.context.view_layer.update()
ref={o.name.removeprefix('REF_'):o for o in mounted.objects if o.name.startswith('REF_')}
tank=[o for o in mounted.objects if o.type=='MESH' and not o.name.startswith('REF_') and o.name!='StudioFloor' and not o.get('collision_only') and not o.hide_render]
yaw=ref['MGYawPivot'];pitch=ref['MGPitchPivot'];turret=next(o for o in mounted.objects if not o.name.startswith('REF_') and identifier(o)=='TurretPivot');gun=next(o for o in mounted.objects if not o.name.startswith('REF_') and identifier(o)=='GunPitchPivot')
for o in [yaw,pitch,turret,gun]:o.rotation_mode='XYZ'
moving=[o for o in ref.values() if o.type=='MESH' and o in ref['MGYawPivot'].children_recursive]
def bvh(objects):
    verts=[];faces=[]
    for o in objects:
        offset=len(verts);verts.extend([o.matrix_world@v.co for v in o.data.vertices]);faces.extend([tuple(offset+i for i in p.vertices) for p in o.data.polygons])
    return BVHTree.FromPolygons(verts,faces,all_triangles=False)
collisions=[];samples=0
# 5° MG sweep at zero turret, plus 30° full turret sweep with endpoint/midpoint MG angles and main cannon elevations.
poses=[(0,y,p,g) for y in range(-60,61,5) for p in range(-10,46,5) for g in [-8,20]]
poses += [(t,y,p,g) for t in range(30,360,30) for y in [-60,0,60] for p in [-10,0,45] for g in [-8,0,20]]
tank_cache={}
for t,y,p,gun_elev in poses:
    turret.rotation_euler.z=math.radians(t);gun.rotation_euler.x=-math.radians(gun_elev);yaw.rotation_euler.z=math.radians(y);pitch.rotation_euler.x=-math.radians(p);bpy.context.view_layer.update()
    key=(t,gun_elev)
    if key not in tank_cache:tank_cache[key]=bvh(tank)
    a=tank_cache[key];b=bvh(moving)
    overlap=a.overlap(b);samples+=1
    if overlap:collisions.append({'turret_yaw':t,'mg_yaw':y,'mg_elevation':p,'main_gun_elevation':gun_elev,'triangle_pairs':len(overlap)})
for o in [yaw,pitch,turret,gun]:o.rotation_euler=(0,0,0)
bpy.context.view_layer.update()
# POV point outside weapon; center and nearby aiming rays unobstructed.
cam=ref['MGCameraPoint'];origin=cam.matrix_world.translation;direction=cam.matrix_world.to_quaternion()@Vector((0,-1,0))
weapon_bvh=bvh([o for o in ref.values() if o.type=='MESH'])
center_hit=weapon_bvh.ray_cast(origin,direction,100)[0]
assert center_hit is None
foot_gaps=[]
roof=bvh(tank)
for dx,dy in [(-.16,-.15),(.16,-.15),(-.16,.15),(.16,.15)]:
    pos=ref['MGMountRoot'].matrix_world.translation
    hit=roof.ray_cast(pos+Vector((dx,dy,.01)),Vector((0,0,-1)),1)[0]
    assert hit is not None
    foot_gaps.append(pos.z-hit.z)
assert max(abs(v) for v in foot_gaps)<.001,foot_gaps
report={'blender':bpy.app.version_string,'glb_triangles':tris,'glb_meshes':len(g['meshes']),'glb_materials':len(g['materials']),'glb_nodes':len(g['nodes']),'bounds_blender_m':{'min':minimum,'max':maximum,'dimensions':[maximum[i]-minimum[i] for i in range(3)]},'roundtrip':{'same_node_ids':True,'same_parenting':True,'same_material_slot_counts':True,'max_matrix_error':err,'source_motion':source_motion,'imported_motion':import_motion},'clearance':{'method':'world-space triangle BVH surface overlap; finite sampling, no continuous or hatch-opening guarantee','samples':samples,'foot_gap_m':foot_gaps,'collision_count':len(collisions),'collisions':collisions[:20],'mg_yaw_deg':[-60,60],'mg_elevation_deg':[-10,45],'turret_yaw_deg':[0,330],'main_gun_elevation_deg':[-8,20]},'pov':{'horizontal_fov_deg':68,'camera_point_blender_pitch_local_m':[.18,-.357,.19],'muzzle_point_blender_pitch_local_m':[0,-1.351,0],'center_ray_clear':True},'mount_local_to_turret_blender_m':[.50,-.85,.94],'source_nodes':src}
(OUT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
result={k:v for k,v in report.items() if k not in ['source_nodes']}

assert not collisions, f"Tank clearance failed: {len(collisions)} poses"
