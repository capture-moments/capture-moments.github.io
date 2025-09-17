/* ================================
   FOOTER YEAR (safe)
================================ */
{
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

/* ================================
   CONTACT FORM (AJAX)
================================ */
(() => {
  const form = document.getElementById('contactForm');
  const statusEl = document.getElementById('formStatus');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (statusEl) statusEl.textContent = '';
    const btn = form.querySelector('button[type="submit"]');
    const original = btn?.textContent || '';
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        form.reset();
        if (statusEl) {
          statusEl.textContent = 'Hvala! Vaša poruka je poslata.';
          statusEl.className = 'form-status ok';
        }
      } else {
        const data = await res.json().catch(() => ({}));
        if (statusEl) {
          statusEl.textContent = (data.errors && data.errors[0]?.message) || 'Oops, something went wrong.';
          statusEl.className = 'form-status err';
        }
      }
    } catch {
      if (statusEl) {
        statusEl.textContent = 'Network error. Please try again.';
        statusEl.className = 'form-status err';
      }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = original; }
    }
  });

  window.addEventListener('pageshow', (e) => { if (e.persisted) form.reset(); });
})();

/* ================================
   JUSTIFIED GALLERY
================================ */
function setupJustifiedGallery(selector = '#jg', userOpts = {}) {
  const container = document.querySelector(selector);
  if (!container) return;

  // OPTIONS (data-* > userOpts > CSS var > default)
  const cssGutter = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gutter')) || null;
  const ds = container.dataset;

  const GAP = parseInt(ds.gap ?? userOpts.gap ?? cssGutter ?? 22);                 // px
  const TARGET_ROW_H_BASE = parseInt(ds.rowH ?? userOpts.targetRowH ?? 300);       // px
  const TARGET_ROW_H_SM   = parseInt(ds.rowHSm ?? userOpts.rowHSm ?? TARGET_ROW_H_BASE - 40);
  const MAX_ROW_DEV = parseFloat(ds.maxDev ?? userOpts.maxRowDev ?? 0.20);         // 0–1
  const JUSTIFY_LAST_ROW = (ds.justifyLastRow ?? userOpts.justifyLastRow ?? 'true') === 'true';

  const anchors = Array.from(container.querySelectorAll('a'));

  function targetRowH() {
    const w = container.getBoundingClientRect().width;
    return (w < 640) ? TARGET_ROW_H_SM : TARGET_ROW_H_BASE;
  }

  Promise.all(
    anchors.map(a => new Promise(res => {
      const img = a.querySelector('img');
      if (!img) return res();
      if (img.complete && img.naturalWidth) return res();
      img.onload = img.onerror = res;
    }))
  ).then(layout);

  let rt, lastW = Math.round(container.getBoundingClientRect().width);
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      const w = Math.round(container.getBoundingClientRect().width);
      if (Math.abs(w - lastW) > 6) { 
        lastW = w;
        layout();
      }
    }, 120);
  });

  let boundCount = 0;
  function bindLightboxIfNeeded() {
    if (!window.Fancybox) return;
    const count = container.querySelectorAll('a').length;
    if (count !== boundCount) {
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
      boundCount = count;
    }
  }

  function layout() {
    const prevY = window.scrollY; 

    const items = anchors.map(a => {
      const img = a.querySelector('img');
      const ar = img?.naturalWidth
        ? (img.naturalWidth / img.naturalHeight)
        : (img?.getAttribute('width') && img?.getAttribute('height'))
          ? (parseFloat(img.getAttribute('width')) / parseFloat(img.getAttribute('height')))
          : parseFloat(img?.dataset?.ar || '1.5');
      return { a, ar: ar || 1.5 };
    });

    const totalW = container.getBoundingClientRect().width;
    const frag = document.createDocumentFragment();

    let row = [], arSum = 0, H = targetRowH();

    function pushRow(isLast) {
      const rowEl = document.createElement('div');
      rowEl.className = 'jg-row';
      rowEl.style.gap = GAP + 'px';

      const contentW = totalW - GAP * (row.length - 1);
      const h = isLast ? Math.min(targetRowH(), contentW / arSum) : (contentW / arSum);

      row.forEach(({ a, ar }) => {
        const w = h * ar;
        const wrap = document.createElement('div');
        wrap.className = 'jg-item';
        wrap.style.width  = w + 'px';
        wrap.style.height = h + 'px';
        wrap.appendChild(a); 
        rowEl.appendChild(wrap);
      });

      frag.appendChild(rowEl);
    }

    for (let i = 0; i < items.length; i++) {
      row.push(items[i]);
      arSum += items[i].ar;
      const rowW = arSum * H + GAP * (row.length - 1);

      if (rowW > totalW * (1 - MAX_ROW_DEV)) {
        pushRow(false);
        row = []; arSum = 0;
      }
    }

    if (row.length) {
      pushRow(!JUSTIFY_LAST_ROW);
    }

    container.replaceChildren(frag);
    bindLightboxIfNeeded();

    requestAnimationFrame(() => window.scrollTo(0, prevY));

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
}

/* ================================
   AUTO-INIT
================================ */
document.addEventListener('DOMContentLoaded', () => {
  setupJustifiedGallery('#jg');
});

/* ================================
   HEADER OFFSET (CSS var)
================================ */
(() => {
  const header = document.querySelector('.site-header');
  function setHeaderOffset() {
    if (!header) return;
    document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
  }
  setHeaderOffset();
  window.addEventListener('load', setHeaderOffset, { once: true });
  window.addEventListener('resize', setHeaderOffset);
})();

/* ================================
   BURGER / MOBILE NAV
================================ */
(() => {
  const body = document.body;
  const burger = document.querySelector('.burger');
  const nav = document.getElementById('primary-nav');
  const overlay = document.querySelector('.nav-overlay');
  if (!burger || !nav || !overlay) return;

  const open = () => {
    body.classList.add('nav-open');
    burger.setAttribute('aria-expanded', 'true');
    overlay.hidden = false;
    if (window.matchMedia('(pointer: fine)').matches) {
      const firstLink = nav.querySelector('a[href]');
      firstLink && firstLink.focus({ preventScroll: true });
    }
  };
  const close = () => {
    body.classList.remove('nav-open');
    burger.setAttribute('aria-expanded', 'false');
    overlay.hidden = true;
    burger.focus && burger.focus({ preventScroll: true });
  };

  burger.addEventListener('click', () => {
    body.classList.contains('nav-open') ? close() : open();
  });
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && body.classList.contains('nav-open')) close(); });
  nav.addEventListener('click', (e) => { if (e.target.closest('a[href]')) close(); });

  const mql = window.matchMedia('(max-width: 900px)');
  const handleMQ = () => { if (!mql.matches && body.classList.contains('nav-open')) close(); };
  mql.addEventListener ? mql.addEventListener('change', handleMQ) : mql.addListener(handleMQ);
})();

/* ================================
   BACK TO TOP
================================ */
(() => {
  const backToTop = document.getElementById('backToTop');
  if (!backToTop) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) backToTop.classList.add('show');
    else backToTop.classList.remove('show');
  }, { passive: true });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

/* ================================
   LOADER ⇄ JG READY HOOK (+ failsafe)
================================ */
document.addEventListener('DOMContentLoaded', () => {
  const cont = document.getElementById('jg');
  const loader = document.getElementById('loader');
  if (!cont || !loader) return;

  cont.addEventListener('jg:ready', () => {
    loader.classList.add('hidden');
    setTimeout(() => loader.remove(), 500);
  }, { once: true });
  setTimeout(() => {
    if (document.body.contains(loader)) {
      loader.classList.add('hidden');
      setTimeout(() => loader.remove(), 500);
    }
  }, 2500);
});
