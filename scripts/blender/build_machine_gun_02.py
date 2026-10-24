"""Blender MCP CLI ile çalıştırılır; yalnız MG 02 çıktıları yazılır."""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
BASE=Path(bpy.data.filepath).resolve().parents[3]
OUT=BASE/'assets/weapons/iron_dust_mg_02'
OUT.mkdir(parents=True,exist_ok=True)
# Bu işlem izole MCP background sürecinde çalışır, masaüstü oturumunu etkilemez.
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.name='MG02_AssetStudio'
scene.unit_settings.system='METRIC'
scene.unit_settings.scale_length=1
asset=bpy.data.collections.new('MG02_Asset'); scene.collection.children.link(asset)
studio=bpy.data.collections.new('MG02_Studio'); scene.collection.children.link(studio)
def material(name,color,metal,rough):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
    return m
olive=material('MG02_Olive',(0.10,0.135,0.105),.45,.64)
steel=material('MG02_Graphite',(.048,.058,.065),.78,.42)
edge=material('MG02_BareSteel',(.26,.28,.26),.82,.45)
rubber=material('MG02_Rubber',(.015,.020,.021),.05,.84)
glass=material('MG02_OpticGlass',(.025,.18,.20),.7,.19)
mark=material('MG02_StenciledSand',(.55,.47,.33),.2,.7)
parts=[]
def attach(o,name,parent=None,mat=None):
    o.name=name
    for c in list(o.users_collection):c.objects.unlink(o)
    asset.objects.link(o)
    if parent:o.parent=parent
    if mat:o.data.materials.append(mat)
    o['asset_node_id']=name
    parts.append(o);return o
def empty(name,loc,parent=None):
    o=bpy.data.objects.new(name,None);asset.objects.link(o);o.location=loc;o.parent=parent;o.empty_display_size=.06;o['asset_node_id']=name;parts.append(o);return o
def box(name,loc,size,parent,mat=steel,bevel=.008):
    bpy.ops.mesh.primitive_cube_add(size=1)
    o=attach(bpy.context.object,name,parent,mat);o.location=loc;o.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        m=o.modifiers.new('Machined edges','BEVEL');m.width=bevel;m.segments=1
        bpy.ops.object.modifier_apply(modifier=m.name)
        m=o.modifiers.new('Face normals','WEIGHTED_NORMAL');m.keep_sharp=True
        bpy.ops.object.modifier_apply(modifier=m.name)
    return o
def cyl(name,loc,r,depth,parent,mat=steel,axis='Z',vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth)
    o=attach(bpy.context.object,name,parent,mat);o.location=loc
    if axis=='Y':o.rotation_euler[0]=math.pi/2
    if axis=='X':o.rotation_euler[1]=math.pi/2
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return o
def ring(name,y,r,inner,depth,parent):
    n=12;verts=[]
    for yy,rr in [(y-depth/2,r),(y+depth/2,r),(y-depth/2,inner),(y+depth/2,inner)]:
        verts.extend([(rr*math.cos(i*2*math.pi/n),yy,rr*math.sin(i*2*math.pi/n)) for i in range(n)])
    faces=[]
    for i in range(n):
        j=(i+1)%n
        faces.extend([(i,j,n+j,n+i),(2*n+j,2*n+i,3*n+i,3*n+j),(i,2*n+i,2*n+j,j),(n+j,3*n+j,3*n+i,n+i)])
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    return attach(bpy.data.objects.new(name,mesh),name,parent,steel)
root=empty('MGMountRoot',(0,0,0));root['forward_axis']='-Y';root['up_axis']='+Z';root['mount_parent']='TurretPivot';root['mount_translation_blender_m']=[.50,-.85,.94]
box('MGBase',(0,0,.035),(.42,.40,.07),root,olive,.025)
for x in [-.15,.15]:
    for y in [-.14,.14]:cyl('BaseBolt',(x,y,.077),.022,.018,root,edge,vertices=6)
cyl('AzimuthRace',(0,0,.11),.155,.08,root)
yaw=empty('MGYawPivot',(0,0,.15),root);yaw['yaw_range_deg']=[-60,60]
cyl('YawDeck',(0,0,.025),.175,.05,yaw,olive)
# Four sloped cheeks around an open cradle, a compact elevation actuator.
for x in [-.145,.145]:
    box('CradleLeg',(x,.015,.17),(.065,.19,.28),yaw,olive,.02)
    cyl('ElevationTrunnion',(x,0,.35),.068,.09,yaw,edge,'X')
box('MGSupport',(0,.075,.12),(.30,.085,.07),yaw,olive)
cyl('ElevationServo',(.22,0,.30),.072,.11,yaw,steel,'X')
pitch=empty('MGPitchPivot',(0,0,.35),yaw);pitch['elevation_range_deg']=[-10,45];pitch['positive_elevation_axis']='-X'
receiver=box('MGReceiver',(0,-.06,.025),(.19,.49,.16),pitch,steel,.018)
box('TopCover',(0,-.07,.122),(.18,.38,.035),pitch,olive)
box('RearBuffer',(0,.225,.024),(.14,.10,.115),pitch,rubber)
box('ChargeHandle',(.13,.07,.035),(.10,.035,.03),pitch,edge,.005)
box('EjectionPort',(.099,.04,-.025),(.008,.14,.045),pitch,rubber,0)
box('FeedTray',(-.15,-.035,.025),(.13,.17,.065),pitch,edge,.006)
box('MGAmmoBox',(-.31,.025,-.015),(.24,.34,.27),pitch,olive,.02)
box('AmmoLid',(-.31,.025,.132),(.26,.355,.035),pitch,olive)
for y in [-.105,.15]:box('AmmoLatch',(-.44,y,.03),(.016,.035,.085),pitch,edge,.003)
box('AmmoHandle',(-.31,.035,.162),(.13,.028,.026),pitch,steel,.004)
# Short rigid feed bridge moves with elevation; no deforming belt requirement.
for i in range(4):cyl('MGFeed',(-.235+i*.034,-.045,.068),.013,.10,pitch,mark,'Y',8)
for i in range(4):box('CoverVent',(.096,-.19+i*.065,.052),(.006,.032,.025),pitch,rubber,0)
box('SerialPlate',(-.31,-.151,.0),(.13,.004,.065),pitch,mark,.002)
for i in range(3):box('PlateMark',(-.35+i*.035,-.154,.0),(.018,.002,.008),pitch,steel,0)
recoil=empty('MGRecoilRoot',(0,0,0),pitch);recoil['suggested_recoil_m']=.018
cyl('MGBarrel',(0,-.77,0),.026,1.04,recoil,steel,'Y')
ring('BarrelBreech',-.29,.066,.028,.095,recoil)
# Open heat shield: real slots between longitudinal ribs, hollow front ring.
for yy in [-.38,-.73]:ring('HeatShieldRing',yy,.065,.048,.045,recoil)
for i in range(8):
    a=i*math.tau/8
    o=box('HeatShieldRib',(.057*math.sin(a),-.555,.057*math.cos(a)),(.018,.31,.016),recoil,steel,.003);o.rotation_euler[1]=a
ring('BarrelCollar',-.91,.038,.026,.045,recoil)
ring('MuzzleBrake',-1.285,.043,.018,.13,recoil)
cyl('BoreShadow',(0,-1.224,0),.018,.003,recoil,rubber,'Y')
muzzle=empty('MGMuzzlePoint',(0,-1.351,0),recoil)
muzzle['direction_local']=[0,-1,0]
box('CameraBracket',(.17,-.10,.10),(.11,.14,.055),pitch,olive)
box('MGCameraHousing',(.18,-.18,.19),(.13,.30,.12),pitch,olive,.015)
box('CameraVisor',(.18,-.32,.255),(.17,.12,.025),pitch,steel,.005)
for x in [.102,.258]:box('CameraGuard',(x,-.28,.19),(.018,.15,.135),pitch,steel,.004)
cyl('OpticBezel',(.18,-.337,.19),.045,.02,pitch,steel,'Y')
cyl('OpticLens',(.18,-.350,.19),.035,.004,pitch,glass,'Y')
point=empty('MGCameraPoint',(.18,-.357,.19),pitch);point['direction_local']=[0,-1,0];point['horizontal_fov_deg']=68
empty('MGEjectionPoint',(.11,.04,-.025),pitch)
# Consolidate details by logical movable group, retaining contract nodes.
protected={'MGBase','MGSupport','MGReceiver','MGAmmoBox','MGCameraHousing','MGBarrel'}
for par in [root,yaw,pitch,recoil]:
    children=[o for o in list(asset.objects) if o.type=='MESH' and o.parent==par and o.name not in protected]
    if children:
        bpy.ops.object.select_all(action='DESELECT')
        for o in children:o.select_set(True)
        bpy.context.view_layer.objects.active=children[0];bpy.ops.object.join()
        o=bpy.context.object;o.name={root:'MGBaseDetails',yaw:'MGCradleDetails',pitch:'MGFeed',recoil:'MGBarrelDetails'}[par];o['asset_node_id']=o.name
parts=list(asset.objects)
bpy.context.view_layer.update()
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(OUT/'iron_dust_mg_02.glb'),export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_apply=True,export_cameras=False,export_lights=False)
# Neutral studio; never exported.
def link_studio(o):
    for c in list(o.users_collection):c.objects.unlink(o)
    studio.objects.link(o)
box_floor=None
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.012));floor=bpy.context.object;floor.name='StudioFloor';link_studio(floor);floor.data.materials.append(material('StudioFloorMat',(.065,.075,.082),.05,.8))
world=bpy.data.worlds.new('MG02_StudioWorld');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.19,.23,.28,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45;scene.world=world
for name,loc,power,size,col in [('Key',(3,-4,6),1100,4,(1,.86,.7)),('Fill',(-4,-2,3),800,3,(.65,.78,1)),('Rim',(1,4,5),1300,3,(1,1,1))]:
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=col;o=bpy.data.objects.new(name,d);studio.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,-.25,.3))-o.location).to_track_quat('-Z','Y').to_euler()
def camera(name,loc,target,lens=52):
    d=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,d);studio.objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();d.lens=lens;d.clip_start=.01;d.clip_end=500;return o
scene.camera=camera('StudioCamera',(2.05,-2.65,1.65),(0,-.38,.35))
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=1280;scene.render.resolution_y=720;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
# Independent mounted preview with the delivered tank GLB as read-only reference.
mounted=bpy.data.scenes.new('MG02_MountedPreview');mounted.world=world
bpy.context.window.scene=mounted
bpy.ops.import_scene.gltf(filepath=str(BASE/'assets/tanks/iron_dust_01/iron_dust_01.glb'))
tank_objects=list(mounted.objects)
for o in tank_objects:
    if o.get('collision_only') or o.name=='COL_Hull':o.hide_render=True;o.hide_set(True)
turret=next(o for o in tank_objects if o.get('asset_node_id',o.name)=='TurretPivot')
copies={o:o.copy() for o in parts}
for orig,o in copies.items():
    o.name='REF_'+orig.name;mounted.collection.objects.link(o);o.parent=copies.get(orig.parent);o.matrix_basis=orig.matrix_basis.copy()
mount=copies[root];mount.parent=turret;mount.location=(.50,-.85,.94)
for o in studio.objects:
    if o.type in {'LIGHT','CAMERA'}:mounted.collection.objects.link(o)
# Dedicated floor at tank ground.
mounted.collection.objects.link(floor)
mounted.camera=scene.camera
mounted.render.engine='CYCLES';mounted.cycles.samples=24;mounted.cycles.use_denoising=True;mounted.render.resolution_x=1280;mounted.render.resolution_y=720;mounted.render.resolution_percentage=100;mounted.view_settings.view_transform='AgX'
bpy.context.view_layer.update()
# Save editable asset, neutral transforms and reference scene. No original file writes.
bpy.context.window.scene=scene
bpy.ops.object.select_all(action='DESELECT')
root.select_set(True);bpy.context.view_layer.objects.active=root
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'iron_dust_mg_02.blend'))
result={'blend':str(OUT/'iron_dust_mg_02.blend'),'glb':str(OUT/'iron_dust_mg_02.glb'),'objects':len(parts),'original_files_written':False}
