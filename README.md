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
  ui/               (página) HUD y pantallas en HTML
  meta/             (página) perfil guardado, mercado, loadout (fases futuras)
  game/             lo cargan la página Y los workers: no importa el engine, usa el global WEED
    runScene.js     la escena de una run (= un capítulo)
    assets.js       URLs de assets relativas al módulo
    config/         números de balance y tablas (solo datos)
    components/     componentes (typed arrays compartidos)
    entities/       Person → Recruit / Civilian / Enemy; props/ (House, Tree, …)
    systems/        estado compartido (SquadState, RunState) y directores
    world/          el mapa (littleCity por ahora; generador procedural más adelante)
```

Reglas:
- Lo que está en `src/game/` corre en varios threads. Para compartir estado entre ellos se usan componentes o `SharedResource`, nunca variables de módulo.
- Cada campo de un `SharedResource` tiene un solo escritor, salvo los `mailbox` (atómicos).
- La progresión permanente vive en la página (localStorage) y entra a la run por `loadScene(url, { data })`.
