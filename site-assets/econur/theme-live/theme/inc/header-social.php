<?php
/**
 * Econur header social links: Facebook, Instagram, TikTok in the empty space to the right of the desktop
 * header's Search / Account / Cart icons. Printed through Astra's desktop header column hook, so it appears on
 * every page with the main header; the mobile header uses its own hook and never gets it.
 * The group sits outside the header grid (absolute, just past the Cart icon), so the logo, the navigation and the
 * Search / Account / Cart icons keep their exact positions. It is shown only on wide screens (1400px and up) and only
 * when the space right of the Cart icon fits the whole group (a small script measures it; the product pages use a
 * wider header than the homepage), so it never overlaps anything or causes sideways scrolling.
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

// outline brand marks drawn like the header's search / account / bag icons (24px grid, 1.6 stroke, currentColor)
function econur_header_social_icon($n) {
    $p = array(
        'facebook'  => '<path d="M7 10v4h3v7h4v-7h3l1-4h-4V8a1 1 0 0 1 1-1h3V3h-3a5 5 0 0 0-5 5v2H7"/>',
        'instagram' => '<rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="12" cy="12" r="3.6"/><path d="M16.6 7.4v.01"/>',
        'tiktok'    => '<path d="M21 7.9v4a9.9 9.9 0 0 1-5-1.9v4.5a6.5 6.5 0 1 1-8-6.3v4.3a2.5 2.5 0 1 0 4 2V3h4.1A6 6 0 0 0 21 7.9Z"/>',
    );
    return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . $p[$n] . '</svg>';
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
.ecn-hsocial{ display:none; }
@media (min-width:1400px){
  #ast-desktop-header .site-header-primary-section-right{ position:relative; }
  /* 10px past the Cart target puts ~28px between the Cart glyph and the Facebook glyph; 36px targets, ~16px between glyphs */
  #ast-desktop-header .ecn-hsocial.is-fit{ position:absolute; left:100%; top:50%; transform:translateY(-50%); display:flex; align-items:center; gap:0; margin:0 0 0 10px; padding:0; list-style:none; }
  .ecn-hsocial li{ margin:0; padding:0; list-style:none; line-height:0; }
  .ecn-hsocial a{ display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:999px; color:var(--ecn-ink, #2A2823) !important; text-decoration:none; transition:color .2s ease, transform .2s ease; }
  .ecn-hsocial a:hover, .ecn-hsocial a:focus-visible{ color:var(--ecn-teal, #0D585F) !important; transform:translateY(-1px); }
  .ecn-hsocial svg{ display:block; width:20px; height:20px; }
}
@media (prefers-reduced-motion:reduce){ .ecn-hsocial a, .ecn-hsocial a:hover{ transition:color .2s ease; transform:none; } }
</style>
    <?php
}, 130);

add_action('wp_footer', function () {
    ?>
<script id="econur-hsocial-js">
(function () {
  var g = document.querySelector('#ast-desktop-header .ecn-hsocial');
  if (!g || !window.matchMedia) return;
  var wide = matchMedia('(min-width: 1400px)'), queued = false;
  function fit() {
    queued = false;
    var sec = g.parentNode, need = 10 + g.children.length * 36 + 16; // offset from Cart + targets + breathing room to the screen edge
    var room = document.documentElement.clientWidth - sec.getBoundingClientRect().right;
    g.classList.toggle('is-fit', wide.matches && room >= need);
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(fit); } }
  window.addEventListener('resize', queue);
  fit();
})();
</script>
    <?php
}, 20);
