import { t } from '../i18n/index.ts';
import { releasedKeys } from './DriveInput.ts';

/** Pointer IDs are owned per control so driving, aiming and firing can overlap. */
export class TouchControls {
  readonly keys = releasedKeys();
  turn = 0;
  elevation = 0;
  fireHeld = false;
  aiming = false;
  private pendingFire = false;
  private cleanups: (() => void)[] = [];
  private resets: (() => void)[] = [];
  private root: HTMLElement;
  constructor(root: HTMLElement, canvas: HTMLCanvasElement, actions: {
    look: (x: number, y: number) => void; fireReady: () => boolean;
    weapon: () => void; reset: () => void; sound: () => void;
  }) {
    this.root = root;
    const bind = (element: HTMLElement, start: (e: PointerEvent) => void,
      move: (e: PointerEvent) => void, end: () => void) => {
      let id: number | undefined;
      const down = (e: PointerEvent) => {
        if (e.pointerType === 'mouse' || id !== undefined) return;
        e.preventDefault(); id = e.pointerId; element.setPointerCapture(id); start(e);
      };
      const motion = (e: PointerEvent) => { if (id === e.pointerId) { e.preventDefault(); move(e); } };
      const clear = () => {
        const previous = id; id = undefined; end(); element.classList.remove('pressed');
        if (previous !== undefined && element.hasPointerCapture(previous)) element.releasePointerCapture(previous);
      };
      const up = (e: PointerEvent) => { if (id === e.pointerId) clear(); };
      element.addEventListener('pointerdown', down);
      element.addEventListener('pointermove', motion);
      for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) element.addEventListener(name, up as EventListener);
      this.resets.push(clear);
      this.cleanups.push(() => {
        element.removeEventListener('pointerdown', down); element.removeEventListener('pointermove', motion);
        for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) element.removeEventListener(name, up as EventListener);
      });
    };
    const stick = (name: string, change: (x: number, y: number) => void) => {
      const el = root.querySelector<HTMLElement>(`[data-stick="${name}"]`)!;
      const update = (e: PointerEvent) => {
        const box = el.getBoundingClientRect(), radius = box.width * 0.34;
        let x = (e.clientX - box.left - box.width / 2) / radius;
        let y = (e.clientY - box.top - box.height / 2) / radius;
        const magnitude = Math.max(1, Math.hypot(x, y)); x /= magnitude; y /= magnitude;
        el.style.setProperty('--x', `${x * radius}px`); el.style.setProperty('--y', `${y * radius}px`);
        change(Math.abs(x) < 0.16 ? 0 : x, Math.abs(y) < 0.16 ? 0 : y);
      };
      bind(el, update, update, () => { el.style.setProperty('--x', '0px'); el.style.setProperty('--y', '0px'); change(0, 0); });
    };
    stick('drive', (x, y) => Object.assign(this.keys, { forward: y < -0.22, reverse: y > 0.22, left: x < -0.22, right: x > 0.22 }));
    stick('aim', (x, y) => { this.turn = x; this.elevation = -y; });
    const hold = (name: string, change: (held: boolean) => void) => {
      const el = root.querySelector<HTMLElement>(`[data-action="${name}"]`)!;
      bind(el, () => { el.classList.add('pressed'); change(true); }, () => {}, () => change(false));
    };
    hold('fire', held => { if (held && actions.fireReady()) this.pendingFire = true; this.fireHeld = held; });
    hold('brake', held => { this.keys.brake = held; });
    hold('zoom', held => { this.aiming = held; });
    for (const name of ['weapon', 'reset', 'sound'] as const) {
      const el = root.querySelector<HTMLElement>(`[data-action="${name}"]`)!;
      const click = () => { this.clear(); actions[name](); };
      el.addEventListener('click', click); this.cleanups.push(() => el.removeEventListener('click', click));
    }
    let lastX = 0, lastY = 0;
    bind(canvas, e => { lastX = e.clientX; lastY = e.clientY; }, e => {
      actions.look(e.clientX - lastX, e.clientY - lastY); lastX = e.clientX; lastY = e.clientY;
    }, () => {});
    const visibility = () => { if (document.hidden) this.clear(); };
    window.addEventListener('blur', this.clear);
    document.addEventListener('visibilitychange', visibility);
    this.cleanups.push(() => { window.removeEventListener('blur', this.clear); document.removeEventListener('visibilitychange', visibility); });
  }
  consumeFire() { const fire = this.pendingFire; this.pendingFire = false; return fire; }
  clear = () => {
    for (const reset of this.resets) reset();
    Object.assign(this.keys, releasedKeys()); this.turn = 0; this.elevation = 0;
    this.fireHeld = false; this.aiming = false; this.pendingFire = false;
  };
  update(ready: boolean, mg: boolean) {
    this.root.querySelector('[data-action="fire"]')!.classList.toggle('reloading', !ready && !mg);
    this.root.querySelector('[data-action="weapon"]')!.textContent = mg ? t('cannon') : 'MG';
  }
  dispose() { this.clear(); for (const cleanup of this.cleanups) cleanup(); }
}
