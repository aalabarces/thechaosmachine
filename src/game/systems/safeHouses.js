// Safe houses (GDD): bares repartidos por el mapa. Con algún recluta cerca, se abre un menú
// (ui/safeHouseMenu.js) para invertir plata de esta run en reclutas nuevos que aparecen en la
// puerta; cada uno cuesta más que el anterior. Comprar es siempre a propósito: con el botón del
// menú, nunca tocando el mapa. Corre en la página (RunScene).

import { SAFE_HOUSE } from '../config/balance.js';
import { WEAPON } from '../config/weapons.js';
import { RunState } from './runState.js';
import { Recruit } from '../entities/Recruit.js';
import { SafeHouseSign } from '../entities/props/SafeHouseSign.js';

const { Transform } = WEED;

export class SafeHouses {
  constructor() {
    /** @type {{ x: number, y: number, doorX: number, doorY: number }[]} */
    this.houses = [];
    this.bought = 0;
    /** Lo que muestra el menú del bar (ui/safeHouseMenu.js): si hay un bar con reclutas cerca y el precio. */
    this.prompt = { visible: false, x: 0, y: 0, price: 0, affordable: false };
  }

  /**
   * Elige SAFE_HOUSE.count casas separadas entre sí, una de ellas cerca del punto de partida,
   * y les pone el cartel.
   * @param {{x: number, y: number}[]} houses casas del mapa
   */
  setup(houses, startX, startY) {
    this.houses = [];
    const near2 = SAFE_HOUSE.nearStartDistance * SAFE_HOUSE.nearStartDistance;
    const spacing2 = SAFE_HOUSE.minSpacing * SAFE_HOUSE.minSpacing;
    const sorted = [...houses].sort((a, b) => dist2(a.x, a.y, startX, startY) - dist2(b.x, b.y, startX, startY));
    // La primera: la casa más cercana al punto de partida dentro de nearStartDistance (si hay).
    if (sorted.length > 0 && dist2(sorted[0].x, sorted[0].y, startX, startY) < near2) this._add(sorted[0]);
    // El resto: lo más repartido posible, de lejos a cerca.
    for (let k = sorted.length - 1; k >= 0 && this.houses.length < SAFE_HOUSE.count; k--) {
      const h = sorted[k];
      if (this.houses.some((s) => dist2(s.x, s.y, h.x, h.y) < spacing2)) continue;
      this._add(h);
    }
  }

  _add(h) {
    const signY = h.y + SAFE_HOUSE.signOffsetY;
    this.houses.push({ x: h.x, y: signY, doorX: h.x, doorY: signY + 24 });
    SafeHouseSign.spawn({ x: h.x, y: signY });
  }

  price() {
    return Math.round(SAFE_HOUSE.basePrice * Math.pow(SAFE_HOUSE.priceGrowth, this.bought));
  }

  /** Cada frame: qué bar tiene reclutas cerca (para el aviso). */
  update() {
    const p = this.prompt;
    p.visible = false;
    const h = this._usableHouse();
    if (!h) return;
    p.visible = true;
    p.x = h.x;
    p.y = h.y;
    p.price = this.price();
    p.affordable = RunState.money.load() >= p.price;
  }

  /**
   * Compra un recluta en el bar que tiene reclutas cerca (el botón del menú).
   * @returns {{ ok: boolean, message: string }}
   */
  buy() {
    const h = this._usableHouse();
    if (!h) return { ok: false, message: 'No hay ningún recluta cerca del bar' };
    const price = this.price();
    if (RunState.money.load() < price) return { ok: false, message: `Falta plata: el recluta cuesta $${price}` };
    RunState.money.add(-price);
    this.bought++;
    Recruit.spawn({ x: h.doorX + (Math.random() - 0.5) * 20, y: h.doorY, weapon: WEAPON.FISTS });
    return { ok: true, message: `+1 recluta (−$${price})` };
  }

  _usableHouse() {
    for (const h of this.houses) if (this._hasRecruitNear(h)) return h;
    return null;
  }

  _hasRecruitNear(h) {
    const r2 = SAFE_HOUSE.useRadius * SAFE_HOUSE.useRadius;
    const all = Recruit.getAllActive();
    for (let k = 0; k < all.length; k++) {
      if (dist2(Transform.x[all[k]], Transform.y[all[k]], h.doorX, h.doorY) < r2) return true;
    }
    return false;
  }
}

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}
