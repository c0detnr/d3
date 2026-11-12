import { t } from '../i18n/index.ts';
import { acquireVehiclePanel, headingDegrees, headingLabel, speedLabel } from './tacticalHudModel.ts';
import './hudTokens.css';
import './tacticalHud.css';
import { vehicleMarkup } from './DamageHud.ts';

export interface TacticalHudState {
  cameraYaw: number;
  hullYaw: number;
  turretYaw: number;
  speed: number;
  reloadRemaining: number;
  reloadFraction: number;
  machineGun: boolean;
  range?: number;
  blocked?: boolean;
}

/** Presentation only. Receives scene telemetry without owning physics or weapon state. */
export class TacticalHud {
  readonly element = document.createElement('div');
  private readonly ribbon: HTMLElement;
  private readonly heading: HTMLElement;
  private readonly speed: HTMLElement;
  private readonly drive: HTMLElement;
  private readonly hull: SVGGElement;
  private readonly turret: SVGGElement;
  private readonly vehicle;
  private readonly compassHull: HTMLElement;
  private readonly compassTurret: HTMLElement;
  private readonly weaponState: HTMLElement;
  private readonly range: HTMLElement;
  private readonly bars: NodeListOf<HTMLProgressElement>;
  private readonly weapons: NodeListOf<HTMLButtonElement>;
  private readonly listeners = new AbortController();

  constructor(hasMachineGun: boolean, selectWeapon?: (machineGun: boolean) => void) {
    this.element.className = 'tactical-hud';
    const ticks = Array.from({ length: 49 }, (_, i) => {
      const angle = i * 15 - 180;
      const normalized = (angle + 360) % 360;
      const label = normalized % 90 === 0 ? [t('north'), t('east'), t('south'), t('west')][normalized / 90] : String(normalized).padStart(3, '0');
      return `<span style="left:${i * 45}px" class="${normalized % 90 === 0 ? 'cardinal' : ''}">${label}</span>`;
    }).join('');
    this.element.innerHTML = `<span class="hud-brand">${t('title')}</span>
      <section class="hud-compass" aria-label="${t('cameraDirection')}">
        <div class="compass-window" aria-hidden="true"><div class="compass-ribbon">${ticks}</div></div>
        <span class="compass-vehicle compass-hull"></span><span class="compass-vehicle compass-turret"></span>
        <span class="compass-pin" aria-hidden="true">▾</span><output class="compass-heading">000</output>
      </section>
      <section class="hud-center" aria-label="${t('aimReload')}">
        <output class="hud-range" aria-label="${t('boreRange')}"></output>
      </section>
      <section class="hud-weapons" aria-label="${t('weaponSelect')}">
        <button type="button" data-weapon="cannon" aria-pressed="true"><span>${t('cannon120')}</span><kbd>1</kbd></button>
        <svg class="hud-shell" viewBox="0 0 220 24" aria-hidden="true"><path d="M3 7h125l42-3 28 3 18 5-18 5-28 3-42-3H3Z M12 7v10m116-10v10m42-13v16"/></svg>
        <progress max="1" value="1" aria-label="${t('mainReload')}"></progress>
        <span class="hud-weapon-state">${t('ready')}</span>
        ${hasMachineGun ? `<button type="button" data-weapon="mg" aria-pressed="false"><span>${t('hudMG')}</span><span class="hud-mg-line" aria-hidden="true">┄┄━╤━━</span><kbd>2</kbd></button>` : ''}
      </section>`;
    const get = <T extends Element = HTMLElement>(selector: string) => this.element.querySelector<T>(selector)!;
    this.ribbon = get('.compass-ribbon'); this.heading = get('.compass-heading');
    this.vehicle = acquireVehiclePanel('telemetry', vehicleMarkup);
    this.vehicle.element.setAttribute('aria-label', t('vehicleDirection'));
    this.speed = this.vehicle.element.querySelector('.hud-speed output')!; this.drive = this.vehicle.element.querySelector('.hud-drive')!;
    this.hull = this.vehicle.element.querySelector('.hud-hull')!; this.turret = this.vehicle.element.querySelector('.hud-turret')!;
    this.compassHull = get('.compass-hull'); this.compassTurret = get('.compass-turret');
    this.weaponState = get('.hud-weapon-state'); this.range = get('.hud-range');
    this.bars = this.element.querySelectorAll('progress');
    this.weapons = this.element.querySelectorAll('button');
    this.weapons.forEach(button => {
      button.disabled = !selectWeapon;
      button.addEventListener('click', () => selectWeapon?.(button.dataset.weapon === 'mg'), { signal: this.listeners.signal });
    });
    document.body.append(this.element);
    document.body.classList.add('has-tactical-hud');
  }

  update(state: TacticalHudState) {
    this.ribbon.style.transform = `translateX(-${(headingDegrees(state.cameraYaw) + 180) * 3}px)`;
    this.heading.textContent = headingLabel(state.cameraYaw);
    this.speed.textContent = speedLabel(state.speed);
    this.drive.textContent = Math.abs(state.speed) < 0.15 ? t('hudNeutral') : state.speed < 0 ? t('hudReverse') : t('hudForward');
    this.hull.setAttribute('transform', `rotate(${(state.hullYaw - state.cameraYaw) * 180 / Math.PI} 60 70)`);
    this.turret.setAttribute('transform', `rotate(${state.turretYaw * 180 / Math.PI} 60 70)`);
    const ready = state.machineGun || state.reloadRemaining <= 0;
    const text = ready ? t('hudReady') : `${t('hudLoading')} ${state.reloadRemaining.toFixed(1)} ${t('hudSeconds')}`;
    const bore = document.querySelector<HTMLElement>('#aim-bore, .reticle');
    if (bore) {
      bore.style.setProperty('--hud-reload', String(state.machineGun ? 1 : Math.max(0, Math.min(1, state.reloadFraction))));
      bore.dataset.ready = ready ? t('hudReady') : '';
    }
    for (const [node, yaw, label] of [[this.compassHull, state.hullYaw, t('hudHull')], [this.compassTurret, state.hullYaw + state.turretYaw, t('hudTurret')]] as const) {
      const delta = ((headingDegrees(yaw) - headingDegrees(state.cameraYaw) + 540) % 360) - 180;
      node.style.left = `calc(50% + ${delta * 3}px)`;
      node.textContent = label;
      node.hidden = Math.abs(delta * 3) > this.compassHull.parentElement!.clientWidth / 2 - 18;
    }
    this.weaponState.textContent = state.machineGun ? `${t('hudMG')} · ${t('hudReady')}` : `${t('hudAmmo')} · ${text}`;
    this.element.dataset.reloading = String(!ready);
    this.element.dataset.blocked = String(!!state.blocked);
    this.element.dataset.weapon = state.machineGun ? 'mg' : 'cannon';
    this.bars[0].value = state.reloadFraction;
    this.range.textContent = state.range === undefined ? '' : `${state.blocked ? `${t('nearObstacle')} · ` : ''}${Math.round(state.range)} ${t('hudMetres')}`;
    this.weapons.forEach(button => button.setAttribute('aria-pressed', String((button.dataset.weapon === 'mg') === state.machineGun)));
  }

  dispose() {
    this.listeners.abort(); this.vehicle.release(); this.element.remove(); document.body.classList.remove('has-tactical-hud');
    const bore = document.querySelector<HTMLElement>('#aim-bore, .reticle');
    if (bore) { bore.style.removeProperty('--hud-reload'); delete bore.dataset.ready; }
  }
}
