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

// === JUSTIFIED GALLERY (Flickr-style) — per-page options via data-* ===
function setupJustifiedGallery(selector = '#jg', userOpts = {}) {
  const container = document.querySelector(selector);
  if (!container) return;

  // ---- OPTIONS (prioritet: data-* > userOpts > CSS var > default)
  const cssGutter = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gutter')) || null;
  const ds = container.dataset;

  const GAP = parseInt(ds.gap ?? userOpts.gap ?? cssGutter ?? 22);            // px
  const TARGET_ROW_H_BASE = parseInt(ds.rowH ?? userOpts.targetRowH ?? 300);  // px
  const TARGET_ROW_H_SM   = parseInt(ds.rowHSm ?? userOpts.rowHSm ?? TARGET_ROW_H_BASE - 40);
  const MAX_ROW_DEV = parseFloat(ds.maxDev ?? userOpts.maxRowDev ?? 0.20);    // 0–1
  const JUSTIFY_LAST_ROW = (ds.justifyLastRow ?? userOpts.justifyLastRow ?? 'true') === 'true';
  const WIDOW_MIN_FILL = parseFloat(ds.widowFill ?? userOpts.widowMinFill ?? 0.95);

  // responsive target height (po uzoru na stari home)
  function targetRowH() {
    const w = container.getBoundingClientRect().width;
    if (w < 640) return TARGET_ROW_H_SM;  
    return TARGET_ROW_H_BASE;
  }

  // ---- SOURCE ITEMS
  const anchors = Array.from(container.querySelectorAll('a'));

  Promise.all(
    anchors.map(a => new Promise(res => {
      const img = a.querySelector('img');
      if (img && img.complete && img.naturalWidth) return res();
      if (!img) return res();
      img.onload = res; img.onerror = res;
    }))
  ).then(layout);

  // re-layout na resize (debounce)
  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(layout, 120);
  });

  function layout() {
    const items = anchors.map(a => {
      const img = a.querySelector('img');
      const ar = img ? (img.naturalWidth || 3) / (img.naturalHeight || 2) : 3/2;
      return { a, ar };
    });

    const totalW = container.getBoundingClientRect().width;
    container.innerHTML = '';

    let row = [], arSum = 0, H = targetRowH();

    for (let i = 0; i < items.length; i++) {
      row.push(items[i]);
      arSum += items[i].ar;
      const rowW = arSum * H + GAP * (row.length - 1);

      if (rowW > totalW * (1 - MAX_ROW_DEV)) {
        renderRow(row, totalW, GAP, arSum, /*isLast=*/false);
        row = []; arSum = 0;
      }
    }

    if (row.length) {
      if (JUSTIFY_LAST_ROW) {
        renderRow(row, totalW, GAP, arSum, /*isLast=*/false);
      } else {
        renderRow(row, totalW, GAP, arSum, /*isLast=*/true);
      }
    }

    // rebind Fancybox (safe)
    if (window.Fancybox) {
      Fancybox.destroy();
      Fancybox.bind(selector + ' a', {
        groupAll: true,
        Thumbs: { autoStart: false },
        Toolbar: { display: ['counter', 'close'] },
        Images: { zoom: true, Panzoom: { maxScale: 2.5 } },
        caption: null,
        animated: true,
        dragToClose: true,
        trapFocus: false,
        placeFocusBack: false
      });
    }
  }

  function renderRow(row, totalW, gap, arSum, isLast) {
    const rowEl = document.createElement('div');
    rowEl.className = 'jg-row';
    rowEl.style.gap = gap + 'px';

    const contentW = totalW - gap * (row.length - 1);
    const H = isLast ? Math.min(targetRowH(), contentW / arSum) : (contentW / arSum);

    row.forEach(({ a, ar }) => {
      const w = H * ar;
      const wrap = document.createElement('div');
      wrap.className = 'jg-item';
      wrap.style.width = w + 'px';
      wrap.style.height = H + 'px';
      wrap.appendChild(a); // pomeramo POSTOJEĆE <a> (ne kloniramo)
      rowEl.appendChild(wrap);
    });

    container.appendChild(rowEl);
  }
  requestAnimationFrame(() => {
  const newImgs = Array.from(container.querySelectorAll('.jg-item img'));
  const waits = newImgs.map(img => {
    if (img.decode) return img.decode().catch(() => {});
    if (img.complete) return Promise.resolve();
    return new Promise(res => { img.onload = img.onerror = res; });
  });
  Promise.all(waits).then(() => {
    container.dispatchEvent(new Event('jg:ready'));
  });
});
}

// auto-init
document.addEventListener('DOMContentLoaded', () => {
  setupJustifiedGallery('#jg');
});


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


  document.addEventListener('DOMContentLoaded', () => {
    const cont = document.getElementById('jg');
    const loader = document.getElementById('loader');
    if (!cont || !loader) return;

    cont.addEventListener('jg:ready', () => {
      loader.classList.add('hidden');
      setTimeout(() => loader.remove(), 500);
    }, { once: true });
  });
