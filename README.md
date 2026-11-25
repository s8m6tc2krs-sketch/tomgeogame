# Master of the Continents

A geography voyage that runs in any browser (computer, iPad, phone). No install, no build step.

Start as a **Junior Sailor** and earn ranks on each of six continents:
- **Captain**: name every country (Political layers)
- **Commodore**: know every capital (Capitals layers, mixed question types, a fact for each country)
- **Admiral**: know the physical map: mountains, plains, rivers, lakes and seas. North America also needs the **States & Provinces** track (50 US states, 13 Canadian provinces and territories, names then capitals). Becoming Admiral opens the continent's treasure chest.
- **Master of the Continents**: Admiral of all six.

Each layer: learn it, pass 3 training tests at 9/10 or better, then win its Sailing Challenge (every item once, 90% needed) to unlock the next layer. North America Political Layer 2 is a 13-round challenge with up to 3 misses allowed.
Small countries get enlarged tap circles; pinch, scroll or use the +/− buttons to zoom.

Progress is saved in the browser (`localStorage`, key `motc.v1`). Use **Save code** on the voyage chart to copy progress to another device.

The original quiz is still available at `classic/`. Design mockups are in `mockups/`.

## Run locally
`python3 -m http.server 8080`, then open http://localhost:8080.

## Files
- `index.html`, `css/motc.css`, `js/main.js`: the game
- `js/content.js`: continents, layers, physical features, states and provinces; `js/facts.js`: one fact per country, state and province
- `js/art.js`: ship, rank insignia and chest drawings
- `data/world.json`: countries (Natural Earth via world-atlas); `data/physical.json`, `data/states.json`: physical features and US/Canada boundaries (Natural Earth)
- `tools/build-data.mjs`, `tools/build-motc.mjs`: regenerate the data files (`npm install`, then see the comments at the top of each script)
- `vendor/`: d3 and topojson-client; `fonts/`: Cinzel, Nunito, Fredoka (SIL Open Font License)
