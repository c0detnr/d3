import { t } from '../i18n/index.ts';
import { headingDegrees, headingLabel, speedLabel } from './tacticalHudModel.ts';
import './tacticalHud.css';

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
  private readonly reloadText: HTMLElement;
  private readonly reloadTime: HTMLElement;
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
        <span class="compass-pin" aria-hidden="true">▾</span><output class="compass-heading">000</output>
      </section>
      <section class="hud-center" aria-label="${t('aimReload')}">
        <div class="hud-reload"><div><span class="hud-reload-text">${t('ready')}</span><span class="hud-reload-time"></span></div>
          <progress max="1" value="1" aria-label="${t('cannonReload')}"></progress></div>
        <output class="hud-range" aria-label="${t('boreRange')}"></output>
      </section>
      <section class="hud-vehicle" aria-label="${t('vehicleDirection')}">
        <svg viewBox="0 0 120 140" aria-label="${t('hullTurret')}" role="img">
          <path class="vehicle-guide" d="M60 0v9M60 131v9M0 70h9m102 0h9"/>
          <g class="hud-hull"><rect x="22" y="37" width="15" height="84" rx="2"/><rect x="83" y="37" width="15" height="84" rx="2"/>
            <path d="M40 30h40l6 20v65l-9 10H43l-9-10V50Z M39 94h42m-42 8h42m-42 8h42M27 43v71m66-71v71"/>
            <g class="hud-turret"><path d="m45 52 15-6 15 6 4 26-8 10H49L41 78Z"/><path d="M57 49V8h6v41"/><circle cx="60" cy="68" r="7"/></g>
          </g>
        </svg>
        <div class="hud-speed"><output>0</output><span>${t('kmh')}</span><small class="hud-drive">${t('stopped')}</small></div>
      </section>
      <section class="hud-weapons" aria-label="${t('weaponSelect')}">
        <button type="button" data-weapon="cannon" aria-pressed="true"><span>${t('cannon120')}</span><kbd>1</kbd></button>
        <svg class="hud-shell" viewBox="0 0 220 24" aria-hidden="true"><path d="M3 7h125l42-3 28 3 18 5-18 5-28 3-42-3H3Z M12 7v10m116-10v10m42-13v16"/></svg>
        <progress max="1" value="1" aria-label="${t('mainReload')}"></progress>
        <span class="hud-weapon-state">${t('ready')}</span>
        ${hasMachineGun ? '<button type="button" data-weapon="mg" aria-pressed="false"><span>MG 02</span><span class="hud-mg-line" aria-hidden="true">┄┄━╤━━</span><kbd>2</kbd></button>' : ''}
      </section>`;
    const get = <T extends Element = HTMLElement>(selector: string) => this.element.querySelector<T>(selector)!;
    this.ribbon = get('.compass-ribbon'); this.heading = get('.compass-heading');
    this.speed = get('.hud-speed output'); this.drive = get('.hud-drive');
    this.hull = get<SVGGElement>('.hud-hull'); this.turret = get<SVGGElement>('.hud-turret');
    this.reloadText = get('.hud-reload-text'); this.reloadTime = get('.hud-reload-time');
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
    this.drive.textContent = Math.abs(state.speed) < 0.15 ? t('stopped') : state.speed < 0 ? t('reverse') : t('forward');
    this.hull.setAttribute('transform', `rotate(${(state.hullYaw - state.cameraYaw) * 180 / Math.PI} 60 70)`);
    this.turret.setAttribute('transform', `rotate(${state.turretYaw * 180 / Math.PI} 60 70)`);
    const ready = state.machineGun || state.reloadRemaining <= 0;
    const text = ready ? t('ready') : t('reloading');
    this.reloadText.textContent = text;
    this.reloadTime.textContent = ready ? '' : `${state.reloadRemaining.toFixed(1)} s`;
    this.weaponState.textContent = state.machineGun ? `${t('machineGun')} · ${t('ready')}` : `${t('cannon')} · ${text}`;
    this.element.dataset.reloading = String(!ready);
    this.element.dataset.blocked = String(!!state.blocked);
    this.element.dataset.weapon = state.machineGun ? 'mg' : 'cannon';
    this.bars[0].value = state.machineGun ? 1 : state.reloadFraction;
    this.bars[1].value = state.reloadFraction;
    this.range.textContent = state.range === undefined ? '' : `${state.blocked ? `${t('nearObstacle')} · ` : ''}${Math.round(state.range)} m`;
    this.weapons.forEach(button => button.setAttribute('aria-pressed', String((button.dataset.weapon === 'mg') === state.machineGun)));
  }

  dispose() {
    this.listeners.abort(); this.element.remove(); document.body.classList.remove('has-tactical-hud');
  }
}
