<?php
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
require_once get_stylesheet_directory() . '/inc/econur-locale.php'; // Bangla type + helpers, Bangla product copy (<key>_bn meta), price format ৳280
require_once get_stylesheet_directory() . '/inc/product-pdp.php'; // product landing page v7 (v6.2 kept as inc/product-pdp.php.bak-6.2.0, v5 in inc/product-page.php)
require_once get_stylesheet_directory() . '/inc/product-cards.php';
require_once get_stylesheet_directory() . '/inc/hero-slider.php';
require_once get_stylesheet_directory() . '/inc/shop-archive.php';
require_once get_stylesheet_directory() . '/inc/trust.php';
require_once get_stylesheet_directory() . '/inc/finder.php';
// Disabled 2026-09-30: the homepage section now comes from the ECONUR Reviews plugin (wp-content/plugins/econur-reviews).
// To restore the old section, uncomment the next line and set the option econur_reviews_active to 'no'.
// require_once get_stylesheet_directory() . '/inc/reviews.php';
require_once get_stylesheet_directory() . '/inc/sale-featured.php';
require_once get_stylesheet_directory() . '/inc/announce-bar.php';
require_once get_stylesheet_directory() . '/inc/help-cta.php';
require_once get_stylesheet_directory() . '/inc/site-footer.php';
require_once get_stylesheet_directory() . '/inc/header-social.php'; // Facebook / Instagram / TikTok beside the desktop header icons
require_once get_stylesheet_directory() . '/inc/header-nav.php'; // header styles, sticky header, mobile menu social circles
require_once get_stylesheet_directory() . '/inc/category-trust.php'; // homepage Shop by category + trust panel [econur_category_trust]
require_once get_stylesheet_directory() . '/inc/pdp-accordion.php'; // product page details accordion under the purchase card
require_once get_stylesheet_directory() . '/inc/pdp-love.php'; // product page Why You'll Love This section under the hero
require_once get_stylesheet_directory() . '/inc/motion.php'; // motion tokens, homepage scroll reveal, hover / press feedback
require_once get_stylesheet_directory() . '/inc/mobile-home.php';

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
