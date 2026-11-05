import { tr } from './tr.ts';
import { en } from './en.ts';
import { t, type TranslationKey } from './index.ts';
/** Refresh static HUD labels too when language changes while the simulation is paused. */
export function translateGameDom() {
  const translations = new Map<string, TranslationKey>();
  for (const key of Object.keys(tr) as TranslationKey[]) { translations.set(tr[key], key); translations.set(en[key], key); }
  for (const element of document.querySelectorAll<HTMLElement>('[data-i18n]')) element.textContent = t(element.dataset.i18n as TranslationKey);
  const nodes = document.querySelectorAll('#game-layer, .tactical-hud, .damage-hud, .team-duel-hud, .game-pointer-prompt');
  for (const root of nodes) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.textContent?.trim() ?? '';
      const key = translations.get(text);
      if (key) node.textContent = node.textContent!.replace(text, t(key));
    }
    for (const element of [root, ...root.querySelectorAll('[aria-label]')]) {
      const key = translations.get(element.getAttribute('aria-label') ?? '');
      if (key) element.setAttribute('aria-label', t(key));
    }
  }
}
