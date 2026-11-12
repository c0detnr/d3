import { t } from '../i18n/index.ts';
import { rangeVisible, type RangeSample, type SightMode } from '../aim/gunnerSightModel.ts';
import './gunnerSight.css';

export interface GunnerSightState {
  active: boolean;
  enabled: boolean;
  mode: SightMode;
  fov: number;
  magnification: number;
  azimuth: string;
  reloadRemaining: number;
  blocked: boolean;
  sample?: RangeSample;
  now: number;
}

/** An optical overlay only; the existing projected bore ring stays independent. */
export class GunnerSight {
  private readonly root = document.createElement('section');
  private readonly normalRange = document.createElement('output');
  private readonly mode: HTMLElement;
  private readonly zoom: HTMLElement;
  private readonly ammo: HTMLElement;
  private readonly range: HTMLElement;
  private readonly azimuth: HTMLElement;
  private readonly status: HTMLElement;
  private readonly help: HTMLElement;
  private readonly scale: SVGElement;
  private lastFov = -1;
  constructor() {
    this.root.className = 'gunner-sight'; this.root.hidden = true;
    this.root.innerHTML = `<div class="gunner-sight__frame">
      <div class="gunner-sight__block gunner-sight__optics"><span data-mode></span><strong data-zoom></strong></div>
      <div class="gunner-sight__block gunner-sight__ammo"><span data-ammo></span><span data-azimuth></span></div>
      <svg class="gunner-sight__reticle" viewBox="-500 -500 1000 1000" aria-hidden="true">
        <path d="M-34 0H-7 M7 0H34 M0-34V-7 M0 7V34"/><g data-scale></g>
      </svg>
      <div class="gunner-sight__block gunner-sight__solution"><strong data-range></strong><span data-status></span></div>
      <div class="gunner-sight__block gunner-sight__help" data-help></div>
    </div>`;
    this.mode = this.root.querySelector('[data-mode]')!;
    this.zoom = this.root.querySelector('[data-zoom]')!;
    this.ammo = this.root.querySelector('[data-ammo]')!;
    this.range = this.root.querySelector('[data-range]')!;
    this.azimuth = this.root.querySelector('[data-azimuth]')!;
    this.status = this.root.querySelector('[data-status]')!;
    this.help = this.root.querySelector('[data-help]')!;
    this.scale = this.root.querySelector('[data-scale]')!;
    this.normalRange.className = 'gunner-range'; this.normalRange.hidden = true;
    document.body.append(this.root, this.normalRange);
  }
  update(state: GunnerSightState) {
    const { active, enabled, sample, now } = state;
    this.root.hidden = !active;
    document.body.classList.toggle('gunner-sight-active', active);
    const visible = rangeVisible(sample, now);
    const range = `${t('sightRange')} ${visible && sample?.meters !== null ? sample!.meters : '---'}${visible && sample?.meters !== null ? ` ${t('sightMeters')}` : ''}`;
    this.normalRange.hidden = !enabled || active || !visible;
    this.normalRange.textContent = range;
    if (!active) return;
    this.root.setAttribute('aria-label', t('sightLabel'));
    this.mode.textContent = t(state.mode === 'DAY' ? 'sightDay' : state.mode === 'WHT' ? 'sightWhiteHot' : 'sightBlackHot');
    this.zoom.textContent = `${state.magnification.toFixed(1)}×`;
    this.ammo.textContent = `${t('sightAmmo')} ${state.reloadRemaining > 0 ? `${t('sightLoading')} ${state.reloadRemaining.toFixed(1)} ${t('sightSeconds')}` : t('sightReady')}`;
    this.ammo.classList.toggle('is-loading', state.reloadRemaining > 0);
    this.range.textContent = range;
    this.azimuth.textContent = `${t('sightAzimuth')} ${state.azimuth}`;
    this.status.textContent = t(state.blocked ? 'sightObstructed' : 'sightManual');
    this.status.classList.toggle('is-obstructed', state.blocked);
    this.help.textContent = t('sightControls');
    if (Math.abs(state.fov - this.lastFov) > 0.0001) {
      this.lastFov = state.fov;
      let lines = '';
      for (let mil = 10; mil <= 50; mil += 10) {
        const offset = Math.tan(mil / 1000) / (2 * Math.tan(state.fov / 2)) * 1000;
        const length = mil % 20 === 0 ? 5 : 3;
        for (const sign of [-1, 1]) {
          const p = offset * sign;
          lines += `<path d="M${p} ${-length}v${length * 2} M${-length} ${p}h${length * 2}"/>`;
        }
      }
      this.scale.innerHTML = lines;
    }
  }
  dispose() { this.root.remove(); this.normalRange.remove(); document.body.classList.remove('gunner-sight-active'); }
}
