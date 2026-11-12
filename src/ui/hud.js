// HUD minimalista: un indicador por recurso. Lee el estado compartido de la run cada frame
// y solo toca el DOM cuando un valor cambia.

import { RunState } from '../game/systems/runState.js';
import { Recruit } from '../game/entities/Recruit.js';
import { heatStars } from '../game/systems/spawnDirector.js';
import { HEAT } from '../game/config/balance.js';

export function createHud(root, { dev = false } = {}) {
  const box = document.createElement('div');
  box.className = dev ? 'hud dev' : 'hud';
  const money = item(box, 'hud-money');
  const recruits = item(box, 'hud-recruits');
  const heat = item(box, 'hud-heat');
  root.appendChild(box);

  // Una estrella por nivel de heat; las encendidas en rojo.
  const stars = [];
  for (let k = 0; k < HEAT.stars.length; k++) {
    const star = document.createElement('span');
    star.textContent = '★';
    heat.appendChild(star);
    stars.push(star);
  }

  let lastMoney = NaN;
  let lastRecruits = NaN;
  let lastStars = NaN;

  function frame() {
    const m = RunState.money.load();
    if (m !== lastMoney) {
      lastMoney = m;
      money.textContent = `$${m}`;
    }
    const r = Recruit.activeCount;
    if (r !== lastRecruits) {
      lastRecruits = r;
      recruits.textContent = `${r} ${r === 1 ? 'recluta' : 'reclutas'}`;
    }
    const s = heatStars(RunState.heat.load());
    if (s !== lastStars) {
      lastStars = s;
      for (let k = 0; k < stars.length; k++) stars[k].className = k < s ? 'on' : '';
    }
    requestAnimationFrame(frame);
  }
  frame();
}

function item(parent, className) {
  const el = document.createElement('div');
  el.className = className;
  parent.appendChild(el);
  return el;
}
