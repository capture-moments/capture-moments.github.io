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
  const TARGET_ROW_H = 300;   // možeš 240–320 po ukusu
  const MAX_ROW_DEV = 0.20;
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

    if (row.length) {
      const contentW = totalW - GAP * (row.length - 1);
      const lastRowWidthAtTarget = arSum * TARGET_ROW_H;

      if (JUSTIFY_LAST_ROW) {
        renderRow(row, totalW, GAP, arSum, /*isLast=*/false);
      } else {
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
