import { JAMMER_EFFECT } from '../world/jammerLayout.ts';
import { t } from '../i18n/index.ts';
import { MinimapContacts, worldToMinimap, type MapPosition } from './minimapModel.ts';
import './hudTokens.css';
import './minimap.css';
interface Pose extends MapPosition { yaw: number }
interface Contact { id: string; position: MapPosition; friend: boolean; visible: boolean }
export interface MinimapState {
  tank: Pose; lookYaw: number; drone?: Pose; contacts: Contact[]; waypoint?: MapPosition;
  /** Own roof-jammer field radius, metres. */
  tankJammer?: number;
}
interface MapLayout {
  limit: number; height: (x: number, z: number) => number;
  jammers?: readonly MapPosition[];
  paths?: readonly { points: readonly MapPosition[] }[];
  buildings?: readonly (MapPosition & { width: number; depth: number; yaw?: number })[];
}
/** Owns one cached terrain raster; callers supply only currently observed enemy positions. */
export class Minimap {
  readonly element = document.createElement('section');
  private readonly canvas = document.createElement('canvas');
  private readonly background = document.createElement('canvas');
  private readonly context: CanvasRenderingContext2D;
  private readonly contacts = new MinimapContacts();
  private readonly scale = document.createElement('span');
  private readonly zoom = document.createElement('button');
  private readonly north = document.createElement('span');
  private readonly layout: MapLayout;
  private readonly enabled: () => boolean;
  private lastDraw = -Infinity;
  private span = 400;
  private readonly colors: Record<string, string> = {};
  constructor(layout: MapLayout, enabled: () => boolean) {
    this.layout = layout; this.enabled = enabled;
    this.element.className = 'minimap'; this.element.hidden = true;
    this.canvas.width = this.canvas.height = 440;
    this.context = this.canvas.getContext('2d')!;
    this.north.className = 'minimap-north'; this.scale.className = 'minimap-scale'; this.zoom.className = 'minimap-zoom'; this.zoom.type = 'button';
    this.element.append(this.canvas, this.north, this.zoom, this.scale); document.body.append(this.element);
    document.body.classList.add('has-minimap');
    const style = getComputedStyle(this.element);
    for (const name of ['fg', 'amber', 'danger', 'friend', 'panel', 'line']) this.colors[name] = style.getPropertyValue(`--hud-${name}`).trim();
    this.createBackground();
    this.zoom.addEventListener('click', this.toggle); window.addEventListener('keydown', this.key);
  }
  private toggle = () => { if (this.enabled()) { this.span = this.span === 400 ? 800 : 400; this.lastDraw = -Infinity; } };
  private key = (event: KeyboardEvent) => {
    if (event.code !== 'KeyM' || event.repeat || event.ctrlKey || event.altKey || event.metaKey || !this.enabled()) return;
    if ((event.target as HTMLElement)?.closest?.('input, textarea, select, button, [contenteditable]')) return;
    event.preventDefault(); this.toggle();
  };
  private createBackground() {
    const size = 512, limit = this.layout.limit, step = limit * 2 / (size - 1);
    this.background.width = this.background.height = size;
    const ctx = this.background.getContext('2d')!, image = ctx.createImageData(size, size), heights = new Float32Array(size * size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) heights[y * size + x] = this.layout.height(-limit + x * step, limit - y * step);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = y * size + x, h = heights[i];
      const east = heights[y * size + Math.min(size - 1, x + 1)], south = heights[Math.min(size - 1, y + 1) * size + x];
      const contour = Math.floor(h / 5) !== Math.floor(east / 5) || Math.floor(h / 5) !== Math.floor(south / 5);
      const shade = Math.max(0, Math.min(32, 16 + (h - east + south - h) / step * 13));
      image.data.set([19 + shade + (contour ? 17 : 0), 27 + shade + (contour ? 19 : 0), 28 + shade + (contour ? 16 : 0), 220], i * 4);
    }
    ctx.putImageData(image, 0, 0);
    const project = (p: MapPosition) => worldToMinimap(p, { x: 0, z: 0 }, size, limit * 2);
    ctx.strokeStyle = this.colors.line; ctx.lineWidth = 3;
    for (const path of this.layout.paths ?? []) {
      ctx.beginPath(); path.points.forEach((p, i) => { const q = project(p); if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }); ctx.stroke();
    }
    ctx.fillStyle = this.colors.line; ctx.lineWidth = 1;
    for (const building of this.layout.buildings ?? []) {
      const p = project(building); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(building.yaw ?? 0);
      const w = building.width * size / (limit * 2), h = building.depth * size / (limit * 2);
      ctx.fillRect(-w / 2, -h / 2, w, h); ctx.strokeRect(-w / 2, -h / 2, w, h); ctx.restore();
    }
  }
  update(time: number, sample: () => MinimapState) {
    const enabled = this.enabled(); this.element.hidden = !enabled;
    if (!enabled || time - this.lastDraw < .05) return;
    this.lastDraw = time;
    const state = sample(), center = state.drone ?? state.tank, size = this.canvas.width, ctx = this.context;
    const project = (p: MapPosition) => worldToMinimap(p, center, size, this.span);
    ctx.clearRect(0, 0, size, size);
    const origin = project({ x: -this.layout.limit, z: this.layout.limit });
    ctx.drawImage(this.background, origin.x, origin.y, this.layout.limit * 2 * size / this.span, this.layout.limit * 2 * size / this.span);
    ctx.strokeStyle = this.colors.line; ctx.lineWidth = 1;
    const grid = 100 * size / this.span;
    for (let n = ((size / 2 - center.x * size / this.span) % grid + grid) % grid; n < size; n += grid) { ctx.beginPath(); ctx.moveTo(n, 0); ctx.lineTo(n, size); ctx.stroke(); }
    for (let n = ((size / 2 + center.z * size / this.span) % grid + grid) % grid; n < size; n += grid) { ctx.beginPath(); ctx.moveTo(0, n); ctx.lineTo(size, n); ctx.stroke(); }
    for (const jammer of this.layout.jammers ?? []) {
      const p = project(jammer); ctx.save(); ctx.strokeStyle = ctx.fillStyle = this.colors.amber;
      ctx.globalAlpha = .13; ctx.beginPath(); ctx.arc(p.x,p.y,JAMMER_EFFECT.outerRadius*size/this.span,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha = .6; ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x,p.y-7); ctx.lineTo(p.x-6,p.y+6); ctx.lineTo(p.x+6,p.y+6); ctx.closePath(); ctx.stroke();
      ctx.fillRect(p.x-1,p.y-10,2,4); ctx.restore();
    }
    if (state.tankJammer) {
      const p = project(state.tank); ctx.save(); ctx.strokeStyle = ctx.fillStyle = this.colors.amber;
      ctx.globalAlpha = .18; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(4, state.tankJammer * size / this.span), 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = .8; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.restore();
    }
    const dot = (point: MapPosition, color: string, radius = 5) => { const p = project(point); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fill(); };
    for (const contact of state.contacts) {
      if (contact.friend) dot(contact.position, this.colors.friend);
      else if (contact.visible) this.contacts.observe(contact.id, contact.position, time);
    }
    for (const contact of this.contacts.markers(time)) { ctx.globalAlpha = contact.alpha; dot(contact, this.colors.danger, 6); }
    ctx.globalAlpha = 1;
    if (state.waypoint) {
      const p = project(state.waypoint); p.x = Math.max(16, Math.min(size - 16, p.x)); p.y = Math.max(16, Math.min(size - 16, p.y));
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.PI / 4); ctx.strokeStyle = this.colors.amber; ctx.lineWidth = 2; ctx.strokeRect(-7, -7, 14, 14); ctx.restore();
    }
    const arrow = (pose: Pose, color: string) => {
      const p = project(pose); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(pose.yaw);
      ctx.fillStyle = color; ctx.strokeStyle = this.colors.panel; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(8, 9); ctx.lineTo(0, 5); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    };
    const view = project(center); ctx.save(); ctx.translate(view.x, view.y); ctx.rotate(state.drone?.yaw ?? state.lookYaw);
    ctx.strokeStyle = this.colors.fg; ctx.globalAlpha = .6; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-23, -58); ctx.lineTo(0, 0); ctx.lineTo(23, -58); ctx.stroke(); ctx.restore();
    arrow(state.tank, this.colors.fg); if (state.drone) arrow(state.drone, this.colors.friend);
    this.element.setAttribute('aria-label', t('minimap')); this.north.textContent = t('north');
    this.zoom.textContent = t('minimapZoom'); this.zoom.setAttribute('aria-label', t('minimapZoomLabel'));
    this.scale.style.width = `${100 / this.span * 100}%`; this.scale.textContent = t('minimapScale');
  }
  reset() { this.contacts.clear(); this.lastDraw = -Infinity; }
  dispose() {
    window.removeEventListener('keydown', this.key); this.zoom.removeEventListener('click', this.toggle);
    this.contacts.clear(); this.element.remove(); this.canvas.width = this.background.width = 0;
    document.body.classList.remove('has-minimap');
  }
}
