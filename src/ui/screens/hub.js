// Pantalla de la partida (GDD): preparar para salir, mercado, salir de la partida.

import { openScreen, el, button, money } from './screen.js';

/**
 * @param {HTMLElement} root
 * @param {import('../../meta/profile.js').Profile} profile
 * @returns {Promise<'prep' | 'market' | 'exit'>}
 */
export function showHub(root, profile) {
  return new Promise((resolve) => {
    const s = openScreen(root, 'hub');
    const done = (choice) => {
      s.close();
      resolve(choice);
    };
    s.card.append(
      el('div', 'screen-title', `CAPÍTULO ${profile.chapter}`),
      el('div', 'screen-sub', profile.stats.runs === 0 ? 'Empezás con un chabón y cero pesos.' : 'Los ricachones esperan el próximo episodio.'),
      el('div', 'screen-money', money(profile.money)),
    );
    const list = el('div', 'screen-buttons');
    list.append(
      button('PREPARAR PARA SALIR', () => done('prep'), 'primary'),
      button('MERCADO', () => done('market')),
      button('SALIR DE LA PARTIDA', () => done('exit')),
    );
    s.card.append(list);
  });
}
