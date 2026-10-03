/* ECONUR product details accordion 1.0: one row open at a time; "{size}" follows the size picked in the purchase card. */
(function () {
  'use strict';
  document.querySelectorAll('[data-ecn-acc]').forEach(function (acc) {
    var btns = [].slice.call(acc.querySelectorAll('.ecn-acc-btn'));
    function set(btn, open) {
      var p = document.getElementById(btn.getAttribute('aria-controls'));
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (p) p.classList.toggle('is-open', open);
    }
    btns.forEach(function (b) {
      set(b, false);
      b.addEventListener('click', function () {
        var open = b.getAttribute('aria-expanded') !== 'true';
        btns.forEach(function (o) { if (o !== b) set(o, false); });
        set(b, open);
      });
    });
    acc.classList.add('is-ready');

    // Net weight etc.: mirror the purchase card's size label (product-pdp.js updates it when a variation is chosen)
    var src = document.querySelector('.ecn-pdp [data-ecn-size]'), dst = [].slice.call(acc.querySelectorAll('[data-ecn-acc-size]'));
    if (src && dst.length && window.MutationObserver) {
      var copy = function () { var t = src.textContent.trim(); if (t) dst.forEach(function (d) { d.textContent = t; }); };
      new MutationObserver(copy).observe(src, { childList: true, characterData: true, subtree: true });
      copy();
    }
  });
})();
