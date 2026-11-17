import { t } from '../i18n/index.ts';
import { MODULES, type DamageState, type DamageModule } from '../combat/DamageModel.ts';
import './hudTokens.css';
import './tacticalHud.css';
import './damageHud.css';
import { acquireVehiclePanel } from './tacticalHudModel.ts';
import { icon, srText, type IconName } from './icons.ts';

const moduleName = (module: DamageModule) => t(module === 'engine' ? 'engineModule' : module === 'turret' ? 'turretModule' : module);

/** HUD only: receives authoritative damage, never infers it from an animation. */
export class DamageHud {
  readonly element: HTMLDivElement;
  private readonly health: HTMLProgressElement;
  private readonly readout: HTMLElement;
  private readonly notice: HTMLElement;
  private readonly moduleIndicators: NodeListOf<HTMLElement>;
  private readonly confirm: HTMLElement;
  private readonly directions: HTMLDivElement;
  private noticeLife = 0;
  private confirmLife = 0;
  private pulseLife = 0;
  private pulseSpan = 0.22;
  private pulsePeak = 0.32;
  private bearings: { angle: number; life: number; node: HTMLDivElement }[] = [];
  private parts: Record<DamageModule, Element>;
  private readonly vehicle;
  private criticalLife = 0;
  private lastHp = -1;
  private lastModules = '';
  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'damage-hud';
    this.element.innerHTML = `<div class="damage-pulse" aria-hidden="true"></div>
      <div class="damage-bearings" aria-hidden="true"></div>
      <div class="damage-confirm" role="status" aria-live="polite"><span class="damage-hitmark" aria-hidden="true">${icon('hit')}</span><span></span></div>
      `;
    this.vehicle = acquireVehiclePanel('damage', vehicleMarkup);
    this.vehicle.element.setAttribute('aria-label', t('vehicleDirection'));
    document.body.append(this.element);
    this.health = this.vehicle.element.querySelector('progress')!;
    this.readout = this.vehicle.element.querySelector('.condition-value')!;
    this.notice = this.vehicle.element.querySelector('.condition-notice')!;
    this.moduleIndicators = this.vehicle.element.querySelectorAll('[data-module-status]');
    this.confirm = this.element.querySelector('.damage-confirm')!;
    this.directions = this.element.querySelector('.damage-bearings')!;
    this.parts = Object.fromEntries(MODULES.map(module => [module, this.vehicle.element.querySelector(`[data-module="${module}"]`)!])) as Record<DamageModule, Element>;
  }
  setState(state: DamageState) {
    const key = t('vehicleCondition') + MODULES.map(module => `${state.modules[module]}:${Math.ceil(state.repair[module])}`).join('/') + (state.fire > 0 ? 'F' : '');
    if (state.hp === this.lastHp && key === this.lastModules) return;
    if (state.hp > 0 && state.hp <= 25 && state.hp < this.health.value) this.criticalLife = 3;
    if (state.hp === 0 || state.hp > 25) this.criticalLife = 0;
    this.lastHp = state.hp; this.lastModules = key;
    this.health.value = state.hp;
    this.readout.innerHTML = `${icon('hull', t('hullIntegrity'))}<span>${state.hp}</span>`;
    this.element.dataset.condition = state.hp === 0 ? 'destroyed' : state.hp <= 25 ? 'critical' : 'normal';
    this.vehicle.element.dataset.condition = this.element.dataset.condition;
    for (const node of this.moduleIndicators) {
      const module = node.dataset.moduleStatus as DamageModule;
      const hp = state.modules[module];
      node.dataset.state = hp === 0 ? 'disabled' : hp < 100 ? 'damaged' : 'ok';
      node.title = `${moduleName(module)}: ${hp === 0 ? t('disabled') : hp < 100 ? t('damaged') : t('intact')}`;
    }
    const issues: string[] = [];
    const chips: string[] = [];
    for (const module of MODULES) {
      const hp = state.modules[module];
      this.parts[module].setAttribute('class', hp === 0 ? 'module-disabled' : hp < 100 ? 'module-damaged' : 'module-ok');
      this.parts[module].setAttribute('aria-label', `${moduleName(module)}: ${hp === 0 ? t('disabled') : hp < 100 ? t('damaged') : t('intact')}`);
      const repair = Math.ceil(state.repair[module]);
      if (hp >= 100) continue;
      issues.push(`${moduleName(module)} ${hp === 0 ? `${t('disabled')} · ${t('repairing')} ${repair} ${t('seconds')}` : t('damaged')}`);
      chips.push(`<span class="hud-chip" data-state="${hp === 0 ? 'disabled' : 'damaged'}">${icon(module as IconName)}${hp === 0 ? `${icon('repair')}<span>${repair}${t('seconds')}</span>` : ''}</span>`);
    }
    if (state.fire > 0) { issues.unshift(t('engineFire')); chips.unshift(`<span class="hud-chip" data-state="fire">${icon('fire')}</span>`); }
    this.element.dataset.fire = String(state.fire > 0 && state.hp > 0);
    if (this.noticeLife <= 0 || state.hp === 0) this.setNotice(state.hp === 0 ? `<span class="hud-chip" data-state="disabled">${icon('destroyed')}</span>` : chips.join(''), state.hp === 0 ? t('vehicleDestroyed') : issues.join(' · ') || t('systemsOk'));
  }
  private setNotice(markup: string, text: string) {
    this.notice.innerHTML = markup + srText(text);
    this.notice.title = text;
  }
  outgoing(module: DamageModule | null, disabled: boolean, destroyed: boolean, penetrated = true) {
    this.confirm.dataset.kind = destroyed ? 'destroyed' : penetrated ? 'hit' : 'blocked';
    const text = destroyed ? t('targetDestroyed')
      : !penetrated ? t('notPenetrated') : module ? `${moduleName(module).toLocaleUpperCase()} ${disabled ? t('disabled').toLocaleUpperCase() : t('damaged').toLocaleUpperCase()}` : t('effectiveHit');
    const glyph = destroyed ? icon('destroyed') : !penetrated ? icon('blocked') : module ? `${icon(module as IconName)}${disabled ? icon('destroyed', undefined, 'hud-icon-small') : ''}` : '';
    this.confirm.querySelector('span:last-child')!.innerHTML = `<span class="hud-chip">${glyph}</span>${srText(text)}`;
    this.confirmLife = destroyed ? 3 : 1.5;
  }
  incoming(angle: number, module: DamageModule | null, disabled: boolean, severe: boolean) {
    if (this.bearings.length >= 4) this.bearings.shift()!.node.remove();
    const node = document.createElement('div'); node.className = 'damage-bearing';
    node.dataset.severe = String(severe);
    node.innerHTML = '<svg viewBox="0 0 240 240"><path d="M83 25 A102 102 0 0 1 157 25"/></svg>';
    this.directions.append(node);
    this.bearings.push({ angle, life: 1.4, node });
    // Severe hits flash longer and brighter than a glancing module hit.
    this.pulseSpan = severe ? 0.6 : 0.3; this.pulsePeak = severe ? 0.28 : 0.12;
    this.pulseLife = this.pulseSpan;
    this.noticeLife = this.lastHp === 0 ? 0 : 2.5;
    this.setNotice(`<span class="hud-chip" data-state="${this.lastHp === 0 || disabled ? 'disabled' : 'damaged'}">${this.lastHp === 0 ? icon('destroyed') : `${icon('hit')}${module ? icon(module as IconName) : icon('hull')}`}</span>`,
      this.lastHp === 0 ? t('vehicleDestroyed') : module ? `${moduleName(module)} ${disabled ? t('disabled') : t('damageTaken')}` : t('hullDamaged'));
  }
  update(dt: number, cameraYaw: number) {
    this.criticalLife = Math.max(0, this.criticalLife - dt);
    this.element.dataset.criticalPulse = String(this.criticalLife > 0);
    this.confirmLife = Math.max(0, this.confirmLife - dt);
    this.pulseLife = Math.max(0, this.pulseLife - dt);
    this.confirm.style.opacity = String(Math.min(1, this.confirmLife * 4));
    this.element.style.setProperty('--damage-pulse', String(this.pulseLife / this.pulseSpan * this.pulsePeak));
    for (const marker of this.bearings) {
      marker.life -= dt;
      marker.node.style.transform = `rotate(${marker.angle - cameraYaw}rad)`;
      marker.node.style.opacity = String(Math.min(1, Math.max(0, marker.life) * 2));
      if (marker.life <= 0) marker.node.remove();
    }
    this.bearings = this.bearings.filter(marker => marker.life > 0);
    if (this.noticeLife > 0) {
      this.noticeLife -= dt;
      if (this.noticeLife <= 0) { this.lastHp = -1; }
    }
  }
  reset() {
    this.bearings.forEach(marker => marker.node.remove()); this.bearings = [];
    this.confirmLife = this.noticeLife = this.pulseLife = this.criticalLife = 0; this.lastHp = -1;
    this.update(0, 0);
  }
  dispose() { this.vehicle.release(); this.element.remove(); }
}


/** Shared outline: damage owns module colours; TacticalHud owns rotations and speed. */
export function vehicleMarkup() {
  return `<svg viewBox="0 0 120 140" aria-label="${t('hullTurret')}" role="img">
    <path class="vehicle-guide" d="M60 0v9M60 131v9M0 70h9m102 0h9"/>
    <g class="hud-hull">
      <rect data-module="leftTrack" x="22" y="37" width="15" height="84" rx="2"/>
      <rect data-module="rightTrack" x="83" y="37" width="15" height="84" rx="2"/>
      <path d="M40 30h40l6 20v65l-9 10H43l-9-10V50Z"/>
      <path data-module="engine" d="M41 95h38v18H41Z"/>
      <g class="hud-turret"><path data-module="turret" d="m45 52 15-6 15 6 4 26-8 10H49L41 78Z"/><path d="M57 49V8h6v41"/><circle cx="60" cy="68" r="7"/></g>
    </g></svg>
    <div class="hud-speed"><output>0</output><span>${t('kmh')}</span><small class="hud-drive">${icon('neutral', t('hudNeutral'))}</small></div>
    <div class="condition-data"><strong class="condition-value">${icon('hull', t('hullIntegrity'))}<span>100</span></strong>
      <progress class="condition-health" max="100" value="100" aria-label="${t('hullIntegrity')}"></progress>
      <span class="condition-modules" aria-hidden="true">${MODULES.map(module => `<span data-module-status="${module}">${icon(module as IconName)}</span>`).join('')}</span>
      <span class="condition-notice" role="status" aria-live="polite">${srText(t('systemsOk'))}</span></div>`;
}
