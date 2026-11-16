import { t } from '../i18n/index.ts';
import { icon, keyBadge } from '../ui/icons.ts';
/** Owns desktop focus; the entry click never reaches weapon handlers. */
export class GamePointerLock {
  private readonly prompt = document.createElement('button');
  private readonly listeners = new AbortController();
  get active() { return !this.enabled || document.pointerLockElement === this.canvas; }

  private readonly canvas: HTMLCanvasElement;
  private readonly clearInput: () => void;
  private readonly canEnter: () => boolean;
  private readonly enabled: boolean;
  constructor(canvas: HTMLCanvasElement, clearInput: () => void,
    canEnter: () => boolean, enabled = !matchMedia('(pointer: coarse)').matches) {
    this.canvas = canvas; this.clearInput = clearInput; this.canEnter = canEnter; this.enabled = enabled;
    if (!enabled) return;
    this.prompt.className = 'game-pointer-prompt';
    this.prompt.type = 'button';
    this.setPrompt(t('pointerEnter'), false);
    document.body.append(this.prompt);
    const options = { signal: this.listeners.signal };
    this.prompt.addEventListener('click', this.enter, options);
    canvas.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'mouse' || this.active) return;
      event.preventDefault(); event.stopImmediatePropagation();
      this.enter();
    }, { ...options, capture: true });
    document.addEventListener('pointerlockchange', () => {
      this.clearInput();
      this.prompt.hidden = this.active;
      if (this.active) canvas.focus();
    }, options);
    document.addEventListener('pointerlockerror', this.error, options);
    window.addEventListener('keydown', event => { if (event.code === 'Escape') this.exit(); }, options);
    window.addEventListener('blur', this.exit, options);
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.exit(); }, options);
  }
  private error = () => {
    this.setPrompt(t('pointerError'), true);
  };
  private setPrompt(label: string, failed: boolean) {
    this.prompt.innerHTML = `<span class="hud-chip">${icon(failed ? 'blocked' : 'mouse')}</span><span class="hud-chip">${keyBadge('Esc')}${icon('pause')}</span>`;
    this.prompt.setAttribute('aria-label', label); this.prompt.title = label;
    this.prompt.dataset.failed = String(failed);
  }
  enter = () => {
    if (this.active || !this.canEnter()) return;
    this.canvas.focus();
    try {
      const request = this.canvas.requestPointerLock();
      request?.catch(this.error);
    } catch { this.error(); }
  };
  private exit = () => {
    this.clearInput();
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  };
  dispose() {
    if (!this.enabled) return;
    this.listeners.abort(); this.exit(); this.prompt.remove();
  }
}
