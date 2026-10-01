/* ECONUR product page: gallery, size pills, quantity, live price/stock, tabs, review form toggle, saved hearts, share,
   related row, newsletter sign-up, sticky Add to Cart (phones). WooCommerce's own variation form still does the real work. */
(function () {
  function init() {
    var C = window.ECN_PD || {}, page = document.querySelector('.ecn-pdp'); if (!page) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var form = page.querySelector('form.cart'), isVar = !!(form && form.classList.contains('variations_form'));
    function money(n) { return String(C.symbol || '').trim() + ' ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: C.dec || 0, maximumFractionDigits: C.dec || 0 }); }

    /* toast */
    var toast = document.getElementById('ecnToast'), tt = document.getElementById('ecnToastTxt'), th = null;
    function showToast(msg, checkout) { if (!toast) return; tt.textContent = msg; toast.querySelector('a').hidden = !checkout; toast.hidden = false; requestAnimationFrame(function () { toast.classList.add('is-on'); }); clearTimeout(th); th = setTimeout(function () { toast.classList.remove('is-on'); setTimeout(function () { toast.hidden = true; }, 250); }, 3200); }

    /* ---------- gallery: swipeable track, arrows, thumbnails ---------- */
    var g = page.querySelector('.ecn-g'), track = g && g.querySelector('.ecn-g-track'), slides = track ? [].slice.call(track.children) : [], thumbs = g ? [].slice.call(g.querySelectorAll('.ecn-g-thumb')) : [];
    function gIndex() { return track && track.clientWidth ? Math.round(track.scrollLeft / track.clientWidth) : 0; }
    function gGo(i) { if (!track || !slides.length) return; i = (i + slides.length) % slides.length; track.scrollTo({ left: i * track.clientWidth, behavior: reduce ? 'auto' : 'smooth' }); }
    function gSync() { var i = gIndex(); thumbs.forEach(function (t, k) { var on = k === i; t.classList.toggle('is-on', on); if (on) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); }); }
    if (track && slides.length > 1) {
      var gp = g.querySelector('.ecn-g-prev'), gn = g.querySelector('.ecn-g-next');
      if (gp) gp.addEventListener('click', function () { gGo(gIndex() - 1); });
      if (gn) gn.addEventListener('click', function () { gGo(gIndex() + 1); });
      thumbs.forEach(function (t) { t.addEventListener('click', function () { gGo(parseInt(t.getAttribute('data-i'), 10) || 0); }); });
      var raf = 0; track.addEventListener('scroll', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(gSync); }, { passive: true });
      track.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); gGo(gIndex() + 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); gGo(gIndex() - 1); } });
    }

    /* ---------- size pills mirror the real select ---------- */
    if (form) form.querySelectorAll('table.variations select').forEach(function (sel) {
      var wrap = document.createElement('div'); wrap.className = 'ecn-pdp-sizes'; wrap.setAttribute('role', 'radiogroup');
      var lab = form.querySelector('label[for="' + sel.id + '"]'); wrap.setAttribute('aria-label', lab ? lab.textContent.trim() : 'Size');
      [].forEach.call(sel.options, function (o) {
        if (!o.value) return;
        var b = document.createElement('button'); b.type = 'button'; b.className = 'ecn-pdp-sz'; b.setAttribute('role', 'radio'); b.setAttribute('data-v', o.value); b.textContent = o.text;
        b.addEventListener('click', function () { sel.value = o.value; if (window.jQuery) window.jQuery(sel).trigger('change'); else sel.dispatchEvent(new Event('change', { bubbles: true })); sync(); });
        b.addEventListener('keydown', function (e) { if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].indexOf(e.key) < 0) return; e.preventDefault(); var all = [].slice.call(wrap.children), i = all.indexOf(b), n = all[(i + ((e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : -1) + all.length) % all.length]; n.focus(); n.click(); });
        wrap.appendChild(b);
      });
      function sync() { wrap.querySelectorAll('.ecn-pdp-sz').forEach(function (x, k) { var on = x.getAttribute('data-v') === sel.value; x.classList.toggle('is-on', on); x.setAttribute('aria-checked', on ? 'true' : 'false'); x.tabIndex = on || (!sel.value && k === 0) ? 0 : -1; }); }
      sel.insertAdjacentElement('afterend', wrap); sel.classList.add('ecn-hidden-select'); sel.setAttribute('tabindex', '-1'); sel.setAttribute('aria-hidden', 'true');
      sel.addEventListener('change', sync); if (window.jQuery) window.jQuery(form).on('reset_data woocommerce_update_variation_values', sync); sync();
    });

    /* ---------- quantity stepper (keeps WooCommerce min/max) ---------- */
    var q = form ? form.querySelector('.quantity input.qty') : null;
    if (q && !q.closest('.ecn-qty')) { var box = q.closest('.quantity'); if (box) { box.classList.add('ecn-qty');
      var m = document.createElement('button'), p = document.createElement('button'); m.type = p.type = 'button'; m.className = p.className = 'ecn-qty-btn'; m.innerHTML = '&minus;'; p.textContent = '+'; m.setAttribute('aria-label', 'Decrease quantity'); p.setAttribute('aria-label', 'Increase quantity');
      box.insertBefore(m, q); box.appendChild(p);
      m.addEventListener('click', function () { var v = parseInt(q.value || '1', 10) || 1, mn = parseInt(q.getAttribute('min') || '1', 10) || 1; if (v > mn) { q.value = v - 1; q.dispatchEvent(new Event('change', { bubbles: true })); } });
      p.addEventListener('click', function () { var v = parseInt(q.value || '1', 10) || 1, mx = parseInt(q.getAttribute('max') || '0', 10); if (!mx || v < mx) { q.value = v + 1; q.dispatchEvent(new Event('change', { bubbles: true })); } }); } }

    /* ---------- live price, size, stock, SKU and photo from the real variation ---------- */
    var price = page.querySelector('.ecn-pdp-price'), origPrice = price ? price.innerHTML : '', sizeEl = page.querySelector('[data-ecn-size]'), origSize = sizeEl ? sizeEl.textContent : '',
        stockEl = page.querySelector('[data-ecn-stock]'), origStock = stockEl ? [stockEl.className, stockEl.textContent] : null, skuEl = page.querySelector('[data-ecn-sku]'), origSku = skuEl ? skuEl.textContent : '',
        sbP = document.getElementById('ecnSbarPrice'), sbS = document.getElementById('ecnSbarSize'), firstImg = slides[0] ? slides[0].querySelector('img') : null, origImg = firstImg ? [firstImg.src, firstImg.srcset, firstImg.sizes] : null;
    function sizeLabel(v) { var out = []; if (!form || !v || !v.attributes) return ''; Object.keys(v.attributes).forEach(function (k) { var sel = form.querySelector('select[name="' + k + '"]'), val = v.attributes[k]; if (sel) { var o = [].filter.call(sel.options, function (x) { return x.value === val; })[0]; out.push(o ? o.text : val); } }); return out.join(' / '); }
    if (window.jQuery && isVar) {
      window.jQuery(form).on('found_variation', function (e, v) {
        if (!v) return;
        if (v.price_html && price) { var t = document.createElement('div'); t.innerHTML = v.price_html; var src = t.querySelector('.price'); price.innerHTML = src ? src.innerHTML : v.price_html; }
        var lbl = sizeLabel(v); if (sizeEl && lbl) sizeEl.textContent = lbl;
        if (stockEl) { if (!v.is_in_stock) { stockEl.className = 'ecn-pdp-stock is-out'; stockEl.textContent = 'Out of stock'; } else if (v.backorders_allowed && v.availability_html && /backorder/i.test(v.availability_html)) { stockEl.className = 'ecn-pdp-stock is-soon'; stockEl.textContent = 'On backorder'; } else { stockEl.className = 'ecn-pdp-stock is-in'; stockEl.textContent = 'In Stock'; } }
        if (skuEl && v.sku) skuEl.textContent = v.sku;
        if (sbP && v.display_price != null) sbP.textContent = money(v.display_price); if (sbS && lbl) sbS.textContent = lbl;
        if (firstImg && v.image && v.image.src && v.image.src !== firstImg.src) { firstImg.src = v.image.src; firstImg.srcset = v.image.srcset || ''; if (v.image.sizes) firstImg.sizes = v.image.sizes; gGo(0); }
      }).on('reset_data', function () {
        if (price) price.innerHTML = origPrice; if (sizeEl) sizeEl.textContent = origSize; if (stockEl && origStock) { stockEl.className = origStock[0]; stockEl.textContent = origStock[1]; } if (skuEl) skuEl.textContent = origSku;
        if (firstImg && origImg) { firstImg.src = origImg[0]; firstImg.srcset = origImg[1]; firstImg.sizes = origImg[2]; }
      });
    }

    /* ---------- a size must be chosen before Add to Cart / Buy Now ---------- */
    function needsSize() { if (!isVar) return false; var vid = form.querySelector('input[name=variation_id]'); return !(vid && parseInt(vid.value || '0', 10) > 0); }
    function flagSize() { var sz = form.querySelector('.ecn-pdp-sizes') || form; sz.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); sz.classList.add('ecn-flag'); var f = sz.querySelector('.ecn-pdp-sz'); if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 350); setTimeout(function () { sz.classList.remove('ecn-flag'); }, 1600); }
    var bn = form ? form.querySelector('.ecn-pdp-buynow') : null;
    if (bn) bn.addEventListener('click', function (e) { if (needsSize()) { e.preventDefault(); flagSize(); return; } var add = form.querySelector('.single_add_to_cart_button'); if (add && add.classList.contains('wc-variation-is-unavailable')) e.preventDefault(); });

    /* ---------- sticky Add to Cart (phones): only once the main button has scrolled away ---------- */
    var bar = document.getElementById('ecnSbar'), sbBtn = document.getElementById('ecnSbarBtn'), anchor = form ? (form.querySelector('.single_add_to_cart_button') || form) : page.querySelector('.ecn-pdp-coming');
    function showBar(on) { if (!bar) return; bar.classList.toggle('is-on', on); bar.setAttribute('aria-hidden', on ? 'false' : 'true'); bar.querySelectorAll('a,button').forEach(function (x) { x.tabIndex = on ? 0 : -1; }); document.body.classList.toggle('ecn-sbar-on', on); }
    if (bar && anchor && 'IntersectionObserver' in window) new IntersectionObserver(function (en) { en.forEach(function (x) { showBar(!x.isIntersecting && x.boundingClientRect.top < 0); }); }, { threshold: 0 }).observe(anchor);
    if (sbBtn && form) sbBtn.addEventListener('click', function () { if (needsSize()) { flagSize(); return; } var add = form.querySelector('.single_add_to_cart_button'); if (add) add.click(); });

    /* ---------- tabs ---------- */
    var tabs = [].slice.call(page.querySelectorAll('.ecn-pdp-tab'));
    function openTab(key, scroll) {
      var t = document.getElementById('ecn-tab-' + key); if (!t) return;
      tabs.forEach(function (x) { var on = x === t; x.classList.toggle('is-on', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1; var pnl = document.getElementById(x.getAttribute('aria-controls')); if (pnl) pnl.hidden = !on; });
      if (scroll) document.getElementById('ecn-pdp-tabs').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { openTab(t.id.replace('ecn-tab-', ''), false); });
      t.addEventListener('keydown', function (e) { var k = e.key, n = null; if (k === 'ArrowRight') n = tabs[(i + 1) % tabs.length]; else if (k === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length]; else if (k === 'Home') n = tabs[0]; else if (k === 'End') n = tabs[tabs.length - 1]; if (n) { e.preventDefault(); n.focus(); n.click(); } });
    });
    document.addEventListener('click', function (e) { var a = e.target.closest('[data-tab-open]'); if (!a) return; e.preventDefault(); openTab(a.getAttribute('data-tab-open'), !a.hasAttribute('data-write')); if (a.hasAttribute('data-write')) writeOpen(true, true); });

    /* ---------- reviews: the form opens from "Write a review" (it stays open without JavaScript) ---------- */
    var rev = page.querySelector('.ecn-pdp-rev'), wr = page.querySelector('.ecn-rev-write'), rf = page.querySelector('#review_form_wrapper');
    function writeOpen(on, focus) { if (!rev || !rf) return; rev.classList.toggle('is-writing', on); if (wr) wr.setAttribute('aria-expanded', on ? 'true' : 'false'); if (on && focus) { var f = rf.querySelector('p.stars a, #comment'); rf.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 300); } }
    if (rev && rf) { rev.classList.add('is-collapsible'); if (wr) wr.addEventListener('click', function () { writeOpen(!rev.classList.contains('is-writing'), true); }); }
    else if (wr) wr.hidden = true;

    if (/^#(reviews|comments|comment-\d+|review_form_wrapper|review_form|respond|ecn-tab-reviews)$/.test(location.hash)) { openTab('reviews', false); if (/review_form|respond/.test(location.hash)) writeOpen(true, false); var tgt = document.querySelector(location.hash === '#ecn-tab-reviews' ? '#ecn-pdp-tabs' : location.hash); if (tgt) setTimeout(function () { tgt.scrollIntoView({ block: 'start' }); }, 60); }

    /* ---------- saved hearts (same list as the homepage: localStorage "ecn_saved") ---------- */
    var KEY = 'ecn_saved';
    function load() { try { var a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a.map(String) : []; } catch (err) { return []; } }
    function save(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (err) {} }
    var hearts = [].slice.call(document.querySelectorAll('.ecn-pdp-heart, .ecn-rel-heart'));
    function paint() { var s = load(); hearts.forEach(function (h) { var on = s.indexOf(h.getAttribute('data-pid')) > -1; h.classList.toggle('is-on', on); h.setAttribute('aria-pressed', on ? 'true' : 'false'); }); }
    hearts.forEach(function (h) { h.addEventListener('click', function () { var id = h.getAttribute('data-pid'), a = load(), i = a.indexOf(id); if (i > -1) a.splice(i, 1); else { a.push(id); showToast('Saved to your list', false); } save(a); paint(); }); });
    paint();

    /* ---------- copy link ---------- */
    var cp = page.querySelector('.ecn-pdp-copy');
    if (cp) cp.addEventListener('click', function () { var u = cp.getAttribute('data-url'); function ok() { showToast('Link copied', false); } if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(ok, function () { window.prompt('Copy this link', u); }); else window.prompt('Copy this link', u); });

    /* ---------- related products: arrows (desktop), dots (phones), one-tap add ---------- */
    var rel = page.querySelector('.ecn-rel'), rt = rel && rel.querySelector('.ecn-rel-track'), rcards = rt ? [].slice.call(rt.children) : [];
    function rStep() { if (rcards.length < 2) return rt.clientWidth; return rcards[1].getBoundingClientRect().left - rcards[0].getBoundingClientRect().left; }
    if (rt && rcards.length) {
      var rp = rel.querySelector('.ecn-rel-prev'), rn = rel.querySelector('.ecn-rel-next'), dots = rel.querySelector('.ecn-rel-dots');
      function rPages() { var s = rStep(); return s > 0 ? Math.max(1, rcards.length - Math.round(rt.clientWidth / s) + 1) : 1; }
      function rSync() { var max = rt.scrollWidth - rt.clientWidth - 2; if (rp) rp.disabled = rt.scrollLeft <= 2; if (rn) rn.disabled = rt.scrollLeft >= max;
        if (dots) { var n = rPages(); if (dots.children.length !== n) dots.innerHTML = new Array(n + 1).join('<i></i>'); var a = rt.scrollLeft >= max ? n - 1 : Math.min(n - 1, Math.round(rt.scrollLeft / rStep())); [].forEach.call(dots.children, function (d, i) { d.classList.toggle('is-on', i === a); }); dots.hidden = n < 2; } }
      if (rp) rp.addEventListener('click', function () { rt.scrollBy({ left: -rStep(), behavior: reduce ? 'auto' : 'smooth' }); });
      if (rn) rn.addEventListener('click', function () { rt.scrollBy({ left: rStep(), behavior: reduce ? 'auto' : 'smooth' }); });
      rt.addEventListener('scroll', function () { requestAnimationFrame(rSync); }, { passive: true }); window.addEventListener('resize', rSync); rSync();
    }
    page.querySelectorAll('.ecn-rel-add').forEach(function (b) { b.addEventListener('click', function () {
      if (b.disabled) return; b.disabled = true; b.classList.add('is-busy');
      var fd = new FormData(); fd.append('product_id', b.getAttribute('data-id')); fd.append('quantity', '1');
      fetch(C.ajax, { method: 'POST', body: fd, credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (res) {
        if (!res || res.error) { location.href = b.getAttribute('data-url'); return; }
        if (res.fragments) { Object.keys(res.fragments).forEach(function (k) { document.querySelectorAll(k).forEach(function (el) { el.outerHTML = res.fragments[k]; }); }); if (window.jQuery) window.jQuery(document.body).trigger('added_to_cart', [res.fragments, res.cart_hash]); }
        b.classList.add('is-done'); showToast(b.getAttribute('data-name') + ' added to cart', true);
      }).catch(function () { location.href = b.getAttribute('data-url'); }).then(function () { b.disabled = false; b.classList.remove('is-busy'); });
    }); });

    /* a size with only one choice is picked straight away, so the button is ready to use */
    if (form) form.querySelectorAll('.ecn-pdp-sizes').forEach(function (w) { var only = w.querySelectorAll('.ecn-pdp-sz'), sel = w.previousElementSibling; if (only.length === 1 && sel && !sel.value) only[0].click(); });
  }

  /* newsletter sign-up (saved by the theme; works without JavaScript too) */
  function initNews() {
    [].forEach.call(document.querySelectorAll('.ecn-nl-form'), function (f) {
      var em = f.querySelector('.ecn-nl-email'), btn = f.querySelector('.ecn-nl-btn'), msg = f.querySelector('.ecn-nl-msg');
      function say(t, ok) { msg.textContent = t; msg.className = 'ecn-nl-msg ' + (ok ? 'is-ok' : 'is-error'); }
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = (em.value || '').trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { say('Please enter a valid email address.', false); em.setAttribute('aria-invalid', 'true'); em.focus(); return; }
        em.removeAttribute('aria-invalid'); btn.disabled = true; f.classList.add('is-busy');
        fetch(f.action, { method: 'POST', body: new FormData(f), credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' } })
          .then(function (r) { return r.json(); })
          .then(function (res) { say(res && res.message ? res.message : 'Sorry, something went wrong. Please try again.', !!(res && res.ok)); if (res && res.ok) f.reset(); })
          .catch(function () { say('Sorry, something went wrong. Please try again.', false); })
          .then(function () { btn.disabled = false; f.classList.remove('is-busy'); });
      });
    });
  }
  if (document.readyState !== 'loading') initNews(); else document.addEventListener('DOMContentLoaded', initNews);

  if (window.jQuery) window.jQuery(function () { setTimeout(init, 0); }); else if (document.readyState !== 'loading') init(); else document.addEventListener('DOMContentLoaded', init);
})();
