/* ECONUR sign-in / create-account page 1.1 (templates/econur-login.php)
   Show / hide passwords, short checks for empty or mistyped fields, and one submission at a time. Signing in and
   creating the account are WooCommerce's own (the form posts to the page; WordPress and WooCommerce check everything
   again on the server). On the create-account form WooCommerce's password strength meter may hold the button. */
(function () {
  'use strict';
  var form = document.querySelector('.econur-login-form');
  if (!form) return;
  var isReg = form.classList.contains('econur-register-form');

  /* ---------- password visibility (every eye button on the form) ---------- */
  [].slice.call(form.querySelectorAll('[data-econur-eye]')).forEach(function (eye) {
    var pass = document.getElementById(eye.getAttribute('aria-controls'));
    if (!pass) return;
    eye.addEventListener('click', function () {
      var show = pass.type === 'password';
      pass.type = show ? 'text' : 'password';
      eye.setAttribute('aria-pressed', show ? 'true' : 'false');
      eye.setAttribute('aria-label', show ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন');
      eye.querySelector('.econur-login-eye-show').hidden = show;
      eye.querySelector('.econur-login-eye-hide').hidden = !show;
      pass.focus({ preventScroll: true });
    });
  });

  /* ---------- checks before sending ---------- */
  function fieldErr(input, msg) {
    var e = document.getElementById(input.id + '_err');
    if (e) { e.textContent = msg || ''; e.hidden = !msg; }
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }
  var $ = function (id) { return document.getElementById(id); };
  var checks = isReg ? [
    [$('econur_reg_name'), function (v) { return v.trim() ? '' : 'আপনার নাম লিখুন।'; }],
    [$('reg_email'), function (v) { v = v.trim(); return !v ? 'আপনার ইমেইল লিখুন।' : (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'সঠিক ইমেইল ঠিকানা লিখুন।'); }],
    [$('reg_password'), function (v) { return v ? '' : 'একটি পাসওয়ার্ড তৈরি করুন।'; }],
    [$('econur_reg_password2'), function (v) { var p = $('reg_password'); return !v ? 'পাসওয়ার্ডটি আবার লিখুন।' : (p && v !== p.value ? 'পাসওয়ার্ড দুটি মিলছে না।' : ''); }]
  ] : [
    [$('econur_login_user'), function (v) { return v.trim() ? '' : 'ইমেইল বা ইউজারনেম লিখুন।'; }],
    [$('econur_login_pass'), function (v) { return v ? '' : 'পাসওয়ার্ড লিখুন।'; }]
  ];
  checks = checks.filter(function (c) { return c[0]; });
  // a field's message clears as soon as it is fixed
  checks.forEach(function (c) {
    c[0].addEventListener('input', function () { if (c[0].getAttribute('aria-invalid') === 'true' && !c[1](c[0].value)) fieldErr(c[0], ''); });
  });

  var btn = form.querySelector('.econur-login-submit'), busy = false;
  form.addEventListener('submit', function (e) {
    if (busy) { e.preventDefault(); return; }
    var first = null;
    checks.forEach(function (c) { var m = c[1](c[0].value); fieldErr(c[0], m); if (m && !first) first = c[0]; });
    if (first) { e.preventDefault(); first.focus(); return; }
    busy = true;
    // the server reads the hidden "login" / "register" field, so the button can be disabled right away
    setTimeout(function () { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.textContent = btn.getAttribute('data-busy') || btn.textContent; }, 0);
  });
  // back / forward cache: the button is usable again
  window.addEventListener('pageshow', function (ev) {
    if (!ev.persisted || !btn) return;
    busy = false; btn.disabled = false; btn.removeAttribute('aria-busy'); btn.textContent = btn.getAttribute('data-label') || btn.textContent;
  });
})();
