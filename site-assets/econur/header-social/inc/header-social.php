<?php
/**
 * Econur header social links: Facebook, Instagram, TikTok in the empty space to the right of the desktop
 * header's Search / Account / Cart icons. Printed through Astra's desktop header column hook, so it appears on
 * every page with the main header; the mobile header uses its own hook and never gets it.
 * The group sits outside the header grid (absolute, just past the Cart icon), so the logo, the navigation and the
 * Search / Account / Cart icons keep their exact positions. The circles are centred in the free strip between the Cart
 * icon and the screen edge, and shown only when that strip fits the whole group (a small script measures it; the
 * product pages use a wider header than the homepage), so they never overlap anything or cause sideways scrolling.
 * Style: the footer's social circles (42px soft sage circle, teal 18px icon).
 *
 * URLs: Facebook and Instagram are the ones the footer already uses (econur_footer_config()).
 * TikTok: set the real profile URL in the option "econur_social_tiktok_url" (or the econur_social_tiktok_url filter);
 * until then the TikTok icon is not printed, so the header never links to a placeholder.
 */
defined('ABSPATH') || exit;

function econur_header_social_links() {
    $urls = array();
    if (function_exists('econur_footer_config')) {
        foreach (econur_footer_config()['social'] as $s) $urls[$s[0]] = $s[2];
    }
    $tiktok = trim((string) apply_filters('econur_social_tiktok_url', get_option('econur_social_tiktok_url', '')));
    $links = array(
        array('facebook',  'ECONUR on Facebook',  $urls['facebook'] ?? ''),
        array('instagram', 'ECONUR on Instagram', $urls['instagram'] ?? ''),
        array('tiktok',    'ECONUR on TikTok',    $tiktok),
    );
    return array_filter($links, function ($l) { return '' !== $l[2]; });
}

// the footer's Facebook "f" and Instagram outline, plus the TikTok note in the same weight (24px grid, currentColor)
function econur_header_social_icon($n) {
    $p = array(
        'facebook'  => '<path fill="currentColor" d="M13.6 21v-7.7h2.6l.4-3h-3V8.4c0-.9.3-1.5 1.5-1.5h1.6V4.2c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.9v3h2.6V21h3.1Z"/>',
        'instagram' => '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/></g><circle cx="17.2" cy="6.8" r="1" fill="currentColor"/>',
        'tiktok'    => '<path fill="currentColor" d="M16.6 3c.3 2.2 1.6 3.6 3.9 3.8v2.6c-1.3.1-2.6-.3-3.9-1.1v5.1c0 3.3-2.3 5.6-5.4 5.6S5.8 16.8 5.8 14c0-3.1 2.6-5.4 5.9-5v2.7c-1.5-.4-3.1.5-3.1 2.2 0 1.3 1 2.3 2.4 2.3 1.6 0 2.6-1 2.6-2.9V3h3Z"/>',
    );
    return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">' . $p[$n] . '</svg>';
}

add_action('astra_render_header_column', function ($row, $column) {
    if ('primary' !== $row || 'right' !== $column) return;
    $links = econur_header_social_links();
    if (!$links) return;
    echo '<ul class="ecn-hsocial">';
    foreach ($links as $l) {
        echo '<li><a class="ecn-hsocial-' . esc_attr($l[0]) . '" href="' . esc_url($l[2]) . '" target="_blank" rel="noopener noreferrer" aria-label="' . esc_attr($l[1]) . '">'
            . econur_header_social_icon($l[0]) . '</a></li>';
    }
    echo '</ul>';
}, 20, 2);

add_action('wp_head', function () {
    ?>
<style id="econur-hsocial-css">
/* hidden until the script confirms the free strip right of Cart fits the group (desktop header, 1024px and up) */
.ecn-hsocial{ display:none; }
@media (min-width:1024px){
  #ast-desktop-header .site-header-primary-section-right{ position:relative; }
  /* the list spans the free strip between the Cart icon and the screen edge (width set by the script) and centres the circles in it */
  #ast-desktop-header .ecn-hsocial.is-fit{ position:absolute; left:100%; top:0; bottom:0; display:flex; align-items:center; justify-content:center; gap:12px; margin:0; padding:0; list-style:none; }
  .ecn-hsocial li{ margin:0; padding:0; list-style:none; line-height:0; }
  /* same soft sage circle and teal icon as the footer's social links */
  .ecn-hsocial a{ display:grid; place-items:center; width:42px; height:42px; border-radius:50%; background:#E3E9DD; color:#0D585F !important; text-decoration:none;
    transition:background-color .2s ease, color .2s ease, transform .2s ease; }
  .ecn-hsocial a:hover, .ecn-hsocial a:focus-visible{ background:#D6E0CE; color:#0A474D !important; transform:translateY(-1px); }
  .ecn-hsocial svg{ display:block; width:18px; height:18px; }
}
@media (prefers-reduced-motion:reduce){ .ecn-hsocial a, .ecn-hsocial a:hover{ transform:none; } }
</style>
    <?php
}, 130);

add_action('wp_footer', function () {
    ?>
<script id="econur-hsocial-js">
(function () {
  var g = document.querySelector('#ast-desktop-header .ecn-hsocial');
  if (!g || !window.matchMedia) return;
  var desk = matchMedia('(min-width: 1024px)'), queued = false;
  function fit() {
    queued = false;
    var n = g.children.length, need = n * 42 + (n - 1) * 12 + 2 * 16; // circles + gaps + at least 16px clear on both sides
    var room = Math.floor(document.documentElement.clientWidth - g.parentNode.getBoundingClientRect().right);
    var ok = desk.matches && room >= need;
    g.style.width = ok ? room + 'px' : '';
    g.classList.toggle('is-fit', ok);
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(fit); } }
  window.addEventListener('resize', queue);
  fit();
})();
</script>
    <?php
}, 20);
