import icon from '../../../assets/items/smoke_supply_01/inventory.svg?url';
import { SMOKE, type SmokeModel } from '../items/SmokeModel.ts';
import './smokeInventory.css';

export class SmokeInventory {
  readonly element = document.createElement('section');
  private readonly use: HTMLButtonElement;
  private readonly pickup: HTMLButtonElement;
  private readonly count: HTMLElement;
  private readonly status: HTMLElement;
  private readonly cooldown: HTMLProgressElement;
  private readonly listeners = new AbortController();

  constructor(fire: () => void, collect: () => void) {
    this.element.className = 'smoke-inventory';
    this.element.setAttribute('aria-label', 'Sis mühimmatı envanteri');
    this.element.innerHTML = `<button class="smoke-pickup" type="button" hidden><kbd>F</kbd><span>Sis mühimmatı · +1 kullanım</span></button>
      <button class="smoke-use" type="button" aria-label="Sis mühimmatı kullan" title="Sis mühimmatı — Geçici görüş perdesi oluşturur. Mermileri durdurmaz.">
        <kbd>G</kbd><img src="${icon}" alt="İki sis mühimmatı tüpü"/><span class="smoke-count">0 / 3</span>
        <progress max="20" value="0" aria-label="Sis kullanımına kalan süre"></progress>
      </button><div class="smoke-caption"><span>SİS MÜHİMMATI</span><output aria-live="polite">İKMAL GEREKLİ</output></div>`;
    this.use = this.element.querySelector('.smoke-use')!;
    this.pickup = this.element.querySelector('.smoke-pickup')!;
    this.count = this.element.querySelector('.smoke-count')!;
    this.status = this.element.querySelector('output')!;
    this.cooldown = this.element.querySelector('progress')!;
    this.use.addEventListener('click', fire, { signal: this.listeners.signal });
    this.pickup.addEventListener('click', collect, { signal: this.listeners.signal });
    document.body.append(this.element);
  }

  update(model: SmokeModel, near: boolean, alive: boolean) {
    this.count.textContent = `${model.count} / ${SMOKE.capacity}`;
    this.cooldown.value = model.cooldown;
    this.use.disabled = !alive || model.count === 0 || model.cooldown > 1e-6;
    const label = !alive ? 'ARAÇ İMHA EDİLDİ' : model.cooldown > 1e-6 ? `${Math.ceil(model.cooldown)} s · BEKLE` : model.count ? 'G · SİS PERDESİ' : 'İKMAL GEREKLİ';
    if (this.status.textContent !== label) this.status.textContent = label;
    this.pickup.hidden = !near || !alive;
    this.pickup.disabled = model.count >= SMOKE.capacity;
    this.pickup.querySelector('span')!.textContent = model.count >= SMOKE.capacity ? 'Sis mühimmatı · envanter dolu' : 'Sis mühimmatı · +1 kullanım';
    this.element.dataset.empty = String(model.count === 0);
  }

  dispose() { this.listeners.abort(); this.element.remove(); }
}
