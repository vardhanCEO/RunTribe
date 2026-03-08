// ===== NAV SCROLL =====
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20);
});

// ===== HAMBURGER =====
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});
mobileMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

// ===== iPHONE CANVAS MAP =====
(function () {
  const canvas = document.getElementById('mapCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const COLS = 10, ROWS = 19;
  const PLAYER = '#f97316';
  const ENEMIES = ['#8b5cf6', '#06b6d4', '#ef4444', '#10b981'];

  // territory: "r,c" -> color
  const territory = new Map();

  // Seed enemy + player starting territory
  const seeds = [
    // purple cluster
    {r:1,c:1,e:0},{r:1,c:2,e:0},{r:2,c:1,e:0},{r:2,c:2,e:0},{r:2,c:3,e:0},{r:3,c:2,e:0},
    // cyan cluster
    {r:1,c:7,e:1},{r:1,c:8,e:1},{r:2,c:7,e:1},{r:2,c:8,e:1},{r:3,c:8,e:1},
    // orange cluster
    {r:7,c:1,e:2},{r:7,c:2,e:2},{r:8,c:1,e:2},{r:8,c:2,e:2},{r:8,c:3,e:2},
    // green cluster
    {r:13,c:6,e:3},{r:13,c:7,e:3},{r:14,c:6,e:3},{r:14,c:7,e:3},{r:15,c:7,e:3},
    // player existing
    {r:9,c:4,e:-1},{r:9,c:5,e:-1},{r:10,c:4,e:-1},{r:10,c:5,e:-1},{r:11,c:4,e:-1},{r:11,c:5,e:-1},
  ];
  seeds.forEach(({ r, c, e }) => territory.set(`${r},${c}`, e === -1 ? PLAYER : ENEMIES[e]));

  // Path that intentionally passes through enemy territory
  const PATH = [
    {r:11,c:5},{r:10,c:5},{r:9,c:5},{r:9,c:4},{r:9,c:3},{r:8,c:3},
    {r:8,c:2},{r:8,c:1},{r:7,c:1},{r:7,c:2},           // orange!
    {r:6,c:2},{r:5,c:2},{r:4,c:2},{r:3,c:2},{r:2,c:2},{r:1,c:2},{r:2,c:1}, // purple!
    {r:3,c:1},{r:4,c:1},{r:5,c:1},{r:5,c:2},{r:5,c:3},{r:5,c:4},
    {r:5,c:5},{r:5,c:6},{r:5,c:7},{r:4,c:7},{r:3,c:7},{r:2,c:7},{r:1,c:7}, // cyan!
    {r:2,c:8},{r:3,c:8},{r:4,c:8},{r:5,c:8},{r:6,c:8},{r:7,c:8},
    {r:8,c:8},{r:9,c:8},{r:10,c:8},{r:10,c:7},{r:10,c:6},{r:10,c:5},{r:11,c:5},
  ];

  let pIdx = 0;
  let rx = 0, ry = 0;
  let trail = [];
  let flashes = []; // [{r,c,t}]
  let toasts  = []; // [{text,x,y,a}]
  let distKm = 0, totalSecs = 0, claimedCells = 0;
  let cW = 1, cH = 1;

  const hudDist  = document.getElementById('hudDist');
  const hudPace  = document.getElementById('hudPace');
  const hudTime  = document.getElementById('hudTime');
  const hudCells = document.getElementById('hudCells');

  function init() {
    canvas.width  = canvas.offsetWidth  || 270;
    canvas.height = canvas.offsetHeight || 420;
    cW = canvas.width  / COLS;
    cH = canvas.height / ROWS;
    const s = PATH[0];
    rx = (s.c + 0.5) * cW;
    ry = (s.r + 0.5) * cH;
  }

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }

  function frame() {
    // --- Move runner ---
    const tgt = PATH[pIdx % PATH.length];
    const tx = (tgt.c + 0.5) * cW;
    const ty = (tgt.r + 0.5) * cH;
    const dx = tx - rx, dy = ty - ry;
    const d  = Math.sqrt(dx * dx + dy * dy);
    const spd = 2.4;

    if (d < spd + 1) {
      rx = tx; ry = ty;
      const key = `${tgt.r},${tgt.c}`;
      const existing = territory.get(key);

      if (!existing) {
        territory.set(key, PLAYER);
        claimedCells++;
      } else if (existing !== PLAYER) {
        territory.set(key, PLAYER);
        flashes.push({ r: tgt.r, c: tgt.c, t: 0 });
        toasts.push({ text: '⚡ Captured!', x: rx, y: ry - 22, a: 1 });
        claimedCells++;
      }

      trail.push({ x: rx, y: ry });
      if (trail.length > 24) trail.shift();

      pIdx++;
      distKm    += 0.032;
      totalSecs += 2.8;

      if (hudCells) hudCells.textContent = claimedCells;
      if (hudDist)  hudDist.textContent  = distKm.toFixed(2);
      if (hudPace && distKm > 0) {
        const pace = totalSecs / distKm;
        const pm = Math.floor(pace / 60), ps = Math.floor(pace % 60);
        hudPace.textContent = `${pm}:${String(ps).padStart(2,'0')}`;
      }
      if (hudTime) {
        const tm = Math.floor(totalSecs / 60), ts = Math.floor(totalSecs % 60);
        hudTime.textContent = `${String(tm).padStart(2,'0')}:${String(ts).padStart(2,'0')}`;
      }
    } else {
      rx += (dx / d) * spd;
      ry += (dy / d) * spd;
    }

    // --- Draw ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = '#0c1520';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // City blocks (alternating subtle shade for block feel)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const isBlock = (Math.floor(r / 3) + Math.floor(c / 3)) % 2 === 0;
        ctx.fillStyle = isBlock ? '#0f1c2b' : '#111e2d';
        rr(c * cW + 1, r * cH + 1, cW - 2, cH - 2, 2);
        ctx.fill();
      }
    }

    // Territory
    territory.forEach((color, key) => {
      const [r, c] = key.split(',').map(Number);
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = color;
      rr(c * cW + 1.5, r * cH + 1.5, cW - 3, cH - 3, 3);
      ctx.fill();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // Capture flash (white burst)
    flashes = flashes.filter(f => f.t < 1);
    flashes.forEach(f => {
      ctx.globalAlpha = Math.sin(f.t * Math.PI) * 0.92;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(f.c * cW, f.r * cH, cW, cH);
      ctx.globalAlpha = 1;
      f.t += 0.09;
    });

    // Street grid lines
    ctx.strokeStyle = 'rgba(160,210,255,0.09)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cW, 0); ctx.lineTo(c * cW, canvas.height);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * cH); ctx.lineTo(canvas.width, r * cH);
      ctx.stroke();
    }

    // Runner trail
    for (let i = 1; i < trail.length; i++) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(249,115,22,${(i / trail.length) * 0.7})`;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
      ctx.lineTo(trail[i].x, trail[i].y);
      ctx.stroke();
    }

    // Runner glow
    const grd = ctx.createRadialGradient(rx, ry, 0, rx, ry, 22);
    grd.addColorStop(0, 'rgba(249,115,22,0.55)');
    grd.addColorStop(1, 'rgba(249,115,22,0)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(rx, ry, 22, 0, Math.PI * 2); ctx.fill();

    // Runner dot
    ctx.fillStyle = '#f97316';
    ctx.beginPath(); ctx.arc(rx, ry, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

    // Capture toasts
    toasts = toasts.filter(t => t.a > 0);
    ctx.font = 'bold 9px Inter,sans-serif';
    ctx.textAlign = 'center';
    toasts.forEach(t => {
      const tw = ctx.measureText(t.text).width;
      ctx.save();
      ctx.globalAlpha = Math.min(t.a, 1);
      ctx.fillStyle = '#f97316';
      rr(t.x - tw / 2 - 8, t.y - 4, tw + 16, 18, 9);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(t.text, t.x, t.y + 9);
      ctx.restore();
      t.y -= 0.38;
      t.a -= 0.011;
    });

    requestAnimationFrame(frame);
  }

  // Wait for layout before reading canvas dimensions
  setTimeout(() => {
    init();
    requestAnimationFrame(frame);
  }, 120);
})();

// ===== BASE CANVAS (ISOMETRIC 3D) =====
(function () {
  const canvas = document.getElementById('baseCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let TW, TH, EH, ox, oy, t = 0;

  // Isometric projection
  function proj(c, r, e = 0) {
    return { x: ox + (c - r) * TW, y: oy + (c + r) * TH - e * EH };
  }

  // Darken/lighten a hex color by factor
  function shade(hex, f) {
    const rv = Math.min(255, Math.round(parseInt(hex.slice(1,3),16) * f));
    const gv = Math.min(255, Math.round(parseInt(hex.slice(3,5),16) * f));
    const bv = Math.min(255, Math.round(parseInt(hex.slice(5,7),16) * f));
    return `rgb(${rv},${gv},${bv})`;
  }

  function poly(pts, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 0.5; ctx.stroke(); }
  }

  // Draw one isometric cuboid at grid position (c,r) with size (w × d) and height h
  function block(c, r, w, d, h, color, glow) {
    if (glow) {
      const ctr = proj(c + w / 2, r + d / 2, h + 0.6);
      const pulse = 18 + Math.sin(t * 2.5) * 5;
      const g = ctx.createRadialGradient(ctr.x, ctr.y, 0, ctr.x, ctr.y, pulse);
      g.addColorStop(0, color + '66'); g.addColorStop(1, color + '00');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ctr.x, ctr.y, pulse, 0, Math.PI * 2); ctx.fill();
    }
    // East face (right side, col+w)
    poly([proj(c+w,r,0), proj(c+w,r,h), proj(c+w,r+d,h), proj(c+w,r+d,0)], shade(color, 0.38));
    // South face (front side, row+d)
    poly([proj(c,r+d,0), proj(c,r+d,h), proj(c+w,r+d,h), proj(c+w,r+d,0)], shade(color, 0.56));
    // Top face
    poly([proj(c,r,h), proj(c+w,r,h), proj(c+w,r+d,h), proj(c,r+d,h)], color, 'rgba(255,255,255,0.13)');
    // Top highlight edge
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 0.8;
    const tl = proj(c,r,h), tr = proj(c+w,r,h), bl = proj(c,r+d,h);
    ctx.beginPath(); ctx.moveTo(tl.x,tl.y); ctx.lineTo(tr.x,tr.y); ctx.moveTo(tl.x,tl.y); ctx.lineTo(bl.x,bl.y); ctx.stroke();
  }

  function groundTile(c, r) {
    poly([proj(c,r), proj(c+1,r), proj(c+1,r+1), proj(c,r+1)],
      (c + r) % 2 === 0 ? '#0e1c2c' : '#0b1927', 'rgba(100,180,255,0.05)');
  }

  const G = 7; // grid size

  // Buildings sorted back-to-front (smaller col+row = further from viewer)
  const BLDGS = [
    { c:1, r:1, w:2, d:1, h:2, color:'#f97316', glow:false }, // Barracks
    { c:5, r:0, w:1, d:2, h:1, color:'#f59e0b', glow:false }, // Depot
    { c:5, r:2, w:1, d:1, h:5, color:'#06b6d4', glow:false }, // Watchtower
    { c:3, r:3, w:1, d:1, h:4, color:'#f97316', glow:true  }, // HQ (glowing)
    { c:1, r:4, w:2, d:2, h:2, color:'#10b981', glow:false }, // Training Ground
    { c:4, r:5, w:2, d:1, h:2, color:'#8b5cf6', glow:false }, // Workshop
  ].sort((a, b) => (a.c + a.r) - (b.c + b.r));

  function frame() {
    t += 0.016;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, '#060d18'); bg.addColorStop(1, '#0a1525');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Ground tiles (back-to-front diagonal order)
    for (let s = 0; s < G * 2 - 1; s++)
      for (let c = Math.max(0, s - G + 1); c < Math.min(G, s + 1); c++)
        groundTile(c, s - c);

    // Buildings (already sorted)
    BLDGS.forEach(b => block(b.c, b.r, b.w, b.d, b.h, b.color, b.glow));

    requestAnimationFrame(frame);
  }

  function init() {
    canvas.width  = canvas.offsetWidth  || 222;
    canvas.height = canvas.offsetHeight || 340;
    TW = Math.max(13, Math.round(canvas.width / 15));
    TH = Math.round(TW / 2);
    EH = Math.round(TH * 2.8);
    ox = canvas.width / 2;
    oy = Math.round(canvas.height * 0.56);
    requestAnimationFrame(frame);
  }

  setTimeout(init, 200);
})();

// ===== SCROLL ANIMATIONS =====
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const delay = entry.target.dataset.delay || 0;
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, parseInt(delay));
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.feature-card').forEach(el => observer.observe(el));

// ===== LEADERBOARD TABS =====
const tabs = document.querySelectorAll('.lb-tab');
const lbTable = document.getElementById('lbTable');

const lbData = {
  territory: [
    { rank: '🥇', name: 'ThunderLegs', color: '#f97316', value: '1,842' },
    { rank: '🥈', name: 'NightStrider', color: '#8b5cf6', value: '1,541' },
    { rank: '🥉', name: 'GridRunner',  color: '#f97316', value: '1,203' },
    { rank: '4',  name: 'UrbanWolf',   color: '#06b6d4', value: '987'   },
    { rank: '5',  name: 'TribeQueen',  color: '#10b981', value: '841'   },
  ],
  distance: [
    { rank: '🥇', name: 'MarathonKing',  color: '#06b6d4', value: '2,341 km' },
    { rank: '🥈', name: 'ThunderLegs',   color: '#f97316', value: '1,987 km' },
    { rank: '🥉', name: 'DawnChaser',    color: '#f59e0b', value: '1,654 km' },
    { rank: '4',  name: 'TribeQueen',    color: '#10b981', value: '1,421 km' },
    { rank: '5',  name: 'NightStrider',  color: '#8b5cf6', value: '1,302 km' },
  ],
  captures: [
    { rank: '🥇', name: 'GridRunner',   color: '#f97316', value: '3,210' },
    { rank: '🥈', name: 'StealthFoot',  color: '#8b5cf6', value: '2,891' },
    { rank: '🥉', name: 'ThunderLegs',  color: '#f97316', value: '2,453' },
    { rank: '4',  name: 'UrbanWolf',    color: '#06b6d4', value: '1,987' },
    { rank: '5',  name: 'MapBreaker',   color: '#f59e0b', value: '1,654' },
  ],
};

const labels = { territory: 'Cells Owned', distance: 'Total Distance', captures: 'Total Captures' };

function renderLb(tab) {
  const rows = lbData[tab];
  lbTable.innerHTML = `
    <div class="lb-row lb-header">
      <span class="lb-rank">#</span>
      <span class="lb-player">Runner</span>
      <span class="lb-value">${labels[tab]}</span>
    </div>
    ${rows.map((r, i) => `
      <div class="lb-row ${i < 3 ? 'lb-top'+(i+1) : ''}">
        <span class="lb-rank">${r.rank}</span>
        <span class="lb-player"><span class="lb-dot" style="background:${r.color}"></span>${r.name}</span>
        <span class="lb-value">${r.value}</span>
      </div>
    `).join('')}
  `;
}

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderLb(tab.dataset.tab);
  });
});

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
