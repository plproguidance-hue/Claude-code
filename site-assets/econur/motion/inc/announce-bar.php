<?php
/**
 * Econur announcement bar above the Astra header (front page here; product pages print the same bar from product-pdp.php).
 * Order: announcement bar -> main header -> page content.
 * Text is read from the existing Elementor HTML widget (page 43, widget 74bf20f),
 * so it can still be edited in Elementor. The in-content copy is hidden via style.css (patch 8).
 *
 * Rotation (1.1): each sentence of that text is one message. The messages sit on top of each other in one line box,
 * so the bar keeps its height and width; one is shown at a time and they swap with a soft fade
 * (about 2.5s on screen, 400ms out, then 400ms in). Without JavaScript the first message stays. Screen readers read
 * every message (the hidden ones are transparent, not removed).
 * Reduced motion: the messages swap without the fade.
 */
defined('ABSPATH') || exit;

function econur_top_announce_html() {
    $fallback = '<strong>সারা দেশে ক্যাশ অন ডেলিভারি।</strong> অর্ডার নিশ্চিত করতে 12 ঘণ্টার মধ্যে আমরা ফোন করি।';
    $html     = $fallback;
    $page_id  = (int) get_option('page_on_front');
    $data     = $page_id ? json_decode((string) get_post_meta($page_id, '_elementor_data', true), true) : null;
    if (is_array($data)) {
        $found = null;
        $walk = function ($els) use (&$walk, &$found) {
            foreach ((array) $els as $el) {
                if ($found !== null) return;
                if (($el['id'] ?? '') === '74bf20f' && !empty($el['settings']['html'])) { $found = $el['settings']['html']; return; }
                if (!empty($el['elements'])) $walk($el['elements']);
            }
        };
        $walk($data);
        if ($found !== null && preg_match('/<div[^>]*ecn-announce[^>]*>(.*)<\/div>/s', $found, $m)) $html = $m[1];
    }
    return econur_top_announce_messages($html);
}

// "<strong>A।</strong> B।" -> one <span class="ecn-ab-msg"> per sentence, the first one showing
function econur_top_announce_messages($html) {
    $text = trim(preg_replace('/\s+/u', ' ', wp_strip_all_tags($html)));
    $msgs = array_values(array_filter(array_map('trim', preg_split('/(?<=[।.!?])\s+/u', $text))));
    if (count($msgs) < 2) return $html;
    $out = '';
    foreach ($msgs as $i => $msg) {
        $msg  = rtrim($msg, '।.');
        $lang = function_exists('econur_bn_attr') ? econur_bn_attr($msg) : '';
        $out .= '<span class="ecn-ab-msg' . (0 === $i ? ' is-on' : '') . '"' . $lang . '>' . esc_html($msg) . '</span>';
    }
    return '<span class="ecn-ab-track">' . $out . '</span>';
}

function econur_top_announce_shown() {
    return is_front_page() || (function_exists('is_product') && is_product());
}

add_action('astra_header_before', function () {
    if (!is_front_page()) return;
    $html = econur_top_announce_html();
    echo '<div class="ecn ecn-announce ecn-announce--top"' . (function_exists('econur_bn_attr') ? econur_bn_attr($html) : '') . ' role="region" aria-label="Store notice">'
        . wp_kses($html, array('strong' => array(), 'b' => array(), 'a' => array('href' => array()), 'span' => array('class' => array(), 'lang' => array())))
        . '</div>';
}, 5);

// printed after the theme, Customizer and econur-ui.css (priority 120), so the bar's own size rules win
add_action('wp_head', function () {
    if (!econur_top_announce_shown()) return;
    ?>
<style id="econur-announce-css">
html body .ecn.ecn-announce.ecn-announce--top:not(#ecn-ab){ display:block; box-sizing:border-box; min-height:36px; padding:8px 16px !important; overflow:hidden;
  font-size:14px !important; font-weight:600; line-height:20px !important; letter-spacing:0; text-align:center; white-space:nowrap; }
html body .ecn.ecn-announce--top .ecn-ab-track{ display:inline-grid; vertical-align:top; max-width:100%; }
html body .ecn.ecn-announce--top .ecn-ab-msg{ grid-area:1 / 1; justify-self:center; min-width:0; max-width:100%; overflow:hidden; text-overflow:ellipsis; font-weight:600; opacity:0;
  transition:opacity .4s ease-in-out; }
html body .ecn.ecn-announce--top .ecn-ab-msg.is-on{ opacity:1; transition:opacity .4s ease-in-out .4s; }
/* the truck icon travels with each message, so it stays next to the text and fades with it */
html body .ecn.ecn-announce--top:has(.ecn-ab-track)::before{ display:none; }
html body .ecn.ecn-announce--top .ecn-ab-msg::before{ content:""; display:inline-block; width:15px; height:15px; margin:0 7px 0 0; vertical-align:-3px; background-color:currentColor;
  -webkit-mask:var(--ecn-i-truck) center/contain no-repeat; mask:var(--ecn-i-truck) center/contain no-repeat; }
@media (max-width:767px){
  html body .ecn.ecn-announce.ecn-announce--top:not(#ecn-ab){ min-height:38px; padding:9px 12px !important; font-size:13px !important; }
}
@media (prefers-reduced-motion:reduce){
  html body .ecn.ecn-announce--top .ecn-ab-msg, html body .ecn.ecn-announce--top .ecn-ab-msg.is-on{ transition:none; }
}
</style>
    <?php
}, 130);

add_action('wp_footer', function () {
    if (!econur_top_announce_shown()) return;
    ?>
<script id="econur-announce-js">
(function () {
  var HOLD = 2500, FADE = 400; // on screen ~2.5s, then 400ms out and 400ms in (see the CSS transitions)
  function start() {
    var bar = document.querySelector('.ecn-announce--top');
    var msgs = bar ? bar.querySelectorAll('.ecn-ab-msg') : [];
    if (msgs.length < 2) return;
    var i = 0, timer = null, paused = false;
    function next() {
      if (paused || document.hidden) return;
      msgs[i].classList.remove('is-on');
      i = (i + 1) % msgs.length;
      msgs[i].classList.add('is-on');
    }
    function run() { clearInterval(timer); timer = setInterval(next, HOLD + 2 * FADE); }
    // pointing at (mouse) or tabbing into the bar holds the current message
    if (window.matchMedia && matchMedia('(hover: hover)').matches) {
      bar.addEventListener('mouseenter', function () { paused = true; });
      bar.addEventListener('mouseleave', function () { paused = false; run(); });
    }
    bar.addEventListener('focusin', function () { paused = true; });
    bar.addEventListener('focusout', function () { paused = false; run(); });
    run();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
</script>
    <?php
}, 20);
