/* ECONUR "Why You'll Love This" 1.0: a gentle entrance when the section scrolls in; the play button (only rendered when a
   real video is set) swaps the photo for the video. */
(function () {
  'use strict';
  var sec = document.querySelector('[data-ecn-love]');
  if (!sec) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // only sections still below the screen wait for their entrance, so nothing already visible blinks
  if (!reduce && 'IntersectionObserver' in window && sec.getBoundingClientRect().top > window.innerHeight) {
    sec.classList.add('is-wait');
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) {
        if (!x.isIntersecting) return;
        sec.classList.add('is-in'); sec.classList.remove('is-wait'); io.disconnect();
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    io.observe(sec);
  }
  var play = sec.querySelector('[data-ecn-love-video]');
  if (play) play.addEventListener('click', function () {
    var box = play.parentNode, img = box.querySelector('img'), v = document.createElement('video');
    v.src = play.getAttribute('data-ecn-love-video'); v.controls = true; v.playsInline = true; v.preload = 'auto';
    if (img) { v.poster = img.currentSrc || img.src; v.setAttribute('aria-label', img.alt); }
    box.replaceChildren(v); v.focus();
    var p = v.play(); if (p && p.catch) p.catch(function () {});
  });
})();
