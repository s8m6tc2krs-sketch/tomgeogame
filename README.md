# Tom's GeoGame

A geography quiz that runs in any browser (computer, iPad, phone). No install, no build step.

## Games
- **Find it** – a country name appears; tap it on the map (3 tries).
- **Name it** – a country lights up orange; pick its name from 4 choices.
- **Capitals** – pick the capital of the highlighted country.

Play the whole world or one continent. Each round is 10 questions; best scores are saved in the browser.
Pinch / scroll to zoom, drag to pan. Very small countries show as dots so they are easy to tap.

## Run locally
Open a terminal in this folder and run `python3 -m http.server 8080`, then visit http://localhost:8080.

## Files
- `index.html`, `style.css`, `game.js` – the game
- `data/world.json` – map + country info (Natural Earth via world-atlas, countries-list)
- `vendor/` – d3 and topojson-client
- `fonts/` – Fredoka (SIL Open Font License)
- `tools/build-data.mjs` – regenerates `data/world.json` (`npm install && npm run build-data`)
