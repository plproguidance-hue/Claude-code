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
    // the arrows wrap around in both layouts, so neither is ever disabled
    function go(i) { if (rotating()) return rotate(i); var p = pages(); i = ((i % p) + p) % p; track.scrollTo({ left: i * step(), behavior: reduce.matches ? 'auto' : 'smooth' }); }
    function at() { return rotating() ? lead : current(); }
    function sync() {
      var rot = rotating();
      if (!rot && lead !== 0) { lead = 0; order(0); }
      var p = rot ? orig.length : pages(), i = at();
      nav.hidden = p < 2;
      dots.forEach(function (d, k) { d.hidden = k >= p; var on = (k === i); d.classList.toggle('is-on', on); if (on) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
      prev.disabled = false; next.disabled = false;
    }
    prev.addEventListener('click', function () { go(at() - 1); });
    next.addEventListener('click', function () { go(at() + 1); });
    dots.forEach(function (d, k) { d.addEventListener('click', function () { go(k); }); });
    c.addEventListener('keydown', function (e) {
      if (e.target.closest && e.target.closest('a')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(at() + 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(at() - 1); }
    });
    // reviewer rows and lower blocks share one height across cards, so dividers, thumbnails and bottoms line up
    function equalize() {
      ['.enr-rv-who', '.enr-rv-buy'].forEach(function (sel) {
        var els = [].slice.call(track.querySelectorAll(sel)), m = 0;
        els.forEach(function (e) { e.style.minHeight = ''; });
        els.forEach(function (e) { m = Math.max(m, e.getBoundingClientRect().height); });
        els.forEach(function (e) { e.style.minHeight = Math.ceil(m) + 'px'; });
      });
    }
    var lastW = 0;
    function resized() { var w = track.clientWidth; if (w !== lastW) { lastW = w; equalize(); } sync(); }
    track.addEventListener('scroll', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(sync); }, { passive: true });
    if (window.ResizeObserver) new ResizeObserver(resized).observe(track); else window.addEventListener('resize', resized);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { equalize(); sync(); });
    // every page view starts from the first review and the first card, also when the browser restores the page
    // from its back/forward cache or restores the scroll position
    function reset() { lead = 0; order(0); track.scrollLeft = 0; sync(); }
    window.addEventListener('pageshow', reset); window.addEventListener('load', function () { equalize(); sync(); }); equalize(); reset();
  }
  function start() { [].forEach.call(document.querySelectorAll('.enr-rv-carousel'), init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
