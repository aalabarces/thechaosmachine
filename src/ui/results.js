// Pantalla de fin de capítulo (provisoria): el resumen de la run y "otro capítulo".
// La fase 6 la convierte en la pantalla de resultados de verdad (ricachones, mercado, perfil).

import { WEAPONS } from '../game/config/weapons.js';

/**
 * @param {HTMLElement} root
 * @param {{ chapter: number, money: number, civiliansKilled: number, enemiesKilled: number,
 *           recruitsLost: number, weaponsFound: number[], armorFound: boolean, durationMs: number }} s
 */
export function showResults(root, s) {
  const box = document.createElement('div');
  box.className = 'results';
  const found = s.weaponsFound.map((w) => WEAPONS[w].name);
  if (s.armorFound) found.push('Chaleco');
  box.innerHTML = `
    <div class="results-card">
      <div class="results-title">CAPÍTULO ${s.chapter}</div>
      <div class="results-sub">Se terminó el episodio. Los ricachones apagan la tele.</div>
      <dl class="results-stats">
        <dt>Plata juntada</dt><dd class="hud-money">$${s.money}</dd>
        <dt>Duración</dt><dd>${formatTime(s.durationMs)}</dd>
        <dt>Civiles</dt><dd>${s.civiliansKilled}</dd>
        <dt>Policías y pandilleros</dt><dd>${s.enemiesKilled}</dd>
        <dt>Reclutas caídos</dt><dd>${s.recruitsLost}</dd>
        <dt>Encontrado</dt><dd>${found.length ? found.join(', ') : '—'}</dd>
      </dl>
      <button class="results-button" type="button">OTRO CAPÍTULO</button>
    </div>`;
  // Hasta que exista el loop meta (fase 6), "otro capítulo" recarga la página.
  box.querySelector('button').addEventListener('click', () => location.reload());
  root.appendChild(box);
}

function formatTime(ms) {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
}
