// SVG art used by the mockups: galleon, rank insignia, treasure chest
const ART = {};
ART.star = (cx, cy, r, fill = '#ffd77a') => {
  let p = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; p.push((cx + Math.cos(a) * rr).toFixed(1) + ',' + (cy + Math.sin(a) * rr).toFixed(1)); }
  return `<polygon points="${p.join(' ')}" fill="${fill}"/>`;
};
ART.anchor = (s = '#ffd77a', w = 3.2) => `<g fill="none" stroke="${s}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="0" cy="-13" r="3.6"/><path d="M0 -9.4V14M-8 -3H8M-13 3Q-12 14 0 14Q12 14 13 3"/><path d="M-15.5 6L-13 2.5L-10 5.8M15.5 6L13 2.5L10 5.8"/></g>`;
ART.RANKS = {
  sailor: {name: 'Junior Sailor', ring: ['#8b5a2b', '#c9925a'], stars: 0},
  captain: {name: 'Captain', ring: ['#8a9bb0', '#e6eef7'], stars: 1},
  commodore: {name: 'Commodore', ring: ['#b07a1c', '#ffd77a'], stars: 2},
  admiral: {name: 'Admiral', ring: ['#b07a1c', '#fff1b8'], stars: 3},
};
ART.insignia = (rank, locked = false) => {
  const r = ART.RANKS[rank], id = 'g' + Math.random().toString(36).slice(2, 7);
  let stars = '';
  const pos = {1: [[0, -27]], 2: [[-9, -27], [9, -27]], 3: [[-15, -24], [0, -29], [15, -24]]}[r.stars] || [];
  pos.forEach(([x, y]) => stars += ART.star(x, y, 6.5));
  const laurel = rank === 'admiral' ? `<g fill="#7fbf6a" opacity=".95">${[-1, 1].map(sd => [0, 1, 2, 3, 4].map(i => { const a = (200 + i * 28) * Math.PI / 180; const x = sd * Math.cos(a) * 33, y = -Math.sin(a) * 33 * -1; return `<ellipse cx="${(sd * -Math.cos(a) * 33).toFixed(1)}" cy="${(Math.sin(a) * 33 * -1).toFixed(1)}" rx="5" ry="2.6" transform="rotate(${sd * (i * 28 - 40)} ${(sd * -Math.cos(a) * 33).toFixed(1)} ${(Math.sin(a) * 33 * -1).toFixed(1)})"/>`; }).join('')).join('')}</g>` : '';
  return `<svg viewBox="-40 -40 80 80" ${locked ? 'style="filter:grayscale(1) brightness(.55)"' : ''}><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${r.ring[1]}"/><stop offset="1" stop-color="${r.ring[0]}"/></linearGradient></defs>
    ${laurel}<circle r="25" fill="url(#${id})"/><circle r="20" fill="#0b2a45" stroke="${r.ring[0]}" stroke-width="1.5"/>
    ${rank === 'sailor' ? '<circle r="22.5" fill="none" stroke="#f2e2bd" stroke-width="1.6" stroke-dasharray="2.5 2"/>' : ''}
    <g transform="scale(.85)">${ART.anchor(r.ring[1])}</g>${stars}</svg>`;
};
ART.galleon = (night = true) => {
  const pts = [[38, 186], [66, 206], [160, 222], [260, 229], [340, 225], [392, 210], [436, 205]];
  const sy = x => { for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return pts[pts.length - 1][1]; };
  const along = (off, x0 = 64, x1 = 404) => { let d = ''; for (let x = x0; x <= x1; x += 8) d += (d ? 'L' : 'M') + x + ' ' + (sy(x) + off * (1 - Math.pow((x - 234) / 260, 2) * .35)).toFixed(1); return d; };
  const yo = (x, off) => (sy(x) + off * (1 - Math.pow((x - 234) / 260, 2) * .35)).toFixed(1);
  const band = (o1, o2, x0 = 40, x1 = 440) => { const xs = []; for (let x = x0; x <= x1; x += 8) xs.push(x); return 'M' + xs.map(x => x + ' ' + yo(x, o1)).join('L') + 'L' + xs.reverse().map(x => x + ' ' + yo(x, o2)).join('L') + 'Z'; };
  const sq = (x, t, b, wt, wb, belly = 9) => {
    const m = (t + b) / 2; let seams = '';
    for (let i = 1; i < 6; i++) { const xt = x - wt + 2 * wt * i / 6, xb = x - wb + 2 * wb * i / 6; seams += `M${xt.toFixed(1)} ${t + 2}Q${((xt + xb) / 2 + (i - 3) * 1.5).toFixed(1)} ${m} ${xb.toFixed(1)} ${b - belly * (1 - Math.abs(i - 3) / 3) - 1}`; }
    return `<path d="M${x - wt} ${t}L${x + wt} ${t}Q${x + wb + belly * .9} ${m} ${x + wb} ${b}Q${x} ${b - belly} ${x - wb} ${b}Q${x - wb - belly * .5} ${m} ${x - wt} ${t}Z" fill="url(#sailG)" stroke="#a89263" stroke-width=".8"/>
      <path d="${seams}" fill="none" stroke="#b9a476" stroke-width=".6" opacity=".7"/>
      <path d="M${x + wt * .2} ${t + 3}Q${x + wb * .9} ${m} ${x + wb * .7} ${b - 4}L${x + wb} ${b}Q${x + wb + belly * .9} ${m} ${x + wt} ${t}Z" fill="#8c7448" opacity=".22"/>
      <path d="M${x - wt - 5} ${t}L${x + wt + 5} ${t}" stroke="#3a2412" stroke-width="3.2" stroke-linecap="round"/>`;
  };
  const shrouds = (x, top, n = 4) => { const d = sy(x) + 1; let o = ''; for (let i = 0; i < n; i++) { const dx = 10 + i * 7; o += `M${x} ${top}L${x - dx} ${d}M${x} ${top}L${x + dx} ${d}`; } for (let k = 1; k < 6; k++) { const yy = top + (d - top) * k / 6, w = (10 + (n - 1) * 7) * k / 6; o += `M${x - w} ${yy}L${x + w} ${yy}`; } return o; };
  const pennant = (x, y, len) => `<path d="M${x} ${y}Q${x + len * .3} ${y - 3} ${x + len * .55} ${y + 1}T${x + len} ${y}L${x + len * .82} ${y + 3.5}L${x + len * .95} ${y + 7}Q${x + len * .5} ${y + 9} ${x} ${y + 9}Z" fill="#b8322c"/>`;
  const gunports = [96, 128, 160, 192, 224, 256, 288, 320].map(x => `<rect x="${x}" y="${(sy(x) + 19).toFixed(1)}" width="11" height="9" rx="1" fill="#120a04" stroke="#c99a3e" stroke-width=".8"/>`).join('');
  const hull = `M36 184Q46 181 62 184L66 206Q160 224 260 230Q340 228 392 210L438 204L428 216Q410 248 386 274Q330 300 250 302Q150 302 92 292Q66 284 58 262Q48 226 36 184Z`;
  return `<svg viewBox="0 0 480 360" class="galleon-svg"><defs>
    <linearGradient id="sailG" x1="0" x2="1" y1="0" y2=".3"><stop offset="0" stop-color="#fbf1d8"/><stop offset=".55" stop-color="#ead8ac"/><stop offset="1" stop-color="#c7ad78"/></linearGradient>
    <linearGradient id="hullG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6e4526"/><stop offset=".5" stop-color="#4a2d17"/><stop offset="1" stop-color="#24150a"/></linearGradient>
    <linearGradient id="castleG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a2412"/><stop offset="1" stop-color="#5b3a1f"/></linearGradient>
    <radialGradient id="lampG"><stop offset="0" stop-color="#fff2b0"/><stop offset=".4" stop-color="#ffc24d" stop-opacity=".75"/><stop offset="1" stop-color="#ff9d00" stop-opacity="0"/></radialGradient>
    <clipPath id="hullClip"><path d="${hull}"/></clipPath></defs>
    <g stroke="rgba(226,208,170,.42)" stroke-width=".7" fill="none">
      <path d="M235 22L340 46M340 46L468 168M235 22L130 74M130 74L44 150M235 140L340 150M340 146L452 182"/>
      <path d="${shrouds(130, 112, 3)}${shrouds(235, 130)}${shrouds(340, 140)}"/></g>
    <path d="M392 210L470 168" stroke="#3a2412" stroke-width="5.5" stroke-linecap="round"/><path d="M440 186L444 176" stroke="#3a2412" stroke-width="3"/>
    <path d="M352 100L462 172L376 190Z" fill="url(#sailG)" stroke="#a89263" stroke-width=".8"/><path d="M362 128L446 176L384 186Z" fill="#8c7448" opacity=".12"/>
    ${sq(438, 186, 210, 16, 19, 5)}
    <g stroke="#3a2412" stroke-linecap="round"><path d="M130 216V68" stroke-width="5.5"/><path d="M235 230V18" stroke-width="7"/><path d="M340 226V40" stroke-width="6.5"/></g>
    <g fill="#3a2412"><rect x="124" y="110" width="12" height="4" rx="1"/><rect x="227" y="128" width="16" height="5" rx="1"/><rect x="333" y="138" width="14" height="5" rx="1"/><rect x="229" y="64" width="12" height="4" rx="1"/><rect x="334" y="80" width="12" height="4" rx="1"/></g>
    <path d="M176 56L82 200" stroke="#3a2412" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M175 60Q178 140 160 204L86 198Q124 134 175 60Z" fill="url(#sailG)" stroke="#a89263" stroke-width=".8"/><path d="M168 82Q170 150 156 202L132 200Q156 140 168 82Z" fill="#8c7448" opacity=".2"/>
    ${sq(340, 52, 78, 22, 27, 6)}${sq(340, 86, 132, 33, 41, 9)}${sq(340, 144, 196, 44, 52, 11)}
    ${sq(235, 28, 58, 26, 31, 6)}${sq(235, 68, 122, 38, 47, 10)}${sq(235, 136, 198, 52, 62, 12)}
    ${pennant(130, 64, 30)}${pennant(235, 12, 46)}${pennant(340, 34, 38)}
    <path d="${hull}" fill="url(#hullG)" stroke="#1d1108" stroke-width="1.5"/>
    <g clip-path="url(#hullClip)" fill="none">
      <path d="${band(14, 32)}" fill="#132233" stroke="none"/>
      <g stroke="#1d1108" stroke-width=".7" opacity=".55">${[42, 52, 62, 72, 82].map(o => `<path d="${along(o, 40, 440)}"/>`).join('')}</g>
      <path d="${along(14, 40, 440)}" stroke="#d6a646" stroke-width="2.4"/><path d="${along(33, 40, 440)}" stroke="#d6a646" stroke-width="2"/>
      <path d="${along(4, 40, 440)}" stroke="#2a190c" stroke-width="3"/></g>
    ${gunports}
    <path d="${along(-7, 150, 330)}" stroke="#4a2d17" stroke-width="1.5" fill="none"/>
    <g stroke="#4a2d17" stroke-width="1.2">${[160, 180, 200, 220, 240, 260, 280, 300, 320].map(x => `<path d="M${x} ${(sy(x) - 7).toFixed(1)}V${sy(x).toFixed(1)}"/>`).join('')}</g>
    <path d="M30 156L106 164L112 208Q86 206 66 206L62 184Q46 181 36 184Z" fill="url(#castleG)" stroke="#1d1108" stroke-width="1.2"/>
    <path d="M30 156L106 164" stroke="#d6a646" stroke-width="2.5"/><path d="M34 172L108 182" stroke="#d6a646" stroke-width="1.2" opacity=".8"/>
    <g fill="${night ? '#ffd77a' : '#e9dcb8'}" stroke="#d6a646" stroke-width=".6">${[46, 60, 74, 88].map((x, i) => `<path d="M${x} ${175 + i * 1.4}h8v-6q-4 -4 -8 0z"/>`).join('')}</g>
    <path d="M34 186Q26 210 34 232L46 236Q40 210 44 186Z" fill="#3a2412" stroke="#d6a646" stroke-width="1"/>
    <path d="M336 210L392 200L394 210Q364 220 336 222Z" fill="url(#castleG)" stroke="#1d1108"/><path d="M336 210L392 200" stroke="#d6a646" stroke-width="1.6"/>
    <path d="M392 210L438 204L428 216L404 222Z" fill="#3a2412" stroke="#d6a646" stroke-width="1"/><path d="M398 226Q412 214 434 207" stroke="#d6a646" stroke-width="1.2" fill="none"/>
    <path d="M58 262L52 298L66 298L68 268" fill="#2a190c" stroke="#1d1108"/>
    <g transform="translate(398 244) scale(.42)">${ART.anchor('#1d1108', 4)}</g>
    <g transform="rotate(-7 352 254)"><rect x="318" y="244" width="70" height="19" rx="4" fill="#132233" stroke="#d6a646" stroke-width="1.4"/>
      <text x="353" y="258.5" text-anchor="middle" font-family="Cinzel,serif" font-weight="900" font-size="12.5" letter-spacing="1.5" fill="#ffd77a">SS TOM</text></g>
    <path d="M70 294Q160 306 250 304Q340 302 390 276" stroke="rgba(220,240,255,.55)" stroke-width="2" fill="none" stroke-dasharray="14 6 4 6"/>
    ${night ? '<circle cx="30" cy="150" r="20" fill="url(#lampG)"/><path d="M27 144h6v10h-6z" fill="#fff2b0" stroke="#d6a646"/><circle cx="420" cy="196" r="14" fill="url(#lampG)"/>' : ''}
  </svg>`;
};
ART.chest = () => `<svg viewBox="0 0 320 260"><defs>
  <radialGradient id="glowC"><stop offset="0" stop-color="#fff6c7"/><stop offset=".35" stop-color="#ffd77a" stop-opacity=".85"/><stop offset="1" stop-color="#e8b54d" stop-opacity="0"/></radialGradient>
  <linearGradient id="woodC" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5a2f"/><stop offset="1" stop-color="#4a2c14"/></linearGradient></defs>
  <ellipse cx="160" cy="120" rx="150" ry="110" fill="url(#glowC)"/>
  <path d="M60 110L80 30Q160 6 240 30L260 110Z" fill="url(#woodC)" stroke="#2c1a0c" stroke-width="3"/>
  <path d="M80 30Q160 6 240 30" fill="none" stroke="#e8b54d" stroke-width="7"/><path d="M118 20L104 108M202 20L216 108" stroke="#e8b54d" stroke-width="6"/>
  <g>${[[110, 128], [138, 118], [168, 124], [196, 116], [222, 126], [124, 112], [182, 108], [152, 104]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="13" ry="7" fill="#ffd34d" stroke="#b07a1c" stroke-width="2"/>`).join('')}</g>
  <path d="M50 124H270V232Q160 244 50 232Z" fill="url(#woodC)" stroke="#2c1a0c" stroke-width="3"/>
  <path d="M50 124H270" stroke="#e8b54d" stroke-width="8"/><path d="M104 124V238M216 124V238" stroke="#e8b54d" stroke-width="7"/>
  <rect x="145" y="140" width="30" height="36" rx="5" fill="#ffd77a" stroke="#9c6a17" stroke-width="2"/><circle cx="160" cy="154" r="5" fill="#3c2513"/><path d="M160 158v10" stroke="#3c2513" stroke-width="4"/>
  ${ART.star(40, 60, 8, '#fff6c7')}${ART.star(282, 52, 10, '#fff6c7')}${ART.star(300, 120, 6, '#fff6c7')}${ART.star(20, 140, 6, '#fff6c7')}
</svg>`;
document.querySelectorAll('[data-ins]').forEach(el => el.innerHTML = ART.insignia(el.dataset.ins, el.hasAttribute('data-locked')));
document.querySelectorAll('[data-galleon]').forEach(el => el.innerHTML = ART.galleon(el.dataset.galleon !== 'day'));
document.querySelectorAll('[data-chest]').forEach(el => el.innerHTML = ART.chest());
