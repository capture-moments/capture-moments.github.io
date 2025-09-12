// footer year
document.getElementById('year').textContent = new Date().getFullYear();

// // lightbox
// const lb = document.getElementById('lightbox');
// const lbImg = document.getElementById('lb-img');
// const lbTitle = document.getElementById('lb-title');
// const anchors = Array.from(document.querySelectorAll('#work a.item'));
// let index = 0;
// function openAt(i){ if(!anchors.length) return; index=(i+anchors.length)%anchors.length; const a=anchors[index]; lbImg.src=a.getAttribute('href'); lbTitle.textContent=a.dataset.title||''; lb.classList.add('active'); document.body.style.overflow='hidden'; }
// function closeLB(){ lb.classList.remove('active'); document.body.style.overflow=''; }
// function next(){ openAt(index+1); } function prev(){ openAt(index-1); }
// anchors.forEach((a,i)=>a.addEventListener('click',e=>{ e.preventDefault(); openAt(i); }));
// document.getElementById('close')?.addEventListener('click', closeLB);
// document.getElementById('next')?.addEventListener('click', next);
// document.getElementById('prev')?.addEventListener('click', prev);
// lb.addEventListener('click', e=>{ if(e.target===lb) closeLB(); });
// window.addEventListener('keydown', e=>{ if(!lb.classList.contains('active')) return; if(e.key==='Escape') closeLB(); if(e.key==='ArrowRight') next(); if(e.key==='ArrowLeft') prev(); });

// CONTACT FORM AJAX
const form = document.getElementById('contactForm');
const statusEl = document.getElementById('formStatus');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusEl.textContent = '';
    const btn = form.querySelector('button[type="submit"]');
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } });
      if (res.ok) { form.reset(); statusEl.textContent = 'Thanks! Your message was sent.'; statusEl.className = 'form-status ok'; }
      else { const data = await res.json().catch(() => ({})); statusEl.textContent = (data.errors && data.errors[0]?.message) || 'Oops, something went wrong.'; statusEl.className = 'form-status err'; }
    } catch { statusEl.textContent = 'Network error. Please try again.'; statusEl.className = 'form-status err'; }
    finally { btn.disabled = false; btn.textContent = original; }
  });
  window.addEventListener('pageshow', e => { if (e.persisted) form.reset(); });
}

// === JUSTIFIED GALLERY (Flickr-style) ===
function setupJustifiedGallery() {
  const container = document.getElementById('jg');
  if (!container) return;

  const GAP = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gutter')) || 18;
  const TARGET_ROW_H = 280;         // probaj 240–320 po ukusu
  const MAX_ROW_DEV = 0.25;
  const JUSTIFY_LAST_ROW = true;  // ako želiš i poslednji red rastegnut bez preloma -> true
  const WIDOW_MIN_FILL = 0.85;     // poslednji red mora da bude bar 85% širine, inače radimo prelom


  const anchors = Array.from(container.querySelectorAll('a'));

  // sačekaj slike da dobijemo dimenzije
  Promise.all(anchors.map(a => new Promise(res => {
    const img = a.querySelector('img');
    if (img.complete && img.naturalWidth) return res();
    img.onload = res; img.onerror = res;
  }))).then(layout);

  window.addEventListener('resize', () => {
    clearTimeout(window.__jg_rt);
    window.__jg_rt = setTimeout(layout, 120);
  });

  function layout() {
    // kloniramo originale da ne izgubimo reference
    const items = anchors.map(a => {
      const img = a.querySelector('img');
      const ar = (img.naturalWidth || 3) / (img.naturalHeight || 2);
      // kreiramo svež <a> da ne premeštamo original (čist relayout)
      const a2 = a.cloneNode(true);
      a2.classList.add('item');          // važno za lightbox selektor
      return { a: a2, ar };
    });

    // isprazni i renderuj redove
    container.innerHTML = '';
    const totalW = container.getBoundingClientRect().width; // tačna širina (uklj. padding)
    let row = [], arSum = 0;

    for (let i = 0; i < items.length; i++) {
      row.push(items[i]); arSum += items[i].ar;
      const rowW = arSum * TARGET_ROW_H + GAP * (row.length - 1);
      if (rowW > totalW * (1 - MAX_ROW_DEV)) {
        renderRow(row, totalW, GAP, arSum, false);
        row = []; arSum = 0;
      }
    }
    if (row.length) renderRow(row, totalW, GAP, arSum, true);

    // posle layouta, re-inicijalizuj lightbox
    initLightbox();
  }

  function renderRow(row, totalW, gap, arSum, isLast) {
    const rowEl = document.createElement('div');
    rowEl.className = 'jg-row';
    rowEl.style.gap = gap + 'px';

    // izračunaj visinu reda
    const h = isLast ? TARGET_ROW_H : ((totalW - gap * (row.length - 1)) / arSum);

    row.forEach(({ a, ar }) => {
      const w = h * ar;
      const wrap = document.createElement('div');
      wrap.className = 'jg-item';
      wrap.style.width = w + 'px';
      wrap.style.height = h + 'px';
      wrap.appendChild(a);
      rowEl.appendChild(wrap);
    });
    container.appendChild(rowEl);
  }
  // ako je ostao poslednji red
if (row.length) {
  const contentW = totalW - GAP * (row.length - 1);
  const lastRowWidthAtTarget = arSum * TARGET_ROW_H;

  if (JUSTIFY_LAST_ROW) {
    // 1) razvuci poslednji red da popuni širinu
    renderRow(row, totalW, GAP, arSum, /*isLast=*/false);
  } else {
    // 2) widow control – ako je <85% širine, prebaci zadnje fotke iz prethodnog reda
    const fillRatio = lastRowWidthAtTarget / contentW;

    if (fillRatio < WIDOW_MIN_FILL && container.lastElementChild) {
      // uzmi prethodni renderovani red nazad kao listu itema
      const prevRowEl = container.lastElementChild;
      const prevItems = Array.from(prevRowEl.querySelectorAll('.jg-item > a'))
        .map(a => {
          const img = a.querySelector('img');
          const ar = (img.naturalWidth || 3) / (img.naturalHeight || 2);
          return { a, ar };
        });

      // skloni prethodni red iz DOM-a
      container.removeChild(prevRowEl);

      // dok poslednji red nije dovoljno "pun", poteži fotke iz kraja pretposlednjeg
      while (fillRatio < WIDOW_MIN_FILL && prevItems.length) {
        const moved = prevItems.pop();
        row.unshift(moved);      // dodaj na početak poslednjeg reda
        arSum += moved.ar;
        // re-izračunaj popunjenost za target visinu
        const contentW2 = totalW - GAP * (row.length - 1);
        const lastRowWidth2 = arSum * TARGET_ROW_H;
        if (contentW2 > 0) fillRatio = lastRowWidth2 / contentW2;
      }

      // re-renderuj oba reda lepo
      if (prevItems.length) {
        const prevArSum = prevItems.reduce((s, it) => s + it.ar, 0);
        renderRow(prevItems, totalW, GAP, prevArSum, /*isLast=*/false);
      }
      renderRow(row, totalW, GAP, arSum, /*isLast=*/false);
    } else {
      // poslednji red je dovoljno širok – renderuj kao "ne-justify" (target visina)
      renderRow(row, totalW, GAP, arSum, /*isLast=*/true);
    }
  }
}

}

// === LIGHTBOX koji radi sa dinamičkim anchorima (.item) ===
let lb, lbImg, lbTitle, lbOpen = false, lbIndex = 0, lbAnchors = [];
function initLightbox() {
  lb = document.getElementById('lightbox');
  lbImg = document.getElementById('lb-img');
  lbTitle = document.getElementById('lb-title');
  lbAnchors = Array.from(document.querySelectorAll('#work a.item')); // posle layouta

  // delegacija: klik na bilo koji anchor
  lbAnchors.forEach((a, i) => {
    a.onclick = (e) => { e.preventDefault(); openAt(i); };
  });

  document.getElementById('close')?.addEventListener('click', closeLB);
  document.getElementById('next')?.addEventListener('click', () => openAt(lbIndex + 1));
  document.getElementById('prev')?.addEventListener('click', () => openAt(lbIndex - 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLB(); });
  window.addEventListener('keydown', (e) => {
    if (!lbOpen) return;
    if (e.key === 'Escape') closeLB();
    if (e.key === 'ArrowRight') openAt(lbIndex + 1);
    if (e.key === 'ArrowLeft') openAt(lbIndex - 1);
  });
}
function openAt(i) {
  if (!lbAnchors.length) return;
  lbIndex = (i + lbAnchors.length) % lbAnchors.length;
  const a = lbAnchors[lbIndex];
  lbImg.src = a.getAttribute('href');
  lbTitle.textContent = a.querySelector('img')?.alt || '';
  lb.classList.add('active'); document.body.style.overflow = 'hidden'; lbOpen = true;
}
function closeLB() { lb.classList.remove('active'); document.body.style.overflow = ''; lbOpen = false; }

// pokreni sve kada se DOM učita
document.addEventListener('DOMContentLoaded', () => {
  setupJustifiedGallery();
});

initLightbox();
