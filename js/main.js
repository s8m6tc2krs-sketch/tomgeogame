import {CONTINENTS, POLITICAL, COUNTRY_FIX, PHYSICAL, STATES, STATE_ALT} from './content.js';
import {FACTS} from './facts.js';
import ART from './art.js';

const $ = s => document.querySelector(s);
const RANKS = ['sailor', 'captain', 'commodore', 'admiral'];
const KEY = 'motc.v1';
const TEST_LEN = 10, TEST_NEED = 9, PASSES = 3;
const LOCK = '<svg viewBox="0 0 16 16" width="11" height="11"><path d="M4 7V5a4 4 0 0 1 8 0v2h1v8H3V7zm2 0h4V5a2 2 0 0 0-4 0z" fill="currentColor"/></svg>';
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const ins = (rank, locked) => `<span class="ins">${ART.insignia(rank, locked)}</span>`;
const contOf = id => CONTINENTS.find(c => c.id === id);

// ---------- save data ----------
let S = load();
function blank() { return {v: 1, player: '', prog: {}, missed: {}, shown: {}, inProgress: null}; }
function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return Object.assign(blank(), s); } catch {} return blank(); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} }
addEventListener('storage', e => { if (e.key !== KEY) return; S = load(); if (current === 'hub') renderHub(); if (current === 'chart') renderChart(); });
const prog = id => S.prog[id] || (S.prog[id] = {tests: [], passes: 0, best: null, won: false});
const peek = id => S.prog[id] || {tests: [], passes: 0, best: null, won: false};

// ---------- items and layers ----------
const ITEMS = {};
const LAYERS = {};
const TRACKS = {};
const chunk = (arr, size) => { const n = Math.ceil(arr.length / size), out = []; let i = 0; for (let k = 0; k < n; k++) { const len = Math.round((arr.length - i) / (n - k)); out.push(arr.slice(i, i + len)); i += len; } return out; };

function fixWinding(f) {
  const g = f.geometry; if (!g) return f;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  polys.forEach(rings => { if (d3.geoArea({type: 'Polygon', coordinates: rings}) > 2 * Math.PI) rings.forEach(r => r.reverse()); });
  return f;
}
function mainPart(f) {
  const g = f.geometry;
  if (!g || g.type !== 'MultiPolygon') return f;
  let best, ba = -1;
  for (const c of g.coordinates) { const p = {type: 'Polygon', coordinates: c}, a = d3.geoArea(p); if (a > ba) { ba = a; best = p; } }
  return {type: 'Feature', properties: {}, geometry: best};
}

let worldFeats = [], stateFeats = [];
function buildData(world, phys, states) {
  worldFeats = topojson.feature(world, world.objects.countries).features;
  const byA2 = {};
  worldFeats.forEach(f => { if (f.properties.quiz) byA2[f.properties.a2] = f; });
  stateFeats = topojson.feature(states, states.objects.states).features.map(fixWinding);
  const byPostal = Object.fromEntries(stateFeats.map(f => [f.properties.id, f]));

  for (const c of CONTINENTS) {
    const tracks = [];
    // political + capitals
    const pol = POLITICAL[c.id].map((L, i) => {
      const keys = L.items.split(' ').map(a2 => {
        const f = byA2[a2]; if (!f) throw new Error('missing ' + a2);
        const fix = COUNTRY_FIX[a2] || {};
        const key = 'c:' + a2;
        ITEMS[key] = {key, kind: 'country', name: fix.name || f.properties.name, capital: fix.capital || f.properties.capital, alt: fix.alt || [], fact: FACTS[a2], f, main: mainPart(f), cont: c.id};
        return key;
      });
      return addLayer({id: `${c.id}.political.${i}`, cont: c.id, track: 'political', idx: i, name: L.name, items: keys, ask: 'name', map: 'country', need: L.challengeNeed});
    });
    tracks.push({id: 'political', name: 'Political · Countries', rank: 'captain', layers: pol});
    const order = pol.flatMap(L => L.items);
    const caps = chunk(order, 8).map((keys, i) => addLayer({id: `${c.id}.capitals.${i}`, cont: c.id, track: 'capitals', idx: i, name: `Layer ${i + 1}`, items: keys, ask: 'capital', map: 'country'}));
    tracks.push({id: 'capitals', name: 'Capitals', rank: 'commodore', layers: caps});
    // physical
    const pf = topojson.feature(phys, phys.objects[c.id]).features.map(fixWinding);
    const pById = Object.fromEntries(pf.map(f => [f.properties.id, f]));
    const ph = PHYSICAL[c.id].map((L, i) => {
      const keys = L.items.map(([id, name, kind]) => {
        const key = `p:${c.id}:${id}`, f = pById[id];
        ITEMS[key] = {key, kind, name, f, main: kind === 'river' ? f : mainPart(f), cont: c.id};
        return key;
      });
      return addLayer({id: `${c.id}.physical.${i}`, cont: c.id, track: 'physical', idx: i, name: L.name, items: keys, ask: 'name', map: 'phys'});
    });
    tracks.push({id: 'physical', name: 'Physical', rank: 'admiral', layers: ph});
    if (c.id === 'NA') {
      const pairs = STATES.map((L, i) => {
        const keys = L.items.map(([p, name, capital]) => {
          const key = 's:' + p, f = byPostal[p];
          ITEMS[key] = {key, kind: 'state', name, capital, alt: STATE_ALT[p] || [], fact: FACTS['S:' + p], f, main: mainPart(f), cont: 'NA', country: f.properties.country};
          return key;
        });
        const base = {cont: 'NA', track: 'states', idx: i, name: L.name, items: keys, map: 'state'};
        return [addLayer({...base, id: `NA.states.${i}.names`, ask: 'name', part: 'names'}), addLayer({...base, id: `NA.states.${i}.capitals`, ask: 'capital', part: 'capitals'})];
      });
      tracks.push({id: 'states', name: 'States & Provinces', rank: 'admiral', layers: pairs.flat(), pairs});
    }
    TRACKS[c.id] = tracks;
  }
}
function addLayer(L) {
  L.need = L.need || Math.ceil(L.items.length * 0.9);
  LAYERS[L.id] = L;
  return L;
}
const trackOf = L => TRACKS[L.cont].find(t => t.id === L.track);

// ---------- progression ----------
const won = L => peek(L.id).won;
function rankOf(cont) {
  const t = Object.fromEntries(TRACKS[cont].map(x => [x.id, x]));
  if (!t.political.layers.every(won)) return 'sailor';
  if (!t.capitals.layers.every(won)) return 'captain';
  if (!t.physical.layers.every(won) || (t.states && !t.states.layers.every(won))) return 'commodore';
  return 'admiral';
}
const atLeast = (cont, r) => RANKS.indexOf(rankOf(cont)) >= RANKS.indexOf(r);
function unlocked(L) {
  const tr = trackOf(L);
  if (L.track === 'states') {
    if (!atLeast('NA', 'captain')) return false;
    if (L.part === 'capitals') return won(tr.pairs[L.idx][0]);
    return L.idx === 0 || won(tr.pairs[L.idx - 1][0]);
  }
  const gate = {political: null, capitals: 'captain', physical: 'commodore'}[L.track];
  if (gate && !atLeast(L.cont, gate)) return false;
  return L.idx === 0 || won(tr.layers[L.idx - 1]);
}
const challengeReady = L => unlocked(L) && peek(L.id).passes >= PASSES;
function overallRank() {
  const rs = CONTINENTS.map(c => RANKS.indexOf(rankOf(c.id)));
  return RANKS[Math.max(...rs)];
}
const admirals = () => CONTINENTS.filter(c => rankOf(c.id) === 'admiral').length;
const rankName = r => ART.RANKS[r].name;
function trackLabel(L) {
  if (L.track === 'states') return `States L${L.idx + 1} · ${L.part === 'names' ? 'Names' : 'Capitals'}`;
  return `${{political: 'Political', capitals: 'Capitals', physical: 'Physical'}[L.track]} L${L.idx + 1}`;
}
function contStatus(cont) {
  const r = rankOf(cont);
  if (r === 'admiral') return 'Admiral · Mastered';
  const anyProg = Object.keys(S.prog).some(k => k.startsWith(cont + '.') && (S.prog[k].tests.length || S.prog[k].won));
  if (!anyProg) return 'Not started';
  for (const t of TRACKS[cont]) for (const L of t.layers) if (unlocked(L) && !won(L)) {
    const p = peek(L.id);
    return `${r === 'sailor' ? '' : rankName(r) + ' · '}${trackLabel(L)} · ${p.passes >= PASSES ? 'Challenge ready' : Math.min(p.passes, 3) + '/3 tests'}`;
  }
  return rankName(r);
}

// ---------- screens ----------
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('hidden', s.id !== id));
  current = id;
  if (id === 'chart') renderChart();
  if (id === 'hub') renderHub();
  if (id === 'title') renderTitle();
}
let current = 'title';
document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => show(b.dataset.go));

let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), 1800); }

// modal queue
const mq = [];
function modal(html, setup) { mq.push([html, setup]); if (mq.length === 1) openModal(); }
function openModal() { const [html, setup] = mq[0]; $('#card').innerHTML = html; $('#modal').classList.remove('hidden'); setup && setup($('#card')); }
function closeModal() { mq.shift(); if (mq.length) openModal(); else $('#modal').classList.add('hidden'); }

// ---------- title ----------
$('#galleon').innerHTML = ART.galleon(true);
function renderTitle() {
  $('#nameRow').classList.toggle('hidden', !!S.player);
  const started = CONTINENTS.filter(c => contStatus(c.id) !== 'Not started').length;
  $('#titleStatus').innerHTML = S.player
    ? `Welcome back, <b style="color:#ffd77a">${esc(rankName(overallRank()))} ${esc(S.player)}</b> · ${started} of 6 continents underway`
    : 'Progress is saved on this device.';
}
$('#setSail').onclick = () => {
  if (!S.player) { S.player = ($('#playerName').value.trim() || 'Sailor').slice(0, 16); save(); }
  show('chart');
};

// ---------- chart ----------
let worldProj;
function renderChart() {
  const svg = d3.select('#worldMap'), w = innerWidth, h = innerHeight;
  svg.attr('viewBox', `0 0 ${w} ${h}`);
  worldProj = d3.geoNaturalEarth1().fitExtent([[10, 70], [w - 10, h - 60]], {type: 'Sphere'});
  const path = d3.geoPath(worldProj);
  svg.selectAll('*').remove();
  svg.append('path').attr('class', 'grat').attr('d', path(d3.geoGraticule10()));
  svg.append('g').selectAll('path').data(worldFeats.filter(f => f.properties.continent !== 'AN' && f.properties.a2 !== 'AQ')).join('path').attr('class', 'cty on').attr('d', path).style('cursor', 'default');
  const r = overallRank(), master = admirals() === 6;
  $('#chartIns').innerHTML = ART.insignia(r);
  $('#chartRank').textContent = master ? 'Master of the Continents' : rankName(r);
  $('#chartChip').textContent = `${admirals()} / 6 Admiral`;
  $('#pins').innerHTML = CONTINENTS.map(c => {
    const [x, y] = worldProj(c.at), cr = rankOf(c.id), st = contStatus(c.id);
    return `<button class="pin" data-c="${c.id}" style="left:${x}px;top:${y}px">${ins(cr, st === 'Not started')}<b>${c.name}</b><span>${esc(st)}</span></button>`;
  }).join('');
  document.querySelectorAll('.pin').forEach(p => p.onclick = () => openHub(p.dataset.c));
}
$('#btnTitle').onclick = () => show('title');
$('#btnRanks').onclick = () => {
  const cs = CONTINENTS.map(c => `<span title="${c.name}">${ins(rankOf(c.id), rankOf(c.id) === 'sailor')}</span>`).join('');
  modal(`<h2>Ranks of the Fleet</h2><p>Every continent has its own ranks.</p>
  <div class="ladder">
   <div>${ins('sailor')}<h4>Junior Sailor</h4><p>Learn each layer and pass its training tests.</p></div>
   <div>${ins('captain')}<h4>Captain</h4><p>Pass every Political layer: name every country.</p></div>
   <div>${ins('commodore')}<h4>Commodore</h4><p>Pass every Capitals layer.</p></div>
   <div>${ins('admiral')}<h4>Admiral</h4><p>Pass every Physical layer (and States &amp; Provinces in North America). Opens the treasure chest.</p></div>
  </div><p style="margin-top:16px"><b style="color:#ffd77a">Master of the Continents:</b> become Admiral of all six.</p><div class="mini-row">${cs}</div>
  <p style="font-size:14px">Each layer: pass 3 training tests at 9/10 or better to unlock its Sailing Challenge. Win the challenge to unlock the next layer.</p>
  <div class="acts"><button class="gbtn" data-x>Aye!</button></div>`, c => c.querySelector('[data-x]').onclick = closeModal);
};
$('#btnSave').onclick = () => {
  const code = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
  modal(`<h2>Save code</h2><p>Copy this code to move your progress to another device (like the iPad), then paste it there.</p>
   <textarea id="saveCode" spellcheck="false">${code}</textarea>
   <div class="acts"><button class="obtn" id="copyCode">Copy</button><button class="obtn" id="loadCode">Load pasted code</button><button class="gbtn" data-x>Done</button></div>`, c => {
    c.querySelector('[data-x]').onclick = closeModal;
    c.querySelector('#copyCode').onclick = () => { const t = c.querySelector('#saveCode'); t.select(); (navigator.clipboard ? navigator.clipboard.writeText(t.value) : Promise.reject()).then(() => toast('Copied!'), () => { document.execCommand('copy'); toast('Copied!'); }); };
    c.querySelector('#loadCode').onclick = () => {
      try {
        const s = JSON.parse(decodeURIComponent(escape(atob(c.querySelector('#saveCode').value.trim()))));
        if (!s || s.v !== 1 || typeof s.prog !== 'object') throw 0;
        if (!confirm('Replace the progress on this device with this save code?')) return;
        S = Object.assign(blank(), s); save(); closeModal(); toast('Progress loaded'); show('chart');
      } catch { toast('That code did not work'); }
    };
  });
};

// ---------- hub ----------
let hubCont = 'NA';
function openHub(c) { hubCont = c; show('hub'); }
function pips(L) {
  const p = peek(L.id), n = Math.min(p.passes, PASSES);
  let s = '';
  for (let i = 0; i < PASSES; i++) s += i < n ? '<span class="pip ok">✓</span>' : `<span class="pip">${i + 1}</span>`;
  return s;
}
function ship(L) {
  const p = peek(L.id);
  if (p.won) return `<span class="ship ok">⚓ ${esc(p.best)}</span>`;
  if (challengeReady(L)) return '<span class="ship ready">⚓ Challenge</span>';
  return `<span class="ship">${LOCK} Challenge</span>`;
}
function acts(L) {
  if (!unlocked(L)) return '';
  const resume = S.inProgress && S.inProgress.layer === L.id;
  return `<div class="acts"><button class="sbtn" data-l="${L.id}" data-m="learn">Learn</button><button class="sbtn${!challengeReady(L) && !won(L) ? ' go' : ''}" data-l="${L.id}" data-m="test">Test</button>${challengeReady(L) ? `<button class="sbtn${won(L) ? '' : ' go'}" data-l="${L.id}" data-m="challenge">⚓ Challenge</button>` : ''}${resume ? `<button class="sbtn go" data-l="${L.id}" data-m="resume">Resume ${S.inProgress.mode}</button>` : ''}</div>`;
}
function layerClass(L) { return won(L) ? 'done' : unlocked(L) ? 'cur' : 'lock'; }
function renderHub() {
  const c = contOf(hubCont), r = rankOf(c.id), tracks = TRACKS[c.id];
  $('#hubIns').innerHTML = ART.insignia(r);
  $('#hubCont').textContent = c.name;
  $('#hubRank').textContent = rankName(r);
  $('#hubTitle').textContent = c.name;
  const nCountries = tracks[0].layers.reduce((a, L) => a + L.items.length, 0);
  $('#hubSub').textContent = `${nCountries} countries${c.id === 'NA' ? ' · 50 states · 13 provinces & territories' : ''}`;
  $('#hubChip').textContent = r === 'admiral' ? 'Mastered!' : `Next rank: ${rankName(RANKS[RANKS.indexOf(r) + 1])}`;
  $('#tracks').style.setProperty('--cols', tracks.length);
  const gateText = {political: () => won(tracks[0].layers.at(-1)) ? 'Complete · Captain earned' : 'Earn Captain',
    capitals: () => atLeast(c.id, 'commodore') ? 'Complete · Commodore earned' : atLeast(c.id, 'captain') ? 'In progress → Commodore' : 'Opens at Captain → Commodore',
    physical: () => tracks[2].layers.every(won) ? 'Complete' : atLeast(c.id, 'commodore') ? 'In progress → Admiral' : 'Opens at Commodore → Admiral',
    states: () => tracks[3].layers.every(won) ? 'Complete' : atLeast(c.id, 'captain') ? 'North America only · needed for Admiral' : 'Opens at Captain · needed for Admiral'};
  $('#tracks').innerHTML = tracks.map(t => {
    const earned = t.layers.every(won), open = unlocked(t.layers[0]);
    let body;
    if (t.id === 'states') {
      body = t.pairs.map(([a, b]) => `<div class="layer ${won(b) ? 'done' : unlocked(a) ? 'cur' : 'lock'}"><div class="t">${a.idx + 1} · ${esc(a.name)} <em>${a.items.length}</em></div>
        <div class="row"><b>Names</b>${pips(a)}${ship(a)}</div>${acts(a)}<div class="row"><b>Capitals</b>${pips(b)}${ship(b)}</div>${acts(b)}</div>`).join('');
    } else {
      const noun = t.id === 'political' ? 'countries' : t.id === 'capitals' ? 'capitals' : 'features';
      body = t.layers.map(L => `<div class="layer ${layerClass(L)}"><div class="t">Layer ${L.idx + 1}${t.id !== 'capitals' ? ' · ' + esc(L.name) : ''} <em>${L.items.length} ${noun}</em></div>
        <div class="row">Tests ${pips(L)}${ship(L)}</div>${L.need < Math.ceil(L.items.length * 0.9) ? `<span class="exc">★ Challenge: ${L.items.length} rounds, up to ${L.items.length - L.need} misses allowed</span>` : ''}${acts(L)}</div>`).join('');
    }
    const chest = t.id === 'physical' ? `<div class="chestbox ${r === 'admiral' ? '' : 'lock'}"><div class="c">${ART.chest()}</div>${r === 'admiral' ? 'Treasure chest opened!' : 'Treasure chest waits at Admiral'}</div>` : '';
    return `<div class="track ${open && !earned ? 'cur' : ''} ${open ? '' : 'lock'}"><h4>${ins(t.rank, !earned)}${t.name}</h4><div class="sub">${gateText[t.id]()}</div>${body}${chest}</div>`;
  }).join('');
  document.querySelectorAll('#tracks [data-l]').forEach(b => b.onclick = () => {
    const L = LAYERS[b.dataset.l];
    if (b.dataset.m === 'resume') resume(); else startPlay(L, b.dataset.m);
  });
}

// ---------- play: map ----------
const pm = {svg: d3.select('#playMap')};
pm.svg.append('defs').html('<pattern id="mtn" width="16" height="11" patternUnits="userSpaceOnUse"><rect width="16" height="11" fill="rgba(150,105,60,.35)"/><path d="M1 10L5.5 3L10 10M8 10L11.5 5L15 10" fill="none" stroke="#e8c294" stroke-width="1"/></pattern>');
pm.g = pm.svg.append('g');
pm.zoom = d3.zoom().scaleExtent([1, 40]).clickDistance(8).tapDistance(14).on('zoom', e => { pm.g.attr('transform', e.transform); pm.k = e.transform.k; scaleMarks(); });
pm.svg.call(pm.zoom).on('dblclick.zoom', null);
pm.k = 1;
$('#zIn').onclick = () => pm.svg.transition().duration(250).call(pm.zoom.scaleBy, 1.7);
$('#zOut').onclick = () => pm.svg.transition().duration(250).call(pm.zoom.scaleBy, 1 / 1.7);
$('#zFit').onclick = () => resetZoom();
function resetZoom(ms = 450) { pm.svg.transition().duration(ms).call(pm.zoom.transform, d3.zoomIdentity); }
function scaleMarks() {
  pm.g.selectAll('circle.tap').attr('r', 15 / pm.k);
  pm.g.selectAll('text.lbl').style('font-size', 12 / pm.k + 'px').style('stroke-width', 3 / pm.k + 'px');
}
function mapBox() {
  const w = innerWidth, h = innerHeight, sr = $('#side').getBoundingClientRect();
  const bottom = sr.left < 5; // bottom sheet
  return bottom ? [[16, 76], [w - 16, h - sr.height - 12]] : [[70, 76], [w - sr.width - 16, h - 16]];
}
function projFor(L) {
  if (L.map === 'state') {
    if (L.idx === 4) return d3.geoAlbersUsa();
    if (L.idx >= 5) return d3.geoConicConformal().parallels([49, 77]).rotate([96, 0]);
    return d3.geoConicEqualArea().parallels([29.5, 45.5]).rotate([96, 0]);
  }
  return d3.geoNaturalEarth1().rotate([contOf(L.cont).rot, 0]);
}
function drawPlayMap() {
  const L = P.layer, w = innerWidth, h = innerHeight;
  pm.svg.attr('viewBox', `0 0 ${w} ${h}`);
  const [[x0, y0], [x1, y1]] = mapBox();
  const padX = (x1 - x0) * 0.05, padY = (y1 - y0) * 0.05;
  const fit = {type: 'FeatureCollection', features: L.items.map(k => L.map === 'phys' ? ITEMS[k].f : ITEMS[k].main)};
  const proj = projFor(L).fitExtent([[x0 + padX, y0 + padY], [x1 - padX, y1 - padY]], fit);
  const path = pm.path = d3.geoPath(proj);
  const inLayer = new Set(L.items);
  pm.g.selectAll('*').remove();
  if (L.map !== 'state' || L.idx !== 4) pm.g.append('path').attr('class', 'grat').attr('d', path(d3.geoGraticule10()));
  const gC = pm.g.append('g');
  if (!(L.map === 'state' && L.idx === 4)) {
    gC.selectAll('path').data(worldFeats.filter(f => f.properties.a2 !== 'AQ')).join('path')
      .attr('class', f => 'cty' + (L.map === 'country' && inLayer.has('c:' + f.properties.a2) ? ' on' : ''))
      .attr('data-k', f => f.properties.quiz ? 'c:' + f.properties.a2 : null)
      .attr('d', path);
  }
  if (L.map === 'state') {
    const sts = L.idx === 4 ? stateFeats.filter(f => f.properties.country === 'USA') : stateFeats;
    pm.g.append('g').selectAll('path').data(sts).join('path')
      .attr('class', f => 'cty' + (inLayer.has('s:' + f.properties.id) ? ' on' : ''))
      .attr('data-k', f => 's:' + f.properties.id).attr('d', path);
  }
  if (L.map === 'phys') {
    const order = ['sea', 'plain', 'island', 'range', 'lake', 'river'];
    const keys = L.items.slice().sort((a, b) => order.indexOf(ITEMS[a].kind) - order.indexOf(ITEMS[b].kind));
    const gp = pm.g.append('g');
    keys.forEach(k => {
      const it = ITEMS[k], g = gp.append('g').attr('class', 'feat').attr('data-k', k);
      g.append('path').attr('class', 'f-' + it.kind).attr('d', path(it.f));
      if (it.kind === 'river') g.append('path').attr('class', 'f-hit').attr('d', path(it.f));
    });
  }
  // enlarged tap circles for small targets
  const small = L.items.filter(k => {
    const it = ITEMS[k]; if (it.kind === 'river') return false;
    const [[a, b], [c, d]] = path.bounds(it.main);
    return Math.max(c - a, d - b) < 24 || Math.abs(path.area(it.main)) < 260;
  });
  pm.g.append('g').selectAll('circle').data(small).join('circle').attr('class', 'tap').attr('data-k', k => k)
    .attr('cx', k => path.centroid(ITEMS[k].main)[0]).attr('cy', k => path.centroid(ITEMS[k].main)[1]).attr('r', 15);
  pm.labels = pm.g.append('g');
  pm.g.selectAll('[data-k]').on('click', function (e) { e.stopPropagation(); onPick(this.dataset.k); });
  pm.svg.call(pm.zoom.transform, d3.zoomIdentity);
  pm.k = 1;
  restyleMap();
}
function labelPoint(k) {
  const it = ITEMS[k];
  if (it.kind === 'river') {
    let best = null, bl = 0;
    const lines = it.f.geometry.type === 'MultiLineString' ? it.f.geometry.coordinates : [it.f.geometry.coordinates];
    lines.forEach(c => { const len = d3.geoLength({type: 'LineString', coordinates: c}); if (len > bl) { bl = len; best = c; } });
    return pm.path.centroid({type: 'Point', coordinates: best[best.length >> 1]});
  }
  return pm.path.centroid(it.main);
}
function restyleMap() {
  const marks = P.marks || {};
  pm.g.selectAll('[data-k]').each(function () {
    const k = this.dataset.k, m = marks[k] || '';
    const base = this.tagName === 'circle' ? 'tap' : this.classList.contains('feat') ? 'feat' : 'cty' + (P.layer.items.includes(k) && P.layer.map !== 'phys' ? ' on' : '');
    this.setAttribute('class', base + (m ? ' ' + m : ''));
  });
  const labs = P.mode === 'learn' && P.showNames ? P.layer.items : P.mode !== 'learn' && !P.answered ? [] : Object.keys(marks).filter(k => ITEMS[k] && marks[k] !== '');
  pm.labels.selectAll('text').data(labs.filter(k => ITEMS[k]), k => k).join('text').attr('class', 'lbl')
    .attr('x', k => labelPoint(k)[0]).attr('y', k => labelPoint(k)[1] - 18 / pm.k * (pm.g.select(`circle[data-k="${k}"]`).empty() ? 0 : 1)).text(k => ITEMS[k].name);
  scaleMarks();
}
function zoomTo(k) {
  const it = ITEMS[k], [[a, b], [c, d]] = pm.path.bounds(it.main);
  const [[x0, y0], [x1, y1]] = mapBox(), vw = x1 - x0, vh = y1 - y0;
  const size = Math.max(c - a, d - b);
  if (size > Math.min(vw, vh) * 0.12) return resetZoom();
  const z = Math.min(8, Math.min(vw, vh) * 0.18 / Math.max(size, 2));
  const t = d3.zoomIdentity.translate((x0 + x1) / 2, (y0 + y1) / 2).scale(z).translate(-(a + c) / 2, -(b + d) / 2);
  pm.svg.transition().duration(650).call(pm.zoom.transform, t);
}

// ---------- play: session ----------
let P = null;
const NOUN = {country: 'country', state: 'state', province: 'province'};
const noun = it => it.kind === 'state' ? (it.country === 'CAN' ? (['YT', 'NT', 'NU'].includes(it.key.slice(2)) ? 'territory' : 'province') : 'state') : it.kind === 'country' ? 'country' : '';
const TYPE_LABEL = {tap: 'Find it on the map', name: 'Name it', capOf: 'Pick the capital', tapCap: 'Capital → tap it', whoseCap: 'Capital → pick it', typeCap: 'Type the capital'};

function makeQueue(L, mode) {
  let keys;
  if (mode === 'challenge') keys = shuffle(L.items);
  else { keys = []; while (keys.length < TEST_LEN) keys.push(...shuffle(L.items)); keys = keys.slice(0, TEST_LEN); }
  let types;
  if (L.ask === 'capital') { types = []; while (types.length < keys.length) types.push(...shuffle(['capOf', 'tapCap', 'whoseCap', 'typeCap'])); }
  else types = keys.map((_, i) => i % 10 < (L.map === 'phys' ? 6 : 7) ? 'tap' : 'name');
  types = shuffle(types.slice(0, keys.length));
  return keys.map((k, i) => ({k, type: types[i]}));
}
function startPlay(L, mode) {
  P = {layer: L, mode, marks: {}, showNames: true};
  if (mode !== 'learn') {
    Object.assign(P, {queue: makeQueue(L, mode), i: 0, score: 0, misses: 0, results: []});
    S.inProgress = {layer: L.id, mode, queue: P.queue, i: 0, score: 0, misses: 0, results: []}; save();
  }
  openPlay();
}
function resume() {
  const ip = S.inProgress, L = ip && LAYERS[ip.layer];
  if (!L) { S.inProgress = null; save(); return; }
  P = {layer: L, mode: ip.mode, marks: {}, queue: ip.queue, i: ip.i, score: ip.score, misses: ip.misses, results: ip.results || [], sunk: !!ip.sunk};
  openPlay();
}
function openPlay() {
  show('play');
  const L = P.layer, r = rankOf(L.cont);
  $('#playIns').innerHTML = ART.insignia(r);
  $('#playKicker').textContent = `${contOf(L.cont).name} · ${trackLabel(L)}`;
  $('#playMode').textContent = P.mode === 'learn' ? 'Learn' : P.mode === 'test' ? `Training test ${Math.min(peek(L.id).passes + 1, 3)} of 3` : 'Sailing Challenge';
  $('#playTitle').textContent = L.track === 'capitals' ? `Capitals · Layer ${L.idx + 1}` : L.name;
  renderSide();
  drawPlayMap();
  if (P.mode !== 'learn') { if (P.sunk || P.i >= P.queue.length) finish(P.sunk); else ask(); }
}
$('#playBack').onclick = () => { P = null; show('hub'); };
function hudPips() {
  const L = P.layer, el = $('#playPips');
  if (P.mode === 'challenge') { const left = P.queue.length - L.need - P.misses; el.innerHTML = `<span class="chip">${left >= 0 ? `Misses left: ${left}` : 'Sunk!'}</span>`; return; }
  if (P.mode === 'learn') { el.innerHTML = ''; return; }
  const n = Math.min(peek(L.id).passes, 3);
  el.innerHTML = [0, 1, 2].map(i => i < n ? '<span class="pip ok">✓</span>' : i === n ? `<span class="pip" style="border-color:#ffd77a;color:#ffd77a">${i + 1}</span>` : `<span class="pip">${i + 1}</span>`).join('');
}

// learn
function renderSide() {
  hudPips();
  if (P.mode !== 'learn') return;
  const L = P.layer, sel = P.sel;
  $('#playSub').textContent = `${L.items.length} to learn · tap the map or the list`;
  const it = sel && ITEMS[sel];
  const card = it ? `<div class="parch"><b>${esc(it.name)}</b>${it.capital && L.ask === 'capital' ? `<br>Capital: <b>${esc(it.capital)}</b>` : ''}${it.fact ? `<br>${esc(it.fact)}` : ''}${!it.fact && !it.capital ? `<br>${esc(kindName(it.kind))}` : ''}</div>` : `<p>Tap a ${L.map === 'phys' ? 'feature' : L.map === 'state' ? 'state or province' : 'country'} to learn about it. When you're ready, take a training test.</p>`;
  const list = L.items.map(k => { const x = ITEMS[k], m = S.missed[k]; return `<li data-k="${k}" class="${k === sel ? 'cur' : ''}">${esc(x.name)}<span>${L.ask === 'capital' ? esc(x.capital) : ''}${m ? ` · missed ${m}×` : ''}</span></li>`; }).join('');
  $('#side').innerHTML = `<span class="tag">Learn</span><h3>${esc(L.track === 'capitals' ? 'Capitals · Layer ' + (L.idx + 1) : L.name)}</h3>${card}
    <ul class="list">${list}</ul><div class="grow"></div>
    <label style="font-size:14px;color:#cfe3f1;margin:6px 0"><input type="checkbox" id="showNames" ${P.showNames ? 'checked' : ''}> Show names on the map</label>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="gbtn" id="goTest" style="font-size:17px;padding:11px 20px">Start test</button>${challengeReady(L) ? '<button class="obtn" id="goChal">⚓ Challenge</button>' : ''}</div>`;
  $('#side').querySelectorAll('li').forEach(li => li.onclick = () => learnPick(li.dataset.k, true));
  $('#showNames').onchange = e => { P.showNames = e.target.checked; restyleMap(); };
  $('#goTest').onclick = () => startPlay(L, 'test');
  const gc = $('#goChal'); if (gc) gc.onclick = () => startPlay(L, 'challenge');
}
const kindName = k => ({range: 'Mountain range', plain: 'Plain, plateau or desert', river: 'River', lake: 'Lake', sea: 'Sea, gulf or bay', island: 'Island'}[k] || '');
function learnPick(k, zoom) {
  if (!P.layer.items.includes(k)) { if (ITEMS[k]) toast(`${ITEMS[k].name} is not in this layer`); return; }
  P.sel = k; P.marks = {[k]: 'hl'};
  renderSide(); restyleMap(); if (zoom) zoomTo(k);
  const li = $('#side li.cur'); li && li.scrollIntoView({block: 'nearest'});
}

// quiz
function nameOf(k) { const it = ITEMS[k]; if (it) return it.name; const f = worldFeats.find(f => 'c:' + f.properties.a2 === k); return f ? f.properties.name : 'there'; }
function distractors(k, n, field) {
  const L = P.layer, it = ITEMS[k], val = x => field === 'capital' ? ITEMS[x].capital : ITEMS[x].name;
  const pools = [L.items, trackOf(L).layers.flatMap(x => x.items), Object.keys(ITEMS).filter(x => ITEMS[x].kind === it.kind || (it.kind !== 'country' && it.kind !== 'state' && ITEMS[x].cont === it.cont && !['country', 'state'].includes(ITEMS[x].kind)))];
  const out = [], seen = new Set([val(k)]);
  for (const pool of pools) for (const x of shuffle(pool)) { if (out.length >= n) break; const v = val(x); if (!seen.has(v)) { seen.add(v); out.push(v); } }
  return out;
}
function ask() {
  const q = P.queue[P.i], it = ITEMS[q.k], L = P.layer, n = P.queue.length;
  P.answered = false; P.marks = {};
  $('#playSub').textContent = `Question ${P.i + 1} of ${n} · ${P.mode === 'challenge' ? `Need ${L.need} / ${n}` : `Need ${TEST_NEED} / ${TEST_LEN}`}`;
  hudPips();
  const what = noun(it) || kindName(it.kind).toLowerCase();
  const nm = `<span class="nm">${esc(it.name)}</span>`, cap = `<span class="nm">${esc(it.capital || '')}</span>`;
  let h, body = '';
  if (q.type === 'tap') h = `Tap ${nm}`;
  else if (q.type === 'name') { h = `What is the highlighted ${what || 'feature'}?`; P.marks[q.k] = 'hl'; body = choices(shuffle([it.name, ...distractors(q.k, 3, 'name')])); }
  else if (q.type === 'capOf') { h = `What is the capital of ${nm}?`; P.marks[q.k] = 'hl'; body = choices(shuffle([it.capital, ...distractors(q.k, 3, 'capital')])); }
  else if (q.type === 'tapCap') h = `Tap the ${what} whose capital is ${cap}`;
  else if (q.type === 'whoseCap') { h = `${cap} is the capital of which ${what}?`; body = choices(shuffle([it.name, ...distractors(q.k, 3, 'name')])); }
  else if (q.type === 'typeCap') { h = `Type the capital of ${nm}`; P.marks[q.k] = 'hl'; body = `<form class="typed" id="typedF"><input id="typedIn" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="Capital city"><button class="sbtn go" style="font-size:16px">Check</button></form>`; }
  const dots = P.queue.map((_, i) => `<i class="${i < P.i ? (P.results[i] ? 'ok' : 'bad') : i === P.i ? 'cur' : ''}"></i>`).join('');
  $('#side').innerHTML = `<span class="tag">${TYPE_LABEL[q.type]}</span><h3>${h}</h3><div class="dots">${dots}</div>${body}<div id="fbBox"></div><div class="grow"></div>`;
  $('#side').querySelectorAll('.choice').forEach(b => b.onclick = () => answer(b.dataset.v === (q.type === 'capOf' ? it.capital : it.name), b));
  const f = $('#typedF');
  if (f) { f.onsubmit = e => { e.preventDefault(); const v = $('#typedIn').value; if (v.trim()) answer(typedOk(v, it), null, v); }; setTimeout(() => $('#typedIn') && $('#typedIn').focus(), 50); }
  restyleMap();
  if (P.marks[q.k] === 'hl') zoomTo(q.k); else resetZoom();
}
function choices(opts) { return `<div class="choices">${opts.map(o => `<button class="choice" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>`; }
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\bst\.?\s/g, 'saint ').replace(/[^a-z]/g, '');
function lev(a, b) {
  const d = Array.from({length: a.length + 1}, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function typedOk(v, it) {
  const n = norm(v);
  return [it.capital, ...(it.alt || [])].map(norm).some(a => a === n || lev(a, n) <= (a.length >= 9 ? 2 : a.length >= 5 ? 1 : 0));
}
function onPick(k) {
  if (!P) return;
  if (P.mode === 'learn') return learnPick(k, false);
  if (P.answered) return;
  const q = P.queue[P.i];
  if (q.type !== 'tap' && q.type !== 'tapCap') return;
  if (P.layer.map === 'phys' && !ITEMS[k]) return;
  answer(k === q.k, null, null, k);
}
function answer(ok, btn, typed, tapped) {
  if (P.answered) return;
  P.answered = true;
  const q = P.queue[P.i], it = ITEMS[q.k], L = P.layer;
  P.results[P.i] = ok;
  if (ok) P.score++; else { P.misses++; S.missed[q.k] = (S.missed[q.k] || 0) + 1; }
  P.marks = {[q.k]: ok ? 'ok' : 'hl'};
  if (tapped && !ok) P.marks[tapped] = 'bad';
  $('#side').querySelectorAll('.choice').forEach(b => { b.disabled = true; if (b.dataset.v === (q.type === 'capOf' ? it.capital : it.name)) b.classList.add('ok'); });
  if (btn && !ok) btn.classList.add('bad');
  const inp = $('#typedIn'); if (inp) inp.disabled = true;
  let msg;
  if (ok) msg = `<div class="fb ok">${['Correct!', 'Well sailed!', 'Aye, that\'s right!', 'Spot on!', 'Bravo!'][Math.random() * 5 | 0]}${q.type === 'typeCap' && norm(typed) !== norm(it.capital) ? ` (It's spelled ${esc(it.capital)}.)` : ''}</div>`;
  else {
    const tn = tapped ? `That's ${esc(nameOf(tapped))}. ` : '';
    const right = q.type === 'capOf' || q.type === 'typeCap' ? `The capital of ${esc(it.name)} is <b>${esc(it.capital)}</b>.` : q.type === 'tapCap' || q.type === 'whoseCap' ? `${esc(it.capital)} is the capital of <b>${esc(it.name)}</b>.` : `This is <b>${esc(it.name)}</b>.`;
    msg = `<div class="fb bad">${tn}${right}</div>`;
  }
  const fact = it.fact ? `<div class="parch"><b>${esc(it.name)}${it.capital && L.ask === 'capital' ? ' · ' + esc(it.capital) : ''}</b><br>${esc(it.fact)}</div>` : '';
  const sunk = P.mode === 'challenge' && P.misses > P.queue.length - L.need;
  const last = P.i + 1 >= P.queue.length || sunk;
  $('#fbBox').innerHTML = `${msg}${fact}<button class="gbtn" id="nextQ" style="width:100%;font-size:18px;margin-top:6px">${last ? 'See results' : 'Next ›'}</button>`;
  $('#nextQ').onclick = () => { if (last) finish(sunk); else { P.i++; ask(); } };
  setTimeout(() => $('#nextQ') && $('#nextQ').focus({preventScroll: true}), 30);
  S.inProgress = {layer: L.id, mode: P.mode, queue: P.queue, i: P.i + 1, score: P.score, misses: P.misses, results: P.results, sunk};
  save(); restyleMap(); hudPips();
  if (!ok) zoomTo(q.k);
}
function finish(sunk) {
  if (P.finished) return;
  P.finished = true;
  const L = P.layer, p = prog(L.id), n = P.queue.length, before = rankOf(L.cont);
  const missed = [...new Set(P.queue.filter((q, i) => P.results[i] === false).map(q => ITEMS[q.k].name))];
  const missList = missed.length ? `<p style="font-size:14px">To review: ${missed.map(esc).join(', ')}</p>` : '';
  S.inProgress = null;
  const back = '<button class="obtn" data-a="hub">Back to port</button>';
  if (P.mode === 'test') {
    const pass = P.score >= TEST_NEED;
    p.tests.push(P.score); p.tests = p.tests.slice(-12);
    if (pass) p.passes++;
    save();
    const unlockedNow = pass && p.passes === PASSES && !p.won;
    const pp = [0, 1, 2].map(i => i < Math.min(p.passes, 3) ? '<span class="pip ok" style="width:30px;height:30px">✓</span>' : `<span class="pip" style="width:30px;height:30px">${i + 1}</span>`).join(' ');
    modal(`<h2>${pass ? 'Test passed!' : 'Keep training'}</h2><div class="big" style="color:${pass ? '#9be8b8' : '#ffb3ab'}">${P.score} / ${TEST_LEN}</div>
      <div>${pp}</div><p>${pass ? (p.passes >= PASSES ? (unlockedNow ? '<b style="color:#ffd77a">Sailing Challenge unlocked!</b>' : 'Your Sailing Challenge is ready.') : `${PASSES - p.passes} more passed test${PASSES - p.passes > 1 ? 's' : ''} to unlock the Sailing Challenge.`) : `You need ${TEST_NEED} out of ${TEST_LEN} to pass.`}</p>${missList}
      <div class="acts">${back}<button class="obtn" data-a="learn">Learn</button>${challengeReady(L) && !p.won ? '<button class="gbtn" data-a="challenge">⚓ Sailing Challenge</button>' : `<button class="gbtn" data-a="test">${pass ? 'Next test' : 'Try again'}</button>`}</div>`, bindResult);
  } else {
    const win = !sunk && P.score >= L.need;
    if (win) { p.won = true; if (!p.best || P.score > +p.best.split('/')[0]) p.best = `${P.score}/${n}`; }
    save();
    const tr = trackOf(L), nextL = tr.layers[tr.layers.indexOf(L) + 1];
    modal(`<h2>${win ? 'Challenge won!' : sunk ? 'Too many hits, back to harbour' : 'Challenge lost'}</h2><div class="big" style="color:${win ? '#ffd77a' : '#ffb3ab'}">${P.score} / ${n}</div>
      <p>${win ? (nextL && unlocked(nextL) ? `Layer complete! <b>${esc(trackLabel(nextL))}</b> is now open.` : 'Layer complete!') : `You need ${L.need} out of ${n}. Train a bit more and try again.`}</p>${missList}
      <div class="acts">${back}${win ? '' : '<button class="obtn" data-a="learn">Learn</button><button class="gbtn" data-a="challenge">Try again</button>'}</div>`, bindResult);
    if (win) celebrate(L.cont, before);
  }
}
function bindResult(c) {
  const L = P.layer;
  c.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    closeModal();
    const a = b.dataset.a;
    if (a === 'hub') { P = null; if (!mq.length) show('hub'); else pendingHub = true; } else startPlay(L, a);
  });
}
let pendingHub = false;
function celebrate(cont, before) {
  const after = rankOf(cont), c = contOf(cont);
  if (RANKS.indexOf(after) <= RANKS.indexOf(before) || S.shown[cont] === after) return;
  S.shown[cont] = after; save();
  const next = {captain: 'Next: learn the capitals to become Commodore.', commodore: `Next: the physical map${cont === 'NA' ? ' and the States & Provinces' : ''} to become Admiral.`, admiral: ''}[after];
  const done = () => { closeModal(); if (pendingHub && !mq.length) { pendingHub = false; show('hub'); } };
  modal(`<p class="serif" style="letter-spacing:4px;color:#8fb3cc;margin:0">PROMOTION</p>${ins(after)}<h2>${rankName(after)} of ${c.name}!</h2><p>${esc(S.player || 'Sailor')}, you have earned a new rank. ${next}</p><div class="acts"><button class="gbtn" data-x>Hooray!</button></div>`, x => x.querySelector('[data-x]').onclick = done);
  if (after === 'admiral') {
    const tracks = TRACKS[cont].map(t => `<span>✓ ${t.id === 'political' ? 'Political' : t.name}</span>`).join('');
    modal(`<h2>${c.name} Mastered!</h2><p style="margin:4px 0">You are now Admiral of ${c.name}</p><div class="chest">${ART.chest()}</div><div class="done-row">${tracks}</div>
      <p>${admirals()} of 6 continents mastered. Become Admiral of all six to be Master of the Continents.</p><div class="acts"><button class="gbtn" data-x>Continue the Voyage</button></div>`, x => x.querySelector('[data-x]').onclick = done);
    if (admirals() === 6) modal(`${ins('admiral')}<h2>Master of the Continents!</h2><p>${esc(S.player || 'Sailor')}, you are Admiral of every continent. The whole world is your chart.</p><div class="acts"><button class="gbtn" data-x>Set sail again</button></div>`, x => x.querySelector('[data-x]').onclick = done);
  }
}

// keyboard: Enter = next
addEventListener('keydown', e => { if (e.key === 'Enter' && $('#nextQ') && current === 'play' && $('#modal').classList.contains('hidden') && document.activeElement?.id !== 'typedIn') { e.preventDefault(); $('#nextQ').click(); } });
let rT;
addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { if (current === 'chart') renderChart(); if (current === 'play' && P) drawPlayMap(); }, 150); });

Promise.all(['world', 'physical', 'states'].map(n => fetch(`data/${n}.json`).then(r => r.json()))).then(([w, p, s]) => {
  buildData(w, p, s);
  renderTitle();
  window.MOTC = {S: () => S, LAYERS, ITEMS, TRACKS, save, reload: () => { S = load(); }};
}).catch(e => { $('#titleStatus').textContent = 'Could not load the maps. Check your connection and reload.'; console.error(e); });
