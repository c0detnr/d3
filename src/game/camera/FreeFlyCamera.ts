import { FreeCamera, Vector3, type Camera, type Scene } from '@babylonjs/core';

/** Independent map inspection camera; distances in metres, movement in metres/second. */
export class FreeFlyCamera {
  readonly camera: FreeCamera;
  private previous: Camera | null = null;
  private readonly keys = new Set<string>();
  private readonly listeners = new AbortController();
  private readonly hint = document.createElement('div');
  get active() { return this.previous !== null; }

  private readonly scene: Scene;
  private readonly enabled: () => boolean;
  private readonly clearGameInput: () => void;
  constructor(scene: Scene, canvas: HTMLCanvasElement,
    enabled: () => boolean, clearGameInput: () => void) {
    this.scene = scene; this.enabled = enabled; this.clearGameInput = clearGameInput;
    this.camera = new FreeCamera('map-free-camera', Vector3.Zero(), scene);
    this.camera.inputs.clear();
    this.camera.minZ = 0.15;
    this.camera.maxZ = 2800;
    this.hint.textContent = 'SERBEST KAMERA · WASD hareket · Q/E alçal/yüksel · Shift hızlan · 0 tanka dön';
    this.hint.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:10px 16px;background:#111d;color:#eee;font:13px sans-serif;z-index:30;pointer-events:none';
    this.hint.hidden = true;
    document.body.append(this.hint);
    const options = { signal: this.listeners.signal };
    window.addEventListener('keydown', event => {
      if (!this.enabled() || (event.target as HTMLElement)?.closest?.('input, textarea, select, button, [contenteditable="true"]')) return;
      if (event.code === 'Digit0' || event.code === 'Numpad0') {
        event.preventDefault();
        if (!event.repeat) this.toggle();
      } else if (this.active && ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight'].includes(event.code)) {
        event.preventDefault(); this.keys.add(event.code);
      }
    }, options);
    window.addEventListener('keyup', event => this.keys.delete(event.code), options);
    window.addEventListener('blur', this.clear, options);
    document.addEventListener('visibilitychange', this.clear, options);
    document.addEventListener('pointerlockchange', this.clear, options);
    canvas.addEventListener('pointermove', event => {
      if (!this.active || !this.enabled() || event.pointerType !== 'mouse') return;
      this.camera.rotation.y += event.movementX * 0.002;
      this.camera.rotation.x = Math.max(-1.55, Math.min(1.55, this.camera.rotation.x + event.movementY * 0.002));
    }, options);
  }
  private clear = () => { this.keys.clear(); };
  toggle() {
    this.clear(); this.clearGameInput();
    if (this.active) {
      this.scene.activeCamera = this.previous;
      this.previous = null;
    } else if (this.scene.activeCamera) {
      this.previous = this.scene.activeCamera;
      this.camera.position.copyFrom(this.previous.globalPosition);
      this.camera.setTarget(this.camera.position.add(this.previous.getForwardRay().direction));
      this.camera.rotation.z = 0;
      this.camera.fov = 0.8;
      this.scene.activeCamera = this.camera;
    }
    this.hint.hidden = !this.active;
  }
  update(dt: number) {
    if (!this.active || !this.enabled()) return;
    const axis = (positive: string, negative: string) => Number(this.keys.has(positive)) - Number(this.keys.has(negative));
    const forward = this.camera.getDirection(Vector3.Forward());
    const right = this.camera.getDirection(Vector3.Right());
    const movement = forward.scale(axis('KeyW', 'KeyS')).add(right.scale(axis('KeyD', 'KeyA')));
    movement.y += axis('KeyE', 'KeyQ');
    if (movement.lengthSquared() > 0) {
      const speed = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 100 : 25;
      this.camera.position.addInPlace(movement.normalize().scale(speed * Math.min(dt, 0.1)));
    }
  }
  dispose() {
    if (this.active) this.toggle();
    this.listeners.abort(); this.hint.remove(); this.camera.dispose();
  }
}
