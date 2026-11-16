import { t } from '../i18n/index.ts';
import { Matrix, Vector3 } from '@babylonjs/core';
import type { TeamDuel } from '../combat/TeamDuel.ts';
import './hudTokens.css';
import './teamDuelHud.css';
import { icon, keyBadge, srText } from './icons.ts';

export class TeamDuelHud {
  readonly element = document.createElement('section');
  private readonly score = document.createElement('strong');
  private readonly message = document.createElement('span');
  private readonly timer = document.createElement('span');
  private readonly feed = document.createElement('ol');
  private readonly retry = document.createElement('button');
  private readonly markers: HTMLDivElement[] = [];
  constructor(private readonly duel: TeamDuel, reset: () => void) {
    this.element.className = 'team-duel-hud'; this.element.setAttribute('aria-label', t(duel.rules ? 'teamClash' : 'duelTitle'));
    this.score.innerHTML = `<span data-side="friend"></span><i aria-hidden="true">—</i><span data-side="enemy"></span>`;
    this.message.setAttribute('role', 'status'); this.message.setAttribute('aria-live', 'polite');
    this.retry.innerHTML = `${icon('respawn')}${keyBadge('R')}`; this.retry.setAttribute('aria-label', t('duelRetry')); this.retry.title = t('duelRetry'); this.retry.onclick = reset;
    this.timer.className = 'team-duel-clock'; this.feed.className = 'team-duel-feed';
    this.element.append(this.score, this.timer, this.message, this.retry); this.element.append(this.feed); document.body.append(this.element);
    for (const bot of duel.bots) {
      const marker = document.createElement('div'); marker.className = 'team-duel-marker';
      marker.dataset.side = bot.member.team === duel.player.team ? 'friend' : 'enemy';
      marker.setAttribute('aria-hidden', 'true'); document.body.append(marker); this.markers.push(marker);
    }
  }
  update() {
    const duel = this.duel, own = duel.alive(duel.player.team), enemy = duel.alive(duel.player.team === 'A' ? 'B' : 'A');
    const rules = duel.rules;
    const friendScore = rules ? String(rules.score[duel.player.team]) : `${own}/${duel.layout.teamSize}`;
    const enemyScore = rules ? String(rules.score[duel.player.team === 'A' ? 'B' : 'A']) : `${enemy}/${duel.layout.teamSize}`;
    this.setHtml(this.score.querySelector('[data-side="friend"]')!, `${icon('friend', t('friend'))}<b>${friendScore}</b>`);
    this.setHtml(this.score.querySelector('[data-side="enemy"]')!, `<b>${enemyScore}</b>${icon('enemy', t('enemy'))}`);
    const clock = rules ? `${Math.floor(Math.ceil(rules.remaining) / 60)}:${String(Math.ceil(rules.remaining) % 60).padStart(2, '0')}` : '';
    this.setHtml(this.timer, clock ? `${icon('clock')}<span>${clock}</span>${srText(t('teamGoal'))}` : '');
    this.timer.title = rules ? t('teamGoal') : '';
    const player = rules?.members[0];
    const text = duel.result === 'draw' ? t('draw') : duel.finished
      ? duel.result === duel.player.team ? t('victory').toLocaleUpperCase() : t('defeat').toLocaleUpperCase()
      : duel.player.damage.hp === 0 ? player ? `${icon('respawn', t('teamRespawn'))}<span>${Math.ceil(player.respawn)} s</span>` : `${icon('destroyed', t('teamContinues'))}`
        : player && player.protection > 0 ? `${icon('shield', t('teamProtection'))}<span>${Math.ceil(player.protection)} s</span>` : '';
    this.setHtml(this.message, text);
    this.message.hidden = !text;
    this.retry.hidden = !duel.finished || !!rules;
    const entries = duel.feed.filter(entry => rules && rules.elapsed - entry.time < 8);
    const feedText = entries.map(entry => `${entry.killer}>${entry.victim}`).join('|');
    if (this.feed.dataset.entries !== feedText) {
      this.feed.dataset.entries = feedText;
      this.feed.replaceChildren(...entries.map(entry => {
        const row = document.createElement('li'); row.append(entry.killer); row.insertAdjacentHTML('beforeend', icon('kill', '→')); row.append(entry.victim);
        row.dataset.side = entry.team === duel.player.team ? 'friend' : 'enemy'; return row;
      }));
    }
    const camera = duel.scene.activeCamera;
    if (!camera) return;
    const viewport = camera.viewport.toGlobal(innerWidth, innerHeight);
    const direction = camera.getForwardRay().direction;
    duel.bots.forEach((bot, i) => {
      const marker = this.markers[i], member = bot.member;
      const position = member.vehicle.node.position.add(new Vector3(0, 4, 0));
      marker.hidden = member.damage.hp === 0 || Vector3.Dot(position.subtract(camera.globalPosition), direction) <= 0
        || (member.team !== duel.player.team && !duel.canSee(duel.player, member));
      if (marker.hidden) return;
      const screen = Vector3.Project(position, Matrix.Identity(), duel.scene.getTransformMatrix(), viewport);
      marker.hidden = screen.z < 0 || screen.z > 1 || screen.x < 0 || screen.x > innerWidth || screen.y < 0 || screen.y > innerHeight;
      marker.style.left = `${screen.x}px`; marker.style.top = `${screen.y}px`;
      const friend = member.team === duel.player.team, key = `${friend}:${member.damage.hp}`;
      if (marker.dataset.key !== key) {
        marker.dataset.key = key;
        marker.innerHTML = `${icon(friend ? 'friend' : 'enemy', t(friend ? 'friend' : 'enemy'))}<span class="marker-hp" style="--hp:${member.damage.hp / 100}"></span>`;
      }
    });
  }
  private readonly rendered = new WeakMap<Element, string>();
  private setHtml(node: Element, html: string) { if (this.rendered.get(node) !== html) { this.rendered.set(node, html); node.innerHTML = html; } }
  dispose() { this.retry.onclick = null; this.element.remove(); this.markers.forEach(marker => marker.remove()); }
}

export function addTeamDuelLink() {
  const link = document.createElement('a'); link.className = 'team-duel-entry';
  const url = new URL(location.href); url.searchParams.set('map', 'kul');
  if (url.searchParams.get('duel') === '5v5') {
    url.searchParams.delete('duel'); link.textContent = t('freeDrive');
  } else { url.searchParams.set('duel', '5v5'); link.textContent = t('teamDuel'); }
  link.href = url.href;
  (document.querySelector('.mission-content, .map-controls') ?? document.body).append(link);
  return () => link.remove();
}
