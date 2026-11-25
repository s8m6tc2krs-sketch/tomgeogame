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
  const sail = (x, top, bot, w) => `<path d="M${x - w} ${top} Q${x} ${top - 7} ${x + w} ${top} Q${x + w + 9} ${(top + bot) / 2} ${x + w + 3} ${bot} Q${x} ${bot + 12} ${x - w - 3} ${bot} Q${x - w + 6} ${(top + bot) / 2} ${x - w} ${top}Z" fill="url(#sailG)" stroke="#bfa877" stroke-width="1"/>
    <path d="M${x - w + 6} ${top + 4} Q${x} ${(top + bot) / 2 + 6} ${x - w + 4} ${bot - 2}" fill="none" stroke="#d9c79c" stroke-width="1.2" opacity=".7"/>`;
  return `<svg viewBox="0 0 440 340" class="galleon-svg"><defs>
    <linearGradient id="sailG" x1="0" x2="1"><stop offset="0" stop-color="#fff6de"/><stop offset=".7" stop-color="#efdcae"/><stop offset="1" stop-color="#cdb27a"/></linearGradient>
    <linearGradient id="hullG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a4f2c"/><stop offset=".55" stop-color="#4f311b"/><stop offset="1" stop-color="#2c1a0c"/></linearGradient>
    <radialGradient id="lampG"><stop offset="0" stop-color="#fff2b0"/><stop offset=".4" stop-color="#ffc24d" stop-opacity=".8"/><stop offset="1" stop-color="#ff9d00" stop-opacity="0"/></radialGradient></defs>
    <g stroke="rgba(242,226,189,.45)" stroke-width="1" fill="none">
      <path d="M126 40L40 196M126 40L250 205M216 12L130 200M216 12L380 196M304 34L250 205M304 34L432 160M216 12L304 34M126 40L216 12"/></g>
    <g stroke="#3c2513" stroke-width="7" stroke-linecap="round"><path d="M126 36V215M216 8V215M304 30V215"/></g>
    <path d="M380 196L438 150" stroke="#3c2513" stroke-width="6" stroke-linecap="round"/>
    ${sail(126, 58, 108, 34)}${sail(126, 116, 166, 40)}
    ${sail(216, 26, 82, 44)}${sail(216, 92, 158, 52)}
    ${sail(304, 50, 102, 38)}${sail(304, 112, 168, 46)}
    <path d="M380 192L432 156L404 196Z" fill="url(#sailG)" stroke="#bfa877"/>
    <path d="M126 36l22 6-22 6z M216 8l26 7-26 7z M304 30l22 6-22 6z" fill="#c8423b"/>
    <path d="M22 168H112V204H22Z" fill="#4f311b" stroke="#e8b54d" stroke-width="2"/>
    <g fill="${night ? '#ffd77a' : '#f2e2bd'}">${[34, 54, 74, 94].map(x => `<rect x="${x}" y="176" width="10" height="14" rx="5"/>`).join('')}</g>
    <path d="M14 196Q30 192 50 196L340 204Q372 200 398 186L388 214Q362 268 300 280L96 280Q50 268 26 236Z" fill="url(#hullG)" stroke="#2c1a0c" stroke-width="2"/>
    <g stroke="#2c1a0c" stroke-width="1.3" fill="none" opacity=".8"><path d="M30 222Q200 232 384 212M42 244Q200 254 372 236M66 264Q200 270 344 258"/></g>
    <path d="M20 206Q200 216 392 198" stroke="#e8b54d" stroke-width="3.5" fill="none"/>
    <g fill="#1a0f06" stroke="#e8b54d" stroke-width="1">${[80, 120, 160, 200, 240, 280, 320].map(x => `<rect x="${x}" y="222" width="13" height="10" rx="2"/>`).join('')}</g>
    ${night ? '<circle cx="18" cy="166" r="22" fill="url(#lampG)"/><circle cx="18" cy="166" r="4" fill="#fff2b0"/><circle cx="398" cy="180" r="16" fill="url(#lampG)"/>' : ''}
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
