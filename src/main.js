// Página: arranca el engine y maneja el flujo del juego.
// Por ahora va directo a una run. Más adelante: menú → preparación → run → resultados → mercado.

import { createHud } from './ui/hud.js';
import { createToasts, showToast } from './ui/toasts.js';
import { showResults } from './ui/results.js';
import { showLoading, hideLoading } from './ui/loading.js';
import { WEAPON } from './game/config/weapons.js';

const RUN_SCENE_URL = new URL('./game/runScene.js', import.meta.url).href;

/**
 * @param {any} WEED el engine que importó index.html
 * @param {{ dev: boolean }} options
 */
export async function boot(WEED, { dev }) {
  const uiRoot = document.getElementById('ui-root');
  const game = new WEED.GameEngine({ debug: dev, hotReload: dev });
  window.game = game;

  showLoading(uiRoot);
  // Lo que la run necesita de afuera (perfil, loadout, capítulo) viaja en data:
  // los workers no tienen localStorage.
  const data = { chapter: 1, startRecruits: 1, startWeapon: WEAPON.FISTS, ...devOverrides(dev) };
  await game.loadScene(RUN_SCENE_URL, { data });
  hideLoading();

  createHud(uiRoot, { dev });
  createToasts(uiRoot);
  listenToRun(game.currentScene, uiRoot);
}

/** Eventos raros que mandan las entidades de la run (emit). */
function listenToRun(scene, uiRoot) {
  // Primera vez en la run que el malón junta cada arma: la desbloquea para el mercado (fase 6).
  scene.on('weaponFound', (data) => showToast(`¡Encontraste: ${data.name.toUpperCase()}!`));
  scene.on('armorFound', () => showToast('¡Encontraste: CHALECO!'));
  // Sin reclutas: fin del capítulo.
  scene.onRunEnded = (summary) => showResults(uiRoot, summary);
}

/**
 * En dev, hasta que existan el mercado y la preparación:
 *   ?recruits=N           arranca con N reclutas
 *   ?weapon=bat|pistol|shotgun|smg   todos arrancan con esa arma
 */
function devOverrides(dev) {
  if (!dev) return {};
  const q = new URLSearchParams(location.search);
  const out = {};
  const n = Number(q.get('recruits'));
  if (Number.isFinite(n) && n > 0) out.startRecruits = n;
  const w = WEAPON[(q.get('weapon') || '').toUpperCase()];
  if (w !== undefined) out.startWeapon = w;
  return out;
}
