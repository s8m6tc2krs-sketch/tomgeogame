// Builds data/physical.json and data/states.json from Natural Earth GeoJSON.
// Download sources into tools/ne/ first, e.g.:
//   for f in geography_regions_polys geography_marine_polys rivers_lake_centerlines lakes admin_1_states_provinces; do
//     curl -L -o tools/ne/ne_50m_$f.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_$f.geojson; done
import fs from 'fs';
import {topology} from 'topojson-server';
import {presimplify, simplify, quantile} from 'topojson-simplify';
import {PHYSICAL} from '../js/content.js';
const dir = process.argv[2] || 'tools/ne';
const read = n => JSON.parse(fs.readFileSync(`${dir}/ne_50m_${n}.geojson`)).features;
const src = {r: read('geography_regions_polys'), m: read('geography_marine_polys'), w: read('rivers_lake_centerlines'), l: read('lakes')};
const nm = f => f.properties.NAME || f.properties.name;
const inBox = (f, [x0, y0, x1, y1]) => { let hit = false; const walk = c => typeof c[0] === 'number' ? (c[0] >= x0 && c[0] <= x1 && c[1] >= y0 && c[1] <= y1 && (hit = true)) : c.forEach(walk); walk(f.geometry.coordinates); return hit; };
// Natural Earth ends the St. Lawrence at Lake Ontario's outlet; trace the rest to the Gulf.
const stLawrence = {type: 'Feature', properties: {}, geometry: {type: 'LineString', coordinates: [[-76.35, 44.15], [-75.79, 44.5], [-74.71, 45.0], [-73.55, 45.5], [-72.55, 46.35], [-71.2, 46.82], [-70.2, 47.4], [-68.9, 48.4], [-66.5, 49.2], [-64.4, 49.3]]}};
const objects = {};
for (const [cont, layers] of Object.entries(PHYSICAL)) {
  const feats = [];
  for (const layer of layers) for (const [id, name, kind, s, names, box] of layer.items) {
    let parts = src[s].filter(f => names.includes(nm(f)));
    if (box) parts = parts.flatMap(f => (f.geometry.type.startsWith('Multi') ? f.geometry.coordinates : [f.geometry.coordinates])
      .map(c => ({type: 'Feature', properties: {}, geometry: {type: f.geometry.type.replace('Multi', ''), coordinates: c}})))
      .filter(f => inBox(f, box));
    if (id === 'stlawrence') parts.push(stLawrence);
    if (!parts.length) throw new Error(`no match for ${cont} ${id}`);
    const geoms = parts.map(f => f.geometry);
    const lines = kind === 'river';
    const coords = geoms.flatMap(g => (g.type.startsWith('Multi') ? g.coordinates : [g.coordinates]));
    feats.push({type: 'Feature', properties: {id, kind}, geometry: {type: lines ? 'MultiLineString' : 'MultiPolygon', coordinates: coords}});
    console.log(cont, id, parts.length);
  }
  objects[cont] = {type: 'FeatureCollection', features: feats};
}
let t = topology(objects);
t = presimplify(t); t = simplify(t, quantile(t, 0.35));
fs.writeFileSync('data/physical.json', JSON.stringify(t));
const st = read('admin_1_states_provinces').filter(f => ['USA', 'CAN'].includes(f.properties.adm0_a3) && f.properties.postal !== 'DC')
  .map(f => ({type: 'Feature', properties: {id: f.properties.postal, country: f.properties.adm0_a3}, geometry: f.geometry}));
let s = topology({states: {type: 'FeatureCollection', features: st}});
s = presimplify(s); s = simplify(s, quantile(s, 0.4));
fs.writeFileSync('data/states.json', JSON.stringify(s));
console.log('states', st.length);
