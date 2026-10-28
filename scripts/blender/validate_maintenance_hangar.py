"""Reimport the exported hangar and check its asset contract in Blender MCP."""
import bpy, json, math
from pathlib import Path
from mathutils import Vector
OUT=Path('/home/mami/Projects/d3/assets/environment/maintenance_hangar_01')
source=bpy.context.scene
assert source.name=='IRON_DUST_MAINTENANCE_HANGAR_01'
stats=json.loads((OUT/'model_stats.json').read_text())
check=bpy.data.scenes.new('MH01_RoundtripValidation')
bpy.context.window.scene=check
try:
    bpy.ops.import_scene.gltf(filepath=str(OUT/'maintenance_hangar_01.glb'))
    objects=list(check.objects)
    visible=[o for o in objects if o.type=='MESH' and not o.get('collision_only')]
    collision=[o for o in objects if o.type=='MESH' and o.get('collision_only')]
    root=next(o for o in objects if o.name.startswith('MaintenanceHangarRoot'))
    assert root.get('closed_building') is True
    assert root.get('units')=='metres'
    for o in visible+collision:
        assert all(math.isfinite(c) for v in o.data.vertices for c in v.co)
        assert all(abs(s-1)<1e-5 for s in o.scale), o.name
        assert not o.modifiers
        o.data.calc_loop_triangles()
    triangles=sum(len(o.data.loop_triangles) for o in visible)
    assert triangles==stats['visible_triangles'], (triangles,stats)
    assert len(collision)==3
    assert sum(len(o.data.loop_triangles) for o in collision)==stats['collision_triangles']
    points=[o.matrix_world@Vector(v) for o in visible for v in o.bound_box]
    lo=[min(v[i] for v in points) for i in range(3)]
    hi=[max(v[i] for v in points) for i in range(3)]
    # glTF import maps back to Blender's Z-up convention.
    assert all(abs(lo[i]-stats['bounds_min'][i])<1e-3 for i in range(3)),lo
    assert all(abs(hi[i]-stats['bounds_max'][i])<1e-3 for i in range(3)),hi
    assert abs(lo[2])<1e-4
    assert not [o for o in objects if o.type in {'LIGHT','CAMERA'}]
    mats={m for o in visible for m in o.data.materials}
    assert len(mats)==10
    assert all(m.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value>=.3 for m in mats)
    assert not [node for m in mats for node in m.node_tree.nodes if node.type=='TEX_IMAGE']
    report={'status':'passed','method':'Blender GLB reimport','visible_triangles':triangles,'materials':len(mats),'visible_meshes':len(visible),'collision_meshes':len(collision),'collision_triangles':stats['collision_triangles'],'bounds_min':lo,'bounds_max':hi,'metre_scale':True,'ground_origin':True,'external_textures':False,'closed_building':True,'source_tank_width_m':4.158,'source_tank_total_length_m':10.975,'door_visual_width_m':10.16,'door_visual_height_m':6.65,'game_integration_tested':False,'collision_note':'Collision meshes carry collision_only=true; runtime must hide them and create static physics. No Havok or projectile test performed.'}
    (OUT/'validation.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
    result=report
finally:
    bpy.context.window.scene=source
    for o in list(check.objects):bpy.data.objects.remove(o,do_unlink=True)
    bpy.data.scenes.remove(check)
