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
  window.addEventListener('pageshow', (e) => { if (e.persisted) form.reset(); });
}

// === JUSTIFIED GALLERY (Flickr-style) ===
function setupJustifiedGallery() {
  const container = document.getElementById('jg');
  if (!container) return;

  const GAP = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gutter')) || 18;
  const TARGET_ROW_H = 300;   // 240–320 po ukusu
  const MAX_ROW_DEV = 0.20;
  const JUSTIFY_LAST_ROW = true;   // stavi false ako nećeš da se poslednji red razvlači
  const WIDOW_MIN_FILL = 0.95;     // koliko da bude popunjena poslednja linija kad nije justify

  // Uzmemo postojeće <a> (NE kloniramo!)
  const anchors = Array.from(container.querySelectorAll(':scope > a'));

  // Sačekaj da slike imaju dimenzije
  Promise.all(
    anchors.map(a => new Promise(res => {
      const img = a.querySelector('img');
      if (!img) return res();
      if (img.complete && img.naturalWidth) return res();
      img.onload = res; img.onerror = res;
    }))
  ).then(() => {
    layout();
    // Debounce za resize
    let rt;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(layout, 120);
    });
  });

  function layout() {
    const totalW = container.clientWidth || container.getBoundingClientRect().width;

    // Zadrži visinu kontejnera tokom relayouta (spreči skok)
    const prevH = container.offsetHeight;
    if (prevH) container.style.minHeight = prevH + 'px';

    // (opciono) sačuvaj skrol poziciju — safety net
    const prevScrollY = window.scrollY;

    // Pripremi stavke sa AR
    const items = anchors.map(a => {
      const img = a.querySelector('img');
      const ar = img ? ( (img.naturalWidth || 3) / (img.naturalHeight || 2) ) : 1;
      return { a, ar };
    });

    // Složi redove u memoriji (ne diramo DOM dok ne završimo)
    const rows = [];
    let row = [];
    let arSum = 0;

    for (let i = 0; i < items.length; i++) {
      row.push(items[i]);
      arSum += items[i].ar;
      const rowW = arSum * TARGET_ROW_H + GAP * (row.length - 1);
      if (rowW > totalW * (1 - MAX_ROW_DEV)) {
        rows.push({ items: row, sum: arSum });
        row = [];
        arSum = 0;
      }
    }

    // Ako je ostao rep (poslednji red)
    if (row.length) {
      if (!JUSTIFY_LAST_ROW) {
        // Ako nećeš justify poslednjeg reda, probaj blago da ga dopuniš iz prethodnog
        let sumLast = arSum;
        if (rows.length) {
          const prev = rows[rows.length - 1];
          const contentW = totalW - GAP * (row.length - 1);
          let fill = (sumLast * TARGET_ROW_H) / contentW;

          // Vuci iz prethodnog reda dok ne napuni ~95%
          while (fill < WIDOW_MIN_FILL && prev.items.length > 1) {
            const moved = prev.items.pop();
            prev.sum -= moved.ar;
            row.unshift(moved);
            sumLast += moved.ar;
            const contentW2 = totalW - GAP * (row.length - 1);
            fill = (sumLast * TARGET_ROW_H) / contentW2;
          }
        }
        rows.push({ items: row, sum: sumLast, isLast: true });
      } else {
        // Justify i poslednji
        rows.push({ items: row, sum: arSum, isLast: false });
      }
    }

    // Sastavi novi sadržaj u fragmentu
    const frag = document.createDocumentFragment();

    for (const r of rows) {
      const rowEl = document.createElement('div');
      rowEl.className = 'jg-row';
      rowEl.style.gap = GAP + 'px';

      const isLast = !!r.isLast;
      const h = isLast ? TARGET_ROW_H : ((totalW - GAP * (r.items.length - 1)) / r.sum);

      for (const { a, ar } of r.items) {
        const w = h * ar;
        const wrap = document.createElement('div');
        wrap.className = 'jg-item';
        wrap.style.width = w + 'px';
        wrap.style.height = h + 'px';
        wrap.appendChild(a); // premesti postojeći <a> (bez kloniranja)
        rowEl.appendChild(wrap);
      }

      frag.appendChild(rowEl);
    }

    // Jedan atomic replace (nema innerHTML = '')
    container.replaceChildren(frag);

    // Očisti zaštitni minHeight
    container.style.minHeight = '';

    // Vrati skrol na isto mesto (ako je browser ipak cimnuo)
    if (typeof prevScrollY === 'number') {
      window.scrollTo(0, prevScrollY);
    }
  }
}


document.addEventListener('DOMContentLoaded', () => {
  setupJustifiedGallery();
});
const header = document.querySelector('.site-header');
function setHeaderOffset() {
  if (!header) return;
  document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
}
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(setHeaderOffset, 100);
});
window.addEventListener('resize', setHeaderOffset);

(function () {
  const body = document.body;
  const burger = document.querySelector('.burger');
  const nav = document.getElementById('primary-nav');
  const overlay = document.querySelector('.nav-overlay');

  if (!burger || !nav || !overlay) return;

  const open = () => {
    body.classList.add('nav-open');
    burger.setAttribute('aria-expanded', 'true');
    overlay.hidden = false;
    const firstLink = nav.querySelector('a[href]');
    if (firstLink) firstLink.focus({ preventScroll: true });
  };

  const close = () => {
    body.classList.remove('nav-open');
    burger.setAttribute('aria-expanded', 'false');
    overlay.hidden = true;
    burger.focus({ preventScroll: true });
  };

  burger.addEventListener('click', (e) => {
    const isOpen = body.classList.contains('nav-open');
    isOpen ? close() : open();
  });

  overlay.addEventListener('click', close);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && body.classList.contains('nav-open')) {
      close();
    }
  });

  nav.addEventListener('click', (e) => {
    const target = e.target.closest('a[href]');
    if (target) close();
  });

  const mql = window.matchMedia('(max-width: 900px)');
  const handleMQ = () => {
    if (!mql.matches && body.classList.contains('nav-open')) {
      close();
    }
  };
  mql.addEventListener ? mql.addEventListener('change', handleMQ) : mql.addListener(handleMQ);
})();

const backToTop = document.getElementById("backToTop");

window.addEventListener("scroll", () => {
  if (window.scrollY > 400) {
    backToTop.classList.add("show");
  } else {
    backToTop.classList.remove("show");
  }
});

backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});
