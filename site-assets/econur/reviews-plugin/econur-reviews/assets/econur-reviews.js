/* ECONUR Reviews: carousel for the "What customers say" section. No dependencies. */
(function () {
  function init(c) {
    var track = c.querySelector('.enr-rv-track'), orig = [].slice.call(track.children), slides = orig.slice(), nav = c.querySelector('.enr-rv-nav'),
        prev = c.querySelector('.enr-rv-prev'), next = c.querySelector('.enr-rv-next'), dots = [].slice.call(c.querySelectorAll('.enr-rv-dot')), raf = 0, lead = 0, busy = false;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    function step() { return slides.length > 1 ? slides[1].offsetLeft - slides[0].offsetLeft : track.clientWidth; }
    function pages() { var s = step(); return s > 0 ? Math.max(1, slides.length - Math.round(track.clientWidth / s) + 1) : 1; }
    function current() { var s = step(); return s > 0 ? Math.min(pages() - 1, Math.round(track.scrollLeft / s)) : 0; }
    // three cards that all fit (desktop): the controls change which review leads the row instead of scrolling
    function rotating() { return orig.length > 2 && pages() < 2; }
    function order(k) { slides = orig.slice(k).concat(orig.slice(0, k)); slides.forEach(function (s) { track.appendChild(s); }); }
    function rotate(k) {
      k = (k % orig.length + orig.length) % orig.length; if (busy || k === lead) return; lead = k;
      if (reduce.matches) { order(k); sync(); return; }
      busy = true; track.classList.add('is-swap');
      setTimeout(function () { order(k); track.classList.remove('is-swap'); busy = false; sync(); }, 220);
    }
    function go(i) { if (rotating()) return rotate(i); track.scrollTo({ left: Math.max(0, Math.min(pages() - 1, i)) * step(), behavior: reduce.matches ? 'auto' : 'smooth' }); }
    function at() { return rotating() ? lead : current(); }
    function sync() {
      var rot = rotating();
      if (!rot && lead !== 0) { lead = 0; order(0); }
      var p = rot ? orig.length : pages(), i = at();
      nav.hidden = p < 2;
      dots.forEach(function (d, k) { d.hidden = k >= p; var on = (k === i); d.classList.toggle('is-on', on); if (on) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
      prev.disabled = !rot && i <= 0; next.disabled = !rot && i >= p - 1;
    }
    prev.addEventListener('click', function () { go(at() - 1); });
    next.addEventListener('click', function () { go(at() + 1); });
    dots.forEach(function (d, k) { d.addEventListener('click', function () { go(k); }); });
    c.addEventListener('keydown', function (e) {
      if (e.target.closest && e.target.closest('a')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(at() + 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(at() - 1); }
    });
    track.addEventListener('scroll', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(sync); }, { passive: true });
    if (window.ResizeObserver) new ResizeObserver(sync).observe(track); else window.addEventListener('resize', sync);
    // every page view starts from the first review and the first card, also when the browser restores the page
    // from its back/forward cache or restores the scroll position
    function reset() { lead = 0; order(0); track.scrollLeft = 0; sync(); }
    window.addEventListener('pageshow', reset); window.addEventListener('load', sync); reset();
  }
  function start() { [].forEach.call(document.querySelectorAll('.enr-rv-carousel'), init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
