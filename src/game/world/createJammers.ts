import { Color3, Mesh, MeshBuilder, PhysicsAggregate, PhysicsShapeType, Quaternion, StandardMaterial, Vector3, type Scene } from '@babylonjs/core';
import { KUL_JAMMERS } from './jammerLayout.ts';

/** Original procedural placeholder towers; no external assets. */
export function createJammers(scene: Scene, ground: (x: number, z: number) => number) {
  const meshes: Mesh[] = [], bodies: PhysicsAggregate[] = [];
  const steel = new StandardMaterial('jammer-steel', scene); steel.diffuseColor = Color3.FromHexString('#626b64');
  const beacon = new StandardMaterial('jammer-beacon', scene); beacon.disableLighting = true;
  const solid = (mesh: Mesh) => { mesh.material = steel; mesh.metadata = { hardCover: true, surface: 'metal', temporaryAsset: true }; meshes.push(mesh);
    bodies.push(new PhysicsAggregate(mesh, PhysicsShapeType.MESH, { mass: 0, friction: .8 }, scene)); return mesh; };
  const positions = KUL_JAMMERS.map((p, i) => {
    const base = ground(p.x, p.z), center = new Vector3(p.x, base, p.z);
    const beam = (a: Vector3, b: Vector3, width: number) => {
      const delta = b.subtract(a), m = MeshBuilder.CreateBox(`jammer-${i}-beam`, { width, depth: width, height: delta.length() }, scene);
      m.position.copyFrom(a.add(b).scale(.5)); m.rotationQuaternion = Quaternion.FromUnitVectorsToRef(Vector3.Up(), delta.normalize(), Quaternion.Identity()); solid(m);
    };
    const foot = MeshBuilder.CreateBox(`jammer-${i}-foot`, {width:4,depth:4,height:.6}, scene); foot.position.copyFrom(center).y += .3; solid(foot);
    for (const x of [-1.3,1.3]) for (const z of [-1.3,1.3]) {
      beam(center.add(new Vector3(x,0,z)), center.add(new Vector3(x,p.y,z)), .18);
    }
    for (let y=1;y< p.y-1;y+=3) for (const z of [-1.3,1.3]) {
      beam(center.add(new Vector3(-1.3,y,z)),center.add(new Vector3(1.3,y+3,z)),.1);
      beam(center.add(new Vector3(z,y,-1.3)),center.add(new Vector3(z,y+3,1.3)),.1);
    }
    const dish = MeshBuilder.CreateSphere(`jammer-${i}-dish`, {diameter:3,segments:8}, scene);
    dish.scaling.z = .18; dish.position.set(p.x,base+p.y,p.z); solid(dish);
    beam(center.add(new Vector3(0,p.y-1,0)),center.add(new Vector3(0,p.y+2,0)),.12);
    const lamp = MeshBuilder.CreateSphere(`jammer-${i}-light`, {diameter:.45,segments:6}, scene);
    lamp.position.set(p.x,base+p.y+2,p.z); lamp.material=beacon; lamp.isPickable=false; meshes.push(lamp);
    return { x:p.x, y:base+p.y, z:p.z };
  });
  let elapsed=0;
  const observer=scene.onBeforeRenderObservable.add(()=> { elapsed+=scene.getEngine().getDeltaTime()/1000;
    beacon.emissiveColor.set(Math.sin(elapsed*5)>0 ? 1 : .16, .015, .005); });
  return { positions, shadowCasters: meshes, dispose() { scene.onBeforeRenderObservable.remove(observer); bodies.forEach(b=>b.dispose()); meshes.forEach(m=>m.dispose()); steel.dispose(); beacon.dispose(); } };
}
