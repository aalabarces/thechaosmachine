// Fin de capítulo: lo que pasó en la run, lo que pagan los ricachones fantasma por el caos,
// cuánto entra al perfil y qué se encontró por primera vez (ya se puede desbloquear en el mercado).

import { openScreen, el, button, money } from './screen.js';
import { UNLOCKS } from '../../meta/marketCatalog.js';

/**
 * @param {HTMLElement} root
 * @param {object} summary  RunScene.runSummary()
 * @param {{ civilians: number, enemies: number, stars: number, total: number }} bonus  richGhostsBonus()
 * @param {string[]} newlyFound  claves de desbloqueo encontradas por primera vez
 * @returns {Promise<void>}
 */
export function showResults(root, summary, bonus, newlyFound) {
  return new Promise((resolve) => {
    const s = openScreen(root, 'results');
    const stats = el('dl', 'results-stats');
    const line = (label, value, cls = '') => stats.append(el('dt', '', label), el('dd', cls, value));
    line('Duración', formatTime(summary.durationMs));
    line('Civiles', String(summary.civiliansKilled));
    line('Policías y pandilleros', String(summary.enemiesKilled));
    line('Reclutas caídos', String(summary.recruitsLost));
    line('Máximo heat', '★'.repeat(summary.maxStars) || '—');

    const pay = el('dl', 'results-stats pay');
    const payLine = (label, value, cls = '') => pay.append(el('dt', '', label), el('dd', cls, value));
    payLine('Plata juntada', money(summary.money), 'hud-money');
    payLine('Ricachones: civiles', money(bonus.civilians), 'hud-money');
    payLine('Ricachones: enemigos', money(bonus.enemies), 'hud-money');
    payLine('Ricachones: heat', money(bonus.stars), 'hud-money');
    payLine('TOTAL', money(summary.money + bonus.total), 'hud-money total');

    s.card.append(
      el('div', 'screen-title', `CAPÍTULO ${summary.chapter}`),
      el('div', 'screen-sub', 'Se terminó el episodio. Los ricachones fantasma pagan el caos.'),
      stats,
      pay,
    );
    if (newlyFound.length > 0) {
      const names = newlyFound.map((k) => UNLOCKS.find((u) => u.key === k)?.name ?? k);
      s.card.append(el('div', 'results-new', `¡Nuevo en el mercado: ${names.join(', ')}!`));
    }
    const list = el('div', 'screen-buttons');
    list.append(
      button(
        'SEGUIR',
        () => {
          s.close();
          resolve();
        },
        'primary',
      ),
    );
    s.card.append(list);
  });
}

function formatTime(ms) {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}
