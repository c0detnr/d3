"""Source + round-trip geometry, pose and clearance checks, executed through Blender MCP."""
import bpy, math, json, re
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
OUT=Path('/home/mami/Projects/d3/assets/tanks/iron_dust_02')
source=bpy.data.scenes['IRON_DUST_02'];bpy.context.window.scene=source
asset=bpy.data.collections['ID02_Asset']

# Same rule as the game rig: merged *_Details meshes are not suspension points.
WHEEL=re.compile(r'^(Left|Right)_RoadWheel_\d\d$')
def key(o):return o.get('asset_node_id')
def snapshot(objects):
    data={}
    bpy.context.view_layer.update()
    for o in objects:
        if not key(o):continue
        o.rotation_mode='XYZ'
        if o.type=='MESH':o.data.calc_loop_triangles()
        data[key(o)]={'parent':key(o.parent) if o.parent else None,'position':list(o.matrix_world.translation),'rotation':list(o.matrix_world.to_quaternion()),'scale':list(o.matrix_world.to_scale()),'triangles':len(o.data.loop_triangles) if o.type=='MESH' else 0,'materials':sorted(m.name for m in o.data.materials) if o.type=='MESH' else [],'pbr':sorted([list(m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value)+[m.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value,m.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value] for m in o.data.materials]) if o.type=='MESH' else [],'collision_only':bool(o.get('collision_only'))}
    return data

def tree(objects):
    verts=[];faces=[]
    for o in objects:
        if o.type!='MESH':continue
        n=len(verts);verts.extend(o.matrix_world@v.co for v in o.data.vertices)
        faces.extend(tuple(n+i for i in f.vertices) for f in o.data.polygons)
    return BVHTree.FromPolygons(verts,faces,all_triangles=False,epsilon=.00001) if faces else None

def motion(objects):
    nodes={key(o):o for o in objects if key(o)}
    yaw=nodes['TurretPivot'];pitch=nodes['GunPitchPivot'];recoil=nodes['GunRecoilRoot'];muzzle=nodes['MuzzlePoint']
    rest={o:(o.location.copy(),o.rotation_euler.copy()) for o in [yaw,pitch,recoil]}
    def descendant(o,parent):
        while o.parent:
            o=o.parent
            if o==parent:return True
        return False
    fixed=[o for o in objects if o.type=='MESH' and descendant(o,nodes['Hull'])]
    # Hull itself included; expected bolted/interlocking armor overlaps are not gun clearance failures.
    fixed.append(nodes['Hull']);static=tree(fixed)
    moving=[o for o in objects if o.type=='MESH' and descendant(o,recoil)]
    obstacles=[o for o in objects if o.type=='MESH' and (descendant(o,nodes['Hatches']) or descendant(o,nodes['Optics']))]
    failures=[];sampled=0;safe_failures=[];worst_recoil_error=0
    turret_hull_failures=[]
    for a in range(-180,181,15):
        for e in [-8,-4,0,5,10,15,20]:
            for r in [0,.175,.35]:
                yaw.rotation_euler.z=math.radians(a);pitch.rotation_euler.x=-math.radians(e)
                recoil.location=rest[recoil][0]+Vector((0,r,0));bpy.context.view_layer.update()
                tube=tree(moving);hit=bool(tube.overlap(static))
                turret_body=tree([nodes['TurretMesh']]+[o for o in objects if o.type=='MESH' and descendant(o,nodes['TurretArmor'])])
                if r==0 and e==0 and turret_body.overlap(static):turret_hull_failures.append(a)
                optic=tree(obstacles)
                hit=hit or bool(optic and tube.overlap(optic))
                if hit:
                    failures.append({'yaw_deg':a,'elevation_deg':e,'recoil_m':r})
                    if e>=-8:safe_failures.append(failures[-1])
                sampled+=1
                expected=recoil.matrix_world@muzzle.location
                worst_recoil_error=max(worst_recoil_error,(muzzle.matrix_world.translation-expected).length)
    for o,(loc,rot) in rest.items():o.location=loc;o.rotation_euler=rot
    bpy.context.view_layer.update()
    wheel_error=0;suspension_failures=[]
    skirt_tree=tree([o for o in objects if o.type=='MESH' and descendant(o,nodes['SideSkirts'])])
    for name,o in nodes.items():
        if not WHEEL.match(name):continue
        before=o.matrix_world.translation.copy();loc=o.location.copy();
        for travel in [-.22,0,.23]:
            o.location=loc+Vector((0,0,travel));bpy.context.view_layer.update()
            wheel_tree=tree([o]+[c for c in o.children_recursive if c.type=='MESH'])
            if wheel_tree.overlap(skirt_tree):suspension_failures.append({'wheel':name,'travel_m':travel})
        o.location=loc;bpy.context.view_layer.update();rot=o.rotation_euler.copy();o.rotation_euler.x+=1.2;bpy.context.view_layer.update();wheel_error=max(wheel_error,(o.matrix_world.translation-before).length);o.rotation_euler=rot
    bpy.context.view_layer.update()
    direction=(muzzle.matrix_world.to_3x3()@Vector((0,-1,0))).normalized()
    assert direction.dot(Vector((0,-1,0)))>.999999,'Forward must be -Y in Blender.'
    assert len([n for n in nodes if WHEEL.match(n)])==14
    assert wheel_error<.001 and worst_recoil_error<.001
    return {'turret_hull_failures':turret_hull_failures,'suspension_skirt_failures':suspension_failures,'poses':sampled,'requested_minus8_clearance_failures':len(failures),'failed_poses':failures,'safe_min_elevation_deg':-8,'safe_range_clearance_failures':safe_failures,'max_wheel_center_error_m':wheel_error,'max_muzzle_recoil_error_m':worst_recoil_error,'muzzle_forward':list(direction)}

before=snapshot(list(asset.objects));source_motion=motion(list(asset.objects))
# Closed primitive components are intentional; inspect each for nonmanifold topology and bad scale.
import bmesh
nonmanifold=[];negative=[]
for o in asset.objects:
    if o.type!='MESH':continue
    bm=bmesh.new();bm.from_mesh(o.data)
    if any(not e.is_manifold for e in bm.edges):nonmanifold.append(key(o))
    bm.free()
    if min(o.scale)<=0:negative.append(key(o))
assert not negative and not nonmanifold,(negative,nonmanifold)
validation=bpy.data.scenes.new('ID02_RoundtripValidation');bpy.context.window.scene=validation
bpy.ops.import_scene.gltf(filepath=str(OUT/'iron_dust_02.glb'))
imported=[o for o in validation.objects if key(o)]
after=snapshot(imported)
assert set(before)==set(after),(set(before)-set(after),set(after)-set(before))
max_pos=0;max_angle=0;max_scale=0
for n,a in before.items():
    b=after[n];assert a['parent']==b['parent'],n
    assert a['triangles']==b['triangles'],n
    assert a['collision_only']==b['collision_only'],n
    # Import may suffix material names when the source datablock already exists.
    assert len(a['materials'])==len(b['materials']),n
    assert all(abs(x-y)<.00001 for ap,bp in zip(a['pbr'],b['pbr']) for x,y in zip(ap,bp)),n
    max_pos=max(max_pos,(Vector(a['position'])-Vector(b['position'])).length)
    from mathutils import Quaternion
    max_angle=max(max_angle,math.degrees(Quaternion(a['rotation']).rotation_difference(Quaternion(b['rotation'])).angle))
    max_scale=max(max_scale,(Vector(a['scale'])-Vector(b['scale'])).length)
assert max_pos<.001 and max_angle<.1 and max_scale<.001,(max_pos,max_angle,max_scale)
roundtrip_motion=motion(imported)
assert not source_motion['safe_range_clearance_failures'] and not source_motion['turret_hull_failures'] and not source_motion['suspension_skirt_failures']
assert not roundtrip_motion['safe_range_clearance_failures'] and not roundtrip_motion['turret_hull_failures'] and not roundtrip_motion['suspension_skirt_failures']
report={'source_motion':source_motion,'roundtrip_motion':roundtrip_motion,'roundtrip_nodes':len(after),'max_position_error_m':max_pos,'max_rotation_error_deg':max_angle,'max_scale_error':max_scale,'nonmanifold_meshes':nonmanifold,'negative_scale_meshes':negative,'collision_triangles':sum(a['triangles'] for a in after.values() if a['collision_only']),'visible_triangles':sum(a['triangles'] for a in after.values() if not a['collision_only']),'materials':sorted(set(m for a in before.values() if not a['collision_only'] for m in a['materials'])),'dynamic_hatch_opening_tested':False,'method':'Blender MCP execute_blender_code; BVH triangle surface overlaps; joint/attachment interfaces excluded'}
(OUT/'validation.json').write_text(json.dumps(report,indent=2))
bpy.context.window.scene=source
for o in list(validation.objects):bpy.data.objects.remove(o,do_unlink=True)
bpy.data.scenes.remove(validation)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'iron_dust_02.blend'))
result={k:v for k,v in report.items() if k not in ['source_motion','roundtrip_motion']}
result['safe_clearance_failures']=len(source_motion['safe_range_clearance_failures']);result['requested_clearance_failures']=source_motion['requested_minus8_clearance_failures']
