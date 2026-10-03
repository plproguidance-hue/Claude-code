/* ECONUR header 1.0: marks the page while the sticky header is pinned (html.ecn-hdr-stuck), which compacts the
   desktop bar and gives it its soft background. A 1px marker just above the header is watched, no scroll handler. */
(function () {
  var head = document.getElementById('masthead');
  if (!head || !('IntersectionObserver' in window)) return;
  var mark = document.createElement('div');
  mark.setAttribute('aria-hidden', 'true');
  mark.style.cssText = 'height:1px;margin-bottom:-1px;pointer-events:none';
  head.parentNode.insertBefore(mark, head);
  var root = document.documentElement;
  new IntersectionObserver(function (entries) {
    var e = entries[0];
    root.classList.toggle('ecn-hdr-stuck', !e.isIntersecting && e.boundingClientRect.top < 0);
  }, { threshold: 0 }).observe(mark);
})();
