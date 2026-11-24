(() => {
const ROUND = 10;
const REGIONS = [
  {id: 'world', name: 'World', rot: 0, box: [[-170, -56], [180, 78]]},
  {id: 'EU', name: 'Europe', rot: -15, box: [[-25, 34], [45, 71]]},
  {id: 'AS', name: 'Asia', rot: -90, box: [[25, -11], [150, 56]]},
  {id: 'AF', name: 'Africa', rot: -15, box: [[-20, -36], [55, 38]]},
  {id: 'NA', name: 'North America', rot: 100, box: [[-170, 6], [-50, 75]]},
  {id: 'SA', name: 'South America', rot: 60, box: [[-85, -56], [-33, 13]]},
  {id: 'OC', name: 'Oceania', rot: -160, box: [[110, -48], [190, 2]]},
];
const MODES = {find: 'Find it', name: 'Name it', capital: 'Capitals'};

const $ = s => document.querySelector(s);
const svg = d3.select('#map');
const zoomLayer = svg.append('g');
const landLayer = zoomLayer.append('g');
const dotLayer = zoomLayer.append('g');
let features = [], quizPool = [], path, zoom, curK = 1;
let settings = load('settings') || {mode: 'find', region: 'world'};
let game = null;

function load(k) { try { return JSON.parse(localStorage.getItem('geo.' + k)); } catch { return null; } }
function save(k, v) { try { localStorage.setItem('geo.' + k, JSON.stringify(v)); } catch {} }
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const inRegion = (f, r) => r === 'world' || f.properties.continent === r;

fetch('data/world.json').then(r => r.json()).then(topo => {
  features = topojson.feature(topo, topo.objects.countries).features;
  features.forEach((f, i) => f.idx = i);
  quizPool = features.filter(f => f.properties.quiz);
  buildMenu();
  drawMap();
  window.addEventListener('resize', () => { drawMap(); if (game) refocus(); });
});

// ---------- map ----------
function size() { const r = $('#mapWrap').getBoundingClientRect(); return [r.width, r.height]; }

function drawMap() {
  const [w, h] = size();
  const region = REGIONS.find(r => r.id === (game ? game.region : settings.region));
  const [[x0, y0], [x1, y1]] = region.box;
  const pts = [];
  for (let i = 0; i <= 8; i++) { const x = x0 + (x1 - x0) * i / 8; pts.push([x, y0], [x, y1]); }
  for (let i = 0; i <= 8; i++) { const y = y0 + (y1 - y0) * i / 8; pts.push([x0, y], [x1, y]); }
  const proj = d3.geoNaturalEarth1().rotate([region.rot, 0])
    .fitExtent([[12, 12], [w - 12, h - 12]], {type: 'MultiPoint', coordinates: pts});
  path = d3.geoPath(proj);
  svg.attr('viewBox', `0 0 ${w} ${h}`);

  landLayer.selectAll('path').data(features, f => f.idx).join('path')
    .attr('class', f => 'country' + (inRegion(f, region.id) ? '' : ' out'))
    .attr('d', path)
    .on('click', (e, f) => onTap(f));

  const tiny = features.filter(f => f.properties.quiz && inRegion(f, region.id) && (() => { const [[a, b], [c, d]] = path.bounds(f); return Math.max(c - a, d - b) < 30 && Math.abs(path.area(f)) < 40; })());
  dotLayer.selectAll('circle').data(tiny, f => f.idx).join('circle')
    .attr('class', 'dot')
    .attr('transform', f => { const c = path.centroid(f); return `translate(${c})`; })
    .on('click', (e, f) => onTap(f));
  scaleDots();

  zoom = d3.zoom().scaleExtent([1, 40]).translateExtent([[-w, -h], [2 * w, 2 * h]])
    .clickDistance(6).tapDistance(12)
    .on('zoom', e => { zoomLayer.attr('transform', e.transform); curK = e.transform.k; scaleDots(); });
  svg.call(zoom).on('dblclick.zoom', null);
  svg.call(zoom.transform, d3.zoomIdentity);
  if (game) restyle();
}
function scaleDots() { dotLayer.selectAll('circle').attr('r', 7 / curK); }

function zoomTo(f, fill = 0.35, ms = 750) {
  const [w, h] = size();
  const [[a, b], [c, d]] = path.bounds(f);
  const k = Math.max(1, Math.min(14, fill / Math.max((c - a) / w, (d - b) / h)));
  const t = d3.zoomIdentity.translate(w / 2, h / 2).scale(k).translate(-(a + c) / 2, -(b + d) / 2);
  svg.transition().duration(ms).call(zoom.transform, t);
}
function resetZoom(ms = 600) { svg.transition().duration(ms).call(zoom.transform, d3.zoomIdentity); }

$('#zoomIn').onclick = () => svg.transition().duration(250).call(zoom.scaleBy, 1.6);
$('#zoomOut').onclick = () => svg.transition().duration(250).call(zoom.scaleBy, 1 / 1.6);
$('#zoomReset').onclick = () => resetZoom();

let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add('hidden'), 1600);
}

// marks: idx -> class
function restyle() {
  const m = game ? game.marks : {};
  const region = game ? game.region : settings.region;
  const cls = (base, f) => base + (inRegion(f, region) ? '' : ' out') + (m[f.idx] ? ' ' + m[f.idx] : '');
  landLayer.selectAll('path').attr('class', f => cls('country', f));
  dotLayer.selectAll('circle').attr('class', f => cls('dot', f));
  // keep highlighted shapes on top
  landLayer.selectAll('path').filter(f => m[f.idx]).raise();
}

// ---------- menu ----------
function buildMenu() {
  const rg = $('#regionGroup');
  rg.innerHTML = '';
  REGIONS.forEach(r => {
    const b = document.createElement('button');
    b.className = 'opt'; b.dataset.region = r.id;
    b.innerHTML = `<b>${r.name}</b><span class="best"></span>`;
    rg.appendChild(b);
  });
  document.querySelectorAll('#modeGroup .opt').forEach(b => b.onclick = () => { settings.mode = b.dataset.mode; refreshMenu(); });
  rg.querySelectorAll('.opt').forEach(b => b.onclick = () => {
    settings.region = b.dataset.region; refreshMenu(); drawMap();
  });
  refreshMenu();
}
function refreshMenu() {
  document.querySelectorAll('#modeGroup .opt').forEach(b => b.classList.toggle('selected', b.dataset.mode === settings.mode));
  const best = load('best') || {};
  document.querySelectorAll('#regionGroup .opt').forEach(b => {
    b.classList.toggle('selected', b.dataset.region === settings.region);
    const s = best[settings.mode + ':' + b.dataset.region];
    b.querySelector('.best').textContent = s != null ? `Best: ${s}/${ROUND * 3}` : ' ';
  });
  save('settings', settings);
}
function showMenu() {
  game = null;
  $('#menu').classList.remove('hidden');
  $('#results').classList.add('hidden');
  $('#prompt').classList.add('hidden');
  $('#stats').classList.add('hidden');
  $('#menuBtn').classList.add('hidden');
  refreshMenu(); drawMap();
}
$('#menuBtn').onclick = showMenu;
$('#toMenuBtn').onclick = showMenu;
$('#startBtn').onclick = startGame;
$('#againBtn').onclick = startGame;

// ---------- game ----------
function startGame() {
  const pool = quizPool.filter(f => inRegion(f, settings.region) && (settings.mode !== 'capital' || f.properties.capital));
  game = {
    mode: settings.mode, region: settings.region, pool,
    queue: shuffle(pool).slice(0, ROUND), i: 0, score: 0, streak: 0, bestStreak: 0,
    missed: [], marks: {}, tries: 0, done: false,
  };
  $('#menu').classList.add('hidden');
  $('#results').classList.add('hidden');
  $('#prompt').classList.remove('hidden');
  $('#stats').classList.remove('hidden');
  $('#menuBtn').classList.remove('hidden');
  drawMap();
  nextQuestion(true);
}

function nextQuestion(first) {
  if (!first) game.i++;
  if (game.i >= game.queue.length) return finish();
  game.tries = 0; game.done = false; game.marks = {};
  const f = game.queue[game.i], p = f.properties;
  $('#feedback').textContent = ''; $('#feedback').className = '';
  $('#nextBtn').classList.add('hidden');
  $('#choices').innerHTML = '';
  if (game.mode === 'find') {
    $('#question').innerHTML = `Find <span class="name">${p.name}</span>`;
    resetZoom();
  } else {
    game.marks[f.idx] = 'target';
    const isCap = game.mode === 'capital';
    $('#question').innerHTML = isCap
      ? `What is the capital of <span class="name">${p.name}</span>?`
      : 'Which country is <span class="name">orange</span>?';
    const key = isCap ? (x => x.properties.capital) : (x => x.properties.name);
    const others = shuffle(game.pool.filter(x => x !== f && key(x) && key(x) !== key(f)));
    // prefer neighbours-ish: same continent first
    others.sort((a, b) => (a.properties.continent === p.continent ? 0 : 1) - (b.properties.continent === p.continent ? 0 : 1));
    const opts = shuffle([f, ...others.slice(0, 3)]);
    opts.forEach(o => {
      const b = document.createElement('button');
      b.textContent = key(o);
      b.onclick = () => onChoice(o, b);
      $('#choices').appendChild(b);
    });
    zoomTo(f, 0.3);
  }
  restyle();
  updateStats();
}
function refocus() {
  const f = game.queue[game.i];
  if (game.mode !== 'find' || game.done) f && zoomTo(f, 0.3, 0);
}

function points() { return [3, 2, 1][game.tries] || 0; }

function correct() {
  const pts = points();
  game.score += pts; game.streak++; game.bestStreak = Math.max(game.bestStreak, game.streak);
  const cheers = ['Awesome!', 'Great job!', 'Nailed it!', 'Correct!', 'Brilliant!', 'You got it!'];
  $('#feedback').textContent = `${cheers[Math.random() * cheers.length | 0]} +${pts}`;
  $('#feedback').className = 'good';
  endQuestion();
}
function giveUp() {
  const f = game.queue[game.i];
  game.streak = 0; game.missed.push(f.properties);
  game.marks[f.idx] = 'reveal';
  const p = f.properties;
  $('#feedback').textContent = game.mode === 'capital' ? `The capital of ${p.name} is ${p.capital}.` : `That one was ${p.name}.`;
  $('#feedback').className = 'bad';
  zoomTo(f, 0.3);
  endQuestion();
}
function endQuestion() {
  game.done = true;
  restyle(); updateStats();
  $('#nextBtn').classList.remove('hidden');
  $('#nextBtn').textContent = game.i === game.queue.length - 1 ? 'See results' : 'Next \u2192';
}
$('#nextBtn').onclick = () => nextQuestion(false);

function onTap(f) {
  if (!game) { toast(f.properties.name); return; }
  if (game.done || game.mode !== 'find') { toast(f.properties.name); return; }
  const target = game.queue[game.i];
  if (f === target || (f.properties.a2 && f.properties.a2 === target.properties.a2)) { game.marks[f.idx] = 'right'; correct(); return; }
  game.marks[f.idx] = 'wrong'; restyle();
  toast(`That's ${f.properties.name}`);
  game.tries++;
  setTimeout(() => { if (game && game.marks[f.idx] === 'wrong') { delete game.marks[f.idx]; restyle(); } }, 900);
  if (game.tries >= 3) giveUp();
  else {
    $('#feedback').textContent = `Not quite! ${3 - game.tries} ${3 - game.tries === 1 ? 'try' : 'tries'} left`;
    $('#feedback').className = 'bad';
  }
}

function onChoice(o, btn) {
  if (game.done || btn.disabled) return;
  const f = game.queue[game.i];
  if (o === f) {
    btn.classList.add('right'); game.marks[f.idx] = 'right'; correct();
    disableChoices(); return;
  }
  btn.classList.add('wrong'); btn.disabled = true;
  game.tries++;
  if (game.tries >= 2) {
    disableChoices();
    [...$('#choices').children].forEach(b => { if (b.textContent === (game.mode === 'capital' ? f.properties.capital : f.properties.name)) b.classList.add('right'); });
    giveUp();
  } else {
    $('#feedback').textContent = game.mode === 'name' ? `No, that's not ${o.properties.name}. One more try!` : 'Not that one. One more try!';
    $('#feedback').className = 'bad';
  }
}
function disableChoices() { [...$('#choices').children].forEach(b => b.disabled = true); }

function updateStats() {
  $('#progress').textContent = `${Math.min(game.i + 1, game.queue.length)}/${game.queue.length}`;
  $('#score').textContent = `${game.score} pts`;
  $('#streak').textContent = game.streak >= 2 ? `\u{1F525}${game.streak}` : '';
}

function finish() {
  const max = game.queue.length * 3, s = game.score, pct = s / max;
  const stars = pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : pct >= 0.3 ? 1 : 0;
  $('#resultTitle').textContent = ['Keep practising!', 'Nice try!', 'Great job!', 'Geography genius!'][stars];
  $('#stars').innerHTML = [0, 1, 2].map(i => `<span class="${i < stars ? 'on' : ''}">\u2605</span>`).join('');
  $('#resultScore').textContent = `${s} / ${max} points`;
  const best = load('best') || {}, key = game.mode + ':' + game.region;
  const prev = best[key];
  if (prev == null || s > prev) { best[key] = s; save('best', best); }
  const region = REGIONS.find(r => r.id === game.region).name;
  $('#resultBest').textContent = prev != null && s > prev ? `New best for ${MODES[game.mode]} \u00b7 ${region}!`
    : `Best for ${MODES[game.mode]} \u00b7 ${region}: ${Math.max(s, prev ?? 0)}` + (game.bestStreak > 1 ? ` \u00b7 Longest streak: ${game.bestStreak}` : '');
  $('#missed').innerHTML = game.missed.length
    ? `<b>Practise these:</b><ul>${game.missed.map(p => `<li>${p.name}${game.mode === 'capital' ? ' \u2013 ' + p.capital : ''}</li>`).join('')}</ul>` : '';
  $('#results').classList.remove('hidden');
  $('#prompt').classList.add('hidden');
}
})();
