(() => {
const ROUND = 10;
const REGIONS = [
  {id: 'world', name: 'Whole world', rot: 0, box: [[-170, -56], [180, 78]], c: '#bfe3ff', d: '#86c3f2'},
  {id: 'EU', name: 'Europe', rot: -15, box: [[-25, 34], [45, 71]], c: '#e6d4ff', d: '#bfa2ef'},
  {id: 'AS', name: 'Asia', rot: -90, box: [[25, -11], [150, 56]], c: '#ffd3e3', d: '#f2a2c0'},
  {id: 'AF', name: 'Africa', rot: -15, box: [[-20, -36], [55, 38]], c: '#ffe7a8', d: '#efc65a'},
  {id: 'NA', name: 'North America', rot: 100, box: [[-170, 6], [-50, 75]], c: '#ffd6bf', d: '#f2a982'},
  {id: 'SA', name: 'South America', rot: 60, box: [[-85, -56], [-33, 13]], c: '#ccf5c4', d: '#8fd884'},
  {id: 'OC', name: 'Oceania', rot: -160, box: [[110, -48], [190, 2]], c: '#c4f1ec', d: '#7fd3c9'},
];
const MODES = {find: 'Find it', name: 'Name it', capital: 'Capitals'};
const FLAME = '<svg class="flame" viewBox="0 0 24 24"><path d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3-1-4 1-7 1-9z" fill="#ff7a1a"/><path d="M12 12c2 2 3 3 3 5a3 3 0 0 1-6 0c0-2 2-3 3-5z" fill="#ffc531"/></svg>';
const TROPHY = '<svg viewBox="0 0 64 64"><path d="M18 8h28v14a14 14 0 0 1-28 0z" fill="#ffc531" stroke="#c27c00" stroke-width="3"/><path d="M18 13H9c0 9 4 13 10 14M46 13h9c0 9-4 13-10 14" fill="none" stroke="#c27c00" stroke-width="3"/><rect x="28" y="35" width="8" height="10" fill="#e09b00"/><rect x="18" y="45" width="28" height="9" rx="3" fill="#5a3fd6"/><path d="M26 14l3 6 6 1-4 4 1 6-6-3" fill="#fff6c7"/></svg>';
const CHEERS = ['Awesome!', 'Great job!', 'Nailed it!', 'Correct!', 'Brilliant!', 'You got it!', 'Super!', 'Amazing!'];

const $ = s => document.querySelector(s);
const svg = d3.select('#map');
const zoomLayer = svg.append('g');
const gratLayer = zoomLayer.append('path').attr('class', 'grat');
const shadowLayer = zoomLayer.append('path').attr('class', 'shadow');
const landLayer = zoomLayer.append('g');
const dotLayer = zoomLayer.append('g');
const ringLayer = zoomLayer.append('g');
let features = [], quizPool = [], landShape, path, zoom, curK = 1;
let settings = load('settings') || {mode: 'find', region: 'world'};
let game = null;

function load(k) { try { return JSON.parse(localStorage.getItem('geo.' + k)); } catch { return null; } }
function save(k, v) { try { localStorage.setItem('geo.' + k, JSON.stringify(v)); } catch {} }
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const inRegion = (f, r) => r === 'world' || f.properties.continent === r;

fetch('data/world.json').then(r => r.json()).then(topo => {
  const geoms = topo.objects.countries.geometries;
  features = topojson.feature(topo, topo.objects.countries).features;
  // colour the map so neighbouring countries never share a colour
  const nb = topojson.neighbors(geoms);
  const order = d3.range(features.length).sort((a, b) => nb[b].length - nb[a].length);
  const col = [];
  order.forEach(i => {
    const used = new Set(nb[i].map(j => col[j]));
    let c = (i * 7) % 5; for (let t = 0; t < 5 && used.has(c); t++) c = (c + 1) % 5;
    col[i] = c;
  });
  features.forEach((f, i) => { f.idx = i; f.color = col[i]; });
  landShape = topojson.merge(topo, geoms);
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
  const pad = game ? 14 : 20;
  const proj = d3.geoNaturalEarth1().rotate([region.rot, 0])
    .fitExtent([[pad, pad], [w - pad, h - pad - (game ? 18 : 0)]], {type: 'MultiPoint', coordinates: pts});
  path = d3.geoPath(proj);
  svg.attr('viewBox', `0 0 ${w} ${h}`);

  gratLayer.attr('d', path(d3.geoGraticule10()));
  shadowLayer.attr('d', path(landShape));
  landLayer.selectAll('path').data(features, f => f.idx).join('path')
    .attr('d', path)
    .on('click', (e, f) => onTap(f));

  const tiny = features.filter(f => f.properties.quiz && inRegion(f, region.id) && (() => {
    const [[a, b], [c, d]] = path.bounds(f);
    return Math.max(c - a, d - b) < 30 && Math.abs(path.area(f)) < 40;
  })());
  dotLayer.selectAll('circle').data(tiny, f => f.idx).join('circle')
    .attr('transform', f => `translate(${path.centroid(f)})`)
    .on('click', (e, f) => onTap(f));

  zoom = d3.zoom().scaleExtent([1, 40]).translateExtent([[-w, -h], [2 * w, 2 * h]])
    .clickDistance(6).tapDistance(12)
    .on('zoom', e => { zoomLayer.attr('transform', e.transform); curK = e.transform.k; scaleMarks(); });
  svg.call(zoom).on('dblclick.zoom', null);
  svg.call(zoom.transform, d3.zoomIdentity);
  restyle();
}
function scaleMarks() {
  dotLayer.selectAll('circle').attr('r', 7 / curK);
  shadowLayer.attr('transform', `translate(${1.2 / curK},${2.4 / curK})`);
  ringLayer.selectAll('circle').attr('r', function () { return +this.dataset.r / curK; });
}

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
$('#zoomReset').onclick = () => (game && game.mode !== 'find' && game.queue[game.i]) ? zoomTo(game.queue[game.i], 0.3) : resetZoom();

let toastTimer;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
  t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add('hidden'), 1600);
}

function restyle() {
  const m = game ? game.marks : {};
  const region = game ? game.region : settings.region;
  landLayer.selectAll('path').attr('class', f => 'country ' + (inRegion(f, region) ? 'c' + f.color : 'out') + (m[f.idx] ? ' ' + m[f.idx] : ''));
  dotLayer.selectAll('circle').attr('class', f => 'dot' + (m[f.idx] ? ' ' + m[f.idx] : ''));
  landLayer.selectAll('path').filter(f => m[f.idx]).raise();
  // ring around a highlighted small country so it is easy to spot
  const ringed = Object.keys(m).filter(i => m[i] === 'target' || m[i] === 'reveal').map(i => features[i])
    .filter(f => { const [[a, b], [c, d]] = path.bounds(f); return Math.max(c - a, d - b) < 40; });
  ringLayer.selectAll('g').data(ringed, f => f.idx)
    .join(enter => { const g = enter.append('g'); g.append('circle').attr('class', 'ring').attr('data-r', 24); return g; })
    .attr('transform', f => `translate(${path.centroid(f)})`);
  scaleMarks();
}

// ---------- confetti ----------
const cv = $('#confetti'), cx = cv.getContext('2d');
let parts = [], raf = 0;
function confetti(n = 80, x = innerWidth / 2, y = innerHeight * 0.6) {
  const cols = ['#ffc531', '#ff2e88', '#22c55e', '#2a5bd7', '#5a3fd6', '#ff7a1a', '#38bdf8'];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - .5) * 1.9, v = 7 + Math.random() * 9;
    parts.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * 6.28, vr: (Math.random() - .5) * .4,
      w: 6 + Math.random() * 6, h: 4 + Math.random() * 6, c: cols[i % cols.length], life: 0});
  }
  if (!raf) tick();
}
function tick() {
  const dpr = devicePixelRatio || 1;
  if (cv.width !== innerWidth * dpr) { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; }
  cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter(p => p.life < 140 && p.y < innerHeight + 20);
  parts.forEach(p => {
    p.life++; p.vy += .28; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
    cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.globalAlpha = Math.min(1, (140 - p.life) / 30);
    cx.fillStyle = p.c; cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); cx.restore();
  });
  raf = parts.length ? requestAnimationFrame(tick) : (cx.clearRect(0, 0, innerWidth, innerHeight), 0);
}

// ---------- menu ----------
function buildMenu() {
  const rg = $('#regionGroup');
  rg.innerHTML = '';
  REGIONS.forEach(r => {
    const b = document.createElement('button');
    b.className = 'opt region'; b.dataset.region = r.id;
    b.style.setProperty('--rc', r.c); b.style.setProperty('--rd', r.d);
    b.innerHTML = `<b>${r.name}</b><span class="best"></span>`;
    rg.appendChild(b);
  });
  document.querySelectorAll('#modeGroup .opt').forEach(b => b.onclick = () => { settings.mode = b.dataset.mode; refreshMenu(); });
  rg.querySelectorAll('.opt').forEach(b => b.onclick = () => { settings.region = b.dataset.region; refreshMenu(); drawMap(); });
  refreshMenu();
}
function refreshMenu() {
  document.querySelectorAll('#modeGroup .opt').forEach(b => b.classList.toggle('selected', b.dataset.mode === settings.mode));
  const best = load('best') || {};
  document.querySelectorAll('#regionGroup .opt').forEach(b => {
    b.classList.toggle('selected', b.dataset.region === settings.region);
    const s = best[settings.mode + ':' + b.dataset.region];
    b.querySelector('.best').textContent = s != null ? `\u2605 Best ${s}/${ROUND * 3}` : '';
  });
  save('settings', settings);
}
function showMenu() {
  game = null;
  $('#menu').classList.remove('hidden');
  ['#results', '#prompt', '#stats', '#menuBtn', '#dots'].forEach(s => $(s).classList.add('hidden'));
  $('#brand').classList.remove('hidden');
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
    missed: [], marks: {}, tries: 0, done: false, results: [],
  };
  $('#menu').classList.add('hidden');
  $('#results').classList.add('hidden');
  ['#prompt', '#stats', '#menuBtn', '#dots'].forEach(s => $(s).classList.remove('hidden'));
  $('#brand').classList.toggle('hidden', innerWidth < 900);
  $('#dots').innerHTML = game.queue.map(() => '<i></i>').join('');
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
    $('#question').innerHTML = `Where is <span class="name">${p.name}</span>?`;
    resetZoom();
  } else {
    game.marks[f.idx] = 'target';
    const isCap = game.mode === 'capital';
    $('#question').innerHTML = isCap
      ? `What is the capital of <span class="name">${p.name}</span>?`
      : 'Which country is <span class="flash">flashing</span>?';
    const key = isCap ? (x => x.properties.capital) : (x => x.properties.name);
    const others = shuffle(game.pool.filter(x => x !== f && key(x) && key(x) !== key(f)));
    others.sort((a, b) => (a.properties.continent === p.continent ? 0 : 1) - (b.properties.continent === p.continent ? 0 : 1));
    shuffle([f, ...others.slice(0, 3)]).forEach(o => {
      const b = document.createElement('button');
      b.className = 'btn'; b.textContent = key(o);
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
  if (f && (game.mode !== 'find' || game.done)) zoomTo(f, 0.3, 0);
}

function points() { return [3, 2, 1][game.tries] || 0; }

function correct() {
  const pts = points();
  game.score += pts; game.streak++; game.bestStreak = Math.max(game.bestStreak, game.streak);
  game.results[game.i] = game.tries === 0 ? 'r' : 'p';
  $('#feedback').textContent = `${CHEERS[Math.random() * CHEERS.length | 0]} +${pts}` + (game.streak >= 3 ? ` \u00b7 ${game.streak} in a row!` : '');
  $('#feedback').className = 'good';
  const r = $('#prompt').getBoundingClientRect();
  confetti(game.tries === 0 ? 70 : 35, innerWidth / 2, r.top + 10);
  $('#score').classList.remove('bump'); void $('#score').offsetWidth; $('#score').classList.add('bump');
  endQuestion();
}
function giveUp() {
  const f = game.queue[game.i], p = f.properties;
  game.streak = 0; game.missed.push(p); game.results[game.i] = 'm';
  game.marks[f.idx] = 'reveal';
  $('#feedback').textContent = game.mode === 'capital' ? `The capital of ${p.name} is ${p.capital}.` : `That one is ${p.name}.`;
  $('#feedback').className = 'bad';
  zoomTo(f, 0.3);
  endQuestion();
}
function endQuestion() {
  game.done = true;
  restyle(); updateStats();
  $('#nextBtn').classList.remove('hidden');
  $('#nextBtn').innerHTML = game.i === game.queue.length - 1 ? 'See results' : 'Next \u2192';
}
$('#nextBtn').onclick = () => nextQuestion(false);

function onTap(f) {
  if (!game || game.done || game.mode !== 'find') { toast(f.properties.name); return; }
  const target = game.queue[game.i];
  if (f === target || (f.properties.a2 && f.properties.a2 === target.properties.a2)) { game.marks[target.idx] = 'right'; correct(); return; }
  game.marks[f.idx] = 'wrong'; restyle();
  toast(`Oops, that's ${f.properties.name}`);
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
  if (o === f) { btn.classList.add('right'); game.marks[f.idx] = 'right'; disableChoices(); correct(); return; }
  btn.classList.add('wrong'); btn.disabled = true;
  game.tries++;
  if (game.tries >= 2) {
    disableChoices();
    const ans = game.mode === 'capital' ? f.properties.capital : f.properties.name;
    [...$('#choices').children].forEach(b => { if (b.textContent === ans) b.classList.add('right'); });
    giveUp();
  } else {
    $('#feedback').textContent = game.mode === 'name' ? `No, that's not ${o.properties.name}. One more try!` : 'Not that one. One more try!';
    $('#feedback').className = 'bad';
  }
}
function disableChoices() { [...$('#choices').children].forEach(b => b.disabled = true); }

function updateStats() {
  $('#score b').textContent = game.score;
  const st = $('#streak');
  st.classList.toggle('hidden', game.streak < 2);
  st.innerHTML = `${FLAME} ${game.streak}`;
  [...$('#dots').children].forEach((d, i) => d.className = (game.results[i] || '') + (i === game.i && !game.done ? ' cur' : ''));
}

function finish() {
  const max = game.queue.length * 3, s = game.score, pct = s / max;
  const stars = pct >= 0.9 ? 3 : pct >= 0.6 ? 2 : pct >= 0.3 ? 1 : 0;
  $('#trophy').innerHTML = stars >= 2 ? TROPHY : '<img src="icon.svg" alt="">';
  $('#resultTitle').textContent = ['Keep practising!', 'Nice try!', 'Great job!', 'Geography genius!'][stars];
  $('#stars').innerHTML = [0, 1, 2].map(i => `<span class="${i < stars ? 'on' : ''}">\u2605</span>`).join('');
  $('#resultScore').textContent = `${s} / ${max} points`;
  const best = load('best') || {}, key = game.mode + ':' + game.region;
  const prev = best[key];
  const isBest = prev == null || s > prev;
  if (isBest) { best[key] = s; save('best', best); }
  const region = REGIONS.find(r => r.id === game.region).name;
  $('#resultBest').textContent = (prev != null && s > prev ? `New best for ${MODES[game.mode]} \u00b7 ${region}!`
    : `Best for ${MODES[game.mode]} \u00b7 ${region}: ${Math.max(s, prev ?? 0)}`) + (game.bestStreak > 1 ? ` \u00b7 Longest streak ${game.bestStreak}` : '');
  $('#missed').innerHTML = game.missed.length
    ? `<b>Practise these:</b>${game.missed.map(p => `<span>${p.name}${game.mode === 'capital' ? ' \u2013 ' + p.capital : ''}</span>`).join('')}` : '';
  $('#results').classList.remove('hidden');
  $('#prompt').classList.add('hidden');
  if (stars >= 2) { confetti(120, innerWidth / 2, innerHeight * 0.45); setTimeout(() => confetti(90, innerWidth * 0.25, innerHeight * 0.5), 300); setTimeout(() => confetti(90, innerWidth * 0.75, innerHeight * 0.5), 600); }
}
})();
