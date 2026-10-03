/* ECONUR motion 1.0.1: homepage scroll reveal.
   Each group fades up once when about 15% of it enters the screen, its items one after another. Only groups that start
   below the screen are prepared (nothing above the fold is hidden, nothing is hidden without JavaScript), and the reveal
   classes are removed again afterwards, so every component keeps its own hover transitions. Skipped entirely for
   reduced motion. Styles: econur-motion.css. */
(function () {
  if (!document.body || !document.body.classList.contains('home')) return;
  if (!('IntersectionObserver' in window) || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;

  // [group, items inside the group (empty: the group itself), options]
  // k: share of the reveal distance, x: horizontal start, s: start scale, i: extra delay steps, max: highest stagger step
  var GROUPS = [
    ['.econur-category-trust__header', '', { k: .5 }],
    ['.econur-category-list', '.econur-category-card', { k: .5, step: 60 }],
    ['.econur-trust-strip', ':scope > li', { k: .5, s: .985, step: 60 }],
    ['.ecn-sh', '', {}],
    ['.ecn-home-grid', ':scope > li', { k: .9, max: 4 }],
    ['.ecn-sb', '.ecn-sb-copy, .ecn-sb-timer, .ecn-sb-cta', { k: .6, step: 110 }],
    ['.ecn-fp-track', ':scope > *', { k: .9, max: 4 }],
    ['.ecn-usp', ':scope > .ecn-usp-tile', { step: 100 }],
    ['.ecn-fy-head', '', {}],
    ['.ecn-fy-tabs', ':scope > .ecn-fy-tab', { k: .5, step: 60 }],
    ['.ecn-fy-panels', '', { k: 0, s: .985, i: 1 }],
    ['.ecn-fy-trust', '', { k: .6 }],
    ['.enr-rv-head', ':scope > *', { k: .8 }],
    ['.enr-rv-track', ':scope > li', { k: .9, max: 3 }],
    ['.enr-rv-nav', '', { k: .5, i: 2 }],
    ['.enr-rv-trust', '', { k: .6, i: 1 }],
    ['.ehc-intro', '', {}],
    ['.ehc-acc', '', { k: .7, i: 1 }],
    ['.ehc-cta', ':scope > :not(.ehc-art)', { k: .8 }]
  ];
  var X = { '.ecn-sb-copy': '-12px' }; // the sale copy comes in from the left instead of from below

  var vh = window.innerHeight || document.documentElement.clientHeight;
  var items = new Map();
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      reveal(items.get(e.target));
    });
  }, { threshold: .15, rootMargin: '0px 0px -4% 0px' });

  function reveal(list) {
    if (!list) return;
    requestAnimationFrame(function () {
      list.forEach(function (el) { el.classList.add('is-in'); el.classList.remove('is-wait'); });
      setTimeout(function () {
        list.forEach(function (el) {
          el.classList.remove('ecn-rv', 'is-in');
          ['--rv-i', '--rv-k', '--rv-x', '--rv-s', '--ecn-rv-step'].forEach(function (p) { el.style.removeProperty(p); });
        });
      }, 1800);
    });
  }

  GROUPS.forEach(function (g) {
    [].forEach.call(document.querySelectorAll(g[0]), function (box) {
      if (items.has(box) || box.closest('.ecn-rv')) return;
      var r = box.getBoundingClientRect();
      if (!r.height || r.top < vh * .9) return; // on screen (or above it) at load: leave it alone
      var o = g[2], list = g[1] ? [].slice.call(box.querySelectorAll(g[1])) : [box];
      if (!list.length) return;
      list.forEach(function (el, n) {
        el.classList.add('ecn-rv', 'is-wait');
        el.style.setProperty('--rv-i', Math.min(n, o.max || 6) + (o.i || 0));
        if (o.k != null) el.style.setProperty('--rv-k', o.k);
        if (o.s) el.style.setProperty('--rv-s', o.s);
        if (o.step) el.style.setProperty('--ecn-rv-step', (window.innerWidth < 768 ? Math.round(o.step * .7) : o.step) + 'ms');
        for (var sel in X) if (el.matches(sel)) { el.style.setProperty('--rv-x', X[sel]); el.style.setProperty('--rv-k', 0); }
      });
      items.set(box, list);
      io.observe(box);
    });
  });
})();
