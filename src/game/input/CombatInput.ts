/** One pointer owner, including chorded mouse buttons (reported through pointermove). */
export class CombatInput {
  aiming = false;
  get fireHeld() { return this.left && this.canAim(); }
  private turnLeft = false;
  private turnRight = false;
  private elevationDelta = 0;
  get turretTurn() { return Number(this.turnRight) - Number(this.turnLeft); }
  consumeElevation() { const delta = this.elevationDelta; this.elevationDelta = 0; return delta; }
  private left = false;
  private pending = false;
  private pointerId: number | undefined;
  private readonly canvas: HTMLCanvasElement;
  private readonly canFire: () => boolean;
  private readonly canAim: () => boolean;
  private readonly look: (x: number, y: number) => void;
  private readonly released: () => void;
  private readonly alignToView: () => void;
  constructor(canvas: HTMLCanvasElement, canFire: () => boolean, canAim: () => boolean,
    look: (x: number, y: number) => void, released: () => void,
    alignToView: () => void = () => {}) {
    this.canvas = canvas; this.canFire = canFire; this.canAim = canAim;
    this.look = look; this.released = released; this.alignToView = alignToView;
    canvas.addEventListener('pointerdown', this.down);
    canvas.addEventListener('pointermove', this.move);
    window.addEventListener('pointerup', this.up);
    canvas.addEventListener('pointercancel', this.clear);
    canvas.addEventListener('lostpointercapture', this.captureLost);
    canvas.addEventListener('contextmenu', this.context);
    window.addEventListener('blur', this.clear);
    window.addEventListener('keydown', this.key);
    window.addEventListener('keyup', this.keyUp);
    canvas.addEventListener('wheel', this.wheel, { passive: false });
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
    if (!this.canAim()) return;
    e.preventDefault(); this.pointerId = e.pointerId;
    this.canvas.setPointerCapture?.(e.pointerId); this.buttons(e.buttons);
  };
  private move = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    if (!this.canAim()) return;
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
  private key = (e: KeyboardEvent) => {
    if (e.code === 'Escape') { this.clear(); return; }
    if ((e.target as HTMLElement)?.closest?.('input, textarea, select, button, [contenteditable="true"]')) return;
    if (!this.canAim()) return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (!e.repeat) this.alignToView();
    }
    if (e.code === 'KeyQ' || e.code === 'KeyE') {
      e.preventDefault();
      if (e.code === 'KeyQ') this.turnLeft = true;
      else this.turnRight = true;
    }
  };
  private keyUp = (e: KeyboardEvent) => {
    if (e.code === 'KeyQ') this.turnLeft = false;
    if (e.code === 'KeyE') this.turnRight = false;
  };
  private wheel = (e: WheelEvent) => {
    e.preventDefault();
    if (!this.canAim() || !e.deltaY) return;
    // A typical mouse notch is 100 pixels or three lines; preserve trackpad fractions.
    const notches = e.deltaY / (e.deltaMode === 1 ? 3 : e.deltaMode === 2 ? 1 : 100);
    const degrees = e.shiftKey ? 0.15 : 0.75;
    this.elevationDelta -= Math.max(-4, Math.min(4, notches)) * degrees * Math.PI / 180;
  };
  private captureLost = () => { if (this.pointerId !== undefined) this.clear(); };
  private visibility = () => { if (document.hidden) this.clear(); };
  private context = (e: Event) => e.preventDefault();
  consumeFire() { const fire = this.pending; this.pending = false; return fire; }
  clear = () => {
    if (this.aiming) this.released();
    this.aiming = false; this.left = false; this.pending = false;
    this.turnLeft = false; this.turnRight = false; this.elevationDelta = 0;
    const id = this.pointerId; this.pointerId = undefined;
    if (id !== undefined && this.canvas.hasPointerCapture?.(id)) this.canvas.releasePointerCapture(id);
  };
  dispose() {
    this.clear();
    this.canvas.removeEventListener('pointerdown', this.down);
    this.canvas.removeEventListener('pointermove', this.move);
    window.removeEventListener('pointerup', this.up);
    this.canvas.removeEventListener('pointercancel', this.clear);
    this.canvas.removeEventListener('lostpointercapture', this.captureLost);
    this.canvas.removeEventListener('contextmenu', this.context);
    window.removeEventListener('blur', this.clear); window.removeEventListener('keydown', this.key);
    window.removeEventListener('keyup', this.keyUp);
    this.canvas.removeEventListener('wheel', this.wheel);
    document.removeEventListener('visibilitychange', this.visibility);
  }
}
