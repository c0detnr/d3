"""Reimport the GLB in a temporary scene; preserve the production scene."""
import bpy, json, math
from pathlib import Path
from mathutils import Vector
OUT=Path('/home/mami/Projects/d3/assets/environment/concrete_emplacement_01')
source=bpy.context.scene
assert source.name=='IRON_DUST_CONCRETE_EMPLACEMENT_01'
stats=json.loads((OUT/'model_stats.json').read_text())
check=bpy.data.scenes.new('CE01_RoundtripValidation');bpy.context.window.scene=check
try:
    bpy.ops.import_scene.gltf(filepath=str(OUT/'concrete_emplacement_01.glb'))
    bpy.context.view_layer.update()
    objects=list(check.objects)
    visible=[o for o in objects if o.type=='MESH' and not o.get('collision_only')]
    colliders=[o for o in objects if o.type=='MESH' and o.get('collision_only')]
    root=next(o for o in objects if o.get('asset_id')=='concrete_emplacement_01')
    assert root.get('units')=='metres' and root.get('hard_cover') is True
    assert len(colliders)==7
    for obj in visible+colliders:
        assert all(math.isfinite(c) for v in obj.data.vertices for c in v.co)
        assert all(abs(s-1)<1e-5 for s in obj.scale),obj.name
        assert not obj.modifiers
        obj.data.calc_loop_triangles()
    triangles=sum(len(o.data.loop_triangles) for o in visible)
    assert triangles==stats['visible_triangles']
    assert sum(len(o.data.loop_triangles) for o in colliders)==stats['collision_triangles']
    points=[o.matrix_world@Vector(v) for o in visible for v in o.bound_box]
    lo=[min(v[i] for v in points) for i in range(3)];hi=[max(v[i] for v in points) for i in range(3)]
    assert all(abs(lo[i]-stats['bounds_min'][i])<.001 for i in range(3)),lo
    assert all(abs(hi[i]-stats['bounds_max'][i])<.001 for i in range(3)),hi
    assert abs(lo[2])<1e-4 and 2.5<=hi[2]<2.8
    assert not [o for o in objects if o.type in {'CAMERA','LIGHT'}]
    assert not [o for o in objects if o.get('asset_id','').startswith('iron_dust') or o.name.startswith('TankRoot')]
    mats={m for o in visible for m in o.data.materials}
    assert len(mats)==stats['materials']
    assert not [n for m in mats for n in m.node_tree.nodes if n.type=='TEX_IMAGE']
    assert all(m.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value>=.69 for m in mats)
    # The main damaged silhouette is copied exactly into the static collision export.
    wall=[o for o in colliders if o.name.startswith('COL_WallPanel')]
    assert len(wall)==3
    walltops=[max((o.matrix_world@v.co).z for v in o.data.vertices) for o in wall]
    assert all(abs(z-2.5)<.001 for z in walltops)
    report={'status':'passed','method':'Blender MCP GLB reimport','visible_triangles':triangles,'visible_meshes':len(visible),'materials':len(mats),'collision_meshes':len(colliders),'collision_triangles':stats['collision_triangles'],'bounds_min':lo,'bounds_max':hi,'metre_scale':True,'ground_origin':True,'external_textures':False,'tank_in_export':False,'game_integration_tested':False,'collision_note':'7 marked meshes: footing, 3 damaged wall panels, 3 buttresses. Runtime must hide collision_only meshes and build static physics. Rebar, chips and loose rubble have no separate collider.'}
    (OUT/'validation.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n');result=report
finally:
    bpy.context.window.scene=source
    for obj in list(check.objects):bpy.data.objects.remove(obj,do_unlink=True)
    bpy.data.scenes.remove(check)
