/* ECONUR homepage, desktop: previous/next arrows for the one-row Bestsellers list. Manual only, no autoplay.
   The arrows exist only at desktop widths; phones keep their swipe row untouched. No dependencies. */
(function () {
  var mq = window.matchMedia('(min-width: 1000px)'), reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  function init() {
    var sec = document.getElementById('bestsellers'); if (!sec) return;
    var ul = sec.querySelector('ul.ecn-home-grid'), head = sec.querySelector('.ecn-sh'); if (!ul || !head) return;
    if (!ul.id) ul.id = 'ecn-bs-track';
    var tools = document.createElement('div'); tools.className = 'ecn-bs-tools';
    function btn(dir, label, d) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'ecn-bs-nav'; b.setAttribute('aria-label', label); b.setAttribute('aria-controls', ul.id);
      b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="' + d + '"/></svg>';
      b.addEventListener('click', function () { ul.scrollBy({ left: dir * step(), behavior: reduce.matches ? 'auto' : 'smooth' }); });
      return b;
    }
    var prev = btn(-1, 'Previous bestsellers', 'm15 18-6-6 6-6'), next = btn(1, 'Next bestsellers', 'm9 18 6-6-6-6');
    tools.appendChild(prev); tools.appendChild(next); head.appendChild(tools);
    function step() { var li = ul.querySelector('li'), gap = parseFloat(getComputedStyle(ul).columnGap) || 20; return li ? li.getBoundingClientRect().width + gap : ul.clientWidth; }
    function state() {
      var on = mq.matches && ul.scrollWidth > ul.clientWidth + 2;
      tools.hidden = !mq.matches; prev.hidden = next.hidden = !on;
      if (!on) return;
      prev.disabled = ul.scrollLeft <= 2; next.disabled = ul.scrollLeft >= ul.scrollWidth - ul.clientWidth - 2;
    }
    ul.addEventListener('scroll', state, { passive: true });
    if (mq.addEventListener) mq.addEventListener('change', state); else mq.addListener(state);
    window.addEventListener('resize', state); window.addEventListener('load', state);
    if (window.ResizeObserver) new ResizeObserver(state).observe(ul);
    state();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
