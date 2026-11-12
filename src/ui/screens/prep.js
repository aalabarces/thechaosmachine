// Preparación (GDD): gastar para el próximo capítulo —más chabones, ir armado, chalecos—
// "a riesgo de salir perdiendo": lo que se lleva se pierde si los reclutas mueren.
// Solo se ofrecen las armas (y el chaleco) desbloqueadas en el mercado.

import { openScreen, el, button, money } from './screen.js';
import { UNLOCKS, PREP, prepRecruitsCost, prepRecruitPrice, baseRecruits } from '../../meta/marketCatalog.js';
import { saveProfile } from '../../meta/profile.js';

/**
 * @typedef {{ startRecruits: number, weapons: number[], armor: number, spent: number }} Loadout
 */

/**
 * @param {HTMLElement} root
 * @param {import('../../meta/profile.js').Profile} profile al salir se le descuenta lo gastado
 * @returns {Promise<Loadout | null>} null si volvió sin salir
 */
export function showPrep(root, profile) {
  return new Promise((resolve) => {
    const s = openScreen(root, 'prep');
    const base = baseRecruits(profile);
    const items = UNLOCKS.filter((u) => profile.unlocked[u.key]);
    const qty = { extra: 0 };
    for (const u of items) qty[u.key] = 0;

    const cash = el('div', 'screen-money');
    const list = el('div', 'shop-list');
    const summary = el('div', 'prep-summary');
    const go = button('SALIR A LA CALLE', () => finish(true), 'primary');
    const actions = el('div', 'screen-buttons row');
    actions.append(button('VOLVER', () => finish(false)), go);
    s.card.append(
      el('div', 'screen-title', `PREPARACIÓN · CAPÍTULO ${profile.chapter}`),
      el('div', 'screen-sub', 'Lo que lleves se pierde si tus chabones caen.'),
      cash,
      list,
      summary,
      actions,
    );

    const recruits = () => base + qty.extra;
    const itemCost = (u) => qty[u.key] * PREP.unitPrice[u.key];
    const weaponsCount = () => items.filter((u) => u.weapon >= 0).reduce((n, u) => n + qty[u.key], 0);
    const total = () => prepRecruitsCost(qty.extra) + items.reduce((t, u) => t + itemCost(u), 0);

    function finish(play) {
      s.close();
      if (!play) {
        resolve(null);
        return;
      }
      const spent = total();
      profile.money -= spent;
      saveProfile(profile);
      const weapons = [];
      for (const u of items) if (u.weapon >= 0) for (let k = 0; k < qty[u.key]; k++) weapons.push(u.weapon);
      resolve({ startRecruits: recruits(), weapons, armor: qty.armor || 0, spent });
    }

    function render() {
      const left = profile.money - total();
      cash.textContent = `${money(left)} disponibles`;
      list.replaceChildren();

      const nextRecruit = prepRecruitPrice(qty.extra);
      list.append(
        stepper(
          'Reclutas extra',
          `Arrancás con ${base} + ${qty.extra}. El próximo cuesta ${money(nextRecruit)}.`,
          qty.extra,
          qty.extra > 0,
          qty.extra < PREP.maxExtraRecruits && left >= nextRecruit,
          (d) => {
            qty.extra += d;
            // Si bajan los reclutas, que no sobren armas ni chalecos.
            trimToRecruits();
            render();
          },
        ),
      );
      for (const u of items) {
        const price = PREP.unitPrice[u.key];
        const isWeapon = u.weapon >= 0;
        const room = isWeapon ? weaponsCount() < recruits() : qty[u.key] < recruits();
        list.append(
          stepper(u.name, `${money(price)} cada ${isWeapon ? 'una' : 'uno'}. Uno por recluta.`, qty[u.key], qty[u.key] > 0, room && left >= price, (d) => {
            qty[u.key] += d;
            render();
          }),
        );
      }
      if (items.length === 0) list.append(el('div', 'shop-desc', 'Todavía no desbloqueaste armas: conseguilas en la calle y desbloquealas en el mercado.'));
      summary.textContent = `Total: ${money(total())}`;
    }

    function trimToRecruits() {
      let over = weaponsCount() - recruits();
      for (let k = items.length - 1; k >= 0 && over > 0; k--) {
        const u = items[k];
        if (u.weapon < 0) continue;
        const cut = Math.min(over, qty[u.key]);
        qty[u.key] -= cut;
        over -= cut;
      }
      if (qty.armor > recruits()) qty.armor = recruits();
    }

    render();
  });
}

/** Fila con − cantidad + . */
function stepper(name, desc, value, canMinus, canPlus, onChange) {
  const r = el('div', 'shop-row');
  const info = el('div', 'shop-info');
  info.append(el('div', 'shop-name', name), el('div', 'shop-desc', desc));
  const ctl = el('div', 'stepper');
  const minus = button('−', () => onChange(-1), 'step');
  const plus = button('+', () => onChange(1), 'step');
  minus.disabled = !canMinus;
  plus.disabled = !canPlus;
  ctl.append(minus, el('span', 'stepper-value', String(value)), plus);
  r.append(info, ctl);
  return r;
}
