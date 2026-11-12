// SpawnDirector: decide cuántos enemigos hay y dónde aparecen. Corre en la página (RunScene.update).
//   - Heat: lo suben los workers (civiles muertos, cosas rotas, policías muertos); acá baja solo.
//   - Policía: más estrellas y un malón más fuerte = más patrulleros, mejor armados. Aparecen
//     fuera de cámara y cazan al malón; sin heat, los que quedaron lejos se retiran.
//   - Pandillas: zonas fijas por run, lejos del punto de partida; cada zona mantiene su gente
//     (más si el malón es fuerte) y repone miembros en puntos que no se ven.
// Durante la run nada aparece en pantalla: cada punto de aparición se mide contra lo que muestra
// la cámara (más un margen). Al empezar, además, nada cerca del punto de partida (SPAWN_SAFETY).

import { HEAT, DIRECTOR, POLICE, GANG, SPAWN_SAFETY, WORLD } from '../config/balance.js';
import { FACTION } from '../config/factions.js';
import { WEAPON, WEAPONS } from '../config/weapons.js';
import { RunState } from './runState.js';
import { SquadState } from './squadState.js';
import { Recruit } from '../entities/Recruit.js';
import { Police } from '../entities/Police.js';
import { Gang } from '../entities/Gang.js';
import { WeaponHolder } from '../components/WeaponHolder.js';
import { Brain } from '../components/Brain.js';

const { Transform, Camera, rng } = WEED;

/**
 * ¿(x, y) queda fuera de lo que muestra la cámara, con un margen? (página)
 * Medio ancho/alto de la vista en px de mundo = tamaño del canvas / (2 · zoom).
 */
export function isOffscreen(x, y, margin = SPAWN_SAFETY.offscreenMargin) {
  const zoom = Camera.zoom || 1;
  const hw = (Camera.canvasWidth || WORLD.width) / (2 * zoom) + margin;
  const hh = (Camera.canvasHeight || WORLD.height) / (2 * zoom) + margin;
  return Math.abs(x - Camera.centerX) > hw || Math.abs(y - Camera.centerY) > hh;
}

/** Estrellas (0..5) para una cantidad de heat. */
export function heatStars(heat) {
  let s = 0;
  while (s < HEAT.stars.length && heat >= HEAT.stars[s]) s++;
  return s;
}

export class SpawnDirector {
  /** @param {{x: number, y: number}[]} cells celdas por donde se puede aparecer (veredas y calles) */
  constructor(cells) {
    this.cells = cells;
    /** @type {{x: number, y: number, faction: number}[]} */
    this.zones = [];
    this._decay = 0;
    this._nextPoliceAt = 0;
    this._nextGangAt = 0;
  }

  // ---------------------------------------------------------------- inicio de la run

  /**
   * Elige las zonas de pandilla y las llena. Solo en partida nueva. Ningún miembro aparece a menos
   * de SPAWN_SAFETY.startRadius del punto de partida, y la correa de la zona (GANG.leashRadius) no
   * llega hasta ahí: nadie te ataca apenas empieza el capítulo.
   */
  setupGangZones(startX, startY) {
    this.zones = [];
    const minStart = Math.max(GANG.zoneMinDistanceFromStart, GANG.zoneRadius + SPAWN_SAFETY.startRadius, GANG.leashRadius + SPAWN_SAFETY.startRadius * 0.5);
    const minStart2 = minStart * minStart;
    const spacing2 = GANG.zoneMinSpacing * GANG.zoneMinSpacing;
    for (let tries = 0; tries < 400 && this.zones.length < GANG.zones; tries++) {
      const c = this.cells[(rng() * this.cells.length) | 0];
      if (dist2(c.x, c.y, startX, startY) < minStart2) continue;
      if (this.zones.some((z) => dist2(c.x, c.y, z.x, z.y) < spacing2)) continue;
      const faction = this.zones.length % 2 === 0 ? FACTION.GANG_YELLOW : FACTION.GANG_GREEN;
      this.zones.push({ x: c.x, y: c.y, faction });
    }
    const members = this._gangMembersWanted(1);
    const safe = SPAWN_SAFETY.startRadius;
    const awayFromStart = (x, y) => dist2(x, y, startX, startY) >= safe * safe;
    for (let z = 0; z < this.zones.length; z++) {
      for (let k = 0; k < members; k++) this._spawnGangMember(z, awayFromStart);
    }
  }

  // ---------------------------------------------------------------- cada frame

  /**
   * @param {number} now performance.now()
   * @param {number} dtMs
   */
  update(now, dtMs) {
    this._decayHeat(dtMs);
    const strength = this._updateStrength();
    const alive = SquadState.alive[0];
    if (alive === 0) return;
    const stars = heatStars(RunState.heat.load());
    this._directPolice(now, stars, strength);
    this._refillGangs(now, strength);
  }

  _decayHeat(dtMs) {
    const heat = RunState.heat.load();
    if (heat > HEAT.max) RunState.heat.add(HEAT.max - heat);
    if (heat <= 0) {
      this._decay = 0;
      return;
    }
    this._decay += (HEAT.decayPerSecond * dtMs) / 1000;
    if (this._decay >= 1) {
      const n = Math.min(heat, this._decay | 0);
      RunState.heat.add(-n);
      this._decay -= n;
    }
  }

  /** Fuerza del malón = reclutas vivos + calidad de sus armas. La guarda en SquadState. */
  _updateStrength() {
    const all = Recruit.getAllActive();
    let s = all.length;
    for (let k = 0; k < all.length; k++) {
      s += WEAPONS[WeaponHolder.weapon[all[k]]].rank * DIRECTOR.strengthPerWeaponRank;
    }
    SquadState.strength[0] = s;
    return s;
  }

  _directPolice(now, stars, strength) {
    const cx = SquadState.centroid[0];
    const cy = SquadState.centroid[1];
    if (stars === 0) {
      // Sin heat: la policía que quedó lejos se retira.
      const far2 = DIRECTOR.policeDespawnDistance * DIRECTOR.policeDespawnDistance;
      const all = Police.getAllActive();
      for (let k = 0; k < all.length; k++) {
        if (dist2(Transform.x[all[k]], Transform.y[all[k]], cx, cy) > far2) Police.despawn(all[k]);
      }
      return;
    }
    if (now < this._nextPoliceAt) return;
    this._nextPoliceAt = now + DIRECTOR.policeIntervalMs / stars;
    const wanted = Math.min(POLICE.poolSize, Math.floor(DIRECTOR.policePerStar * stars + strength * DIRECTOR.policePerStrength));
    const missing = wanted - Police.activeCount;
    if (missing <= 0) return;
    const spot = this._offscreenCell(cx, cy);
    if (!spot) return;
    const n = Math.min(missing, DIRECTOR.policeGroup);
    for (let k = 0; k < n; k++) {
      Police.spawn({
        x: spot.x + (rng() - 0.5) * 40,
        y: spot.y + (rng() - 0.5) * 40,
        weapon: this._policeWeapon(stars),
      });
    }
  }

  _policeWeapon(stars) {
    if (stars >= DIRECTOR.policeSmgFromStars && rng() < DIRECTOR.policeSmgChance) return WEAPON.SMG;
    if (stars >= DIRECTOR.policeShotgunFromStars && rng() < DIRECTOR.policeShotgunChance) return WEAPON.SHOTGUN;
    return WEAPON.PISTOL;
  }

  _gangMembersWanted(strength) {
    return Math.min(GANG.membersMax, Math.round(GANG.membersBase + strength * GANG.membersPerStrength));
  }

  _refillGangs(now, strength) {
    if (now < this._nextGangAt || this.zones.length === 0) return;
    this._nextGangAt = now + DIRECTOR.gangRefillMs;
    const counts = new Array(this.zones.length).fill(0);
    const all = Gang.getAllActive();
    for (let k = 0; k < all.length; k++) {
      const z = Brain.zone[all[k]];
      if (z >= 0 && z < counts.length) counts[z]++;
    }
    const wanted = this._gangMembersWanted(strength);
    for (let z = 0; z < this.zones.length; z++) {
      if (counts[z] >= wanted) continue;
      // Cada miembro en un punto que no se ve: nadie aparece de la nada frente al jugador.
      this._spawnGangMember(z, isOffscreen);
    }
  }

  /** @param {(x: number, y: number) => boolean} isSafe dónde puede aparecer (lejos del inicio / fuera de pantalla) */
  _spawnGangMember(z, isSafe) {
    const zone = this.zones[z];
    const r2 = GANG.zoneRadius * GANG.zoneRadius;
    for (let tries = 0; tries < 30; tries++) {
      const c = this.cells[(rng() * this.cells.length) | 0];
      if (dist2(c.x, c.y, zone.x, zone.y) > r2) continue;
      if (!isSafe(c.x, c.y)) continue;
      Gang.spawn({
        x: c.x + (rng() - 0.5) * 24,
        y: c.y + (rng() - 0.5) * 24,
        gangFaction: zone.faction,
        zone: z,
        homeX: zone.x,
        homeY: zone.y,
        weapon: gangWeapon(),
      });
      return;
    }
  }

  /**
   * Una celda al azar entre spawnMinDistance y spawnMaxDistance de (cx, cy) que no se vea en
   * pantalla (con el zoom alejado, la distancia sola no alcanza).
   */
  _offscreenCell(cx, cy) {
    // Con la cámara alejada la pantalla cubre más que el anillo de spawnMin/MaxDistance: el anillo
    // se agranda para que siempre quede una parte afuera.
    const zoom = Camera.zoom || 1;
    const hw = (Camera.canvasWidth || WORLD.width) / (2 * zoom) + SPAWN_SAFETY.offscreenMargin;
    const hh = (Camera.canvasHeight || WORLD.height) / (2 * zoom) + SPAWN_SAFETY.offscreenMargin;
    const minD = Math.max(DIRECTOR.spawnMinDistance, Math.min(hw, hh));
    const maxD = Math.max(DIRECTOR.spawnMaxDistance, Math.sqrt(hw * hw + hh * hh) + DIRECTOR.spawnMaxDistance - DIRECTOR.spawnMinDistance);
    const min2 = minD * minD;
    const max2 = maxD * maxD;
    for (let tries = 0; tries < 60; tries++) {
      const c = this.cells[(rng() * this.cells.length) | 0];
      const d2 = dist2(c.x, c.y, cx, cy);
      if (d2 < min2 || d2 > max2) continue;
      // El grupo de policías se reparte ±20 px alrededor de la celda: el margen lo cubre.
      if (isOffscreen(c.x, c.y)) return c;
    }
    return null;
  }
}

function gangWeapon() {
  const w = GANG.weaponChances;
  const r = rng();
  if (r < w.shotgun) return WEAPON.SHOTGUN;
  if (r < w.shotgun + w.pistol) return WEAPON.PISTOL;
  if (r < w.shotgun + w.pistol + w.bat) return WEAPON.BAT;
  return WEAPON.FISTS;
}

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}
