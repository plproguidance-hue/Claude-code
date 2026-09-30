/* ECONUR "Good to know" accordion: one answer open at a time; the open one can be closed again. No dependencies. */
(function () {
  function init(acc) {
    var items = [].slice.call(acc.querySelectorAll('.ehc-item'));
    function set(item, open) {
      item.classList.toggle('is-open', open);
      item.querySelector('.ehc-q button').setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    items.forEach(function (item) {
      item.querySelector('.ehc-q button').addEventListener('click', function () {
        var open = !item.classList.contains('is-open');
        items.forEach(function (other) { if (other !== item) set(other, false); });
        set(item, open);
      });
    });
    // every page view starts with the first answer open, also when the browser restores the page from its
    // back/forward cache
    function reset() { items.forEach(function (item, k) { set(item, k === 0); }); }
    window.addEventListener('pageshow', function (e) { if (e.persisted) reset(); });
    reset();
  }
  function start() { [].forEach.call(document.querySelectorAll('.ehc-acc'), init); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
