import { t } from '../i18n/index.ts';
import { SMOKE, type SmokeModel } from '../items/SmokeModel.ts';
import './hudTokens.css';
import './smokeInventory.css';
import { icon, keyBadge, srText } from './icons.ts';

export class SmokeInventory {
  readonly element = document.createElement('section');
  private readonly use: HTMLButtonElement;
  private readonly pickup: HTMLButtonElement;
  private readonly count: HTMLElement;
  private readonly status: HTMLElement;
  private readonly feedback: HTMLElement;
  private readonly cooldown: HTMLProgressElement;
  private readonly listeners = new AbortController();

  constructor(fire: () => void, collect: () => void) {
    this.element.className = 'smoke-inventory';
    this.element.setAttribute('aria-label', t('smokeInventoryLabel'));
    this.element.innerHTML = `<button class="smoke-pickup" type="button" hidden aria-label="${t('smokePickup')}">${keyBadge('F')}${icon('smoke')}<span>+1</span></button>
      <button class="smoke-use" type="button" aria-label="${t('smokeUseLabel')}" title="${t('smokeDescription')}">
        ${keyBadge('G')}${icon('smoke', t('smokeIconLabel'))}<span class="smoke-count">${SMOKE.initialCharges} / ${SMOKE.capacity}</span>
        <progress max="${SMOKE.cooldown}" value="0" aria-label="${t('smokeCooldownLabel')}"></progress>
      </button><output class="smoke-wait" aria-hidden="true"></output><output class="smoke-feedback" role="status" aria-live="polite" hidden></output>`;
    this.use = this.element.querySelector('.smoke-use')!;
    this.pickup = this.element.querySelector('.smoke-pickup')!;
    this.count = this.element.querySelector('.smoke-count')!;
    this.status = this.element.querySelector('.smoke-wait')!;
    this.cooldown = this.element.querySelector('progress')!;
    this.feedback = this.element.querySelector('.smoke-feedback')!;
    this.use.addEventListener('click', fire, { signal: this.listeners.signal });
    this.pickup.addEventListener('click', collect, { signal: this.listeners.signal });
    document.body.append(this.element);
  }

  update(model: SmokeModel, near: boolean, alive: boolean) {
    this.count.textContent = `${model.count} / ${SMOKE.capacity}`;
    this.cooldown.value = model.cooldown;
    this.element.setAttribute('aria-label', t('smokeInventoryLabel'));
    this.use.title = t('smokeDescription');
    this.cooldown.setAttribute('aria-label', t('smokeCooldownLabel'));
    this.use.setAttribute('aria-label', t('smokeChargeLabel').replace('{count}', String(model.count)).replace('{capacity}', String(SMOKE.capacity)) + (model.cooldown > 0 ? ` · ${t('smokeCooldownSeconds').replace('{seconds}', String(Math.ceil(model.cooldown)))}` : ''));
    this.cooldown.setAttribute('aria-valuetext', t('smokeCooldownSeconds').replace('{seconds}', String(Math.ceil(model.cooldown))));
    this.feedback.hidden = model.feedbackTime <= 0 || !alive;
    const feedbackText = model.feedback ? t(model.feedback.key).replace('{seconds}', String(model.feedback.seconds ?? '')) : '';
    if (this.feedback.dataset.text !== feedbackText) {
      this.feedback.dataset.text = feedbackText;
      const key = model.feedback?.key;
      const visual = key === 'smokeCollected' ? `${icon('smoke')}<span>+1</span>` : key === 'smokeEmpty' ? `${icon('smoke')}<span>0</span>${keyBadge('F')}`
        : key === 'smokePreparing' ? `${icon('clock')}<span>${model.feedback?.seconds ?? ''} s</span>` : key === 'smokeDeployed' ? icon('smoke') : '';
      this.feedback.innerHTML = visual ? `<span class="hud-chip">${visual}</span>${srText(feedbackText)}` : feedbackText;
    }
    this.element.dataset.notice = String(model.feedbackTime > 0);
    this.use.disabled = !alive || model.count === 0 || model.cooldown > 1e-6;
    const label = alive && model.cooldown > 1e-6 ? `${Math.ceil(model.cooldown)} s` : '';
    if (this.status.textContent !== label) this.status.textContent = label;
    this.pickup.hidden = !near || !alive;
    this.pickup.disabled = model.count >= SMOKE.capacity;
    this.pickup.setAttribute('aria-label', model.count >= SMOKE.capacity ? t('smokeFull') : t('smokePickup'));
    this.pickup.querySelector('span')!.textContent = model.count >= SMOKE.capacity ? `${SMOKE.capacity}/${SMOKE.capacity}` : '+1';
    this.element.dataset.empty = String(model.count === 0);
  }

  dispose() { this.listeners.abort(); this.element.remove(); }
}
