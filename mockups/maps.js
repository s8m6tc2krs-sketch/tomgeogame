const L2 = ['Cuba','Jamaica','Haiti','Dominican Republic','Bahamas','Antigua and Barbuda','Barbados','Dominica','Grenada','Saint Kitts and Nevis','Saint Lucia','Saint Vincent and the Grenadines','Trinidad and Tobago'];
const L1 = ['Canada','United States','Mexico','Guatemala','Belize','Honduras','El Salvador','Nicaragua','Costa Rica','Panama'];
const SHORT = {'Saint Vincent and the Grenadines':'St Vincent & Gren.','Saint Kitts and Nevis':'St Kitts & Nevis','Antigua and Barbuda':'Antigua & Barbuda','Trinidad and Tobago':'Trinidad & Tobago','Dominican Republic':'Dominican Rep.'};
const W = 1024, H = 768;
function fitBox(rot, [[x0, y0], [x1, y1]], ext) {
  const pts = []; for (let i = 0; i <= 8; i++) { const x = x0 + (x1 - x0) * i / 8, y = y0 + (y1 - y0) * i / 8; pts.push([x, y0], [x, y1], [x0, y], [x1, y]); }
  return d3.geoNaturalEarth1().rotate([rot, 0]).fitExtent(ext, {type: 'MultiPoint', coordinates: pts});
}
function defs(svg) {
  svg.append('defs').html(`<pattern id="mtn" width="14" height="10" patternUnits="userSpaceOnUse"><rect width="14" height="10" fill="#6b4f33"/><path d="M0 10L4 3L7 7L10 2L14 10Z" fill="#a9825a"/><path d="M4 3l1 2M10 2l1 2" stroke="#efe2c8" stroke-width="1"/></pattern>`);
}
function base(sel, proj, vb = [W, H]) {
  const svg = d3.select(sel).attr('viewBox', `0 0 ${vb[0]} ${vb[1]}`); defs(svg);
  const path = d3.geoPath(proj);
  svg.append('path').attr('class', 'grat').attr('d', path(d3.geoGraticule().step([10, 10])()));
  return {svg, path};
}
function drawCountries(svg, path, feats, cls) {
  svg.append('g').selectAll('path').data(feats).join('path').attr('d', path).attr('class', f => 'cty ' + (cls(f) || ''));
}
function taps(svg, path, feats, opts) {
  const g = svg.append('g');
  feats.forEach(f => {
    const [[a, b], [c, d]] = path.bounds(f); const big = Math.max(c - a, d - b);
    const [x, y] = path.centroid(f); const st = opts.state(f);
    if (big < 34 || (opts.force && opts.force(f))) g.append('circle').attr('cx', x).attr('cy', y).attr('r', 17).attr('class', 'tap ' + (st || ''));
    if (opts.label && opts.label(f)) {
      const dx = opts.dx ? opts.dx(f) : 0, dy = opts.dy ? opts.dy(f) : (big < 34 ? 30 : 4);
      g.append('text').attr('class', 'lbl').attr('x', x + dx).attr('y', y + dy).attr('text-anchor', 'middle').text(opts.label(f));
    }
  });
}
Promise.all(['na', 'land', 'states'].map(n => fetch(`data/${n}.json`).then(r => r.json()))).then(([na, land, st]) => {
  const C = topojson.feature(na, na.objects.countries).features;
  const lf = topojson.feature(land, land.objects.land);
  const under = (svg, path) => svg.append('path').attr('class', 'cty').attr('d', path(lf));
  const carib = [[-86, 9.5], [-59, 27]];

  // world voyage chart
  { const proj = fitBox(-10, [[-170, -50], [180, 75]], [[30, 90], [W - 30, H - 30]]);
    const {svg, path} = base('#m-world', proj);
    svg.append('path').attr('class', 'coast').attr('d', path(lf));
    svg.append('path').attr('d', path(lf)).attr('fill', '#24503f').attr('stroke', '#7fb59a').attr('stroke-width', .8);
    const route = [[-100, 45], [-60, -15], [20, 5], [15, 50], [90, 35], [135, -25]].map(p => proj(p));
    svg.append('path').attr('d', d3.line().curve(d3.curveCatmullRom)(route)).attr('fill', 'none').attr('stroke', '#ffd77a').attr('stroke-width', 2.5).attr('stroke-dasharray', '2 9').attr('stroke-linecap', 'round').attr('opacity', .8);
    document.querySelectorAll('#s2 .pin').forEach(p => { const [x, y] = proj(JSON.parse(p.dataset.at)); p.style.left = x + 'px'; p.style.top = y + 'px'; });
  }
  // learn: caribbean
  const caribMap = (sel, state, label, ext = [[20, 80], [W - 20, H - 150]]) => {
    const proj = fitBox(73, carib, ext); const {svg, path} = base(sel, proj);
    drawCountries(svg, path, C, f => L2.includes(f.properties.name) ? (state(f) || 'on') : '');
    taps(svg, path, C.filter(f => L2.includes(f.properties.name)), {state, label, dx: f => ({'Saint Lucia': -50, 'Barbados': 0, 'Grenada': -34, 'Haiti': -22, 'Dominican Republic': 34, 'Grenada': 44, 'Dominica': 54, 'Antigua and Barbuda': 0, 'Saint Kitts and Nevis': -72, 'Saint Vincent and the Grenadines': -86, 'Trinidad and Tobago': 0})[f.properties.name] || 0,
      dy: f => ({'Haiti': 4, 'Dominican Republic': 4, 'Saint Lucia': -8, 'Antigua and Barbuda': -24, 'Barbados': 34, 'Grenada': 26, 'Dominica': 4, 'Saint Kitts and Nevis': 4, 'Saint Vincent and the Grenadines': 16, 'Trinidad and Tobago': 36, 'Bahamas': 4})[f.properties.name] ?? 4});
    return {svg, path, proj};
  };
  caribMap('#m-learn', f => ({'Saint Lucia': 'hl', 'Cuba': 'ok', 'Jamaica': 'ok', 'Haiti': 'ok', 'Dominican Republic': 'ok', 'Bahamas': 'ok', 'Barbados': 'ok'})[f.properties.name], f => SHORT[f.properties.name] || f.properties.name, [[20, 70], [640, H - 20]]);
  caribMap('#m-test', f => ({'Barbados': 'flash', 'Saint Lucia': 'bad'})[f.properties.name] || '', () => null);
  caribMap('#m-chal', f => '', () => null);

  // capitals: tap the country whose capital is Ottawa
  { const proj = fitBox(95, [[-130, 15], [-60, 62]], [[170, 100], [460, 294]]); const {svg, path} = base('#m-cap', proj, [470, 300]); under(svg, path);
    drawCountries(svg, path, C, f => L1.includes(f.properties.name) ? (f.properties.name === 'Canada' ? 'ok' : 'on') : '');
    const o = proj([-75.7, 45.4]); svg.append('circle').attr('cx', o[0]).attr('cy', o[1]).attr('r', 5).attr('fill', '#fff').attr('stroke', '#04121f').attr('stroke-width', 2);
    svg.append('text').attr('class', 'lbl').attr('x', o[0] + 8).attr('y', o[1] - 8).text('Ottawa');
  }
  // physical
  { const proj = fitBox(100, [[-150, 10], [-55, 70]], [[10, 70], [700, H - 130]]); const {svg, path} = base('#m-phys', proj); under(svg, path);
    drawCountries(svg, path, C, f => L1.includes(f.properties.name) ? 'on' : '');
    const R = topojson.feature(na, na.objects.ranges).features, Lk = topojson.feature(na, na.objects.lakes).features, Rv = topojson.feature(na, na.objects.rivers).features;
    svg.append('g').selectAll('path').data(R).join('path').attr('d', path).attr('class', f => /PLAINS|DESERT|PEN|FLORIDA/.test(f.properties.name) ? 'plain' : 'range');
    svg.append('g').selectAll('path').data(Lk).join('path').attr('d', path).attr('class', 'lake');
    svg.append('g').selectAll('path').data(Rv).join('path').attr('d', path).attr('class', f => 'river' + (f.properties.name === 'Mississippi' ? ' hl' : ''));
    const lab = (t, p, a = 'middle') => { const [x, y] = proj(p); svg.append('text').attr('class', 'lbl').attr('x', x).attr('y', y).attr('text-anchor', a).text(t); };
    lab('Rocky Mts', [-112, 46]); lab('Appalachian Mts', [-80, 37.5]); lab('Great Lakes', [-84, 47.8]); lab('Great Plains', [-101, 41]);
  }

  // states & provinces: Northeast layer
  { const S = topojson.feature(st, st.objects.states).features;
    const NE = ['CT', 'ME', 'MA', 'NH', 'NJ', 'NY', 'PA', 'RI', 'VT', 'DE'], done = {ME: 1, NY: 1, VT: 1, PA: 1, NJ: 1};
    const proj = fitBox(73, [[-80.6, 38.4], [-66.8, 47.5]], [[30, 76], [640, H - 24]]); const {svg, path} = base('#m-states', proj);
    drawCountries(svg, path, S, f => NE.includes(f.properties.postal) ? (done[f.properties.postal] ? 'ok' : 'on') : '');
    taps(svg, path, S.filter(f => ['RI', 'DE', 'CT'].includes(f.properties.postal) || 0), {state: () => '', force: () => true});
    const lab = (t, p) => { const [x, y] = proj(p); svg.append('text').attr('class', 'lbl').attr('x', x).attr('y', y).attr('text-anchor', 'middle').text(t); };
    lab('Maine', [-69.2, 45.3]); lab('New York', [-75.3, 42.9]); lab('Vermont', [-72.7, 44.3]); lab('Pennsylvania', [-77.6, 40.9]); lab('New Jersey', [-74.2, 40.2]);
    lab('QUEBEC', [-72.5, 46.9]); lab('ONTARIO', [-78.8, 44.9]);
  }
});
