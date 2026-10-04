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
    if (count($msgs) < 2) return econur_top_announce_wa() . $html . econur_top_announce_social();
    $out = '';
    foreach ($msgs as $i => $msg) {
        $msg  = rtrim($msg, '।.');
        $lang = function_exists('econur_bn_attr') ? econur_bn_attr($msg) : '';
        $out .= '<span class="ecn-ab-msg' . (0 === $i ? ' is-on' : '') . '"' . $lang . '>' . esc_html($msg) . '</span>';
    }
    $out .= '<span class="ecn-ab-msg ecn-ab-msg--wa">' . econur_top_announce_wa_link('WhatsApp ' . ECONUR_TOP_WA_DISPLAY) . '</span>';
    return econur_top_announce_wa() . '<span class="ecn-ab-track">' . $out . '</span>' . econur_top_announce_social();
}

/* WhatsApp number in the bar (Oct 2026): at the left edge of the bar on tablets and desktop, lined up with the logo;
   on phones it joins the rotating messages instead, so the bar stays one short line. Only <span class> and <a href>
   are used because product pages print the bar through wp_kses (inc/product-pdp.php). */
const ECONUR_TOP_WA_NUMBER  = '8801410753555';
const ECONUR_TOP_WA_DISPLAY = '+880 1410-753555';
function econur_top_announce_wa_link($label) {
    return '<a href="' . esc_url('https://wa.me/' . ECONUR_TOP_WA_NUMBER) . '">' . esc_html($label) . '</a>';
}
function econur_top_announce_wa() {
    return '<span class="ecn-ab-wa">' . econur_top_announce_wa_link(ECONUR_TOP_WA_DISPLAY) . '</span>';
}

/* Facebook / Instagram / TikTok at the right edge of the bar (tablet and desktop). They moved here from the desktop header
   (inc/header-social.php skips the header copy on pages that show this bar); phones keep them in the menu.
   Icons are CSS masks and the names are visually hidden text, so the markup survives wp_kses on product pages. */
function econur_top_announce_social() {
    if (!function_exists('econur_header_social_links')) return '';
    $names = array('facebook' => 'Facebook', 'instagram' => 'Instagram', 'tiktok' => 'TikTok');
    $o = '';
    foreach (econur_header_social_links() as $l) {
        $o .= '<span class="ecn-ab-so-i ecn-ab-so--' . esc_attr($l[0]) . '">'
            . ('' === $l[2] ? '' : '<a href="' . esc_url($l[2]) . '"><span class="ecn-ab-sr">Econur on ' . esc_html($names[$l[0]] ?? $l[0]) . '</span></a>')
            . '</span>';
    }
    return $o ? '<span class="ecn-ab-so">' . $o . '</span>' : '';
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
html body .ecn.ecn-announce.ecn-announce--top:not(#ecn-ab){ display:block; box-sizing:border-box; min-height:42px; padding:11px 16px !important; overflow:hidden;
  font-size:14px !important; font-weight:600; line-height:20px !important; letter-spacing:0; text-align:center; white-space:nowrap; }
html body .ecn.ecn-announce--top .ecn-ab-track{ display:inline-grid; vertical-align:top; max-width:100%; }
html body .ecn.ecn-announce--top .ecn-ab-msg{ grid-area:1 / 1; justify-self:center; min-width:0; max-width:100%; overflow:hidden; text-overflow:ellipsis; font-weight:600; opacity:0;
  transition:opacity .4s ease-in-out; }
html body .ecn.ecn-announce--top .ecn-ab-msg.is-on{ opacity:1; transition:opacity .4s ease-in-out .4s; }
/* the truck icon travels with each message, so it stays next to the text and fades with it */
html body .ecn.ecn-announce--top:has(.ecn-ab-track)::before{ display:none; }
html body .ecn.ecn-announce--top .ecn-ab-msg::before{ content:""; display:inline-block; width:15px; height:15px; margin:0 7px 0 0; vertical-align:-3px; background-color:currentColor;
  -webkit-mask:var(--ecn-i-truck) center/contain no-repeat; mask:var(--ecn-i-truck) center/contain no-repeat; }
/* WhatsApp number: left edge, lined up with the header logo (header content is 1376px wide at most, 16/24/32px side gaps) */
html body .ecn.ecn-announce--top{ position:relative; --ecn-i-wa:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.56.12-.16.25-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.12-1.04-.38-1.99-1.23-.73-.66-1.23-1.47-1.37-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.16 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.46-.6 1.67-1.18.21-.58.21-1.08.14-1.18-.06-.1-.22-.16-.47-.28Z'/%3E%3C/svg%3E"); --ecn-ab-gap:16px; }
html body .ecn.ecn-announce--top .ecn-ab-wa{ position:absolute; top:50%; left:max(var(--ecn-ab-gap), calc((100% - 1376px) / 2)); transform:translateY(-50%); line-height:20px; }
html body .ecn.ecn-announce--top .ecn-ab-wa a, html body .ecn.ecn-announce--top .ecn-ab-msg--wa a{ display:inline-flex; align-items:center; gap:7px; color:inherit !important; font-weight:600; text-decoration:none !important; font-variant-numeric:tabular-nums; letter-spacing:.01em; }
html body .ecn.ecn-announce--top .ecn-ab-wa a::before, html body .ecn.ecn-announce--top .ecn-ab-msg--wa a::before{ content:""; flex:none; width:16px; height:16px; background-color:currentColor;
  -webkit-mask:var(--ecn-i-wa) center/contain no-repeat; mask:var(--ecn-i-wa) center/contain no-repeat; }
html body .ecn.ecn-announce--top .ecn-ab-msg--wa::before{ display:none !important; }
html body .ecn.ecn-announce--top .ecn-ab-wa a:hover, html body .ecn.ecn-announce--top .ecn-ab-msg--wa a:hover{ text-decoration:underline !important; text-underline-offset:3px; }
html body .ecn.ecn-announce--top .ecn-ab-wa a:focus-visible, html body .ecn.ecn-announce--top .ecn-ab-msg--wa a:focus-visible{ outline:2px solid currentColor; outline-offset:2px; border-radius:2px; }
/* social icons: right edge, lined up with the header's right edge */
html body .ecn.ecn-announce--top .ecn-ab-so{ position:absolute; top:50%; right:max(var(--ecn-ab-gap), calc((100% - 1376px) / 2)); transform:translateY(-50%); display:flex; align-items:center; gap:8px; line-height:0; }
/* solid white circles with brand-teal icons, so they read clearly on the teal bar */
html body .ecn.ecn-announce--top .ecn-ab-so-i{ position:relative; display:block; width:30px; height:30px; border-radius:50%; background:#FFFFFF; box-shadow:0 1px 2px rgba(0,0,0,.12); transition:background-color .2s ease, transform .2s ease; }
html body .ecn.ecn-announce--top .ecn-ab-so-i::before{ content:""; position:absolute; inset:0; margin:auto; width:16px; height:16px; background-color:#0D585F; pointer-events:none;
  -webkit-mask:var(--ecn-so) center/contain no-repeat; mask:var(--ecn-so) center/contain no-repeat; }
html body .ecn.ecn-announce--top .ecn-ab-so-i a{ position:absolute; inset:-5px; border-radius:50%; color:inherit !important; }
html body .ecn.ecn-announce--top .ecn-ab-so-i:has(a:hover), html body .ecn.ecn-announce--top .ecn-ab-so-i:has(a:focus-visible){ background:#E3F1EE; transform:translateY(-1px); }
html body .ecn.ecn-announce--top .ecn-ab-so-i a{ color:#fff !important; }
html body .ecn.ecn-announce--top .ecn-ab-so-i a:focus-visible{ outline:2px solid #fff; outline-offset:-2px; }
@media (prefers-reduced-motion:reduce){ html body .ecn.ecn-announce--top .ecn-ab-so-i{ transition:none; } html body .ecn.ecn-announce--top .ecn-ab-so-i:has(a:hover){ transform:none; } }
html body .ecn.ecn-announce--top .ecn-ab-sr{ position:absolute !important; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
html body .ecn.ecn-announce--top .ecn-ab-so--facebook{ --ecn-so:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M13.6 21v-7.7h2.6l.4-3h-3V8.4c0-.9.3-1.5 1.5-1.5h1.6V4.2c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.9v3h2.6V21h3.1Z'/%3E%3C/svg%3E"); }
html body .ecn.ecn-announce--top .ecn-ab-so--instagram{ --ecn-so:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cg fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3.5' y='3.5' width='17' height='17' rx='5'/%3E%3Ccircle cx='12' cy='12' r='4'/%3E%3C/g%3E%3Ccircle cx='17.2' cy='6.8' r='1.1'/%3E%3C/svg%3E"); }
html body .ecn.ecn-announce--top .ecn-ab-so--tiktok{ --ecn-so:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M16.6 3c.3 2.2 1.6 3.6 3.9 3.8v2.6c-1.3.1-2.6-.3-3.9-1.1v5.1c0 3.3-2.3 5.6-5.4 5.6S5.8 16.8 5.8 14c0-3.1 2.6-5.4 5.9-5v2.7c-1.5-.4-3.1.5-3.1 2.2 0 1.3 1 2.3 2.4 2.3 1.6 0 2.6-1 2.6-2.9V3h3Z'/%3E%3C/svg%3E"); }
@media (min-width:768px){ html body .ecn.ecn-announce--top .ecn-ab-msg--wa{ display:none; } }
@media (min-width:1024px){ html body .ecn.ecn-announce--top{ --ecn-ab-gap:24px; } }
@media (min-width:1280px){ html body .ecn.ecn-announce--top{ --ecn-ab-gap:32px; } }
@media (max-width:767px){
  html body .ecn.ecn-announce.ecn-announce--top:not(#ecn-ab){ min-height:38px; padding:9px 12px !important; font-size:13px !important; }
  html body .ecn.ecn-announce--top :is(.ecn-ab-wa, .ecn-ab-so){ display:none; }
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
  var DS = document.body && document.body.classList.contains('ecn-ds'); // visual system 2 (inc/econur-ds.php): a calmer ~4s line, 300ms crossfade
  var HOLD = DS ? 3800 : 2500, FADE = DS ? 300 : 400; // on screen ~2.5s, then 400ms out and 400ms in (see the CSS transitions)
  function start() {
    var bar = document.querySelector('.ecn-announce--top');
    if (!bar) return;
    [].forEach.call(bar.querySelectorAll('a[href^="https://wa.me/"]'), function (a) { a.target = '_blank'; a.rel = 'noopener'; a.setAttribute('aria-label', 'WhatsApp ' + a.textContent.replace(/^WhatsApp\s*/, '')); });
    [].forEach.call(bar.querySelectorAll('.ecn-ab-so a'), function (a) { a.target = '_blank'; a.rel = 'noopener noreferrer'; });
    var all = bar.querySelectorAll('.ecn-ab-msg');
    if (all.length < 2) return;
    // the WhatsApp message only rotates on phones (on wider screens the number sits at the left instead)
    function shown() { return [].filter.call(all, function (m) { return getComputedStyle(m).display !== 'none'; }); }
    var timer = null, paused = false;
    function next() {
      if (paused || document.hidden) return;
      var msgs = shown();
      if (msgs.length < 2) return;
      var cur = bar.querySelector('.ecn-ab-msg.is-on'), i = msgs.indexOf(cur);
      if (cur) cur.classList.remove('is-on');
      msgs[(i + 1) % msgs.length].classList.add('is-on');
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
