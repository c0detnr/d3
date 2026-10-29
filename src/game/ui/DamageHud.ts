import { MODULES, MODULE_LABELS, type DamageState, type DamageModule } from '../combat/DamageModel.ts';
import './damageHud.css';

/** HUD only: receives authoritative damage, never infers it from an animation. */
export class DamageHud {
  readonly element: HTMLDivElement;
  private readonly health: HTMLProgressElement;
  private readonly readout: HTMLElement;
  private readonly notice: HTMLElement;
  private readonly confirm: HTMLElement;
  private readonly directions: HTMLDivElement;
  private noticeLife = 0;
  private confirmLife = 0;
  private pulseLife = 0;
  private pulseSpan = 0.22;
  private pulsePeak = 0.32;
  private bearings: { angle: number; life: number; node: HTMLDivElement }[] = [];
  private parts: Record<DamageModule, Element>;
  private lastHp = -1;
  private lastModules = '';
  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'damage-hud';
    this.element.innerHTML = `<div class="damage-pulse" aria-hidden="true"></div>
      <div class="damage-bearings" aria-hidden="true"></div>
      <div class="damage-confirm" role="status" aria-live="polite"><span class="damage-hitmark" aria-hidden="true">╳</span><span></span></div>
      <section class="vehicle-condition" aria-label="Araç hasar durumu">
        <svg class="condition-diagram" viewBox="0 0 100 132" role="img" aria-label="Üstten araç görünümü; namlu yukarı bakar">
          <path class="diagram-guide" d="M50 2v8M8 66H2m90 0h6M50 124v6"/>
          <rect data-module="leftTrack" x="13" y="33" width="14" height="83" rx="3"/>
          <rect data-module="rightTrack" x="73" y="33" width="14" height="83" rx="3"/>
          <path class="condition-hull" d="M32 26h36l7 23v59l-9 12H34l-9-12V49Z"/>
          <path data-module="engine" d="M33 92h34v18l-4 4H37l-4-4Z"/>
          <path data-module="turret" d="M40 43h20l9 12-4 28H35l-4-28Z"/>
          <path class="diagram-barrel" d="M47 47V9h6v38"/>
          <path class="diagram-detail" d="M38 98h24m-24 6h24M17 40v69m66-69v69"/>
        </svg>
        <div class="condition-data"><span class="condition-caption">ARAÇ DURUMU</span>
          <strong class="condition-value">100 <small>/ 100</small></strong>
          <progress class="condition-health" max="100" value="100" aria-label="Gövde bütünlüğü"></progress>
          <span class="condition-notice" role="status" aria-live="polite">Sistemler çalışıyor</span>
        </div>
      </section>`;
    document.body.append(this.element);
    this.health = this.element.querySelector('progress')!;
    this.readout = this.element.querySelector('.condition-value')!;
    this.notice = this.element.querySelector('.condition-notice')!;
    this.confirm = this.element.querySelector('.damage-confirm')!;
    this.directions = this.element.querySelector('.damage-bearings')!;
    this.parts = Object.fromEntries(MODULES.map(module => [module, this.element.querySelector(`[data-module="${module}"]`)!])) as Record<DamageModule, Element>;
  }
  setState(state: DamageState) {
    const key = MODULES.map(module => state.modules[module]).join('/');
    if (state.hp === this.lastHp && key === this.lastModules) return;
    this.lastHp = state.hp; this.lastModules = key;
    this.health.value = state.hp;
    this.readout.innerHTML = `${state.hp} <small>/ 100</small>`;
    this.element.dataset.condition = state.hp === 0 ? 'destroyed' : state.hp <= 25 ? 'critical' : 'normal';
    const issues: string[] = [];
    for (const module of MODULES) {
      const hp = state.modules[module];
      this.parts[module].setAttribute('class', hp === 0 ? 'module-disabled' : hp < 100 ? 'module-damaged' : 'module-ok');
      this.parts[module].setAttribute('aria-label', `${MODULE_LABELS[module]}: ${hp === 0 ? 'devre dışı' : hp < 100 ? 'hasarlı' : 'sağlam'}`);
      if (hp < 100) issues.push(`${MODULE_LABELS[module]} ${hp === 0 ? 'devre dışı' : 'hasarlı'}`);
    }
    if (this.noticeLife <= 0 || state.hp === 0) this.notice.textContent = state.hp === 0 ? 'ARAÇ İMHA EDİLDİ' : issues.join(' · ') || 'Sistemler çalışıyor';
  }
  outgoing(module: DamageModule | null, disabled: boolean, destroyed: boolean, penetrated = true) {
    this.confirm.dataset.kind = destroyed ? 'destroyed' : penetrated ? 'hit' : 'blocked';
    this.confirm.querySelector('span:last-child')!.textContent = destroyed ? 'HEDEF İMHA EDİLDİ'
      : !penetrated ? 'ZIRH DELİNMEDİ' : module ? `${MODULE_LABELS[module].toLocaleUpperCase('tr')} ${disabled ? 'DEVRE DIŞI' : 'HASARLI'}` : 'ETKİLİ İSABET';
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
    this.pulseSpan = severe ? 0.7 : 0.35; this.pulsePeak = severe ? 0.75 : 0.45;
    this.pulseLife = this.pulseSpan;
    this.noticeLife = this.lastHp === 0 ? 0 : 2.5;
    this.notice.textContent = this.lastHp === 0 ? 'ARAÇ İMHA EDİLDİ' : module ? `${MODULE_LABELS[module]} ${disabled ? 'devre dışı' : 'hasar aldı'}` : 'Gövde hasar aldı';
  }
  update(dt: number, cameraYaw: number) {
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
    this.confirmLife = this.noticeLife = this.pulseLife = 0; this.lastHp = -1;
    this.update(0, 0);
  }
  dispose() { this.element.remove(); }
}
