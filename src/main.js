// Página: arranca el engine y maneja el flujo del juego.
// Fase 1: va directo a una run. Más adelante: menú → preparación → run → resultados → mercado.

import { createHud } from './ui/hud.js';
import { showLoading, hideLoading } from './ui/loading.js';

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
  await game.loadScene(RUN_SCENE_URL, { data: { chapter: 1, startRecruits: devStartRecruits(dev) } });
  hideLoading();

  createHud(uiRoot, { dev });
}

/** En dev, `?recruits=N` arranca la run con N reclutas (hasta que exista el mercado). */
function devStartRecruits(dev) {
  if (!dev) return 1;
  const n = Number(new URLSearchParams(location.search).get('recruits'));
  return Number.isFinite(n) && n > 0 ? n : 1;
}
