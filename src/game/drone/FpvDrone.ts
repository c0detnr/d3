import { signalQuality, type JammerPosition } from '../world/jammerLayout.ts';
import { createFpvVideo } from './FpvVideo.ts';
import { Color3, FreeCamera, MeshBuilder, PhysicsBody, PhysicsMotionType, PhysicsShapeSphere, Quaternion, StandardMaterial, TransformNode, Vector3, type Scene } from '@babylonjs/core';
import type { ProjectileHit } from '../combat/ProjectileSystem.ts';
import type { AudioGraph } from '../audio/AudioSystem.ts';
import { FpvFlight, neutralFlight } from './FpvFlight.ts';
import { FpvHud } from './FpvHud.ts';

export interface FpvWorld {
  jammers?: readonly JammerPosition[];
  scene: Scene; canvas: HTMLCanvasElement;
  ready: () => boolean; controlsEnabled: () => boolean; tankAlive: () => boolean;
  tankPosition: () => Vector3; tankYaw: () => number;
  ground: (x: number, z: number) => number;
  raycast: (from: Vector3, to: Vector3, ownBody?: PhysicsBody) => ProjectileHit | undefined;
  onLaunch: () => void; onImpact: (hit: ProjectileHit, detonate: boolean) => void; onEnd: () => void;
  audio: () => AudioGraph | null;
}

/** One local drone; shared fixed-step loop owns time, the session owns combat outcomes. */
export class FpvDrone {
  readonly flight = new FpvFlight();
  readonly camera: FreeCamera;
  readonly hud: FpvHud;
  private readonly video: ReturnType<typeof createFpvVideo>;
  private staticNoise?: AudioBufferSourceNode;
  private staticGain?: GainNode;
  private readonly world: FpvWorld;
  private readonly root: TransformNode;
  private readonly material: StandardMaterial;
  private readonly rotors: TransformNode[] = [];
  private readonly held = new Set<string>();
  private body?: PhysicsBody;
  private shape?: PhysicsShapeSphere;
  private oscillator?: OscillatorNode;
  private gain?: GainNode;
  private wind?: AudioBufferSourceNode;
  private windGain?: GainNode;
  private audioContext?: AudioContext;
  private readonly controls = new Set(['KeyW','KeyS','KeyA','KeyD','KeyQ','KeyE','Space','ControlLeft','ControlRight']);
  get active() { return this.flight.active; }
  constructor(world: FpvWorld) {
    this.world = world;
    this.camera = new FreeCamera('fpv-camera', Vector3.Zero(), world.scene);
    this.camera.inputs.clear(); this.camera.minZ = .05; this.camera.maxZ = 3000; this.camera.fov = 1.25;
    this.camera.rotationQuaternion = Quaternion.Identity(); this.camera.layerMask = 0x0ffffffd;
    this.root = new TransformNode('fpv-drone', world.scene); this.root.rotationQuaternion = Quaternion.Identity();
    this.material = new StandardMaterial('fpv-carbon', world.scene); this.material.diffuseColor = Color3.FromHexString('#343d35'); this.material.specularColor.set(.2,.2,.2);
    const box = (name: string, width: number, height: number, depth: number, x: number, y: number, z: number) => {
      const mesh = MeshBuilder.CreateBox(name, {width,height,depth}, world.scene);
      mesh.parent = this.root; mesh.position.set(x,y,z); mesh.material = this.material; mesh.isPickable = false; return mesh;
    };
    box('fpv-frame', .22, .12, .32, 0, 0, 0);
    box('fpv-battery', .16, .12, .24, 0, .11, -.03);
    for (const x of [-.27,.27]) for (const z of [-.27,.27]) {
      const arm = box('fpv-arm', .035, .035, .4, x / 2, 0, z / 2); arm.rotation.y = x * z > 0 ? Math.PI / 4 : -Math.PI / 4;
      const rotor = box('fpv-propeller', .34, .012, .035, x, .06, z); this.rotors.push(rotor);
      const motor = MeshBuilder.CreateCylinder('fpv-motor', {diameter:.07,height:.07,tessellation:8}, world.scene);
      motor.parent = this.root; motor.position.set(x,.025,z); motor.material = this.material; motor.isPickable = false;
    }
    this.root.getChildMeshes().forEach(mesh => mesh.layerMask = 2);
    this.root.setEnabled(false);
    this.hud = new FpvHud(() => this.launch(), () => this.changeMode()); this.hud.available(false);
    this.video = createFpvVideo(world.scene, world.canvas, this.flight, this.hud.root);
    window.addEventListener('keydown', this.down); window.addEventListener('keyup', this.up);
    window.addEventListener('blur', this.clear); document.addEventListener('pointerlockchange', this.clear);
    document.addEventListener('visibilitychange', this.clear);
    world.canvas.addEventListener('pointermove', this.move);
  }
  changeMode() { if (this.active) return; this.flight.mode = this.flight.mode === 'ASSIST' ? 'ACRO' : 'ASSIST'; this.hud.show(this.flight); }
  launch() {
    if (this.active || !this.world.ready() || !this.world.tankAlive()) return false;
    const start = this.world.tankPosition().add(new Vector3(0, 3.5, 0));
    const obstruction = this.world.raycast(start, start.add(new Vector3(0, .6, 0)));
    if (obstruction) return false;
    this.flight.launch(start, this.world.tankYaw());
    this.clear(); this.root.position.copyFrom(start); this.root.rotationQuaternion!.copyFrom(this.flight.rotation); this.root.setEnabled(true);
    this.body = new PhysicsBody(this.root, PhysicsMotionType.ANIMATED, false, this.world.scene);
    this.shape = new PhysicsShapeSphere(Vector3.Zero(), .35, this.world.scene); this.shape.isTrigger = true;
    this.body.shape = this.shape; this.body.disablePreStep = false;
    this.world.onLaunch(); this.world.scene.activeCamera = this.camera;
    this.hud.show(this.flight); this.render(0, 1); return true;
  }
  private down = (e: KeyboardEvent) => {
    if (e.repeat && !this.controls.has(e.code)) return;
    if ((e.target as HTMLElement)?.closest?.('input, textarea, select, button, [contenteditable="true"]')) return;
    if (!this.world.controlsEnabled()) return;
    if (e.code === 'KeyV') { e.preventDefault(); this.launch(); }
    if (e.code === 'KeyB') { e.preventDefault(); this.changeMode(); }
    if (this.active && this.controls.has(e.code)) { e.preventDefault(); this.held.add(e.code); }
  };
  private up = (e: KeyboardEvent) => { this.held.delete(e.code); };
  private move = (e: PointerEvent) => { if (this.active && this.world.controlsEnabled()) this.flight.look(e.movementX, e.movementY); };
  clear = () => { this.held.clear(); };
  fixedUpdate(dt: number) {
    if (!this.active) return;
    const input = neutralFlight(), key = (name: string) => Number(this.held.has(name));
    if (this.world.controlsEnabled()) {
      input.forward = key('KeyW') - key('KeyS'); input.right = key('KeyD') - key('KeyA');
      input.lift = key('Space') - Math.max(key('ControlLeft'), key('ControlRight'));
      input.yaw = key('KeyE') - key('KeyQ'); input.pitch = input.forward; input.roll = -input.right;
    }
    this.flight.step(dt, input, signalQuality(this.flight.position, this.world.jammers ?? []));
    // Sweep centre and rotor footprint: thin obstacles cannot be skipped at high speed.
    let closest: ProjectileHit | undefined;
    if (Vector3.DistanceSquared(this.flight.previous, this.flight.position) > 1e-8) for (const offset of [Vector3.Zero(), new Vector3(.3,0,0),new Vector3(-.3,0,0),new Vector3(0,.15,0),new Vector3(0,-.15,0)]) {
      const hit = this.world.raycast(this.flight.previous.add(offset), this.flight.position.add(offset), this.body);
      if (hit && (!closest || hit.distance < closest.distance)) closest = hit;
    }
    const ground = this.world.ground(this.flight.position.x, this.flight.position.z);
    if (!closest && this.flight.position.y <= ground + .2) closest = { point: this.flight.position.clone(), normal:Vector3.Up(), distance:0 };
    if (closest) { this.finish(closest, true); return; }
    this.root.position.copyFrom(this.flight.position); this.root.rotationQuaternion!.copyFrom(this.flight.rotation);
    this.root.computeWorldMatrix(true); this.body?.setTargetTransform(this.root.position, this.root.rotationQuaternion!);
  }
  /** Enemy projectile systems already query trigger bodies. */
  intercept(hit: ProjectileHit) {
    if (!this.active || !this.body || hit.body !== this.body) return false;
    this.finish(hit, false); return true;
  }
  private finish(hit: ProjectileHit, impact: boolean) {
    if (!this.flight.end()) return;
    this.clear(); this.body?.dispose(); this.shape?.dispose(); this.body = undefined; this.shape = undefined;
    this.root.setEnabled(false); this.stopSound(); this.hud.show(this.flight);
    this.world.onImpact(hit, impact);
    this.world.onEnd();
  }
  render(dt: number, alpha: number) {
    this.hud.available(!this.active && this.world.ready() && this.world.tankAlive());
    if (!this.active) { this.stopSound(); return; }
    this.world.scene.activeCamera = this.camera;
    Vector3.LerpToRef(this.flight.previous, this.flight.position, alpha, this.camera.position);
    Quaternion.SlerpToRef(this.flight.previousRotation, this.flight.rotation, alpha, this.camera.rotationQuaternion!);
    this.camera.position.addInPlace(this.camera.getDirection(Vector3.Forward()).scale(.42));
    this.rotors.forEach((r, i) => r.rotation.y += dt * (60 + this.flight.throttle * 180) * (i % 2 ? 1 : -1));
    this.hud.update(dt, this.flight, this.flight.position.y - this.world.ground(this.flight.position.x, this.flight.position.z),
      Vector3.Distance(this.flight.position, this.world.tankPosition()), this.world.tankAlive(), this.world.controlsEnabled());
    const graph = this.world.audio();
    if (graph && !this.oscillator) {
      this.audioContext = graph.context; this.oscillator = graph.context.createOscillator(); this.gain = graph.context.createGain();
      this.oscillator.type = 'sawtooth'; this.gain.gain.value = 0;
      this.oscillator.connect(this.gain); this.gain.connect(graph.output); this.oscillator.start();
      const buffer = graph.context.createBuffer(1, graph.context.sampleRate, graph.context.sampleRate), data = buffer.getChannelData(0);
      let sample = 0; for (let i = 0; i < data.length; i++) { sample = sample * .94 + (Math.random() * 2 - 1) * .06; data[i] = sample; }
      const staticBuffer = graph.context.createBuffer(1, graph.context.sampleRate, graph.context.sampleRate);
      const noise = staticBuffer.getChannelData(0); for (let i=0;i<noise.length;i++) noise[i]=Math.random()*2-1;
      this.staticNoise=graph.context.createBufferSource(); this.staticNoise.buffer=staticBuffer; this.staticNoise.loop=true;
      this.staticGain=graph.context.createGain(); this.staticGain.gain.value=0;
      this.staticNoise.connect(this.staticGain); this.staticGain.connect(graph.output); this.staticNoise.start();
      this.wind = graph.context.createBufferSource(); this.wind.buffer = buffer; this.wind.loop = true;
      this.windGain = graph.context.createGain(); this.windGain.gain.value = 0;
      this.wind.connect(this.windGain); this.windGain.connect(graph.output); this.wind.start();
    }
    if (this.oscillator && this.gain && this.audioContext) {
      this.oscillator.frequency.setTargetAtTime(100 + this.flight.throttle * 210, this.audioContext.currentTime, .06);
      const quality = this.flight.signalQuality, strength = 1-quality;
      const dropout = quality === 0 || this.flight.controlLost || Math.sin(this.flight.elapsed*43) > 1-strength*.8 ? 0 : quality;
      this.staticGain?.gain.setTargetAtTime(strength*.16, this.audioContext.currentTime, .02);
      this.gain.gain.setTargetAtTime((.012 + this.flight.throttle * .018)*dropout, this.audioContext.currentTime, .06);
      this.windGain?.gain.setTargetAtTime(Math.min(.2, this.flight.velocity.length() * .005)*quality, this.audioContext.currentTime, .1);
    }
  }
  private stopSound() { this.staticNoise?.stop(); this.staticNoise?.disconnect(); this.staticGain?.disconnect(); this.staticNoise=undefined; this.staticGain=undefined; this.wind?.stop(); this.wind?.disconnect(); this.windGain?.disconnect(); this.wind = undefined; this.windGain = undefined; this.oscillator?.stop(); this.oscillator?.disconnect(); this.gain?.disconnect(); this.oscillator = undefined; this.gain = undefined; }
  dispose() {
    this.flight.end(); this.stopSound(); this.body?.dispose(); this.shape?.dispose(); this.root.dispose(); this.material.dispose(); this.camera.dispose(); this.video.dispose(); this.hud.dispose();
    window.removeEventListener('keydown',this.down); window.removeEventListener('keyup',this.up); window.removeEventListener('blur',this.clear);
    document.removeEventListener('pointerlockchange',this.clear); document.removeEventListener('visibilitychange',this.clear); this.world.canvas.removeEventListener('pointermove',this.move);
  }
}
