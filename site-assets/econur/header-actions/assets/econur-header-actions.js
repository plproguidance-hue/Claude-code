/* ECONUR header actions 1.0 (markup: inc/header-actions.php)
   1. Search panel under the header (mobile, and the compact desktop header): open / close, Esc, focus handling;
      it closes when the mobile menu opens and the other way round.
   2. Empty searches are not sent; the field gets focus instead.
   3. Fallback for the desktop row: if the actions would still run into the menu (a longer menu, for example), the same
      steps as the stylesheet's: icon-only Login / Cart (.is-tight), then the search icon (.is-compact).
   The Cart button itself is handled by the cart drawer script (data-ecn-cart-open). */
(function () {
  'use strict';
  var head = document.getElementById('masthead');
  var panel = document.getElementById('econur-mobile-search');
  if (!head) return;

  /* ---------- search panel ---------- */
  if (panel) {
    if (panel.parentNode !== head) head.appendChild(panel); // directly under the header, moving with it while sticky
    var input = panel.querySelector('input[type="search"]'), opener = null;
    var toggles = function () { return [].slice.call(document.querySelectorAll('[data-ecn-search-toggle]')); };
    var setExpanded = function (on) { toggles().forEach(function (t) { t.setAttribute('aria-expanded', on ? 'true' : 'false'); }); };
    var menuToggle = function () { return document.querySelector('#ast-mobile-header .menu-toggle[aria-expanded="true"]'); };

    var open = function (from) {
      opener = from || null;
      var m = menuToggle(); if (m) m.click(); // one panel at a time
      panel.hidden = false; panel.classList.add('is-open'); setExpanded(true);
      if (input) { input.focus({ preventScroll: true }); var v = input.value; input.value = ''; input.value = v; }
    };
    var close = function (refocus) {
      if (panel.hidden) return;
      panel.hidden = true; panel.classList.remove('is-open'); setExpanded(false);
      if (refocus && opener && opener.offsetParent !== null) opener.focus({ preventScroll: true });
    };

    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-ecn-search-toggle]');
      if (t) { e.preventDefault(); if (panel.hidden) open(t); else close(true); return; }
      if (e.target.closest('[data-ecn-search-close]')) { e.preventDefault(); close(true); return; }
      if (!panel.hidden && !panel.contains(e.target)) {
        if (e.target.closest('#ast-mobile-header .menu-toggle')) close(false); // the menu takes over
        else if (!e.target.closest('#masthead')) close(false);                 // a tap on the page closes it
      }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) close(true); });
    // the panel's toggle disappears when the window grows into the full desktop header: close it with it
    window.addEventListener('resize', function () {
      if (!panel.hidden && !toggles().some(function (t) { return t.offsetParent !== null; })) close(false);
    });
  }

  /* ---------- no empty searches ---------- */
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (!f.classList || !f.classList.contains('econur-header-search')) return;
    var q = f.querySelector('input[name="s"]');
    if (q && !q.value.trim()) { e.preventDefault(); q.value = ''; q.focus(); }
  });

  /* ---------- desktop row: fallback steps ---------- */
  var acts = document.querySelector('#ast-desktop-header .econur-header-actions');
  var row = acts && acts.closest('.ast-builder-grid-row');
  if (acts && row) {
    var queued = false;
    var clashes = function () {
      var nav = row.querySelector('.site-header-primary-section-center .main-header-menu'), first = null;
      [].slice.call(acts.children).some(function (c) { if (c.offsetParent !== null) { first = c; return true; } return false; });
      return acts.scrollWidth > acts.clientWidth + 1 || acts.getBoundingClientRect().right > row.getBoundingClientRect().right + 1
        || !!(first && nav && first.getBoundingClientRect().left < nav.getBoundingClientRect().right + 8);
    };
    var fit = function () {
      queued = false;
      acts.classList.remove('is-tight', 'is-compact');
      if (acts.offsetParent === null || !clashes()) return; // the desktop header is hidden below Astra's breakpoint
      acts.classList.add('is-tight');
      if (clashes()) acts.classList.add('is-compact');
    };
    window.addEventListener('resize', function () { if (!queued) { queued = true; requestAnimationFrame(fit); } });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    fit();
  }
})();
