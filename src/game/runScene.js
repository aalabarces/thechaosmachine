// RunScene: una run (= un capítulo de la serie). La cargan la página y todos los workers:
// no importa el engine, usa el global WEED.
//
// create()        siempre (partida nueva o restore de hot reload): mundo estático.
// createNewGame() solo partida nueva: el malón inicial, los civiles y las zonas de pandilla.
// update()        cada frame, en la página: input → órdenes, cámara, civiles, enemigos, fin de la run.
//
// Cuando no quedan reclutas, llama a scene.onRunEnded(resumen) (lo asigna main.js).

import { asset, pad2 } from './assets.js';
import { WORLD, CAMERA, SQUAD, INPUT, NAV, CIVILIAN, POLICE, GANG, DIRECTOR, EXPLOSION, MINES } from './config/balance.js';
import { SHEETS, ROLE_ANIMATIONS, excludedAnimations, HOUSE_COUNT, TREE_COUNT } from './config/sprites.js';
import { SOUND_FILES } from './config/sounds.js';
import { Recruit } from './entities/Recruit.js';
import { Civilian } from './entities/Civilian.js';
import { Police } from './entities/Police.js';
import { Gang } from './entities/Gang.js';
import { Corpse } from './entities/Corpse.js';
import { Drop } from './entities/Drop.js';
import { MoveMarker } from './entities/MoveMarker.js';
import { CivilianSpawner } from './systems/civilianSpawner.js';
import { SafeHouses } from './systems/safeHouses.js';
import { Explosion } from './entities/fx/Explosion.js';
import { Fire } from './entities/fx/Fire.js';
import { SafeHouseSign } from './entities/props/SafeHouseSign.js';
import { Health } from './components/Health.js';
import { SpawnDirector } from './systems/spawnDirector.js';
import { CAR_SHEETS, WRECK_SHEET, CAR_ANGLES } from './entities/props/ParkedCar.js';
import { WEAPON, WEAPONS, ARMOR } from './config/weapons.js';
import { CITY_ENTITIES, loadCityData, spawnCity, spawnMines, nearestSidewalk } from './world/cityMap.js';
import { getPreparedCity } from './world/generatedCity.js';
import { SquadState, SQUAD_STATE_SCHEMA, setSquadTarget, squadCentroid, setSquadFocus, clearSquadFocus, FOCUS } from './systems/squadState.js';
import { pickAt, isFocusValid } from './systems/picking.js';
import { RunState, RUN_STATE_SCHEMA } from './systems/runState.js';
import { RunModifiers, RUN_MODIFIERS_SCHEMA, writeRunModifiers } from './systems/runModifiers.js';
import { heatStars } from './systems/spawnDirector.js';

const { Scene, Camera, Mouse, Transform, LAYER_KIND } = WEED;

function numberedTextures(prefix, folder, count) {
  const out = {};
  for (let i = 1; i <= count; i++) out[`${prefix}_${pad2(i)}`] = asset(`img/${folder}/${prefix}_${pad2(i)}.png`);
  return out;
}

/** Hojas LPC de un rol, cargando solo las animaciones que usa (el atlas es uno solo y tiene tope). */
function personSheets(names, keepAnimations) {
  const exclude = excludedAnimations(keepAnimations);
  const out = {};
  for (const name of names) {
    out[name] = {
      json: asset('img/people/lpc_character.json'),
      png: asset(`img/people/${name}.png`),
      excludeAnimations: exclude,
    };
  }
  return out;
}

/** Hojas de autos: de los 48 ángulos (cada 7,5°) solo se cargan los 4 de un auto estacionado. */
function carSheets() {
  const exclude = [];
  for (let k = 0; k < 48; k++) {
    const angle = String(k * 7.5);
    if (!CAR_ANGLES.includes(angle)) exclude.push(angle);
  }
  const out = {};
  for (const name of [...CAR_SHEETS, WRECK_SHEET]) {
    const file = name.replace('car_', '');
    out[name] = { json: asset(`img/cars/${file}.json`), png: asset(`img/cars/${file}.png`), excludeAnimations: exclude };
  }
  return out;
}

function soundFiles() {
  const out = {};
  for (const [name, file] of Object.entries(SOUND_FILES)) out[name] = asset(`audio/${file}`);
  return out;
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

const _centroid = { x: 0, y: 0 };

/** Texturas y hojas de la run (el tilemap y el flowfield van aparte: dependen de la ciudad). */
const STATIC_ASSETS = {
  textures: {
    ...numberedTextures('house', 'houses', HOUSE_COUNT),
    ...numberedTextures('tree', 'trees', TREE_COUNT),
    blood: asset('img/fx/blood.png'),
    muzzle1: asset('img/fx/muzzle1.png'),
    muzzle2: asset('img/fx/muzzle2.png'),
    muzzle3: asset('img/fx/muzzle3.png'),
    scorch: asset('img/fx/explosion_decal.png'),
    smoke: asset('img/fx/smoke.png'),
    mine: asset('img/props/mine.png'),
    bar_sign: asset('img/props/bar_sign.png'),
    drop_money: asset('img/drops/money.png'),
    drop_bat: asset('img/drops/bat.png'),
    drop_pistol: asset('img/drops/pistol.png'),
    drop_shotgun: asset('img/drops/shotgun.png'),
    drop_smg: asset('img/drops/ak47.png'),
    drop_armor: asset('img/drops/armor.png'),
    trash: asset('img/props/trash.png'),
    atm: asset('img/props/atm.png'),
  },
  spritesheets: {
    ...personSheets(SHEETS.recruit, ROLE_ANIMATIONS.recruit),
    ...personSheets(SHEETS.civilian, ROLE_ANIMATIONS.civilian),
    ...personSheets(SHEETS.police, ROLE_ANIMATIONS.police),
    ...personSheets([...SHEETS.gangYellow, ...SHEETS.gangGreen], ROLE_ANIMATIONS.gang),
    ...carSheets(),
    explosions: { json: asset('img/fx/explosions/explosions.json'), png: asset('img/fx/explosions/explosions.png'), excludeAnimations: ['explosion1'] },
    fire: { json: asset('img/fx/fire/fuego.json'), png: asset('img/fx/fire/fuego.png') },
  },
};

export class RunScene extends Scene {
  static config = {
    worldWidth: WORLD.width,
    worldHeight: WORLD.height,
    spatial: { cellSize: 128, maxNeighbors: 128 },
    // Civiles con tickInterval 2: staggeredUpdates reparte sus ticks entre frames pares e impares.
    logic: { numberOfLogicWorkers: 1, staggeredUpdates: true },
    // El mapa crea ~1300 cuerpos estáticos de una vez: el anillo de comandos tiene que entrarlos.
    physics: { gravity: { x: 0, y: 0 }, sleeping: true, commandRingCapacity: 16384 },
    renderer: { backend: 'webgl', ySort: true },
    lighting: { enabled: false },
    // Sangre: partículas que caen y quedan como manchas en el piso (decals).
    particle: { maxParticles: 6000, decals: true, decalsTileSize: 256, decalsResolution: 0.5 },
    // El arma en la mano de cada persona es una decoración pegada a ella.
    decoration: { maxDecorations: 1500 },
    navigation: { enabled: true, cellSize: NAV.cellSize },
    layers: {
      ground: { kind: LAYER_KIND.TILEMAP, tilemap: 'city', scale: 1, zIndex: 0.5 },
    },
  };

  /**
   * Getter: el tilemap y el flowfield de veredas son los de la ciudad que generó main.js para este
   * capítulo (URLs blob:), o los horneados de littleCity si no hay ninguna preparada. La escena
   * los lee al construirse, en la página, después de que main.js preparó la ciudad.
   */
  static get assets() {
    const city = getPreparedCity();
    return {
      ...STATIC_ASSETS,
      tilemaps: {
        city: { json: city ? city.tilemapUrl : asset('map/little_city_tilemap.json'), png: asset('map/tiles.png') },
      },
      // Flowfield de las veredas (el que siguen los civiles al pasear).
      flowfields: {
        sidewalks: city ? city.flowfieldUrl : asset('map/flowfield_sidewalks.json'),
      },
    };
  }

  static audios = soundFiles();

  static sharedResources = [
    [SquadState, SQUAD_STATE_SCHEMA],
    [RunState, RUN_STATE_SCHEMA],
    [RunModifiers, RUN_MODIFIERS_SCHEMA],
  ];

  static messages = ['markerDone', 'hit', 'panic', 'corpseGone', 'dropExpired', 'blast', 'fxDone', 'fireOut'];

  /** Todo lo que tiene vida (personas y props): lo recorren las explosiones, el fuego y las minas. */
  static queries = [[Health]];

  static entities = [
    [Recruit, SQUAD.maxRecruits],
    [Civilian, CIVILIAN.poolSize],
    [Police, POLICE.poolSize],
    [Gang, GANG.poolSize],
    [Corpse, 300],
    [Drop, 400],
    [MoveMarker, 8],
    [Explosion, 40],
    [Fire, 30],
    [SafeHouseSign, 8],
    ...CITY_ENTITIES,
  ];

  async preload() {
    const city = getPreparedCity();
    this.cityData = city ? city.objects : await loadCityData();
  }

  /** @param {{ modifiers?: object }} [data] lo que manda main.js (ver createNewGame) */
  create(data = {}) {
    // Las mejoras del perfil, antes de que aparezca nadie: los reclutas las leen al spawnear.
    writeRunModifiers(data?.modifiers);
    // Punto de partida del malón: hace falta antes de armar la ciudad (sin autos cerca) y para las
    // safe houses (una cerca de acá).
    this._start = nearestSidewalk(this.cityData, WORLD.width / 2, WORLD.height / 2);
    spawnCity(this.cityData, data?.modifiers?.props ?? 1, this._start);
    Camera.setZoom(CAMERA.startZoom);
    // Estado del input (solo página): cuándo empezó el apretón y cuándo se movió el destino por última vez.
    this._pressAt = 0;
    this._lastDragAt = 0;
    // Toque largo: dónde empezó el apretón y si todavía puede convertirse en foco.
    this._pressX = 0;
    this._pressY = 0;
    this._longPressArmed = false;
    // Sin foco al empezar (el estado compartido arranca en 0, que es un índice válido).
    clearSquadFocus();
    // Zoom al que se quiere llegar; el de la cámara se le acerca de a poco (handleZoomInput).
    this._zoomGoal = CAMERA.startZoom;
    this.civilians = new CivilianSpawner(this.cityData.sidewalks || []);
    this.director = new SpawnDirector(this.cityData.sidewalks || []);
    this.safeHouses = new SafeHouses();
    this.safeHouses.setup(this.cityData.houses || [], this._start.x, this._start.y);
    /** @type {((text: string) => void) | null} avisos cortos (los asigna main.js) */
    this.onToast = null;
    // Las explosiones (workers) avisan para sacudir la cámara, que tiene un solo escritor: la página.
    this.on('boom', (d) => this.shakeFor(d.x, d.y, d.shake));
    this._focusX = WORLD.width / 2;
    this._focusY = WORLD.height / 2;
    // Fin de la run: hubo reclutas, ya no hay, y pasó un ratito (runEndDelayMs).
    this._chapter = 1;
    this._startedAt = performance.now();
    this._seenRecruits = false;
    this._emptySince = 0;
    this._ended = false;
    this._maxStars = 0;
    /** @type {((summary: object) => void) | null} lo asigna main.js */
    this.onRunEnded = null;
  }

  /**
   * @param {object} data lo que manda main.js:
   *   chapter        número de capítulo
   *   startRecruits  reclutas con los que arranca (los del perfil + los comprados en la preparación)
   *   weapons        armas compradas en la preparación (WEAPON.*), se reparten de a una, las mejores primero
   *   armor          chalecos comprados: uno por recluta, a los primeros
   *   startWeapon    (dev) arma para todos los que no recibieron una del loadout
   *   modifiers      mejoras del perfil (las escribe create)
   */
  createNewGame({ chapter = 1, startRecruits = 1, weapons = [], armor = 0, startWeapon = WEAPON.FISTS } = {}) {
    this._chapter = chapter;
    const loadout = [...weapons].sort((a, b) => WEAPONS[b].rank - WEAPONS[a].rank);
    const spawn = this._start;
    const count = clamp(startRecruits | 0, 1, SQUAD.maxRecruits);
    for (let k = 0; k < count; k++) {
      // Apiñados en espiral alrededor del punto de partida; la separación los acomoda.
      const r = SQUAD.formationSpacing * Math.sqrt(k);
      const a = k * 2.4;
      Recruit.spawn({
        x: spawn.x + Math.cos(a) * r,
        y: spawn.y + Math.sin(a) * r,
        weapon: k < loadout.length ? loadout[k] : startWeapon,
        armor: k < armor ? ARMOR.amount : 0,
      });
    }
    setSquadTarget(spawn.x, spawn.y);
    Camera.centerOn(spawn.x, spawn.y);
    this.civilians.populate(spawn.x, spawn.y);
    this.director.setupGangZones(spawn.x, spawn.y);
    spawnMines(this.cityData, spawn.x, spawn.y, MINES.count);
  }

  /** Sacude la cámara por una explosión en (x, y): menos cuanto más lejos del centro de la pantalla. */
  shakeFor(x, y, strength) {
    const dx = x - Camera.centerX;
    const dy = y - Camera.centerY;
    const k = 1 - Math.sqrt(dx * dx + dy * dy) / EXPLOSION.shakeFalloff;
    if (k > 0.05) Camera.shake(strength * k, EXPLOSION.shakeMs);
  }

  update(dtRatio, simMs) {
    const now = performance.now();
    if (!this._ended) {
      this.handleMoveInput();
      this.handleFocusInput();
    }
    this.validateFocus();
    this.handleZoomInput(simMs);
    this.followSquad();
    this.civilians.update(now, this._focusX, this._focusY);
    this.director.update(now, simMs);
    this.safeHouses.update();
    this._maxStars = Math.max(this._maxStars, heatStars(RunState.heat.load()));
    this.checkRunEnd(now);
  }

  /** Sin reclutas vivos se termina el capítulo. */
  checkRunEnd(now) {
    if (this._ended) return;
    if (Recruit.activeCount > 0) {
      this._seenRecruits = true;
      this._emptySince = 0;
      return;
    }
    // Recién empezado, los reclutas tardan un frame en aparecer: se espera a verlos. Pero si en
    // runStartGraceMs no apareció ninguno (una run restaurada sin reclutas, un error al cargar),
    // el capítulo termina igual: nunca queda una run sin malón y sin pantalla de fin.
    if (!this._seenRecruits && now - this._startedAt < DIRECTOR.runStartGraceMs) return;
    if (this._emptySince === 0) this._emptySince = now;
    if (now - this._emptySince < DIRECTOR.runEndDelayMs) return;
    this._ended = true;
    this.onRunEnded?.(this.runSummary(now));
  }

  /** Lo que se llevó el capítulo (para la pantalla de resultados y, en la fase 6, el perfil). */
  runSummary(now = performance.now()) {
    const weaponsFound = [];
    for (let w = 1; w < WEAPONS.length; w++) if (RunState.weaponsFound[w]) weaponsFound.push(w);
    return {
      chapter: this._chapter,
      money: RunState.money.load(),
      civiliansKilled: RunState.civiliansKilled.load(),
      enemiesKilled: RunState.enemiesKilled.load(),
      recruitsLost: RunState.recruitsLost.load(),
      weaponsFound,
      armorFound: RunState.armorsFound.load() > 0,
      maxStars: this._maxStars,
      durationMs: now - this._startedAt,
    };
  }

  /**
   * Click/touch: nuevo destino del malón. Manteniendo apretado, el destino sigue al puntero
   * (con un mínimo de distancia y de tiempo: cada destino nuevo pide un flowfield).
   * Con dos dedos no se mueve: es pellizco de zoom.
   */
  handleMoveInput() {
    if (Mouse.count > 1) {
      this._longPressArmed = false; // dos dedos: pellizco, no toque largo
      return;
    }
    const now = performance.now();
    if (Mouse.isButton0Pressed) {
      this._pressAt = now;
      this._lastDragAt = now;
      this._pressX = Mouse.x;
      this._pressY = Mouse.y;
      this._longPressArmed = true;
      this.orderMove(Mouse.x, Mouse.y);
      return;
    }
    if (!Mouse.isButton0Down) {
      this._longPressArmed = false;
      return;
    }
    if (this.handleLongPress(now)) return;
    if (now - this._pressAt < INPUT.dragDelayMs) return;
    if (now - this._lastDragAt < INPUT.dragIntervalMs) return;
    const dx = Mouse.x - SquadState.target[0];
    const dy = Mouse.y - SquadState.target[1];
    if (dx * dx + dy * dy < INPUT.dragMinStep * INPUT.dragMinStep) return;
    this._lastDragAt = now;
    this.orderMove(Mouse.x, Mouse.y);
  }

  /**
   * Click derecho (o toque largo, ver handleLongPress): sobre un drop, el malón va a juntarlo; sobre
   * alguien o algo golpeable, van todos a pegarle. Las órdenes del jugador mandan sobre lo que
   * estuvieran haciendo (ver Recruit.tick). Sobre nada, es una orden de moverse como el click izquierdo.
   */
  handleFocusInput() {
    if (!Mouse.isButton2Pressed) return;
    const hit = pickAt(Mouse.x, Mouse.y);
    if (!hit) {
      this.orderMove(Mouse.x, Mouse.y);
      return;
    }
    this.focusOn(hit);
  }

  /**
   * Toque largo = foco (para el celular, que no tiene click derecho). Mientras el dedo siga quieto,
   * a los longPressMs marca lo que haya donde empezó el toque. Si se movió, es un arrastre.
   * @returns {boolean} true si el toque largo marcó un foco (ese apretón ya no arrastra)
   */
  handleLongPress(now) {
    if (!this._longPressArmed) return false;
    const slop = INPUT.longPressSlop / (Camera.zoom || 1); // px de pantalla → px de mundo
    const dx = Mouse.x - this._pressX;
    const dy = Mouse.y - this._pressY;
    if (dx * dx + dy * dy > slop * slop) {
      this._longPressArmed = false;
      return false;
    }
    if (now - this._pressAt < INPUT.longPressMs) return false;
    this._longPressArmed = false;
    const hit = pickAt(this._pressX, this._pressY);
    if (!hit) return false;
    this.focusOn(hit);
    this._pressAt = Infinity; // el resto de este apretón no mueve el destino
    if (INPUT.longPressVibrateMs > 0) navigator.vibrate?.(INPUT.longPressVibrateMs);
    return true;
  }

  /** Marca el foco del malón en lo que eligió el jugador (click derecho o toque largo). */
  focusOn(hit) {
    const i = hit.index;
    const x = Transform.x[i];
    const y = Transform.y[i];
    setSquadFocus(i, hit.kind, Transform.entityType[i], x, y);
    MoveMarker.spawn({ x, y, markerTint: hit.kind === FOCUS.LOOT ? 0x40ff60 : 0xffa020 });
  }

  /** El foco se termina cuando el blanco muere, se rompe o alguien lo junta. */
  validateFocus() {
    const f = SquadState.focusTarget[0];
    if (f < 0) return;
    if (!isFocusValid(f, SquadState.focusKind[0], SquadState.focusType[0])) clearSquadFocus();
  }

  orderMove(wx, wy) {
    clearSquadFocus(); // una orden de moverse cancela el foco
    const x = clamp(wx, 0, WORLD.width);
    const y = clamp(wy, 0, WORLD.height);
    setSquadTarget(x, y);
    MoveMarker.spawn({ x, y });
  }

  /**
   * Rueda del mouse o pellizco con dos dedos mueven el zoom objetivo; la cámara se le acerca
   * suave (exponencial, independiente de los fps), en escala logarítmica para que acercar y
   * alejar se sientan iguales. Camera.setZoom deja fija la esquina superior izquierda, así que
   * después de cada paso se recentra en el mismo punto: el zoom es sobre el centro de la pantalla.
   */
  handleZoomInput(dtMs) {
    let goal = this._zoomGoal;
    if (Mouse.wheel) goal *= Math.exp(-Mouse.wheel * CAMERA.wheelSensitivity);
    if (Mouse.count >= 2) goal *= Mouse.pinchRatio();
    // Camera.minZoom: el engine no deja alejar más de lo que muestra el mundo entero.
    goal = clamp(goal, Math.max(CAMERA.minZoom, Camera.minZoom), CAMERA.maxZoom);
    this._zoomGoal = goal;

    const z = Camera.zoom;
    if (z === goal) return;
    const k = 1 - Math.exp(-(dtMs > 0 ? dtMs : 16.67) / CAMERA.zoomSmoothingMs);
    let next = z * Math.pow(goal / z, k);
    if (Math.abs(next - goal) < goal * 0.001) next = goal;

    const cx = Camera.centerX;
    const cy = Camera.centerY;
    Camera.setZoom(next);
    Camera.centerOn(cx, cy);
  }

  /** La cámara sigue al centro del malón, y lo publica para la policía (SquadState.centroid). */
  followSquad() {
    const alive = squadCentroid(Recruit, Transform, _centroid);
    SquadState.alive[0] = alive;
    if (alive === 0) return;
    SquadState.centroid[0] = _centroid.x;
    SquadState.centroid[1] = _centroid.y;
    this._focusX = _centroid.x;
    this._focusY = _centroid.y;
    Camera.follow(_centroid.x, _centroid.y, CAMERA.followSmoothing);
  }
}
