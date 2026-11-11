// HUD minimalista: un indicador por recurso. Lee el estado compartido de la run cada frame
// y solo toca el DOM cuando un valor cambia.

import { RunState } from '../game/systems/runState.js';
import { Recruit } from '../game/entities/Recruit.js';

export function createHud(root, { dev = false } = {}) {
  const box = document.createElement('div');
  box.className = dev ? 'hud dev' : 'hud';
  const money = item(box, 'hud-money');
  const recruits = item(box, 'hud-recruits');
  root.appendChild(box);

  let lastMoney = NaN;
  let lastRecruits = NaN;

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
