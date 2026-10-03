/* ECONUR customer login page 1.0 (templates/econur-login.php)
   Show / hide the password, a short check for empty fields, and one submission at a time. The sign-in itself is
   WooCommerce's (the form posts to the page and WordPress checks the password on the server). */
(function () {
  'use strict';
  var form = document.querySelector('.econur-login-form');
  if (!form) return;

  /* ---------- password visibility ---------- */
  var eye = form.querySelector('[data-econur-eye]'), pass = document.getElementById('econur_login_pass');
  if (eye && pass) eye.addEventListener('click', function () {
    var show = pass.type === 'password';
    pass.type = show ? 'text' : 'password';
    eye.setAttribute('aria-pressed', show ? 'true' : 'false');
    eye.setAttribute('aria-label', show ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন');
    eye.querySelector('.econur-login-eye-show').hidden = show;
    eye.querySelector('.econur-login-eye-hide').hidden = !show;
    pass.focus({ preventScroll: true });
  });

  /* ---------- empty fields, one submission ---------- */
  var btn = form.querySelector('.econur-login-submit'), busy = false;
  function fieldErr(input, msg) {
    var e = document.getElementById(input.id + '_err');
    if (e) { e.textContent = msg || ''; e.hidden = !msg; }
    if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }
  var user = document.getElementById('econur_login_user');
  [user, pass].forEach(function (i) { if (i) i.addEventListener('input', function () { if (i.value.trim()) fieldErr(i, ''); }); });
  form.addEventListener('submit', function (e) {
    if (busy) { e.preventDefault(); return; }
    var first = null;
    if (user && !user.value.trim()) { fieldErr(user, 'ইমেইল বা ইউজারনেম লিখুন।'); first = first || user; }
    if (pass && !pass.value) { fieldErr(pass, 'পাসওয়ার্ড লিখুন।'); first = first || pass; }
    if (first) { e.preventDefault(); first.focus(); return; }
    busy = true;
    // the server reads the hidden "login" field, so the button can be disabled right away
    setTimeout(function () { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); btn.textContent = 'সাইন ইন হচ্ছে...'; }, 0);
  });
  // back / forward cache: the button is usable again
  window.addEventListener('pageshow', function (ev) {
    if (!ev.persisted || !btn) return;
    busy = false; btn.disabled = false; btn.removeAttribute('aria-busy'); btn.textContent = btn.getAttribute('data-label') || btn.textContent;
  });
})();
