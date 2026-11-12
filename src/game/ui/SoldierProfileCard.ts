import { getLanguage, t } from '../i18n/index.ts';
import { SoldierProfileQueue } from '../infantry/SoldierProfileQueue.ts';
import type { SoldierProfile } from '../infantry/soldierProfiles.ts';
import './soldierProfileCard.css';

/** Event-driven memorial, separate from flight instrumentation and simulation. */
export class SoldierProfileCard {
  readonly root = document.createElement('section');
  readonly queue: SoldierProfileQueue;
  private readonly listeners = new AbortController();

  constructor() {
    this.root.className = 'soldier-profile';
    this.root.hidden = true;
    this.root.setAttribute('role', 'status');
    this.root.setAttribute('aria-live', 'polite');
    this.root.setAttribute('aria-atomic', 'true');
    document.getElementById('game-layer')!.append(this.root);
    this.queue = new SoldierProfileQueue(profile => this.show(profile));
    const signal = this.listeners.signal;
    this.root.addEventListener('click', event => {
      event.stopPropagation();
      this.queue.dismiss();
    }, { signal });
    // Pointer lock sends clicks to the canvas, even when a card is underneath.
    window.addEventListener('pointerdown', event => {
      if (!this.visible || !document.pointerLockElement || event.button !== 0) return;
      event.preventDefault(); event.stopImmediatePropagation();
      this.queue.dismiss();
    }, { capture: true, signal });
    window.addEventListener('keydown', event => {
      if (!this.visible || event.code !== 'Escape') return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (!event.repeat) this.queue.dismiss();
    }, { capture: true, signal });
  }

  private get visible() {
    return !this.root.hidden && (!document.body.classList.contains('game-shell') || document.body.classList.contains('shell-playing'));
  }

  private show(profile: SoldierProfile | undefined) {
    this.root.replaceChildren();
    this.root.hidden = !profile;
    if (!profile) return;
    const text = profile.text[getLanguage()];
    this.root.lang = getLanguage();
    const portrait = document.createElement('div');
    portrait.className = 'soldier-profile-portrait';
    portrait.setAttribute('aria-hidden', 'true');
    const initials = document.createElement('span');
    initials.textContent = profile.name.split(' ').map(part => part[0]).join('');
    const image = document.createElement('img');
    image.alt = ''; image.src = profile.portrait;
    image.addEventListener('error', () => image.remove(), { once: true });
    portrait.append(initials, image);
    const content = document.createElement('div');
    content.className = 'soldier-profile-content';
    const name = document.createElement('h2'); name.textContent = profile.name;
    const facts = document.createElement('p'); facts.className = 'soldier-profile-facts';
    facts.textContent = `${profile.age} ${t('soldierYears')} · ${text.hometown} · ${text.occupation}`;
    const family = document.createElement('p'); family.className = 'soldier-profile-family'; family.textContent = text.family;
    const story = document.createElement('p'); story.className = 'soldier-profile-story'; story.textContent = text.story;
    const detail = document.createElement('p'); detail.className = 'soldier-profile-detail'; detail.textContent = text.personalDetail;
    const footer = document.createElement('footer');
    const note = document.createElement('small'); note.textContent = t('soldierFictional');
    const dismiss = document.createElement('button'); dismiss.type = 'button'; dismiss.textContent = t('soldierDismiss');
    footer.append(note, dismiss);
    const biography = document.createElement('div'); biography.className = 'soldier-profile-biography';
    biography.append(family, story, detail);
    content.append(name, facts, biography, footer);
    this.root.append(portrait, content);
    // Replay the slow entrance for each queued biography, without a render loop.
    this.root.getAnimations().forEach(animation => { animation.cancel(); animation.play(); });
  }

  dispose() {
    this.listeners.abort();
    this.queue.dispose();
    this.root.remove();
  }
}
