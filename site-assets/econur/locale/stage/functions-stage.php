<?php
/**
 * STAGING ONLY (?ecn_bn=1): the Bangla localization pass, loaded from wp-content/themes/econur/stage-bn/ instead of the
 * live files. Live visitors never reach this file. Removed after go-live.
 */
if (!defined('DONOTCACHEPAGE')) define('DONOTCACHEPAGE', true);
add_filter('stylesheet_directory_uri', function ($u) { return $u . '/stage-bn'; });
add_filter('wc_get_template_part', function ($t, $slug, $name) {
    if ('content' === $slug && 'product' === $name && file_exists(__DIR__ . '/woocommerce/content-product.php')) return __DIR__ . '/woocommerce/content-product.php';
    return $t;
}, 30, 3);
// homepage Elementor data (announcement + "Shop all") and the saved hero / sale settings, as they will be after go-live
add_filter('get_post_metadata', function ($v, $id, $key) {
    if (43 !== (int) $id) return $v;
    if ('_elementor_data' === $key && file_exists(__DIR__ . '/post-43.json')) return array(file_get_contents(__DIR__ . '/post-43.json'));
    if ('_elementor_element_cache' === $key) return array('');
    return $v;
}, 5, 3);
add_filter('option_econur_hero_slides', function ($slides) {
    if (!is_array($slides)) return $slides;
    foreach ($slides as $i => $sl) { if (!empty($sl['cta'])) $slides[$i]['cta'] = ('Shop Face Care' === $sl['cta']) ? 'ফেস কেয়ার দেখুন' : (0 === strpos($sl['cta'], 'Explore') ? 'পণ্যটি দেখুন' : $sl['cta']); }
    return $slides;
});
add_filter('option_econur_sale_featured', function ($o) {
    if (!is_array($o)) return $o;
    if (isset($o['eyebrow']) && 'Limited-time offer' === $o['eyebrow']) $o['eyebrow'] = 'সীমিত সময়ের অফার';
    if (isset($o['cta_text']) && 'Shop the Sale' === $o['cta_text']) $o['cta_text'] = 'অফারের পণ্য দেখুন';
    if (isset($o['fp_sub']) && 'Hand-picked bars, ready to ship with cash on delivery.' === $o['fp_sub']) $o['fp_sub'] = 'বাছাই করা বার, ক্যাশ অন ডেলিভারিতে পাঠানোর জন্য প্রস্তুত।';
    return $o;
});
/**
 * Econur child theme (Astra). Design system: Econur Earth.
 */
add_action('wp_enqueue_scripts', function () {
    $deps = array('astra-theme-css');
    foreach (array('elementor-frontend', 'elementor-post-43', 'elementor-post-5') as $h) {
        if (wp_style_is($h, 'registered') || wp_style_is($h, 'enqueued')) $deps[] = $h;
    }
    wp_enqueue_style('econur-child', get_stylesheet_uri(), $deps, wp_get_theme()->get('Version'));
}, 999);
require_once __DIR__ . '/inc/econur-locale.php'; // Bangla type + helpers, Bangla product copy (<key>_bn meta), price format ৳280
require_once __DIR__ . '/inc/product-pdp.php'; // product landing page v7 (v6.2 kept as inc/product-pdp.php.bak-6.2.0, v5 in inc/product-page.php)
require_once __DIR__ . '/inc/product-cards.php';
require_once __DIR__ . '/inc/hero-slider.php';
require_once __DIR__ . '/inc/shop-archive.php';
require_once __DIR__ . '/inc/trust.php';
require_once __DIR__ . '/inc/finder.php';
// Disabled 2026-09-30: the homepage section now comes from the ECONUR Reviews plugin (wp-content/plugins/econur-reviews).
// To restore the old section, uncomment the next line and set the option econur_reviews_active to 'no'.
// require_once __DIR__ . '/inc/reviews.php';
require_once __DIR__ . '/inc/sale-featured.php';
require_once __DIR__ . '/inc/announce-bar.php';
require_once __DIR__ . '/inc/help-cta.php';
require_once __DIR__ . '/inc/site-footer.php';
require_once __DIR__ . '/inc/mobile-home.php';

// econur-logo-painted-width: the official ECONUR logo (29 Sep 2026) keeps transparent space around the wordmark, so the header
// paints it about 10% wider than the logo box (Astra logo width 158 / 134 / 120 px). Describe that width so browsers fetch a sharp copy.
add_filter('wp_get_attachment_image_attributes', function ($attr) {
    if (!empty($attr['class']) && false !== strpos($attr['class'], 'custom-logo')) {
        $attr['sizes'] = '(max-width: 544px) 133px, (max-width: 921px) 148px, 175px';
    }
    return $attr;
});

// Header account icon (desktop and mobile): open the WooCommerce My Account page (sign-in / register when logged out, the
// customer dashboard when logged in) instead of wp-login.php. The page is looked up at runtime, so a changed slug still works.
function econur_account_link_option($value) {
    if (!function_exists('wc_get_page_id')) return $value;
    $page = wc_get_page_id('myaccount');
    if ($page <= 0 || 'publish' !== get_post_status($page)) return $value;
    $value = is_array($value) ? $value : array();
    $value['url'] = get_permalink($page);
    $value['new_tab'] = false;
    if (!isset($value['link_rel'])) $value['link_rel'] = '';
    return $value;
}
add_filter('astra_get_option_header-account-logout-link', 'econur_account_link_option');
add_filter('astra_get_option_header-account-login-link', 'econur_account_link_option');
