/* ============================================================
   NAV SCROLL
   ============================================================ */
const navEl = document.getElementById('nav');
window.addEventListener('scroll', () => {
  navEl.classList.toggle('scrolled', scrollY > 40);
}, { passive: true });

/* ============================================================
   SCROLL REVEAL
   ============================================================ */
const revObs = new IntersectionObserver((entries, obs) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(el => revObs.observe(el));

/* ============================================================
   ZOOM OVERLAY
   Публичный API:
     zoom.open(src, alt)  — открыть оверлей с картинкой
     zoom.close()         — закрыть
   ============================================================ */
class ZoomOverlay {
  #scale = 1; #panX = 0; #panY = 0;
  #dragActive = false; #dragX = 0; #dragY = 0; #dragMoved = false;
  #pinchDist  = null;
  #MIN = 0.5; #MAX = 8;

  constructor({ overlayId, canvasId, closeId, scaleElId }) {
    this.overlay  = document.getElementById(overlayId);
    this.canvas   = document.getElementById(canvasId);
    this.closeBtn = document.getElementById(closeId);
    this.scaleEl  = document.getElementById(scaleElId);
    this.#bindEvents();
  }

  /* ── публичные методы ── */

  open(src, alt = '') {
    this.#reset();
    this.canvas.innerHTML = '';

    const img = document.createElement('img');
    img.id        = 'zoomImg';
    img.src       = src;
    img.alt       = alt;
    img.draggable = false;
    img.onload = () => {
      const fitW = window.innerWidth  * 0.92 / img.naturalWidth;
      const fitH = window.innerHeight * 0.88 / img.naturalHeight;
      this.#scale = Math.min(fitW, fitH, 1);
      this.#apply(true);
    };
    this.canvas.appendChild(img);

    this.#apply(false);
    this.overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.overlay.classList.remove('open');
    this.#reset();
    setTimeout(() => { this.canvas.innerHTML = ''; }, 320);
    document.body.style.overflow = '';
  }

  /* ── приватные методы ── */

  #reset() { this.#scale = 1; this.#panX = 0; this.#panY = 0; }

  get #img() { return this.canvas.querySelector('#zoomImg'); }

  #apply(animated) {
    const img = this.#img; if (!img) return;
    img.classList.toggle('no-transition', !animated);
    img.style.transform =
      `translate(calc(-50% + ${this.#panX}px), calc(-50% + ${this.#panY}px)) scale(${this.#scale})`;
    if (this.scaleEl) this.scaleEl.textContent = Math.round(this.#scale * 100) + '%';
  }

  #clamp() {
    const img = this.#img; if (!img) return;
    const mx = Math.max(0, (img.naturalWidth  * this.#scale - window.innerWidth)  / 2);
    const my = Math.max(0, (img.naturalHeight * this.#scale - window.innerHeight) / 2);
    this.#panX = Math.max(-mx, Math.min(mx, this.#panX));
    this.#panY = Math.max(-my, Math.min(my, this.#panY));
  }

  #zoomAt(factor, cx, cy) {
    const prev  = this.#scale;
    this.#scale = Math.max(this.#MIN, Math.min(this.#MAX, prev * factor));
    const r  = this.#scale / prev;
    const dx = cx - window.innerWidth  / 2;
    const dy = cy - window.innerHeight / 2;
    this.#panX = (this.#panX - dx) * r + dx;
    this.#panY = (this.#panY - dy) * r + dy;
    this.#clamp();
    this.#apply(false);
  }

  #bindEvents() {
    /* колесо */
    this.canvas.addEventListener('wheel', e => {
      e.preventDefault();
      this.#zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY);
    }, { passive: false });

    /* перетаскивание мышью */
    this.canvas.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      this.#dragActive = true; this.#dragMoved = false;
      this.#dragX = e.clientX - this.#panX;
      this.#dragY = e.clientY - this.#panY;
      this.canvas.classList.add('grabbing');
    });
    window.addEventListener('mousemove', e => {
      if (!this.#dragActive) return;
      const dx = e.clientX - this.#dragX;
      const dy = e.clientY - this.#dragY;
      if (Math.abs(dx - this.#panX) > 3 || Math.abs(dy - this.#panY) > 3) this.#dragMoved = true;
      this.#panX = dx; this.#panY = dy;
      this.#clamp();
      this.#apply(false);
    });
    window.addEventListener('mouseup', () => {
      this.#dragActive = false;
      this.canvas.classList.remove('grabbing');
    });

    /* двойной клик: сброс или зум ×3 */
    this.canvas.addEventListener('dblclick', e => {
      if (this.#scale > 1.05) { this.#reset(); this.#apply(true); }
      else { this.#zoomAt(3, e.clientX, e.clientY); }
    });

    /* тач: щипок + перетаскивание */
    this.canvas.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        this.#pinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
      } else if (e.touches.length === 1) {
        this.#dragActive = true;
        this.#dragX = e.touches[0].clientX - this.#panX;
        this.#dragY = e.touches[0].clientY - this.#panY;
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      if (e.touches.length === 2 && this.#pinchDist !== null) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
        this.#zoomAt(dist / this.#pinchDist,
          (e.touches[0].clientX + e.touches[1].clientX) / 2,
          (e.touches[0].clientY + e.touches[1].clientY) / 2,
        );
        this.#pinchDist = dist;
      } else if (e.touches.length === 1 && this.#dragActive) {
        this.#panX = e.touches[0].clientX - this.#dragX;
        this.#panY = e.touches[0].clientY - this.#dragY;
        this.#clamp();
        this.#apply(false);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', e => {
      if (e.touches.length < 2) this.#pinchDist  = null;
      if (e.touches.length === 0) this.#dragActive = false;
    }, { passive: true });

    /* закрытие */
    this.closeBtn.addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', e => { if (e.target === this.overlay) this.close(); });
    document.addEventListener('keydown', e => {
      if (this.overlay.classList.contains('open') && e.key === 'Escape') this.close();
    });
  }
}

/* Единственный экземпляр — доступен всем скриптам страницы */
const zoom = new ZoomOverlay({
  overlayId: 'zoomOverlay',
  canvasId:  'zoomCanvas',
  closeId:   'zoomClose',
  scaleElId: 'zoomScaleEl',
});
