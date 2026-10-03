/* ECONUR product Description / FAQ / Reviews block 1.0 (markup: inc/pdp-info.php)
   Tabs: click, or arrow keys / Home / End on the tab bar (the focused tab opens); no page reload.
   FAQ: one answer open at a time. "Write a Review" is handled by the product page script ([data-ecn-rv-write]). */
(function () {
  'use strict';
  var root = document.querySelector('[data-econur-pit]');
  if (!root) return;

  /* ---------- tabs ---------- */
  var tabs = [].slice.call(root.querySelectorAll('[role="tab"]'));
  function select(t, focus) {
    tabs.forEach(function (x) {
      var on = x === t, p = document.getElementById(x.getAttribute('aria-controls'));
      x.setAttribute('aria-selected', on ? 'true' : 'false');
      x.tabIndex = on ? 0 : -1;
      if (!p) return;
      if (on && p.hidden) { p.hidden = false; p.classList.remove('is-in'); void p.offsetWidth; p.classList.add('is-in'); }
      else if (!on) p.hidden = true;
    });
    if (focus) t.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(t, false); });
    t.addEventListener('keydown', function (e) {
      var k = e.key, n = null;
      if (k === 'ArrowRight' || k === 'ArrowDown') n = tabs[(i + 1) % tabs.length];
      else if (k === 'ArrowLeft' || k === 'ArrowUp') n = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (k === 'Home') n = tabs[0];
      else if (k === 'End') n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); select(n, true); }
    });
  });

  /* ---------- FAQ: one open at a time ---------- */
  var qs = [].slice.call(root.querySelectorAll('.econur-pit-faq-q button'));
  function setOpen(b, on) {
    b.setAttribute('aria-expanded', on ? 'true' : 'false');
    var it = b.closest('.econur-pit-faq-i'); if (it) it.classList.toggle('is-open', on);
  }
  qs.forEach(function (b) {
    b.addEventListener('click', function () {
      var on = b.getAttribute('aria-expanded') !== 'true';
      qs.forEach(function (x) { if (x !== b) setOpen(x, false); });
      setOpen(b, on);
    });
  });
})();
