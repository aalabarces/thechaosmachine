// Página: arranca el engine y maneja el flujo del juego (GDD):
//   menú → partida (preparar / mercado / salir) → preparación → capítulo → resultados → partida…
// La progresión vive acá (localStorage, meta/profile.js). Cada capítulo es una carga nueva de
// RunScene, que recibe por `data` lo que necesita: los workers no tienen localStorage.

import { createHud } from './ui/hud.js';
import { createToasts, showToast } from './ui/toasts.js';
import { createSafeHousePrompt } from './ui/safeHousePrompt.js';
import { showLoading, hideLoading } from './ui/loading.js';
import { showMenu, confirmScreen, showQuit } from './ui/screens/menu.js';
import { showHub } from './ui/screens/hub.js';
import { showMarket } from './ui/screens/market.js';
import { showPrep } from './ui/screens/prep.js';
import { showResults } from './ui/screens/results.js';
import { loadProfile, newProfile, saveProfile, applyRunResult } from './meta/profile.js';
import { modifiersFromProfile, richGhostsBonus, UNLOCKS } from './meta/marketCatalog.js';
import { WEAPON } from './game/config/weapons.js';

const RUN_SCENE_URL = new URL('./game/runScene.js', import.meta.url).href;

/**
 * @param {any} WEED el engine que importó index.html
 * @param {{ dev: boolean }} options
 */
export async function boot(WEED, { dev }) {
  const uiRoot = document.getElementById('ui-root');
  // preventContextMenu: el click derecho es una orden (foco), no el menú del navegador.
  const game = new WEED.GameEngine({ debug: dev, hotReload: dev, preventContextMenu: true });
  window.game = game;
  createToasts(uiRoot);
  const ctx = { WEED, game, uiRoot, dev };

  for (;;) {
    const saved = loadProfile();
    const choice = await showMenu(uiRoot, { canContinue: saved !== null, chapter: saved?.chapter });
    if (choice === 'quit') {
      await showQuit(uiRoot);
      continue;
    }
    let profile = saved;
    if (choice === 'new') {
      if (saved && !(await confirmScreen(uiRoot, 'PARTIDA NUEVA', 'Se borra todo lo comprado y desbloqueado.', 'BORRAR', 'CANCELAR'))) continue;
      profile = newProfile();
      saveProfile(profile);
    }
    applyDevProfile(profile, dev);
    await playSeason(ctx, profile);
  }
}

/** La partida: entre capítulos, hasta que el jugador sale al menú. */
async function playSeason(ctx, profile) {
  for (;;) {
    const choice = await showHub(ctx.uiRoot, profile);
    if (choice === 'exit') return;
    if (choice === 'market') {
      await showMarket(ctx.uiRoot, profile);
      continue;
    }
    const loadout = await showPrep(ctx.uiRoot, profile);
    if (!loadout) continue;
    await playChapter(ctx, profile, loadout);
  }
}

/** Un capítulo: carga la run, espera a que se terminen los reclutas, cobra y muestra resultados. */
async function playChapter({ WEED, game, uiRoot, dev }, profile, loadout) {
  const data = {
    chapter: profile.chapter,
    startRecruits: loadout.startRecruits,
    weapons: loadout.weapons,
    armor: loadout.armor,
    startWeapon: WEAPON.FISTS,
    modifiers: modifiersFromProfile(profile),
    ...devRunOverrides(dev),
  };

  showLoading(uiRoot);
  await game.loadScene(RUN_SCENE_URL, { data });
  hideLoading();
  WEED.Time.scale = 1;

  const hud = createHud(uiRoot, { dev });
  const scene = game.currentScene;
  const barPrompt = createSafeHousePrompt(uiRoot, scene, WEED.Camera);
  scene.onToast = showToast;
  // Primera vez en la run que el malón junta cada arma (o un chaleco): habilita su desbloqueo.
  scene.on('weaponFound', (d) => showToast(`¡Encontraste: ${d.name.toUpperCase()}!`));
  scene.on('armorFound', () => showToast('¡Encontraste: CHALECO!'));
  const summary = await new Promise((resolve) => {
    scene.onRunEnded = resolve;
  });

  // Congela la run de fondo mientras se ven los menús; el próximo capítulo carga una escena nueva.
  WEED.Time.scale = 0;
  hud.destroy();
  barPrompt.destroy();
  const bonus = richGhostsBonus(summary);
  const newlyFound = applyRunResult(profile, summary, summary.money + bonus.total);
  await showResults(uiRoot, summary, bonus, newlyFound);
}

/**
 * En dev, para probar sin jugar mil capítulos:
 *   ?money=N         suma N al perfil al entrar
 *   ?found=all       todo encontrado (se pueden comprar todos los desbloqueos)
 *   ?recruits=N      arranca cada capítulo con N reclutas
 *   ?weapon=bat|pistol|shotgun|smg   los reclutas sin arma del loadout arrancan con esa
 */
function applyDevProfile(profile, dev) {
  if (!dev) return;
  const q = new URLSearchParams(location.search);
  const money = Number(q.get('money'));
  if (Number.isFinite(money) && money > 0) profile.money += money;
  if (q.get('found') === 'all') for (const u of UNLOCKS) profile.found[u.key] = true;
  saveProfile(profile);
}

function devRunOverrides(dev) {
  if (!dev) return {};
  const q = new URLSearchParams(location.search);
  const out = {};
  const n = Number(q.get('recruits'));
  if (Number.isFinite(n) && n > 0) out.startRecruits = n;
  const w = WEAPON[(q.get('weapon') || '').toUpperCase()];
  if (w !== undefined) out.startWeapon = w;
  return out;
}
