// Mercado (GDD): mejoras permanentes apilables, cada nivel más caro, y desbloqueos de armas.
// Un desbloqueo solo se puede comprar si el malón ya encontró esa arma en alguna run.
// Cada compra se guarda en el perfil al instante.

import { openScreen, el, button, money } from './screen.js';
import { UPGRADES, UNLOCKS, upgradePrice } from '../../meta/marketCatalog.js';
import { saveProfile } from '../../meta/profile.js';

/**
 * @param {HTMLElement} root
 * @param {import('../../meta/profile.js').Profile} profile se modifica y se guarda
 * @returns {Promise<void>} al volver
 */
export function showMarket(root, profile) {
  return new Promise((resolve) => {
    const s = openScreen(root, 'market');
    const title = el('div', 'screen-title', 'MERCADO');
    const cash = el('div', 'screen-money');
    const upgradesBox = el('div', 'shop-list');
    const unlocksBox = el('div', 'shop-list');
    const back = el('div', 'screen-buttons');
    back.append(
      button('VOLVER', () => {
        s.close();
        resolve();
      }),
    );
    s.card.append(title, cash, el('div', 'shop-section', 'Mejoras permanentes'), upgradesBox, el('div', 'shop-section', 'Desbloqueos'), unlocksBox, back);

    function render() {
      cash.textContent = money(profile.money);
      upgradesBox.replaceChildren();
      for (const u of UPGRADES) {
        const level = profile.upgrades[u.id] || 0;
        const price = upgradePrice(u, level);
        upgradesBox.append(
          row(`${u.name}${level ? ` · nivel ${level}` : ''}`, u.desc, money(price), profile.money >= price, () => {
            profile.money -= price;
            profile.upgrades[u.id] = level + 1;
            saveProfile(profile);
            render();
          }),
        );
      }
      unlocksBox.replaceChildren();
      for (const u of UNLOCKS) {
        if (profile.unlocked[u.key]) {
          unlocksBox.append(row(u.name, 'Aparece en el loot y se puede llevar desde la preparación.', 'DESBLOQUEADO', false, null, 'done'));
        } else if (!profile.found[u.key]) {
          unlocksBox.append(row(u.name, 'Primero hay que conseguir uno en la calle.', '???', false, null, 'locked'));
        } else {
          unlocksBox.append(
            row(u.name, 'Lo encontraste: desbloquealo para que aparezca en el loot y poder llevarlo.', money(u.price), profile.money >= u.price, () => {
              profile.money -= u.price;
              profile.unlocked[u.key] = true;
              saveProfile(profile);
              render();
            }),
          );
        }
      }
    }
    render();
  });
}

/** Una fila del mercado: nombre, descripción y el botón con el precio. */
function row(name, desc, priceText, canBuy, onBuy, state = '') {
  const r = el('div', `shop-row ${state}`.trim());
  const info = el('div', 'shop-info');
  info.append(el('div', 'shop-name', name), el('div', 'shop-desc', desc));
  const b = button(priceText, () => onBuy && onBuy(), 'buy');
  b.disabled = !canBuy;
  r.append(info, b);
  return r;
}
