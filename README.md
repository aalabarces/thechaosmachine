# The Chaos Machine

Juego de acción / push-your-luck sobre [WeedJS](https://github.com/brotochola/Web-Engine-for-Enhanced-Dynamics) (`@weed.js/engine`).

```sh
npm install
npm run dev             # http://localhost:8000, con hot reload
npm run dev -- --host   # abierto a la red, para probar en el celular
npm run build           # dist/, listo para subir
npm run preview         # sirve dist/ como lo haría un host
```

## Estructura

```
index.html          import map del engine, raíz de la UI, arranca src/main.js
assets/             mapa, casas, árboles, personajes (tomados de la demo littleCity)
src/
  main.js           (página) arranca el engine y el flujo de pantallas
  ui/               (página) HUD, avisos, pausa, menú del bar, música (music.js) y screens/: menú,
                    opciones, partida, mercado, preparación, resultados
  meta/             (página) profile.js y settings.js (localStorage), marketCatalog.js (mejoras, desbloqueos, precios)
  game/             lo cargan la página Y los workers: no importa el engine, usa el global WEED
    runScene.js     la escena de una run (= un capítulo)
    assets.js       URLs de assets relativas al módulo
    config/         números de balance y tablas (solo datos): balance, weapons, lootTables, factions, sprites, sounds
    components/     componentes (typed arrays compartidos): Health, Faction, Loot, PersonStats, Brain, DropData, WeaponHolder
    ai/             FSM por rol (WEED.FSM): recruitFSM (atacar > lootear > seguir), civilianFSM (pasear ↔ huir),
                    enemyFSM (rondar → atacar → huir)
    entities/       Person → Recruit / Civilian / Enemy (→ Police / Gang); Corpse, Drop, MoveMarker;
                    props/: House, Tree (escenografía), Prop → TrashCan / ParkedCar / Atm (rompibles),
                    Mine, SafeHouseSign; fx/: Explosion, Fire
    systems/        estado compartido (SquadState, RunState, RunModifiers), SpawnDirector (heat, policía,
                    pandillas), SafeHouses (bares), explosiones, spawner de civiles, loot y efectos
    world/          el mapa: mapGenerator (ciudad con semilla), mapTiles (tilemap con autotiles),
                    sidewalkFlow (flowfield de veredas), generatedCity (lo pasa a la escena), cityMap
                    (spawnea casas, árboles y props); el de littleCity queda como alternativa de dev
```

Reglas:
- Lo que está en `src/game/` corre en varios threads. Para compartir estado entre ellos se usan componentes o `SharedResource`, nunca variables de módulo.
- Cada campo de un `SharedResource` tiene un solo escritor, salvo los `mailbox` (atómicos).
- La progresión permanente vive en la página (localStorage) y entra a la run por `loadScene(url, { data })`.

Parámetros de dev (solo con `npm run dev`):
- `?money=N` suma N al perfil al entrar a la partida.
- `?found=all` marca todo como encontrado (se pueden comprar todos los desbloqueos).
- `?recruits=N` arranca cada capítulo con N reclutas.
- `?weapon=bat|pistol|shotgun|smg` los reclutas sin arma del loadout arrancan con esa.
- `?seed=N` siempre la misma ciudad (la semilla de cada capítulo sale en la consola).
- `?map=littlecity` el mapa viejo de littleCity en vez de una ciudad generada.

Sonido:
- Efectos: `src/game/config/sounds.js` (catálogo SFX). Varios salen de variar los archivos que hay
  (tono, volumen, mezcla); para usar uno propio, sumarlo a SOUND_FILES y apuntar su entrada de SFX.
- Música: mp3 en `assets/audio/music/` (ver LEEME.txt ahí). Sin archivos, el juego anda en silencio.
