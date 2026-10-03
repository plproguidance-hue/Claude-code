/* ECONUR cart drawer + floating cart tab 1.0 (markup: inc/econur-cart.php).
   Reads and changes the real WooCommerce cart through the Store API; after a change WooCommerce's cart fragments
   refresh the header count. window.econurCart = { open, close, load, add } is used by the product page script. */
(function () {
  'use strict';
  var C = window.ECN_CART || {}, $ = window.jQuery;
  var drawer = document.getElementById('econur-cart-drawer');
  if (!drawer || !C.api) return;
  var overlay = document.querySelector('.econur-cart-overlay'), tab = document.querySelector('.econur-cart-tab');
  var list = drawer.querySelector('[data-ecn-cart-items]'), empty = drawer.querySelector('[data-ecn-cart-empty]'), foot = drawer.querySelector('[data-ecn-cart-foot]');
  var countEl = drawer.querySelector('[data-ecn-cart-count]'), subEl = drawer.querySelector('[data-ecn-cart-subtotal]'), msg = drawer.querySelector('[data-ecn-cart-msg]');
  var nonce = '', cart = null, lastFocus = null, selfRefresh = false, reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(v, t) {
    var mu = t && t.currency_minor_unit ? t.currency_minor_unit : 0, n = (parseInt(v, 10) || 0) / Math.pow(10, mu);
    var s = n.toFixed(mu).replace(/\B(?=(\d{3})+(?!\d))/g, (t && t.currency_thousand_separator) || ',');
    return ((t && t.currency_prefix) || '৳') + s + ((t && t.currency_suffix) || '');
  }
  function say(t) { msg.textContent = t || ''; msg.hidden = !t; }
  function req(path, method, body) {
    var h = { 'Content-Type': 'application/json' }; if (nonce) h.Nonce = nonce;
    return fetch(C.api + path, { method: method || 'GET', credentials: 'same-origin', headers: h, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) {
        var n = r.headers.get('Nonce'); if (n) nonce = n;
        return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var e = new Error((j && j.message) || 'error'); e.data = j; throw e; } return j; });
      });
  }
  function unitLabel(it) {
    var q = it.quantity, u = /bar/i.test(it.name || '') ? (C.unit || ['bar', 'bars']) : null;
    var bits = []; if (u) bits.push(q + ' ' + (q > 1 ? 'Bars' : 'Bar'));
    (it.variation || []).forEach(function (v) { if (v.value) bits.push(v.value); });
    return bits.join(' • ');
  }
  function plain(html) { var d = document.createElement('div'); d.innerHTML = html || ''; return d.textContent || ''; }

  function render(c) {
    cart = c || cart; if (!cart) return;
    var items = cart.items || [], n = cart.items_count || 0, t = cart.totals || {};
    drawer.classList.remove('is-loading');
    countEl.textContent = '(' + n + ')';
    list.innerHTML = items.map(function (it) {
      var img = it.images && it.images[0], name = plain(it.name), lim = it.quantity_limits || {}, min = lim.minimum || 1, max = lim.maximum || 9999;
      return '<li class="econur-cart-item" data-key="' + esc(it.key) + '">'
        + '<a class="econur-cart-thumb" href="' + esc(it.permalink) + '" tabindex="-1" aria-hidden="true">' + (img ? '<img src="' + esc(img.thumbnail || img.src) + '" alt="" loading="lazy" width="72" height="72">' : '') + '</a>'
        + '<div class="econur-cart-info"><a class="econur-cart-name" href="' + esc(it.permalink) + '">' + esc(name) + '</a>'
        + '<span class="econur-cart-meta">' + esc(unitLabel(it)) + '</span>'
        + '<span class="econur-cart-price">' + esc(money(it.totals && it.totals.line_total, it.totals)) + '</span>'
        + '<div class="econur-cart-row"><div class="econur-cart-qty' + (lim.editable === false ? ' is-fixed' : '') + '">'
        + '<button type="button" data-act="dec" aria-label="' + esc(name) + ' এর পরিমাণ কমান"' + (it.quantity <= min || lim.editable === false ? ' disabled' : '') + '>&minus;</button>'
        + '<span aria-live="polite">' + it.quantity + '</span>'
        + '<button type="button" data-act="inc" aria-label="' + esc(name) + ' এর পরিমাণ বাড়ান"' + (it.quantity >= max || lim.editable === false ? ' disabled' : '') + '>+</button></div>'
        + '<button type="button" class="econur-cart-rm" data-act="rm" aria-label="' + esc(name) + ' কার্ট থেকে সরান"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M5.5 7l1 12a2 2 0 0 0 2 1.8h7a2 2 0 0 0 2-1.8l1-12M9 7V4.8A.8.8 0 0 1 9.8 4h4.4a.8.8 0 0 1 .8.8V7"/></svg></button>'
        + '</div></div></li>';
    }).join('');
    empty.hidden = items.length > 0; foot.hidden = items.length === 0;
    subEl.textContent = money(t.total_items, t);
    if (tab) {
      tab.hidden = n < 1;
      tab.querySelector('[data-ecn-tab-count]').textContent = n + ' টি পণ্য';
      tab.querySelector('[data-ecn-tab-total]').textContent = money(t.total_items, t);
      tab.setAttribute('aria-label', 'কার্ট খুলুন: ' + n + ' টি পণ্য, ' + money(t.total_items, t));
    }
  }
  function load() { drawer.classList.add('is-loading'); return req('cart').then(render).catch(function () { drawer.classList.remove('is-loading'); }); }
  function refreshHeader() { if ($) { selfRefresh = true; $(document.body).trigger('wc_fragment_refresh'); } }

  /* ---------- open / close (focus kept inside while open, Esc closes) ---------- */
  function focusables() { return [].slice.call(drawer.querySelectorAll('a[href], button:not([disabled])')).filter(function (x) { return x.offsetParent !== null; }); }
  function open() {
    if (drawer.classList.contains('is-open')) return;
    lastFocus = document.activeElement;
    drawer.hidden = false; overlay.hidden = false;
    requestAnimationFrame(function () { drawer.classList.add('is-open'); overlay.classList.add('is-open'); });
    drawer.setAttribute('aria-hidden', 'false'); if (tab) tab.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('econur-cart-locked');
    setTimeout(function () { var x = drawer.querySelector('.econur-cart-x'); if (x) x.focus({ preventScroll: true }); }, reduce ? 0 : 60);
  }
  function close() {
    if (!drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open'); overlay.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true'); if (tab) tab.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('econur-cart-locked');
    setTimeout(function () { if (!drawer.classList.contains('is-open')) { drawer.hidden = true; overlay.hidden = true; } }, reduce ? 0 : 280);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-ecn-cart-close]')) { e.preventDefault(); close(); }
    else if (e.target.closest('[data-ecn-cart-open]')) { e.preventDefault(); open(); if (!cart) load(); }
  });
  document.addEventListener('keydown', function (e) {
    if (!drawer.classList.contains('is-open')) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'Tab') { var f = focusables(); if (!f.length) return; var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
  });

  /* ---------- quantity / remove ---------- */
  list.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]'); if (!b || b.disabled) return;
    var row = b.closest('.econur-cart-item'), key = row && row.getAttribute('data-key'), it = (cart.items || []).filter(function (x) { return x.key === key; })[0];
    if (!it || row.classList.contains('is-busy')) return;
    var act = b.getAttribute('data-act'), p;
    row.classList.add('is-busy'); say('');
    if (act === 'rm') p = req('cart/remove-item', 'POST', { key: key });
    else p = req('cart/update-item', 'POST', { key: key, quantity: it.quantity + (act === 'inc' ? 1 : -1) });
    p.then(function (c) { render(c); refreshHeader(); var r = list.querySelector('[data-key="' + key + '"] [data-act="' + act + '"]'); if (r && act !== 'rm') r.focus({ preventScroll: true }); else if (act === 'rm') { var x = drawer.querySelector('.econur-cart-x'); if (x) x.focus({ preventScroll: true }); } })
      .catch(function (err) { say(plain(err.message) || 'দুঃখিত, এখন পরিবর্তন করা যায়নি। আবার চেষ্টা করুন।'); row.classList.remove('is-busy'); load(); });
  });

  /* ---------- add (used by the product page's Add to Cart) ---------- */
  function add(payload) {
    var ready = nonce ? Promise.resolve() : req('cart'); // the first request hands out the Store API nonce
    return ready.then(function () { return req('cart/add-item', 'POST', payload); })
      .then(function (c) { render(c); refreshHeader(); open(); return c; });
  }

  window.econurCart = { open: open, close: close, load: load, add: add };

  // WooCommerce's own ajax add-to-cart buttons on shop / category pages
  if ($) {
    $(document.body).on('added_to_cart', function () { load().then(open); });
    $(document.body).on('wc_fragments_refreshed', function () { if (selfRefresh) { selfRefresh = false; return; } if (cart || tab) load(); });
  }
  // a cart from an earlier visit: show the tab (WooCommerce sets this cookie while the cart has items)
  if (/(?:^|; )woocommerce_items_in_cart=1/.test(document.cookie)) load();
})();
