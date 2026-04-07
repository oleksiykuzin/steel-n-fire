/* ══════════════════════════════════════
   GALLERY — inline per-case
   ══════════════════════════════════════ */
const galState = {}; /* { [id]: { tab, idx } } */

function galImgs(id, tab) {
  return [...document.querySelectorAll(`.case-media[data-gallery="${id}"] .gallery-img[data-tab="${tab}"]`)];
}
function galThumbs(id, tab) {
  return [...document.querySelectorAll(`#gts-${id} .gthumb[data-tab="${tab}"]`)];
}

function galGoto(id, tab, idx) {
  const state = galState[id] || (galState[id] = { tab: 'final', idx: 0 });
  document.querySelectorAll(`.case-media[data-gallery="${id}"] .gallery-img`).forEach(i => i.classList.remove('active'));
  const imgs = galImgs(id, tab);
  const safeIdx = ((idx % imgs.length) + imgs.length) % imgs.length;
  if (imgs[safeIdx]) imgs[safeIdx].classList.add('active');
  document.querySelectorAll(`#gts-${id} .gthumb`).forEach(t => t.classList.remove('active'));
  const thumbs = galThumbs(id, tab);
  if (thumbs[safeIdx]) thumbs[safeIdx].classList.add('active');
  const gc = document.getElementById(`gc-${id}`);
  if (gc) gc.textContent = `${safeIdx + 1} / ${imgs.length}`;
  state.tab = tab;
  state.idx = safeIdx;
}

function galNav(id, dir) {
  const state = galState[id] || { tab: 'final', idx: 0 };
  galGoto(id, state.tab, state.idx + dir);
}

function galTab(id, tab, btn) {
  btn.closest('.gallery-tabs').querySelectorAll('.gtab').forEach(b => b.classList.toggle('active', b === btn));
  document.querySelectorAll(`#gts-${id} .gthumb`).forEach(t => {
    t.classList.toggle('tab-hidden', t.dataset.tab !== tab);
  });
  galGoto(id, tab, 0);
}

function mediaClick(e, id) {
  if (e.target.closest('.gallery-hud button, .gthumb, .gthumbstrip')) return;
  const state = galState[id] || { tab: 'final', idx: 0 };
  const cur   = galImgs(id, state.tab)[state.idx];
  if (!cur) return;
  zoom.open(cur.src, cur.alt); /* zoom определён в main.js */
}
