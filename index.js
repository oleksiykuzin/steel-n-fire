/* ─────────────────────────────────────────────────────────────
   HERO PARALLAX
   ───────────────────────────────────────────────────────────── */
const heroGhost = document.querySelector('.hero-ghost');
window.addEventListener('scroll', () => {
  if (heroGhost) heroGhost.style.transform = `translateY(calc(-50% + ${window.scrollY * 0.15}px))`;
}, { passive: true });

/* ─────────────────────────────────────────────────────────────
   PORTFOLIO — 3-D tilt on mouse move
   ───────────────────────────────────────────────────────────── */
document.querySelectorAll('.portfolio-item').forEach(item => {
  item.addEventListener('mousemove', e => {
    const r = item.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width  - 0.5) * 8;
    const y = ((e.clientY - r.top)  / r.height - 0.5) * 8;
    item.style.transform = `perspective(800px) rotateY(${x}deg) rotateX(${-y}deg) scale(1.01)`;
  });
  item.addEventListener('mouseleave', () => {
    item.style.transition = 'transform .5s cubic-bezier(.16,1,.3,1)';
    item.style.transform  = '';
    setTimeout(() => { item.style.transition = ''; }, 500);
  });
});

/* ─────────────────────────────────────────────────────────────
   WELD ANIMATION — 100% JavaScript-driven RAF
   ─────────────────────────────────────────────────────────────
   Flow:
   1. On init: getTotalLength(), set dasharray/dashoffset to hide paths.
   2. After WELD_DELAY ms: fade in sparksCanvas, start RAF loop.
   3. Each frame: advance draw progress, update dashoffset to reveal
      the seam up to the current point; move spark-head circle to
      getPointAtLength(drawn); convert SVG coords → canvas coords
      and set global srcX/srcY so the particle system emits from there.
   4. Subtle opacity flicker simulates imperfect weld arc.
   5. When t=1: hide spark-head, trigger canvas fade-out.
   ───────────────────────────────────────────────────────────── */
const weldPathEl   = document.querySelector('.weld-path');
const weldGlowEl   = document.querySelector('.weld-glow');
const sparkHeadEl  = document.querySelector('.spark-head');
const sparkHeadSvg = document.getElementById('sparkHeadSvg');
const sparksCanvas = document.getElementById('sparksCanvas');
const ctx          = sparksCanvas.getContext('2d');

const WELD_DELAY    = 2500;
const WELD_DURATION = 2500;
const CANVAS_SIZE   = 260;
const DPR           = Math.max(1, window.devicePixelRatio || 1);

let pathLen    = 0;
let weldT0     = null;
let weldActive = false;
let canvasLife = 0;
let canvasRAF  = 0;
let headX = -9999;
let headY = -9999;

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function resizeCanvas() {
  sparksCanvas.width  = Math.round(CANVAS_SIZE * DPR);
  sparksCanvas.height = Math.round(CANVAS_SIZE * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

function positionCanvasAt(x, y) {
  sparksCanvas.style.left = `${x}px`;
  sparksCanvas.style.top  = `${y}px`;
}

function initWeld() {
  requestAnimationFrame(() => {
    pathLen = weldPathEl.getTotalLength();
    [weldPathEl, weldGlowEl].forEach(p => {
      p.style.strokeDasharray  = pathLen;
      p.style.strokeDashoffset = pathLen;
    });
    sparkHeadSvg.style.opacity = '0';
    resizeCanvas();
    setTimeout(() => {
      sparksCanvas.style.transition = 'opacity .6s';
      sparksCanvas.style.opacity = '0.95';
      canvasLife = 0.95;
      weldActive = true;
      requestAnimationFrame(tickWeld);
      if (!canvasRAF) canvasRAF = requestAnimationFrame(animateSparks);
    }, WELD_DELAY);
  });
}

function tickWeld(now) {
  if (!weldT0) weldT0 = now;
  const t      = Math.min((now - weldT0) / WELD_DURATION, 1);
  const eased  = easeOutCubic(t);
  const drawn  = eased * pathLen;
  const remain = pathLen - drawn;

  weldPathEl.style.strokeDashoffset = remain;
  weldGlowEl.style.strokeDashoffset = remain;
  weldPathEl.style.opacity = (0.88 + Math.random() * 0.12).toString();
  weldGlowEl.style.opacity = (0.20 + Math.random() * 0.22).toString();

  const pt = weldPathEl.getPointAtLength(Math.max(0, drawn));
  sparkHeadSvg.style.left    = (pt.x / 800 * 100) + '%';
  sparkHeadSvg.style.opacity = t > 0.005 ? '1' : '0';

  const svgRect  = weldPathEl.closest('svg').getBoundingClientRect();
  const heroRect = sparksCanvas.parentElement.getBoundingClientRect();
  headX = svgRect.left + (pt.x / 800) * svgRect.width  - heroRect.left;
  headY = svgRect.top  + (pt.y / 8)   * svgRect.height - heroRect.top;
  positionCanvasAt(headX, headY);

  if (t < 1) {
    requestAnimationFrame(tickWeld);
  } else {
    sparkHeadSvg.style.opacity = '0';
    weldPathEl.style.opacity   = '1';
    weldGlowEl.style.opacity   = '0.3';
    weldActive = false;
    requestAnimationFrame(fadeCanvas);
  }
}

function fadeCanvas() {
  canvasLife -= 0.016;
  const op = Math.max(0, canvasLife);
  sparksCanvas.style.transition = 'none';
  sparksCanvas.style.opacity = op;
  if (op > 0) {
    requestAnimationFrame(fadeCanvas);
  } else {
    sparksCanvas.style.display = 'none';
  }
}

/* ─────────────────────────────────────────────────────────────
   SPARK PARTICLES
   ───────────────────────────────────────────────────────────── */
class Spark {
  constructor(stagger) {
    this.life = stagger || 0;
    this.maxLife = 1;
    this._init();
  }

  _init() {
    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;
    this.x = cx + (Math.random() - 0.5) * 6;
    this.y = cy + (Math.random() - 0.5) * 6;
    const angle = Math.random() * Math.PI * 2;
    const spd   = 0.7 + Math.random() * 3.5;
    this.vx = Math.cos(angle) * spd;
    this.vy = Math.sin(angle) * spd - 1.6;
    this.g  = 0.05 + Math.random() * 0.04;
    this.life = 0;
    this.maxLife = 45 + Math.random() * 75;
    this.size = 0.5 + Math.random() * 2;
    const tmp = Math.random();
    this.r  = Math.round(232 + tmp * 23);
    this.g2 = Math.round(93  + tmp * 121);
    this.trail = [];
  }

  update() {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 5) this.trail.shift();
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.g;
    this.vx *= 0.985;
    this.life++;
    if (this.life > this.maxLife) {
      if (weldActive) this._init();
      else this.life = 999;
    }
  }

  draw() {
    if (this.life >= this.maxLife) return;
    const prog  = this.life / this.maxLife;
    const alpha = Math.sin(prog * Math.PI) * 0.9;

    if (this.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
      }
      ctx.strokeStyle = `rgba(${this.r},${this.g2},4,${alpha * 0.35})`;
      ctx.lineWidth = this.size * 0.5;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * (1 - prog * 0.4), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${this.r},${this.g2},4,${alpha})`;
    ctx.fill();

    const grd = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 5);
    grd.addColorStop(0, `rgba(${this.r},${this.g2},4,${alpha * 0.45})`);
    grd.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 5, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
  }
}

const sparks = Array.from({ length: 55 }, (_, i) => new Spark(Math.random() * 90));

function animateSparks() {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  if (parseFloat(sparksCanvas.style.opacity || '0') > 0) {
    sparks.forEach(s => { s.update(); s.draw(); });
  }
  if (sparksCanvas.style.display !== 'none') {
    canvasRAF = requestAnimationFrame(animateSparks);
  } else {
    canvasRAF = 0;
  }
}

window.addEventListener('resize', () => {
  resizeCanvas();
  if (headX > -1000) positionCanvasAt(headX, headY);
}, { passive: true });

initWeld();

/* ═════════════════════════════════════════════════════════════
   GALLERY ENGINE — 2-LEVEL MODAL
   Дані надходять з gallery_data.js (const GALLERY)
   ═════════════════════════════════════════════════════════════ */

/* ── Icon map per category name ── */
const CAT_ICONS = {
  "Сходи":  "🪜",
  "Перила": "🔩",
  "Навіси": "🏗️",
  "Дашки":  "🏠",
  "Двері":  "🚪",
  "Ворота": "🔗",
  "Інше":   "✨",
};

/* ── DOM refs ── */
const modal        = document.getElementById('galleryModal');
const viewProjects = document.getElementById('viewProjects');
const viewPhotos   = document.getElementById('viewPhotos');
const projectsGrid = document.getElementById('projectsGrid');
const imgWrap      = document.getElementById('galleryImgWrap');
const thumbsEl     = document.getElementById('galleryThumbs');
const prevBtn      = document.getElementById('galleryPrev');
const nextBtn      = document.getElementById('galleryNext');
const closeBtn     = document.getElementById('modalClose');
const backBtn      = document.getElementById('modalBack');
const counterEl    = document.getElementById('modalCounter');
const catEl        = document.getElementById('modalCat');
const iconEl       = document.getElementById('modalIcon');
const breadcrumb   = document.getElementById('modalBreadcrumb');
const tabFinished  = document.getElementById('tabFinished');
const tabProcess   = document.getElementById('tabProcess');
const galleryStage = document.getElementById('galleryStage');

/* ── State ── */
let currentKey     = null;
let currentProject = null;
let currentTab     = 'finished';
let currentIdx     = 0;
let touchStartX    = 0;
let coverTimers    = [];

/* ── Lazy observer for project cards ── */
const lazyObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('lazy-visible'); lazyObs.unobserve(e.target); }
  });
}, { threshold: 0.08, rootMargin: '40px' });

/* ─── Build cover area for a project card ─── */
function buildCardCover(proj, key) {
  const icon = CAT_ICONS[key] || '🔩';
  if (proj.cover_sources && proj.cover_sources.length > 0) {
    const imgs = proj.cover_sources.map((src, i) =>
      `<img class="cover-slide${i === 0 ? ' active' : ''}" src="${src}" alt="${proj.title} — металоконструкція Черкаси" loading="lazy">`
    ).join('');
    return imgs + `<div class="project-card-cover-overlay"></div>`;
  }
  if (proj.finished && proj.finished.length > 0 && (proj.finished[0].thumb || proj.finished[0].src)) {
    const coverSrc = proj.finished[0].thumb || proj.finished[0].src;
    return `<img class="cover-slide active" src="${coverSrc}" alt="${proj.title} — металоконструкція Черкаси" loading="lazy">
            <div class="project-card-cover-overlay"></div>`;
  }
  return `
    <div style="position:absolute;inset:0;background:var(--dark-3)"></div>
    <div class="cover-no-photo">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      Фото незабаром
    </div>
    <div class="project-card-cover-overlay"></div>`;
}

/* ─── Build main photo / placeholder for stage ─── */
function buildComp(item, key, proj) {
  if (item && item.src) {
    return `
      <div class="gallery-comp" style="background:#0a0a0a">
        <img src="${item.src}" alt="${item.caption || proj.title}"
             loading="lazy"
             style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain">
        ${item.caption ? `<div class="gallery-comp-badge">${item.caption}</div>` : ''}
        <div class="gallery-comp-caption">
          <div class="gallery-comp-title">${proj.title}</div>
          ${proj.meta ? `<div class="gallery-comp-meta">${proj.meta}</div>` : ''}
        </div>
      </div>`;
  }
  return `
    <div class="gallery-comp" style="background:var(--dark-3);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;color:rgba(255,255,255,.15)">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      <span style="font-family:var(--font-condensed);font-size:.8rem;letter-spacing:.2em;text-transform:uppercase">Фото незабаром</span>
      <div class="gallery-comp-caption">
        <div class="gallery-comp-title">${proj.title}</div>
        ${proj.meta ? `<div class="gallery-comp-meta">${proj.meta}</div>` : ''}
      </div>
    </div>`;
}

/* ─── Build thumbnail ─── */
function buildThumb(item, idx) {
  if (item && item.thumb) {
    return `<div class="gallery-thumb thumb-loaded" data-idx="${idx}">
      <img src="${item.thumb}" alt="${item.caption || 'Фото роботи — металоконструкції Черкаси'}" loading="lazy"
           style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
    </div>`;
  }
  if (item && item.src) {
    return `<div class="gallery-thumb thumb-loaded" data-idx="${idx}">
      <img src="${item.src}" alt="${item.caption || 'Фото роботи — металоконструкції Черкаси'}" loading="lazy"
           style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
    </div>`;
  }
  return `<div class="gallery-thumb thumb-loaded" data-idx="${idx}"
               style="background:var(--dark-3);display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.1)">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
  </div>`;
}

/* ─── Slideshow for cover images ─── */
function startCoverSlideshows() {
  stopCoverSlideshows();
  projectsGrid.querySelectorAll('.project-card').forEach(card => {
    const slides = card.querySelectorAll('.cover-slide');
    if (slides.length < 2) return;
    let idx = 0;
    const tid = setInterval(() => {
      slides[idx].classList.remove('active');
      idx = (idx + 1) % slides.length;
      slides[idx].classList.add('active');
    }, 5000);
    coverTimers.push(tid);
  });
}
function stopCoverSlideshows() {
  coverTimers.forEach(clearInterval);
  coverTimers = [];
}

/* ─── Populate projects grid for a given category key ─── */
function populateProjectsGrid(key) {
  const data = GALLERY[key];
  if (!data) return;

  projectsGrid.innerHTML = data.projects.map((proj, pIdx) => {
    const finCount  = proj.finished ? proj.finished.length : 0;
    const procCount = proj.process  ? proj.process.length  : 0;
    return `
      <div class="project-card" data-key="${key}" data-pidx="${pIdx}" tabindex="0" role="button"
           aria-label="Відкрити проєкт: ${proj.title}">
        <div class="project-card-cover">
          ${buildCardCover(proj, key)}
          <div class="project-card-count">📸 ${finCount} фото</div>
          ${procCount > 0 ? `<div class="project-card-process-badge">🔧 ${procCount} WIP</div>` : ''}
        </div>
        <div class="project-card-info">
          <div class="project-card-title">${proj.title}</div>
          ${proj.meta ? `<div class="project-card-meta">${proj.meta}</div>` : ''}
          <div class="project-card-cta">Переглянути проєкт →</div>
        </div>
      </div>`;
  }).join('');

  projectsGrid.querySelectorAll('.project-card').forEach((card, i) => {
    card.style.transitionDelay = `${i * 60}ms`;
    lazyObs.observe(card);
  });
}

/* ─── LEVEL 1: Open category → show projects grid ─── */
function openCategory(key) {
  const data = GALLERY[key];
  if (!data) return;
  currentKey = key;
  const icon = CAT_ICONS[key] || '🔩';
  iconEl.textContent     = icon;
  catEl.textContent      = data.label || key;
  breadcrumb.textContent = '';
  breadcrumb.classList.remove('visible');
  counterEl.textContent  = `${data.projects.length} проєктів`;
  backBtn.classList.remove('visible');
  populateProjectsGrid(key);
  startCoverSlideshows();
  viewProjects.classList.add('active');
  viewPhotos.classList.remove('active');
  openModal();
}

/* ─── LEVEL 2: Open project photos ─── */
function openProject(key, pIdx, tab = 'finished') {
  const data = GALLERY[key];
  if (!data) return;
  currentKey     = key;
  currentProject = pIdx;
  currentTab     = tab;
  currentIdx     = 0;
  populateProjectsGrid(key);
  const proj = data.projects[pIdx];
  iconEl.textContent     = CAT_ICONS[key] || '🔩';
  catEl.textContent      = data.label || key;
  breadcrumb.textContent = proj.title;
  breadcrumb.classList.add('visible');
  backBtn.classList.add('visible');
  const procPhotos = proj.process || [];
  tabProcess.style.display = procPhotos.length > 0 ? '' : 'none';
  if (procPhotos.length === 0 && tab === 'process') tab = 'finished';
  setActiveTab(tab, false);
  viewProjects.classList.remove('active');
  viewPhotos.classList.add('active');
  renderItem(0, false);
  openModal();
}

/* ─── Switch finished / process tab ─── */
function setActiveTab(tab, rerender = true) {
  currentTab = tab;
  currentIdx = 0;
  tabFinished.classList.toggle('active', tab === 'finished');
  tabProcess.classList.toggle('active',  tab === 'process');
  const proj   = GALLERY[currentKey].projects[currentProject];
  const photos = tab === 'finished' ? (proj.finished || []) : (proj.process || []);
  const label  = tab === 'finished' ? 'Готових фото' : 'Фото процесу';
  counterEl.textContent = `${photos.length} ${label}`;
  thumbsEl.innerHTML = photos.length
    ? photos.map((it, i) => buildThumb(it, i)).join('')
    : `<div style="padding:10px;font-family:var(--font-condensed);font-size:.75rem;color:var(--metal);letter-spacing:.12em;text-transform:uppercase">Фото незабаром</div>`;
  if (rerender) renderItem(0, false);
}

/* ─── Render photo at index ─── */
function renderItem(idx, animate = true) {
  const proj   = GALLERY[currentKey].projects[currentProject];
  const photos = currentTab === 'finished' ? (proj.finished || []) : (proj.process || []);
  currentIdx   = photos.length ? (((idx % photos.length) + photos.length) % photos.length) : 0;
  const item   = photos[currentIdx] || null;

  counterEl.textContent = photos.length
    ? `${currentIdx + 1} / ${photos.length} · ${currentTab === 'finished' ? 'Готові фото' : 'Процес'}`
    : currentTab === 'finished' ? 'Готових фото: 0' : 'Фото процесу: 0';

  thumbsEl.querySelectorAll('.gallery-thumb').forEach((th, i) => {
    th.classList.toggle('active', i === currentIdx);
  });
  const activeThumb = thumbsEl.children[currentIdx];
  if (activeThumb) activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

  const html = buildComp(item, currentKey, proj);
  if (animate) {
    imgWrap.style.opacity = '0';
    setTimeout(() => { imgWrap.innerHTML = html; imgWrap.style.opacity = '1'; }, 220);
  } else {
    imgWrap.innerHTML = html;
    imgWrap.style.transition = 'none';
    imgWrap.style.opacity = '1';
    requestAnimationFrame(() => { imgWrap.style.transition = 'opacity .28s'; });
  }
}

/* ─── Zoom: open from gallery stage ─── */
function openZoom() {
  if (currentProject === null) return;
  const proj   = GALLERY[currentKey].projects[currentProject];
  const photos = currentTab === 'finished' ? (proj.finished || []) : (proj.process || []);
  const item   = photos[currentIdx] || null;
  if (!item || !item.src) return;

  zScale = 1; zPanX = 0; zPanY = 0;
  zCanvas.innerHTML = '';
  const img = document.createElement('img');
  img.id = 'zoomImg';
  img.src = item.src;
  img.alt = item.caption || proj.title;
  img.draggable = false;
  img.onload = () => {
    const fitW = window.innerWidth  * 0.92 / img.naturalWidth;
    const fitH = window.innerHeight * 0.88 / img.naturalHeight;
    zScale = Math.min(fitW, fitH, 1);
    zPanX = 0; zPanY = 0;
    zApply(true);
  };
  zCanvas.appendChild(img);
  zApply(false);
  zoomOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

/* ─── Modal open / close ─── */
function openModal() {
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  modal.classList.remove('open');
  document.body.style.overflow = '';
  stopCoverSlideshows();
}

/* ─── Event listeners ─── */
prevBtn.addEventListener('click', () => renderItem(currentIdx - 1));
nextBtn.addEventListener('click', () => renderItem(currentIdx + 1));
closeBtn.addEventListener('click', closeModal);
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

backBtn.addEventListener('click', () => {
  const data = GALLERY[currentKey];
  iconEl.textContent    = CAT_ICONS[currentKey] || '🔩';
  catEl.textContent     = data.label || currentKey;
  counterEl.textContent = `${data.projects.length} проєктів`;
  breadcrumb.classList.remove('visible');
  backBtn.classList.remove('visible');
  tabProcess.style.display = '';
  viewPhotos.classList.remove('active');
  viewProjects.classList.add('active');
  startCoverSlideshows();
});

tabFinished.addEventListener('click', () => { if (currentTab !== 'finished') setActiveTab('finished'); });
tabProcess.addEventListener('click',  () => { if (currentTab !== 'process')  setActiveTab('process'); });

thumbsEl.addEventListener('click', e => {
  const th = e.target.closest('.gallery-thumb');
  if (th) renderItem(parseInt(th.dataset.idx));
});

projectsGrid.addEventListener('click', e => {
  const card = e.target.closest('.project-card');
  if (card) openProject(card.dataset.key, parseInt(card.dataset.pidx), 'finished');
});
projectsGrid.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') {
    const card = e.target.closest('.project-card');
    if (card) openProject(card.dataset.key, parseInt(card.dataset.pidx), 'finished');
  }
});

galleryStage.addEventListener('click', e => {
  if (e.target.closest('.gallery-nav')) return;
  if (currentProject !== null) openZoom();
});

document.addEventListener('keydown', e => {
  if (zoomOverlay.classList.contains('open')) { if (e.key === 'Escape') { closeZoom(); return; } }
  if (!modal.classList.contains('open')) return;
  if (e.key === 'Escape') { closeModal(); return; }
  if (viewPhotos.classList.contains('active')) {
    if (e.key === 'ArrowRight') renderItem(currentIdx + 1);
    if (e.key === 'ArrowLeft')  renderItem(currentIdx - 1);
  }
});

modal.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
modal.addEventListener('touchend', e => {
  if (!viewPhotos.classList.contains('active')) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 50) dx < 0 ? renderItem(currentIdx + 1) : renderItem(currentIdx - 1);
}, { passive: true });

/* ─── Attach gallery open to all [data-gallery] elements ─── */
document.querySelectorAll('[data-gallery]').forEach(el => {
  el.style.cursor = 'pointer';
  el.addEventListener('click', () => {
    const key  = el.dataset.gallery;
    const pidx = el.dataset.pidx;
    if (pidx !== undefined) {
      openProject(key, parseInt(pidx, 10), 'finished');
    } else {
      openCategory(key);
    }
  });
});

/* ─── Auto-count projects in service-card-view labels ─── */
(function updateServiceCardCounts() {
  document.querySelectorAll('.service-card[data-gallery]').forEach(card => {
    const key  = card.dataset.gallery;
    const data = GALLERY && GALLERY[key];
    if (!data) return;
    const count = data.projects.length;
    const viewEl = card.querySelector('.service-card-view');
    if (viewEl) {
      viewEl.textContent = `Переглянути ${count} проєкт${count === 1 ? '' : count < 5 ? 'и' : 'ів'} ↗`;
    }
  });
})();

/* ─── Inject single static photo into service-cards and portfolio-items ─── */
(function injectStaticPhotos() {
  document.querySelectorAll('.service-card[data-gallery]').forEach(card => {
    const key = card.dataset.gallery;
    if (key === 'Інше') return;
    const data = GALLERY[key];
    if (!data) return;
    const proj = data.projects[0];
    if (!proj) return;
    const src = (proj.finished && proj.finished[0]) ? (proj.finished[0].thumb || proj.finished[0].src) : null;
    if (!src) return;
    const bg = card.querySelector('.service-card-bg');
    if (!bg) return;
    bg.style.background = 'none';
    bg.innerHTML = `<img class="cover-slide active" src="${src}" alt="${proj.title} — металоконструкції Черкаси" loading="lazy"
                        style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`;
  });

  document.querySelectorAll('.portfolio-item[data-gallery]').forEach(item => {
    const key      = item.dataset.gallery;
    const data     = GALLERY[key];
    if (!data) return;
    const pIdx     = parseInt(item.dataset.pidx  || '0', 10);
    const photoIdx = parseInt(item.dataset.photo || '0', 10);
    const proj     = data.projects[pIdx];
    if (!proj) return;
    const photo    = proj.finished && proj.finished[photoIdx];
    const src      = photo ? photo.src : null;
    if (!src) return;
    const bg = item.querySelector('.portfolio-img-bg');
    if (!bg) return;
    bg.style.background = 'none';
    bg.innerHTML = `<img class="cover-slide active" src="${src}" alt="${(photo && photo.caption) || proj.title} — металоконструкції Черкаси" loading="lazy"
                        style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`;
    const label = item.querySelector('.portfolio-label');
    if (label && (photo.caption || proj.title)) {
      label.textContent = photo.caption || proj.title;
    }
  });
})();

/* ─── Slideshow for service-card "Інше" only ─── */
(function initInsheSlideshows() {
  const card = document.querySelector('.service-card[data-gallery="Інше"]');
  if (!card) return;
  const data = GALLERY['Інше'];
  if (!data) return;
  const slides = data.projects
    .filter(p => p.cover_sources && p.cover_sources.length > 0)
    .map(p => p.cover_sources[0]);
  if (!slides.length) return;
  const bg = card.querySelector('.service-card-bg');
  if (!bg) return;
  bg.style.background = 'none';
  bg.innerHTML = slides.map((src, i) =>
    `<img class="cover-slide${i === 0 ? ' active' : ''}" src="${src}" alt="Металоконструкції на замовлення — Черкаси" loading="lazy"
          style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`
  ).join('');
  if (slides.length < 2) return;
  let idx = 0;
  setInterval(() => {
    bg.querySelectorAll('.cover-slide')[idx].classList.remove('active');
    idx = (idx + 1) % slides.length;
    bg.querySelectorAll('.cover-slide')[idx].classList.add('active');
  }, 4000);
})();

/* ─── Dynamic justified collage ─── */
(function buildDynamicCollage() {
  const collageEl = document.getElementById('portfolioCollage');
  if (!collageEl) return;
  const itemEls = [...collageEl.querySelectorAll('.portfolio-item[data-gallery]')];
  if (!itemEls.length) return;

  const entries = itemEls.map(item => {
    const key      = item.dataset.gallery;
    const data     = GALLERY && GALLERY[key];
    const pIdx     = parseInt(item.dataset.pidx  || '0', 10);
    const photoIdx = parseInt(item.dataset.photo || '0', 10);
    const proj     = data && data.projects[pIdx];
    const photo    = proj && proj.finished && proj.finished[photoIdx];
    return { item, src: photo ? photo.src : null, ratio: 4 / 3 };
  });

  let pending = entries.length;
  function onAllLoaded() {
    applyLayout();
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(applyLayout).observe(collageEl);
    } else {
      window.addEventListener('resize', applyLayout, { passive: true });
    }
  }

  entries.forEach(entry => {
    if (!entry.src) { if (--pending === 0) onAllLoaded(); return; }
    const img   = new Image();
    img.onload  = () => { entry.ratio = img.naturalWidth / img.naturalHeight; if (--pending === 0) onAllLoaded(); };
    img.onerror = () => {                                                       if (--pending === 0) onAllLoaded(); };
    img.src = entry.src;
  });

  function applyLayout() {
    const GAP          = 3;
    const MIN_ROW_H    = 150;
    const MAX_ROW_H    = 460;
    const TARGET_ROW_H = 240;
    const MAX_PER_ROW  = 4;
    const containerW   = collageEl.clientWidth;
    if (!containerW) return;

    entries.forEach(e => { if (e.item.parentNode) e.item.parentNode.removeChild(e.item); });
    collageEl.querySelectorAll('.portfolio-row').forEach(r => r.remove());

    if (containerW < 600) {
      const cols   = containerW < 360 ? 1 : 2;
      const tileH  = Math.round((containerW - GAP * (cols - 1)) / cols * 0.72);
      for (let i = 0; i < entries.length; i += cols) {
        const rowEl = document.createElement('div');
        rowEl.className  = 'portfolio-row';
        rowEl.style.cssText = `height:${tileH}px;`;
        for (let j = i; j < Math.min(i + cols, entries.length); j++) {
          const item = entries[j].item;
          item.style.cssText = `flex:1 0 0px; height:100%; --item-h:${tileH}px;`;
          rowEl.appendChild(item);
        }
        collageEl.appendChild(rowEl);
      }
      return;
    }

    const ratios = entries.map(e => e.ratio);
    const rows   = [];
    let i = 0;
    while (i < ratios.length) {
      let rowIdxs = [];
      let rowW    = 0;
      let j       = i;
      while (j < ratios.length && rowIdxs.length < MAX_PER_ROW) {
        const gap  = rowIdxs.length > 0 ? GAP : 0;
        rowIdxs.push(j);
        rowW += ratios[j] * TARGET_ROW_H + gap;
        j++;
        if (rowW >= containerW && rowIdxs.length >= 2) break;
      }
      const ratioSum = rowIdxs.reduce((s, k) => s + ratios[k], 0);
      const gapSum   = (rowIdxs.length - 1) * GAP;
      const rowH     = Math.round(Math.max(MIN_ROW_H, Math.min(MAX_ROW_H, (containerW - gapSum) / ratioSum)));
      rows.push({ indices: rowIdxs, height: rowH });
      i = j;
    }

    rows.forEach(row => {
      const rowEl = document.createElement('div');
      rowEl.className = 'portfolio-row';
      rowEl.style.height = row.height + 'px';
      row.indices.forEach(k => {
        const item  = entries[k].item;
        item.style.flex      = entries[k].ratio + ' 0 0px';
        item.style.height    = '100%';
        item.style.setProperty('--item-h', row.height + 'px');
        rowEl.appendChild(item);
      });
      collageEl.appendChild(rowEl);
    });
  }
})();

/* ─── Active nav highlight on scroll ─── */
const navLinks = document.querySelectorAll('.nav-links a');
const secObs   = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
    }
  });
}, { threshold: 0.4 });
document.querySelectorAll('section[id]').forEach(s => secObs.observe(s));
