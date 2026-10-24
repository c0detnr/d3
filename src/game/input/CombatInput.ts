/** One pointer owner, including chorded mouse buttons (reported through pointermove). */
export class CombatInput {
  aiming = false;
  get fireHeld() { return this.left && this.canAim(); }
  private left = false;
  private pending = false;
  private pointerId: number | undefined;
  private readonly canvas: HTMLCanvasElement;
  private readonly canFire: () => boolean;
  private readonly canAim: () => boolean;
  private readonly look: (x: number, y: number) => void;
  private readonly released: () => void;
  constructor(canvas: HTMLCanvasElement, canFire: () => boolean, canAim: () => boolean,
    look: (x: number, y: number) => void, released: () => void) {
    this.canvas = canvas; this.canFire = canFire; this.canAim = canAim;
    this.look = look; this.released = released;
    canvas.addEventListener('pointerdown', this.down);
    canvas.addEventListener('pointermove', this.move);
    window.addEventListener('pointerup', this.up);
    canvas.addEventListener('pointercancel', this.clear);
    canvas.addEventListener('lostpointercapture', this.clear);
    canvas.addEventListener('contextmenu', this.context);
    window.addEventListener('blur', this.clear);
    window.addEventListener('keydown', this.key);
    document.addEventListener('visibilitychange', this.visibility);
  }
  private buttons(buttons: number) {
    const aiming = !!(buttons & 2) && this.canAim();
    if (this.aiming && !aiming) this.released();
    this.aiming = aiming;
    const left = !!(buttons & 1);
    if (left && !this.left && this.canFire()) this.pending = true;
    this.left = left;
  }
  private down = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    e.preventDefault(); this.pointerId = e.pointerId;
    this.canvas.setPointerCapture?.(e.pointerId); this.buttons(e.buttons);
  };
  private move = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    // A hover cannot create a shot after focus/capture loss.
    if (this.pointerId === e.pointerId) this.buttons(e.buttons);
    this.look(e.movementX, e.movementY);
  };
  private up = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return;
    this.buttons(e.buttons);
    if (!e.buttons) {
      this.pointerId = undefined;
      if (this.canvas.hasPointerCapture?.(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
    }
  };
  private key = (e: KeyboardEvent) => { if (e.code === 'Escape') this.clear(); };
  private visibility = () => { if (document.hidden) this.clear(); };
  private context = (e: Event) => e.preventDefault();
  consumeFire() { const fire = this.pending; this.pending = false; return fire; }
  clear = () => {
    if (this.aiming) this.released();
    this.aiming = false; this.left = false; this.pending = false;
    const id = this.pointerId; this.pointerId = undefined;
    if (id !== undefined && this.canvas.hasPointerCapture?.(id)) this.canvas.releasePointerCapture(id);
  };
  dispose() {
    this.clear();
    this.canvas.removeEventListener('pointerdown', this.down);
    this.canvas.removeEventListener('pointermove', this.move);
    window.removeEventListener('pointerup', this.up);
    this.canvas.removeEventListener('pointercancel', this.clear);
    this.canvas.removeEventListener('lostpointercapture', this.clear);
    this.canvas.removeEventListener('contextmenu', this.context);
    window.removeEventListener('blur', this.clear); window.removeEventListener('keydown', this.key);
    document.removeEventListener('visibilitychange', this.visibility);
  }
}
