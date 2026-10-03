/* ECONUR checkout 1.1 (inc/econur-checkout.php). Works with WooCommerce's own checkout script (wc-checkout):
   division narrows the district list, mobile numbers are checked as they are typed, errors appear under their field,
   the delivery-area card and the order button show their state. WooCommerce still validates and creates the order.
   The coupon field in the order summary sends WooCommerce's own coupon requests (apply_coupon / remove_coupon, with
   the nonces WooCommerce hands to its checkout script) and then lets WooCommerce refresh the totals. */
(function ($) {
  'use strict';
  if (!$) return;
  var CO = window.ECN_CO || {}, $form = $('form.checkout.econur-checkout');
  if (!$form.length) return;

  function bnDigits(v) { return String(v || '').replace(/[০-৯]/g, function (d) { return String('০১২৩৪৫৬৭৮৯'.indexOf(d)); }); }
  function phone(v) { v = bnDigits(v).replace(/[^\d+]/g, ''); if (v.indexOf('+880') === 0) v = '0' + v.slice(4); else if (v.indexOf('880') === 0 && v.length === 13) v = '0' + v.slice(3); return v; }
  function phoneOk(v) { return /^01[3-9]\d{8}$/.test(v); }

  /* ---------- field errors ---------- */
  function setErr(id, msg) {
    var $row = $('#' + id + '_field'); if (!$row.length) return false;
    $row.find('.econur-field-err').remove();
    if (msg) {
      $row.addClass('woocommerce-invalid econur-has-err').removeClass('woocommerce-validated');
      $('<span class="econur-field-err" role="alert"></span>').attr('id', id + '_err').text(msg).appendTo($row);
      $row.find('input, select').attr({ 'aria-invalid': 'true', 'aria-describedby': id + '_err' });
    } else {
      $row.removeClass('econur-has-err');
      $row.find('input, select').removeAttr('aria-invalid aria-describedby');
    }
    return true;
  }
  function clearErr(id) { setErr(id, ''); }

  /* ---------- mobile numbers ---------- */
  function checkPhone(id, optional) {
    var $i = $('#' + id); if (!$i.length) return true;
    var v = phone($i.val()); if (v !== $i.val() && v) $i.val(v);
    if (!v) { if (!optional) return true; clearErr(id); return true; }
    if (!phoneOk(v)) { setErr(id, id === 'billing_phone' ? 'সঠিক মোবাইল নম্বর দিন: ১১ সংখ্যা, 01 দিয়ে শুরু (যেমন 01712345678)।' : 'বিকল্প নম্বরটি সঠিক নয় (যেমন 01712345678), অথবা ঘরটি খালি রাখুন।'); return false; }
    clearErr(id); return true;
  }
  $form.on('blur change', '#billing_phone', function () { checkPhone('billing_phone'); });
  $form.on('blur change', '#billing_econur_alt_phone', function () { checkPhone('billing_econur_alt_phone', true); });
  $form.on('input change', '.form-row input, .form-row select', function () { var $r = $(this).closest('.form-row'); if ($r.hasClass('econur-has-err') && $(this).val()) { var id = ($r.attr('id') || '').replace(/_field$/, ''); if (id !== 'billing_phone' && id !== 'billing_econur_alt_phone') clearErr(id); } });

  /* ---------- division > district ---------- */
  var all = null; // [[code, name], ...] as WooCommerce lists them
  function divisionOf(code) { var d = CO.divisions || {}; for (var k in d) if (d[k].indexOf(code) > -1) return k; return ''; }
  function filterDistricts() {
    var $st = $('#billing_state'), div = $('#billing_econur_division').val();
    if (!$st.is('select')) return;
    var opts = $st.find('option').map(function () { return [[this.value, this.textContent]]; }).get();
    if (!all || opts.length > all.length) all = opts;
    var keep = div && CO.divisions && CO.divisions[div] ? CO.divisions[div] : null, cur = $st.val();
    var html = all.map(function (o) { return (!o[0] || !keep || keep.indexOf(o[0]) > -1) ? '<option value="' + o[0] + '">' + $('<div>').text(o[1]).html() + '</option>' : ''; }).join('');
    $st.html(html);
    if (cur && (!keep || keep.indexOf(cur) > -1)) $st.val(cur); else $st.val('');
    $st.prop('disabled', false);
  }
  $form.on('change', '#billing_econur_division', function () { var before = $('#billing_state').val(); filterDistricts(); if ($('#billing_state').val() !== before) $('#billing_state').trigger('change'); });
  $form.on('change', '#billing_state', function () { var code = $(this).val(), $d = $('#billing_econur_division'); if (code && !$d.val()) { $d.val(divisionOf(code)); filterDistricts(); $(this).val(code); } });
  $(document.body).on('country_to_state_changed', function () { all = null; filterDistricts(); });
  $(function () { var code = $('#billing_state').val(), $d = $('#billing_econur_division'); if (code && !$d.val()) $d.val(divisionOf(code)); filterDistricts(); });

  /* ---------- delivery area cards ---------- */
  $form.on('change', '.econur-ship-card input', function () { $('.econur-ship-card').removeClass('is-on'); $(this).closest('.econur-ship-card').addClass('is-on'); });

  /* ---------- placing the order ---------- */
  var label = '';
  $form.on('checkout_place_order', function () {
    var ok = checkPhone('billing_phone') & checkPhone('billing_econur_alt_phone', true);
    if (!ok) { var $f = $('.econur-has-err').first(); $('html, body').animate({ scrollTop: $f.offset().top - 110 }, 300); $f.find('input').trigger('focus'); return false; }
    var $b = $('#place_order'); label = label || $b.data('value') || $b.text();
    $b.addClass('is-busy').attr('aria-busy', 'true').text('অর্ডার প্রসেস হচ্ছে...');
    return true;
  });
  $(document.body).on('checkout_error', function () {
    var $b = $('#place_order'); $b.removeClass('is-busy').removeAttr('aria-busy'); if (label) $b.text(label);
    // WooCommerce lists the errors at the top; each one with a field moves under that field
    var $group = $('.woocommerce-NoticeGroup-checkout'), first = null, left = 0;
    $form.find('.econur-field-err').remove(); $form.find('.econur-has-err').removeClass('econur-has-err');
    $group.find('li').each(function () {
      var id = $(this).attr('data-id'), txt = $.trim($(this).text());
      if (id && setErr(id, txt)) { if (!first) first = $('#' + id + '_field'); } else left++;
    });
    if (first) {
      if (!left) $group.attr('hidden', true);
      setTimeout(function () { $('html, body').stop().animate({ scrollTop: first.offset().top - 110 }, 300); first.find('input, select').first().trigger('focus'); }, 60);
    }
  });
  $(document.body).on('updated_checkout', function () { var $b = $('#place_order'); if (label && !$form.hasClass('processing')) $b.text(label); });

  /* ---------- coupon code (order summary) ---------- */
  var P = window.wc_checkout_params || {}, cBusy = false;
  function wcAjax(ep) { return String(P.wc_ajax_url || '').replace('%%endpoint%%', ep); }
  function cMsg(text, kind) {
    var $m = $('#econur_coupon_msg');
    $m.removeClass('is-ok is-err').text(text || '').prop('hidden', !text);
    if (text) $m.addClass(kind === 'ok' ? 'is-ok' : 'is-err').attr('role', kind === 'ok' ? 'status' : 'alert');
    $('#econur_coupon_code').attr('aria-invalid', text && kind !== 'ok' ? 'true' : null);
  }
  // WooCommerce answers with its notice markup; the first message is shown under the field
  function notice(html) {
    var $h = $('<div>').html(html || ''), $e = $h.find('.woocommerce-error li, .woocommerce-error').first(), $ok = $h.find('.woocommerce-message, .woocommerce-info').first();
    if ($e.length) return { kind: 'err', text: $.trim($e.text()) };
    if ($ok.length) return { kind: 'ok', text: $.trim($ok.text()) };
    return { kind: 'err', text: '' };
  }
  function busy(on, $btn, text) {
    cBusy = on; $btn.prop('disabled', on).toggleClass('is-busy', on).attr('aria-busy', on ? 'true' : null);
    if (text) $btn.text(text);
  }
  function applyCoupon() {
    var $in = $('#econur_coupon_code'), $btn = $('.econur-coupon-btn'), code = $.trim($in.val() || '');
    if (cBusy) return;
    if (!code) { cMsg('কুপন কোড লিখুন', 'err'); $in.trigger('focus'); return; }
    if (!P.apply_coupon_nonce) { cMsg('দুঃখিত, এখন কুপন প্রয়োগ করা যাচ্ছে না। পাতাটি আবার লোড করুন।', 'err'); return; }
    busy(true, $btn, 'প্রয়োগ হচ্ছে...'); cMsg('');
    $.ajax({ type: 'POST', url: wcAjax('apply_coupon'), dataType: 'html',
      data: { security: P.apply_coupon_nonce, coupon_code: code } })
      .done(function (html) {
        var n = notice(html);
        if (n.kind === 'ok') { cMsg(n.text || 'কুপন সফলভাবে প্রয়োগ হয়েছে', 'ok'); $in.val(''); $(document.body).trigger('applied_coupon_in_checkout', [code]); }
        else cMsg(n.text || 'কুপন কোডটি সঠিক নয়।', 'err');
        $(document.body).trigger('update_checkout', { update_shipping_method: false });
      })
      .fail(function () { cMsg('দুঃখিত, এখন কুপন প্রয়োগ করা যায়নি। আবার চেষ্টা করুন।', 'err'); })
      .always(function () { busy(false, $btn, $btn.data('label')); });
  }
  $form.on('click', '.econur-coupon-btn', function (e) { e.preventDefault(); applyCoupon(); });
  // Enter in the coupon field applies the code; it never sends the order
  $form.on('keydown', '#econur_coupon_code', function (e) { if (e.key === 'Enter' || e.keyCode === 13) { e.preventDefault(); applyCoupon(); } });
  $form.on('input', '#econur_coupon_code', function () { if ($('#econur_coupon_msg').hasClass('is-err')) cMsg(''); });
  $form.on('click', '.econur-coupon-rm', function (e) {
    e.preventDefault();
    var $b = $(this), code = $b.data('coupon');
    if (cBusy || !code) return;
    busy(true, $b); cMsg('');
    $.ajax({ type: 'POST', url: wcAjax('remove_coupon'), dataType: 'html', data: { security: P.remove_coupon_nonce, coupon: code } })
      .done(function (html) {
        var n = notice(html);
        cMsg(n.text || 'কুপন সরানো হয়েছে।', n.kind);
        $(document.body).trigger('removed_coupon_in_checkout', [code]).trigger('update_checkout', { update_shipping_method: false });
      })
      .fail(function () { cMsg('দুঃখিত, কুপনটি সরানো যায়নি। আবার চেষ্টা করুন।', 'err'); })
      .always(function () { busy(false, $b); setTimeout(function () { $('#econur_coupon_code').trigger('focus'); }, 0); });
  });
})(window.jQuery);
