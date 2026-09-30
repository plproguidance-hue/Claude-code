/* ECONUR footer: on phones Shop / Help / Order & Support open and close independently; all start closed. No dependencies. */
(function () {
  function init(footer) {
    [].forEach.call(footer.querySelectorAll('.ecnf-col'), function (col) {
      var btn = col.querySelector('.ecnf-h--toggle button');
      if (!btn) return;
      btn.addEventListener('click', function () {
        var open = !col.classList.contains('is-open');
        col.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  }
  function start() { [].forEach.call(document.querySelectorAll('.ecnf'), init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
