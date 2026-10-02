/* ECONUR product landing page v7: gallery (rail, swipe, full screen), size pills, quantity, pack choice, live price on
   the buttons, reviews, FAQ, routine add, favourites row, closing call to action, sticky Add to Cart (phones) and
   Meta events. WooCommerce's own variation form still does the real work. */
(function () {
  function init() {
    var C = window.ECN_PD || {}, page = document.querySelector('.ecn-pdp'); if (!page) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var form = page.querySelector('form.cart'), isVar = !!(form && form.classList.contains('variations_form'));
    var tiers = C.tiers || {};
    function meta(ev, data, custom) { if (window.ecnMeta) window.ecnMeta(ev, data, custom); }
    function money(n) { return String(C.symbol || '').trim() + ' ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: C.dec || 0, maximumFractionDigits: C.dec || 0 }); }
    function pct(q) { var best = 0, bq = 0; Object.keys(tiers).forEach(function (k) { var kq = parseInt(k, 10); if (q >= kq && kq > bq) { bq = kq; best = parseFloat(tiers[k]); } }); return best; }

    /* toast */
    var toast = document.getElementById('ecnToast'), tt = document.getElementById('ecnToastTxt'), th = null;
    function showToast(msg, checkout) { if (!toast) return; tt.textContent = msg; toast.querySelector('a').hidden = !checkout; toast.hidden = false; requestAnimationFrame(function () { toast.classList.add('is-on'); }); clearTimeout(th); th = setTimeout(function () { toast.classList.remove('is-on'); setTimeout(function () { toast.hidden = true; }, 250); }, 3200); }

    /* ---------- gallery: rail (desktop) / strip (phones), swipe, arrows ---------- */
    var g = page.querySelector('.ecn-g'), track = g && g.querySelector('.ecn-g-track'), slides = track ? [].slice.call(track.children) : [], thumbs = g ? [].slice.call(g.querySelectorAll('.ecn-g-thumb')) : [];
    var rail = g && g.querySelector('.ecn-g-thumbs'), more = g && g.querySelector('.ecn-g-more'), main = g && g.querySelector('.ecn-g-main');
    function gIndex() { return track && track.clientWidth ? Math.round(track.scrollLeft / track.clientWidth) : 0; }
    function gGo(i) { if (!track || !slides.length) return; i = (i + slides.length) % slides.length; track.scrollTo({ left: i * track.clientWidth, behavior: reduce ? 'auto' : 'smooth' }); }
    function gSync() { var i = gIndex(); thumbs.forEach(function (t, k) { var on = k === i; t.classList.toggle('is-on', on); if (on) { t.setAttribute('aria-current', 'true'); } else t.removeAttribute('aria-current'); }); }
    function railFit() {
      if (!rail || !main) return;
      var vertical = getComputedStyle(rail).flexDirection === 'column';
      g.style.setProperty('--ecn-g-h', (vertical ? Math.max(120, main.offsetHeight - (more ? 46 : 0)) : 0) + 'px');
      if (more) more.hidden = !vertical || rail.scrollHeight <= rail.clientHeight + 2;
    }
    if (track && slides.length > 1) {
      var gp = g.querySelector('.ecn-g-prev'), gn = g.querySelector('.ecn-g-next');
      if (gp) gp.addEventListener('click', function () { gGo(gIndex() - 1); });
      if (gn) gn.addEventListener('click', function () { gGo(gIndex() + 1); });
      thumbs.forEach(function (t) { t.addEventListener('click', function () { gGo(parseInt(t.getAttribute('data-i'), 10) || 0); }); });
      var raf = 0; track.addEventListener('scroll', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(gSync); }, { passive: true });
      track.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); gGo(gIndex() + 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); gGo(gIndex() - 1); } });
      if (more) more.addEventListener('click', function () { var end = rail.scrollTop + rail.clientHeight >= rail.scrollHeight - 2; rail.scrollBy({ top: end ? -rail.scrollHeight : rail.clientHeight * 0.8, behavior: reduce ? 'auto' : 'smooth' }); });
      if (rail && more) rail.addEventListener('scroll', function () { more.classList.toggle('is-up', rail.scrollTop + rail.clientHeight >= rail.scrollHeight - 2); }, { passive: true });
      railFit(); window.addEventListener('resize', railFit); window.addEventListener('load', railFit);
    }

    /* ---------- full-screen photo ---------- */
    var zoom = document.getElementById('ecnZoom'), zBtn = g && g.querySelector('.ecn-g-zoom'), zi = 0, zBack = null;
    function zShow(i) { if (!zoom || !slides.length) return; zi = (i + slides.length) % slides.length; var im = slides[zi].querySelector('img'); var z = zoom.querySelector('img'); z.src = im.getAttribute('data-full') || im.currentSrc || im.src; z.alt = im.alt || ''; }
    function zOpen() { if (!zoom) return; zBack = document.activeElement; zoom.classList.toggle('is-single', slides.length < 2); zShow(gIndex()); zoom.hidden = false; document.body.classList.add('ecn-zoom-open'); zoom.querySelector('.ecn-zoom-x').focus(); }
    function zClose() { if (!zoom || zoom.hidden) return; zoom.hidden = true; document.body.classList.remove('ecn-zoom-open'); gGo(zi); if (zBack) zBack.focus(); }
    if (zoom && zBtn) {
      zBtn.addEventListener('click', zOpen);
      zoom.querySelector('.ecn-zoom-x').addEventListener('click', zClose);
      zoom.querySelector('.ecn-zoom-prev').addEventListener('click', function () { zShow(zi - 1); });
      zoom.querySelector('.ecn-zoom-next').addEventListener('click', function () { zShow(zi + 1); });
      zoom.addEventListener('click', function (e) { if (e.target === zoom) zClose(); });
      // Escape closes the photo here; keep it from reaching the theme's mobile-cart handler (which errors on Escape)
      var zEsc = 0; document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !zoom.hidden) zEsc = Date.now(); }, true);
      document.addEventListener('keyup', function (e) { if (e.key === 'Escape' && Date.now() - zEsc < 1500) { e.stopImmediatePropagation(); zEsc = 0; } }, true);
      document.addEventListener('keydown', function (e) { if (zoom.hidden) return; if (e.key === 'Escape') zClose(); else if (e.key === 'ArrowRight') zShow(zi + 1); else if (e.key === 'ArrowLeft') zShow(zi - 1); else if (e.key === 'Tab') { var f = [].slice.call(zoom.querySelectorAll('button')).filter(function (b) { return b.offsetParent; }); var a = f.indexOf(document.activeElement); if (e.shiftKey && a <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && a === f.length - 1) { e.preventDefault(); f[0].focus(); } } });
    }

    /* ---------- size pills mirror the real select ---------- */
    var userPick = false;
    if (form) form.querySelectorAll('table.variations select').forEach(function (sel) {
      var wrap = document.createElement('div'); wrap.className = 'ecn-pdp-sizes'; wrap.setAttribute('role', 'radiogroup');
      var lab = form.querySelector('label[for="' + sel.id + '"]'); wrap.setAttribute('aria-label', lab ? lab.textContent.trim() : 'Size');
      [].forEach.call(sel.options, function (o) {
        if (!o.value) return;
        var b = document.createElement('button'); b.type = 'button'; b.className = 'ecn-pdp-sz'; b.setAttribute('role', 'radio'); b.setAttribute('data-v', o.value); b.textContent = o.text;
        b.addEventListener('click', function (e) { userPick = !!e.isTrusted; sel.value = o.value; if (window.jQuery) window.jQuery(sel).trigger('change'); else sel.dispatchEvent(new Event('change', { bubbles: true })); sync(); });
        b.addEventListener('keydown', function (e) { if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].indexOf(e.key) < 0) return; e.preventDefault(); var all = [].slice.call(wrap.children), i = all.indexOf(b), n = all[(i + ((e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : -1) + all.length) % all.length]; n.focus(); n.click(); });
        wrap.appendChild(b);
      });
      function sync() { wrap.querySelectorAll('.ecn-pdp-sz').forEach(function (x, k) { var on = x.getAttribute('data-v') === sel.value; x.classList.toggle('is-on', on); x.setAttribute('aria-checked', on ? 'true' : 'false'); x.tabIndex = on || (!sel.value && k === 0) ? 0 : -1; }); }
      sel.insertAdjacentElement('afterend', wrap); sel.classList.add('ecn-hidden-select'); sel.setAttribute('tabindex', '-1'); sel.setAttribute('aria-hidden', 'true');
      sel.addEventListener('change', sync); if (window.jQuery) window.jQuery(form).on('reset_data woocommerce_update_variation_values', sync); sync();
    });

    /* ---------- quantity stepper (keeps WooCommerce min/max) ---------- */
    var q = form ? form.querySelector('.quantity input.qty') : null;
    function qty() { return q ? Math.max(1, parseInt(q.value || '1', 10) || 1) : 1; }
    if (q && !q.closest('.ecn-qty')) { var box = q.closest('.quantity'); if (box) { box.classList.add('ecn-qty');
      var m = document.createElement('button'), p = document.createElement('button'); m.type = p.type = 'button'; m.className = p.className = 'ecn-qty-btn'; m.innerHTML = '&minus;'; p.textContent = '+'; m.setAttribute('aria-label', 'Decrease quantity'); p.setAttribute('aria-label', 'Increase quantity');
      box.insertBefore(m, q); box.appendChild(p);
      m.addEventListener('click', function () { var v = qty(), mn = parseInt(q.getAttribute('min') || '1', 10) || 1; if (v > mn) { q.value = v - 1; q.dispatchEvent(new Event('change', { bubbles: true })); } });
      p.addEventListener('click', function () { var v = qty(), mx = parseInt(q.getAttribute('max') || '0', 10); if (!mx || v < mx) { q.value = v + 1; q.dispatchEvent(new Event('change', { bubbles: true })); } }); } }

    /* ---------- price on the buttons, pack cards and sticky bar ---------- */
    var unit = parseFloat(C.price) || 0, unitReg = parseFloat(C.reg) || 0, origReg = unitReg, size = '', vidNow = C.vid || C.pid;
    var addBtn = form ? form.querySelector('.single_add_to_cart_button') : null, atcPrice = null;
    if (addBtn) { atcPrice = document.createElement('span'); atcPrice.className = 'ecn-atc-price'; addBtn.appendChild(atcPrice); }
    var packs = [].slice.call(page.querySelectorAll('.ecn-lp-pack')), sbP = document.getElementById('ecnSbarPrice'), sbS = document.getElementById('ecnSbarSize'), finalP = page.querySelector('[data-ecn-final-price]');
    var sizeEl = page.querySelector('[data-ecn-size]'); size = sizeEl ? sizeEl.textContent : '';
    function lineTotal(n) { return unit * n * (1 - pct(n) / 100); }
    var ptP = page.querySelector('[data-ptype-price]'), ptR = page.querySelector('[data-ptype-reg]'), ptS = page.querySelector('[data-ptype-save]');
    var waLinks = [].slice.call(page.querySelectorAll('[data-ecn-wa-live]'));
    function refresh() {
      var n = qty(), t = lineTotal(n);
      if (waLinks.length) { var bits = [size, n > 1 ? n + ' ' + (/bar/i.test(C.name || '') ? 'bars' : 'pcs') : ''].filter(Boolean).join(', '), msg = 'Hi Econur, I have a question about ' + C.name + (bits ? ' (' + bits + ')' : '') + '.'; waLinks.forEach(function (a) { a.href = 'https://wa.me/' + (C.wa || '') + '?text=' + encodeURIComponent(msg); }); }
      if (ptP && unit) { var base = (unitReg > unit ? unitReg : unit) * n, sv = base - t; ptP.textContent = money(t); if (ptR) { ptR.hidden = !(sv > 0.5); ptR.textContent = sv > 0.5 ? money(base) : ''; } if (ptS) { ptS.hidden = !(sv > 0.5); ptS.textContent = sv > 0.5 ? 'Save ' + money(sv) : ''; } }
      if (atcPrice) atcPrice.textContent = unit ? ' — ' + money(t) : '';
      if (finalP) finalP.textContent = unit ? ' — ' + money(t) : '';
      if (sbP && unit) sbP.textContent = money(t);
      if (sbS) { var unitW = /bar/i.test(C.name || '') ? ['bar', 'bars'] : ['pc', 'pcs']; sbS.textContent = [size, n + ' ' + (n > 1 ? unitW[1] : unitW[0])].filter(Boolean).join(' · '); }
      packs.forEach(function (pk) {
        var k = parseInt(pk.getAttribute('data-q'), 10), on = k === n;
        pk.classList.toggle('is-on', on); var r = pk.querySelector('input'); if (r) r.checked = on;
        var pp = pk.querySelector('[data-pack-price]'); if (pp && unit) pp.textContent = money(lineTotal(k));
        var ps = pk.querySelector('[data-pack-save]'); if (ps) { var s = unit * k - lineTotal(k); ps.textContent = s > 0.5 ? 'Save ' + money(s) : ''; } var pe = pk.querySelector('[data-pack-each]'); if (pe && unit) pe.textContent = k + ' × ' + money(unit);
      });
    }
    packs.forEach(function (pk) { var r = pk.querySelector('input'); if (!r) return; r.addEventListener('change', function () { if (!q) return; q.value = r.value; q.dispatchEvent(new Event('change', { bubbles: true })); meta('PackSelected', { content_ids: [String(vidNow)], content_name: C.name, quantity: parseInt(r.value, 10) }, true); }); });
    if (q) { q.addEventListener('change', refresh); q.addEventListener('input', refresh); }

    /* ---------- live price, size, stock and photo from the real variation ---------- */
    var price = page.querySelector('.ecn-pdp-price'), origPrice = price ? price.innerHTML : '', origSize = size,
        stockEl = page.querySelector('[data-ecn-stock]'), origStock = stockEl ? [stockEl.className, stockEl.textContent] : null, saveEl = page.querySelector('[data-ecn-save]'), origSave = saveEl ? [saveEl.hidden, saveEl.textContent] : null,
        firstImg = slides[0] ? slides[0].querySelector('img') : null, origImg = firstImg ? [firstImg.src, firstImg.srcset, firstImg.sizes] : null, origUnit = unit;
    function sizeLabel(v) { var out = []; if (!form || !v || !v.attributes) return ''; Object.keys(v.attributes).forEach(function (k) { var sel = form.querySelector('select[name="' + k + '"]'), val = v.attributes[k]; if (sel) { var o = [].filter.call(sel.options, function (x) { return x.value === val; })[0]; out.push(o ? o.text : val); } }); return out.join(' / '); }
    if (window.jQuery && isVar) {
      window.jQuery(form).on('found_variation', function (e, v) {
        if (!v) return;
        if (v.price_html && price) { var t = document.createElement('div'); t.innerHTML = v.price_html; var src = t.querySelector('.price'); price.innerHTML = src ? src.innerHTML : v.price_html; }
        var lbl = sizeLabel(v); if (sizeEl && lbl) sizeEl.textContent = lbl; size = lbl || size;
        if (v.display_price != null) unit = parseFloat(v.display_price) || unit; unitReg = parseFloat(v.display_regular_price) || 0; vidNow = v.variation_id || vidNow;
        if (saveEl) { var s = unitReg - unit; saveEl.hidden = !(s > 0.5); if (s > 0.5) saveEl.textContent = 'Save ' + money(s); }
        if (stockEl) { if (!v.is_in_stock) { stockEl.className = 'ecn-pdp-stock is-out'; stockEl.textContent = 'Out of stock'; } else if (v.backorders_allowed && v.availability_html && /backorder/i.test(v.availability_html)) { stockEl.className = 'ecn-pdp-stock is-soon'; stockEl.textContent = 'On backorder'; } else { stockEl.className = 'ecn-pdp-stock is-in'; stockEl.textContent = 'In Stock'; } }
        if (firstImg && v.image && v.image.src && v.image.src !== firstImg.src) { firstImg.src = v.image.src; firstImg.srcset = v.image.srcset || ''; if (v.image.sizes) firstImg.sizes = v.image.sizes; gGo(0); }
        refresh();
        if (userPick) meta('SizeSelected', { content_ids: [String(vidNow)], content_name: C.name, value: unit }, true); userPick = false;
      }).on('reset_data', function () {
        if (price) price.innerHTML = origPrice; if (sizeEl) sizeEl.textContent = origSize; size = origSize; unit = origUnit; unitReg = origReg;
        if (stockEl && origStock) { stockEl.className = origStock[0]; stockEl.textContent = origStock[1]; }
        if (saveEl && origSave) { saveEl.hidden = origSave[0]; saveEl.textContent = origSave[1]; }
        if (firstImg && origImg) { firstImg.src = origImg[0]; firstImg.srcset = origImg[1]; firstImg.sizes = origImg[2]; }
        refresh();
      });
    }
    refresh();

    /* ---------- a size must be chosen before Add to Cart / Buy Now ---------- */
    function needsSize() { if (!isVar) return false; var vid = form.querySelector('input[name=variation_id]'); return !(vid && parseInt(vid.value || '0', 10) > 0); }
    function flagSize() { var sz = form.querySelector('.ecn-pdp-sizes') || form; sz.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); sz.classList.add('ecn-flag'); var f = sz.querySelector('.ecn-pdp-sz'); if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 350); setTimeout(function () { sz.classList.remove('ecn-flag'); }, 1600); }
    var bn = page.querySelector('.ecn-pdp-buynow');
    if (bn) bn.addEventListener('click', function (e) { if (needsSize()) { e.preventDefault(); flagSize(); return; } if (addBtn && addBtn.classList.contains('wc-variation-is-unavailable')) e.preventDefault(); });
    // Meta AddToCart for the form (Add to Cart, Buy Now) is sent only after WooCommerce has added the item: see inc/meta-tracking.php

    /* ---------- sticky Add to Cart (phones): only once the main button has scrolled away ---------- */
    var bar = document.getElementById('ecnSbar'), sbBtn = document.getElementById('ecnSbarBtn'), anchor = form ? (addBtn || form) : page.querySelector('.ecn-pdp-coming');
    function showBar(on) { if (!bar) return; bar.classList.toggle('is-on', on); bar.setAttribute('aria-hidden', on ? 'false' : 'true'); bar.querySelectorAll('a,button').forEach(function (x) { x.tabIndex = on ? 0 : -1; }); document.body.classList.toggle('ecn-sbar-on', on); }
    if (bar && anchor && 'IntersectionObserver' in window) new IntersectionObserver(function (en) { en.forEach(function (x) { showBar(!x.isIntersecting && x.boundingClientRect.top < 0); }); }, { threshold: 0 }).observe(anchor);
    function addNow() { if (!form) return; if (needsSize()) { flagSize(); return; } if (addBtn) addBtn.click(); }
    if (sbBtn) sbBtn.addEventListener('click', addNow);
    var fin = page.querySelector('[data-ecn-final-add]'); if (fin) fin.addEventListener('click', addNow);

    /* ---------- reviews: rating, counter, photos, checks before sending, thank-you message ---------- */
    var rvSec = page.querySelector('#ecn-reviews'), rvCard = page.querySelector('#ecn-rv-form'), rvForm = document.getElementById('commentform');
    var rvBtns = [].slice.call(page.querySelectorAll('[data-ecn-rv-write]'));
    // state 2: the form opens in place (state 1 invitation steps aside; state 3 summary stays above it)
    function rvOpen() {
      if (!rvSec || !rvCard || rvSec.classList.contains('is-open')) return;
      rvSec.classList.add('is-open'); rvBtns.forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
    }
    // Cancel: back to the invitation (no reviews yet) or to the summary (reviews exist); nothing outside this section changes
    function rvClose() {
      if (!rvSec || !rvSec.classList.contains('is-open')) return;
      rvSec.classList.remove('is-open'); rvBtns.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
      document.body.classList.remove('ecn-rv-typing');
      var back = rvSec.querySelector('.ecn-rv-invite, .ecn-rv-summary') || rvSec;
      back.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      var w = rvSec.querySelector('[data-ecn-rv-write]'); if (w) setTimeout(function () { w.focus({ preventScroll: true }); }, reduce ? 0 : 350);
    }
    rvSec && rvSec.querySelectorAll('[data-ecn-rv-cancel]').forEach(function (b) { b.addEventListener('click', rvClose); });
    function rvGo(rate) {
      if (!rvCard) { if (rvSec) rvSec.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); return; }
      rvOpen();
      if (rate) { var r = document.getElementById('ecn-rv-r' + rate); if (r) { r.checked = true; rvErr('rating', false); } }
      requestAnimationFrame(function () { rvCard.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); });
      var f = rvCard.querySelector('.ecn-rv-stars input:checked') || rvCard.querySelector('.ecn-rv-stars input[value="1"]');
      if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, reduce ? 0 : 450);
    }
    function rvErr(k, on, msg) {
      var e = page.querySelector('.ecn-rv-err[data-for="' + k + '"]'); if (!e) return;
      if (msg) e.textContent = msg; e.hidden = !on;
      var f = k === 'rating' ? null : document.getElementById(k); if (f) { if (on) f.setAttribute('aria-invalid', 'true'); else f.removeAttribute('aria-invalid'); }
    }
    page.querySelectorAll('[data-ecn-rv-write], [data-write]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); rvGo(0); }); });
    page.querySelectorAll('[data-ecn-rv-rate]').forEach(function (b) { b.addEventListener('click', function () { rvGo(b.getAttribute('data-ecn-rv-rate')); }); });
    if (rvCard) { rvCard.addEventListener('focusin', function () { document.body.classList.add('ecn-rv-typing'); }); rvCard.addEventListener('focusout', function () { setTimeout(function () { if (!rvCard.contains(document.activeElement)) document.body.classList.remove('ecn-rv-typing'); }, 0); }); }
    page.querySelectorAll('.ecn-rv-readmore').forEach(function (b) { b.addEventListener('click', function () { var t = b.previousElementSibling, on = !t.classList.contains('is-open'); t.classList.toggle('is-open', on); b.setAttribute('aria-expanded', on ? 'true' : 'false'); b.textContent = on ? 'Show less' : 'Read more'; }); });
    page.querySelectorAll('.ecn-rv-stars input').forEach(function (r) { r.addEventListener('change', function () { rvErr('rating', false); }); });
    var rvMore = page.querySelector('.ecn-rv-more');
    if (rvMore) rvMore.addEventListener('click', function () { var first = null; page.querySelectorAll('.ecn-rv-item[hidden]').forEach(function (it) { it.hidden = false; if (!first) first = it; }); rvMore.setAttribute('aria-expanded', 'true'); rvMore.hidden = true; if (first) { first.setAttribute('tabindex', '-1'); first.focus({ preventScroll: true }); } });
    if (rvForm && rvCard) {
      var ta = rvForm.querySelector('#comment'), cnt = rvForm.querySelector('.ecn-rv-count b');
      if (ta && cnt) { var upd = function () { cnt.textContent = ta.value.length; if (ta.value.trim()) rvErr('comment', false); }; ta.addEventListener('input', upd); upd(); }
      ['author', 'email'].forEach(function (k) { var f = document.getElementById(k); if (f) f.addEventListener('input', function () { rvErr(k, false); }); });
      // photos: up to 3, JPG / PNG / WebP, 5 MB each (checked again on the server)
      var fi = rvForm.querySelector('.ecn-rv-file'), th = rvForm.querySelector('.ecn-rv-thumbs');
      function setFiles(list) { if (!window.DataTransfer) return false; var dt = new DataTransfer(); list.forEach(function (f) { dt.items.add(f); }); fi.files = dt.files; return true; }
      function drawThumbs() {
        th.innerHTML = '';
        [].forEach.call(fi.files, function (f, i) {
          var li = document.createElement('li'), im = document.createElement('img'), x = document.createElement('button');
          im.alt = ''; im.src = URL.createObjectURL(f); im.onload = function () { URL.revokeObjectURL(im.src); };
          x.type = 'button'; x.textContent = '×'; x.setAttribute('aria-label', 'Remove photo ' + (i + 1));
          x.addEventListener('click', function () { var keep = [].slice.call(fi.files).filter(function (g, j) { return j !== i; }); if (!setFiles(keep)) fi.value = ''; drawThumbs(); });
          li.appendChild(im); li.appendChild(x); th.appendChild(li);
        });
      }
      if (fi && th) fi.addEventListener('change', function () {
        var ok = [], bad = 0, many = false;
        [].forEach.call(fi.files, function (f) { if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > 5242880) { bad++; return; } if (ok.length >= 3) { many = true; return; } ok.push(f); });
        if (bad || many) { if (!setFiles(ok)) fi.value = ''; rvErr('photos', true, (bad ? 'Some files were left out: please use JPG, PNG or WebP photos up to 5 MB. ' : '') + (many ? 'You can add up to 3 photos.' : '')); } else rvErr('photos', false);
        drawThumbs();
      });
      rvForm.addEventListener('submit', function (e) {
        var first = null, mark = function (k, el) { rvErr(k, true); if (!first) first = el; };
        var rated = rvCard.querySelector('.ecn-rv-stars input:checked');
        if (!rated) mark('rating', rvCard.querySelector('.ecn-rv-stars input[value="1"]'));
        if (ta && !ta.value.trim()) mark('comment', ta);
        var au = document.getElementById('author'), em = document.getElementById('email');
        if (au && !au.value.trim()) mark('author', au);
        if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value.trim())) mark('email', em);
        if (first) { e.preventDefault(); first.focus(); return; }
        var sb = rvForm.querySelector('#submit'); if (sb) { sb.disabled = true; sb.classList.add('is-busy'); var sp = sb.querySelector('span'); if (sp) sp.textContent = 'Submitting…'; }
      });
    }
    // after sending: a thank-you that says what really happens (published now, or after approval)
    var done = (document.cookie.match(/(?:^|;\s*)ecn_rv_done=([^;]+)/) || [])[1];
    if (done && rvCard) {
      document.cookie = 'ecn_rv_done=; Max-Age=0; path=/';
      var d = decodeURIComponent(done).split('.'), box = rvCard.querySelector('.ecn-rv-done');
      var msg = '<b>Thank you for sharing your experience.</b><span>' + (d[0] === '1' ? 'Your review is now live on this page.' : 'Your review has been submitted and may appear after approval.') + '</span>';
      if (+d[1]) msg += '<span>' + (+d[1] === 1 ? 'Your photo was received' : 'Your ' + d[1] + ' photos were received') + (d[0] === '1' ? '.' : ' and will show with your review once it is approved.') + '</span>';
      if (+d[2]) msg += '<span>' + d[2] + ' photo' + (+d[2] === 1 ? '' : 's') + ' could not be added (JPG, PNG or WebP up to 5 MB, 3 at most).</span>';
      if (box) { rvOpen(); box.innerHTML = msg; box.hidden = false; rvCard.classList.add('is-done'); setTimeout(function () { rvCard.scrollIntoView({ block: 'start' }); box.focus({ preventScroll: true }); }, 120); }
    } else if (/^#(reviews|review_form_wrapper|review_form|respond|ecn-rv-form)$/.test(location.hash)) {
      setTimeout(function () { rvGo(0); }, 80); // review-request links (WhatsApp, SMS, email) open the form
    } else if (/^#(ecn-reviews|comments|comment-\d+)$/.test(location.hash)) {
      var tg = document.querySelector(location.hash) || rvSec; if (tg) setTimeout(function () { tg.scrollIntoView({ block: 'start' }); }, 80);
    }

    /* ---------- links to sections of this page (See all reviews, footer links) scroll smoothly ---------- */
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]'); if (!a || a.hasAttribute('data-write') || e.defaultPrevented) return;
      var id = a.getAttribute('href').slice(1), t = id && document.getElementById(id); if (!t || !/^ecn-/.test(id)) return;
      e.preventDefault(); t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      if (history.replaceState) history.replaceState(null, '', '#' + id);
    });

    /* ---------- FAQ: one answer open at a time ---------- */
    var faqs = [].slice.call(page.querySelectorAll('.ecn-lp-faq-i'));
    faqs.forEach(function (d) { d.addEventListener('toggle', function () { if (d.open) faqs.forEach(function (o) { if (o !== d) o.open = false; }); }); });

    /* ---------- saved hearts (same list as the homepage: localStorage "ecn_saved") ---------- */
    var KEY = 'ecn_saved';
    function load() { try { var a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a.map(String) : []; } catch (err) { return []; } }
    function save(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (err) {} }
    var hearts = [].slice.call(document.querySelectorAll('.ecn-pdp-heart, .ecn-rel-heart'));
    function paint() { var s = load(); hearts.forEach(function (h) { var on = s.indexOf(h.getAttribute('data-pid')) > -1; h.classList.toggle('is-on', on); h.setAttribute('aria-pressed', on ? 'true' : 'false'); }); }
    hearts.forEach(function (h) { h.addEventListener('click', function () { var id = h.getAttribute('data-pid'), a = load(), i = a.indexOf(id); if (i > -1) a.splice(i, 1); else { a.push(id); showToast('Saved to your list', false); } save(a); paint(); }); });
    paint();

    /* ---------- WhatsApp clicks (Meta custom event) ---------- */
    document.addEventListener('click', function (e) { var a = e.target.closest('[data-ecn-wa]'); if (a) meta('WhatsAppClick', { content_ids: [String(C.pid)], content_name: C.name }, true); });

    /* ---------- add to cart by AJAX (favourites, routine) ---------- */
    function ajaxAdd(id) {
      var fd = new FormData(); fd.append('product_id', id); fd.append('quantity', '1');
      return fetch(C.ajax, { method: 'POST', body: fd, credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (res) { if (!res || res.error) throw new Error('add'); return res; });
    }
    function applyFragments(res) {
      if (!res || !res.fragments) return;
      Object.keys(res.fragments).forEach(function (k) { document.querySelectorAll(k).forEach(function (el) { el.outerHTML = res.fragments[k]; }); });
      if (window.jQuery) window.jQuery(document.body).trigger('wc_fragments_refreshed');
    }

    /* complete your routine: add all three, one after another */
    var ra = page.querySelector('.ecn-lp-routine-add');
    if (ra) ra.addEventListener('click', function () {
      if (ra.disabled) return; ra.disabled = true; ra.classList.add('is-busy');
      var ids = (ra.getAttribute('data-ids') || '').split(',').filter(Boolean), last = null, chain = Promise.resolve();
      ids.forEach(function (id) { chain = chain.then(function () { return ajaxAdd(id).then(function (r) { last = r; }); }); });
      chain.then(function () {
        applyFragments(last); showToast('Routine added to cart (' + ids.length + ' items)', true);
        var v = parseFloat(ra.getAttribute('data-total')) || undefined;
        meta('AddToCart', { content_ids: ids, content_type: 'product', value: v, num_items: ids.length });
        meta('BundleAddToCart', { content_ids: ids, value: v, num_items: ids.length }, true);
      }).catch(function () { applyFragments(last); showToast('Some items could not be added. Please try again.', false); })
        .then(function () { ra.disabled = false; ra.classList.remove('is-busy'); });
    });

    /* more favourites: arrows (desktop), dots (phones), one-tap add */
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
    page.querySelectorAll('.ecn-rel-sizes').forEach(function (grp) {
      var card = grp.closest('.ecn-rel-card'), btn = card.querySelector('.ecn-rel-add'), pr = card.querySelector('.ecn-rel-pr'), nm = (card.querySelector('.ecn-rel-name') || {}).textContent || '';
      grp.querySelectorAll('.ecn-rel-size').forEach(function (c) { c.addEventListener('click', function () {
        grp.querySelectorAll('.ecn-rel-size').forEach(function (x) { var on = x === c; x.classList.toggle('is-on', on); x.setAttribute('aria-checked', on ? 'true' : 'false'); });
        if (pr) pr.innerHTML = c.getAttribute('data-price-html');
        if (btn) { var sz = c.getAttribute('data-size'); btn.setAttribute('data-id', c.getAttribute('data-id')); btn.setAttribute('data-price', c.getAttribute('data-price')); btn.setAttribute('data-name', nm.trim() + ' (' + sz + ')'); btn.setAttribute('aria-label', 'Add ' + nm.trim() + ', ' + sz + ' to cart'); btn.classList.remove('is-done'); }
      }); });
    });
    page.querySelectorAll('.ecn-rel-add').forEach(function (b) { b.addEventListener('click', function () {
      if (b.disabled) return; b.disabled = true; b.classList.add('is-busy');
      ajaxAdd(b.getAttribute('data-id')).then(function (res) {
        applyFragments(res); b.classList.add('is-done'); showToast(b.getAttribute('data-name') + ' added to cart', true);
        meta('AddToCart', { content_ids: [b.getAttribute('data-id')], content_type: 'product', content_name: b.getAttribute('data-name'), value: parseFloat(b.getAttribute('data-price')) || undefined, quantity: 1 });
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
        fetch(f.getAttribute('action'), { method: 'POST', body: new FormData(f), credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' } })
          .then(function (r) { return r.json(); })
          .then(function (res) { say(res && res.message ? res.message : 'Sorry, something went wrong. Please try again.', !!(res && res.ok)); if (res && res.ok) f.reset(); })
          .catch(function () { say('Sorry, something went wrong. Please try again.', false); })
          .then(function () { btn.disabled = false; f.classList.remove('is-busy'); });
      });
    });
  }
  if (document.readyState !== 'loading') initNews(); else document.addEventListener('DOMContentLoaded', initNews);

  /* "Why" and "How to Use" cards: descriptions in one row share a height, so titles and pills line up */
  function evenRows() {
    [['.ecn-lp-ings', '.ecn-lp-ing p'], ['.ecn-lp-steps', '.ecn-lp-step p']].forEach(function (g) {
      [].forEach.call(document.querySelectorAll(g[0]), function (row) {
        var ps = [].slice.call(row.querySelectorAll(g[1])), max = 0;
        ps.forEach(function (p) { p.style.minHeight = ''; });
        var top = ps.length ? ps[0].getBoundingClientRect().top : 0;
        if (ps.length < 2 || ps.some(function (p) { return Math.abs(p.getBoundingClientRect().top - top) > 40; })) return; // stacked: nothing to line up
        ps.forEach(function (p) { max = Math.max(max, p.getBoundingClientRect().height); });
        ps.forEach(function (p) { p.style.minHeight = max + 'px'; });
      });
    });
  }
  var evenT; function evenSoon() { clearTimeout(evenT); evenT = setTimeout(evenRows, 120); }
  window.addEventListener('resize', evenSoon); window.addEventListener('load', evenRows);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(evenRows);
  if (document.readyState !== 'loading') evenRows(); else document.addEventListener('DOMContentLoaded', evenRows);

  if (window.jQuery) window.jQuery(function () { setTimeout(init, 0); }); else if (document.readyState !== 'loading') init(); else document.addEventListener('DOMContentLoaded', init);
})();
