/* ECONUR footer: on phones Shop / Help / Order & Support open and close independently; all start closed.
   Also keeps the floating WhatsApp button off other controls: while it would sit on top of a button, an accordion row,
   a carousel arrow, the sticky Add to Cart or the footer call to action, it fades out and comes back once the way is clear.
   No dependencies. */
(function () {
  function init(footer) {
    [].forEach.call(footer.querySelectorAll('.ecnf-col'), function (col) {
      var btn = col.querySelector('.ecnf-h--toggle button');
      if (!btn) return;
      btn.addEventListener('click', function () {
        var open = !col.classList.contains('is-open');
        col.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  }

  var AVOID = '.ecnf-wa, .ecnf-h--toggle button, .ehc-btn, .ehc-q button, .ecn-faq-q button, .ecn-help-wa, .ecn-lp-final-add, .ecn-lp-final-wa,'
    + ' .ecn-fp-nav, .ecn-rel-nav, .enr-rv-arrow, .ecn-hx-arrow, .ecn-sh-nav, .ecn-sbar, .ecn-fp-add, .ecn-pc-btn, .ecn-rel-add, .ecn-rel-view,'
    + ' .ecn-fy-cta, .ecn-lp-btn, .single_add_to_cart_button, .ecn-pdp-buynow, .ecn-pdp-wa';
  function floatGuard() {
    var fab = document.querySelector('.ecn-wa-float');
    if (!fab || !window.requestAnimationFrame) return;
    var targets = [].slice.call(document.querySelectorAll(AVOID)), queued = false, away = false;
    function check() {
      queued = false;
      // measure from the resting place: subtract the slide-away offset actually applied (it is partial while the button animates)
      var b = fab.getBoundingClientRect(), shift = away ? 12 : 0, hit = false;
      if (window.DOMMatrixReadOnly) { var tf = getComputedStyle(fab).transform; shift = tf && tf !== 'none' ? new DOMMatrixReadOnly(tf).m42 : 0; }
      var f = { left: b.left, right: b.right, top: b.top - shift, bottom: b.bottom - shift, width: b.width };
      if (f.width) {
        for (var i = 0; i < targets.length && !hit; i++) {
          var r = targets[i].getBoundingClientRect();
          if (!r.width || !r.height) continue;
          hit = r.left < f.right + 8 && r.right > f.left - 8 && r.top < f.bottom + 8 && r.bottom > f.top - 8;
        }
      }
      if (hit && document.activeElement === fab) hit = false;
      fab.classList.toggle('is-away', hit);
      away = hit;
    }
    function queue() { if (!queued) { queued = true; requestAnimationFrame(check); } }
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', function () { targets = [].slice.call(document.querySelectorAll(AVOID)); queue(); });
    document.addEventListener('click', queue, true);
    queue();
  }

  function start() { [].forEach.call(document.querySelectorAll('.ecnf'), init); floatGuard(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
