// footer year
document.getElementById('year').textContent = new Date().getFullYear();

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
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        form.reset();
        statusEl.textContent = 'Thanks! Your message was sent.';
        statusEl.className = 'form-status ok';
      } else {
        const data = await res.json().catch(() => ({}));
        statusEl.textContent = (data.errors && data.errors[0]?.message) || 'Oops, something went wrong.';
        statusEl.className = 'form-status err';
      }
    } catch {
      statusEl.textContent = 'Network error. Please try again.';
      statusEl.className = 'form-status err';
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });
  // ako se vratiš nazad s history cache-a
  window.addEventListener('pageshow', (e) => { if (e.persisted) form.reset(); });
}

// === JUSTIFIED GALLERY (Flickr-style) ===
function setupJustifiedGallery() {
  const container = document.getElementById('jg');
  if (!container) return;

  const GAP = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gutter')) || 18;
  const TARGET_ROW_H = 280;   // možeš 240–320 po ukusu
  const MAX_ROW_DEV = 0.25;
  const JUSTIFY_LAST_ROW = true;
  const WIDOW_MIN_FILL = 0.95;

  const anchors = Array.from(container.querySelectorAll('a'));

  // sačekaj da se sve slike učitaju da znamo dimenzije
  Promise.all(
    anchors.map(a => new Promise(res => {
      const img = a.querySelector('img');
      if (img.complete && img.naturalWidth) return res();
      img.onload = res; img.onerror = res;
    }))
  ).then(layout);

  window.addEventListener('resize', () => {
    clearTimeout(window.__jg_rt);
    window.__jg_rt = setTimeout(layout, 120);
  });

  function layout() {
    // pripremi listu (kloniramo <a> da bude čist re-render)
    const items = anchors.map(a => {
      const img = a.querySelector('img');
      const ar = (img.naturalWidth || 3) / (img.naturalHeight || 2);
      const a2 = a.cloneNode(true);
      return { a: a2, ar };
    });

    container.innerHTML = '';
    const totalW = container.getBoundingClientRect().width;

    let row = [], arSum = 0;

    for (let i = 0; i < items.length; i++) {
      row.push(items[i]);
      arSum += items[i].ar;
      const rowW = arSum * TARGET_ROW_H + GAP * (row.length - 1);
      if (rowW > totalW * (1 - MAX_ROW_DEV)) {
        renderRow(row, totalW, GAP, arSum, /*isLast=*/false);
        row = []; arSum = 0;
      }
    }

    // ako je ostalo još u poslednjem redu – logika završnog reda
    if (row.length) {
      const contentW = totalW - GAP * (row.length - 1);
      const lastRowWidthAtTarget = arSum * TARGET_ROW_H;

      if (JUSTIFY_LAST_ROW) {
        // razvuci i poslednji red
        renderRow(row, totalW, GAP, arSum, /*isLast=*/false);
      } else {
        // widow control: ako je <85% širine, pokušaj da uzmeš fotke iz prethodnog reda
        let fillRatio = lastRowWidthAtTarget / contentW;

        if (fillRatio < WIDOW_MIN_FILL && container.lastElementChild) {
          const prevRowEl = container.lastElementChild;
          const prevItems = Array.from(prevRowEl.querySelectorAll('.jg-item > a'))
            .map(a => {
              const img = a.querySelector('img');
              const ar = (img.naturalWidth || 3) / (img.naturalHeight || 2);
              return { a, ar };
            });

          container.removeChild(prevRowEl);

          while (fillRatio < WIDOW_MIN_FILL && prevItems.length) {
            const moved = prevItems.pop();
            row.unshift(moved);
            arSum += moved.ar;
            const contentW2 = totalW - GAP * (row.length - 1);
            const lastRowWidth2 = arSum * TARGET_ROW_H;
            if (contentW2 > 0) fillRatio = lastRowWidth2 / contentW2;
          }

          if (prevItems.length) {
            const prevArSum = prevItems.reduce((s, it) => s + it.ar, 0);
            renderRow(prevItems, totalW, GAP, prevArSum, /*isLast=*/false);
          }
          renderRow(row, totalW, GAP, arSum, /*isLast=*/false);
        } else {
          // poslednji red ostavi na target visini (ne-justify)
          renderRow(row, totalW, GAP, arSum, /*isLast=*/true);
        }
      }
    }
  }

  function renderRow(row, totalW, gap, arSum, isLast) {
    const rowEl = document.createElement('div');
    rowEl.className = 'jg-row';
    rowEl.style.gap = gap + 'px';

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
  // function renderRow(row, totalW, gap, arSum, isLast) {
  //   const rowEl = document.createElement('div');
  //   rowEl.className = 'jg-row';
  //   rowEl.style.gap = gap + 'px';

  //   if (isLast) {
  //     rowEl.style.justifyContent = 'center'; // centriraj poslednji red
  //   }

  //   const h = isLast
  //     ? TARGET_ROW_H
  //     : ((totalW - gap * (row.length - 1)) / arSum);

  //   row.forEach(({ a, ar }) => {
  //     const w = h * ar;
  //     const wrap = document.createElement('div');
  //     wrap.className = 'jg-item';
  //     wrap.style.width = w + 'px';
  //     wrap.style.height = h + 'px';
  //     wrap.appendChild(a);
  //     rowEl.appendChild(wrap);
  //   });

  //   container.appendChild(rowEl);
  // }
//   function renderRow(row, totalW, gap, arSum, isLast) {
//   const rowEl = document.createElement('div');
//   rowEl.className = 'jg-row';
//   rowEl.style.gap = gap + 'px';

//   const fillH = (totalW - gap * (row.length - 1)) / arSum;
//   const MAX_SCALE = 1.08; // max 8% veći od target visine

//   const h = isLast
//     ? Math.min(fillH, TARGET_ROW_H * MAX_SCALE)
//     : fillH;

//   row.forEach(({ a, ar }) => {
//     const w = h * ar;
//     const wrap = document.createElement('div');
//     wrap.className = 'jg-item';
//     wrap.style.width = w + 'px';
//     wrap.style.height = h + 'px';
//     wrap.appendChild(a);
//     rowEl.appendChild(wrap);
//   });

//   container.appendChild(rowEl);
// }

}

// pokreni kada se DOM učita
document.addEventListener('DOMContentLoaded', () => {
  setupJustifiedGallery();
});
const header = document.querySelector('.site-header');
function setHeaderOffset(){
  if (!header) return;
  document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
}
setHeaderOffset();
window.addEventListener('resize', setHeaderOffset);