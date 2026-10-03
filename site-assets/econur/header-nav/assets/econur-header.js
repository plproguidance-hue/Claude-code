/* ECONUR header 1.0.2
   1. Marks the page while the sticky header is pinned (html.ecn-hdr-stuck), which compacts the desktop bar and gives it
      its soft background. A 1px marker just above the header is watched, no scroll handler.
   2. Desktop: the social circles sit centred in the free strip between the Cart icon and the screen edge; they are
      shown only when that strip fits all of them with 16px to spare on each side (re-checked on resize). */
(function () {
  var head = document.getElementById('masthead');
  if (!head) return;

  if ('IntersectionObserver' in window) {
    var mark = document.createElement('div');
    mark.setAttribute('aria-hidden', 'true');
    mark.style.cssText = 'height:1px;margin-bottom:-1px;pointer-events:none';
    head.parentNode.insertBefore(mark, head);
    var root = document.documentElement;
    new IntersectionObserver(function (entries) {
      var e = entries[0];
      root.classList.toggle('ecn-hdr-stuck', !e.isIntersecting && e.boundingClientRect.top < 0);
    }, { threshold: 0 }).observe(mark);
  }

  var social = document.querySelector('#ast-desktop-header .ecn-hsocial');
  if (social && window.matchMedia) {
    var desk = matchMedia('(min-width: 922px)'), queued = false;
    var fit = function () {
      queued = false;
      var n = social.children.length, need = n * 38 + (n - 1) * 10 + 2 * 16; // circles + gaps + room on both sides
      var room = Math.floor(document.documentElement.clientWidth - social.parentNode.getBoundingClientRect().right);
      var ok = desk.matches && room >= need;
      social.style.width = ok ? room + 'px' : '';
      social.classList.toggle('is-fit', ok);
    };
    window.addEventListener('resize', function () { if (!queued) { queued = true; requestAnimationFrame(fit); } });
    fit();
  }
})();
