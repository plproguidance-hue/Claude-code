<?php
/**
 * ECONUR visual system 2 (assets/econur-ds.css): one set of colours, type sizes, spacing, radii, shadows and buttons
 * laid over the existing sections. It adds no markup and changes no WooCommerce behaviour; every rule is scoped to
 * body.ecn-ds, so it does nothing unless this file adds that class.
 *
 * Until it is approved it runs in PREVIEW only:
 *   - https://econur.shop/?ds_preview=<key> turns it on for that request and remembers it (cookie econur_ds, 7 days)
 *     for a signed-in visitor; ?ds_preview=off turns it off. The key is the option econur_ds_preview_key.
 *   - a signed-in visitor with the cookie sees it on every page (signed-in pages are never page-cached);
 *   - any request carrying ?ds_preview=<key> sees it (used for screenshots and checks); such pages are not cached.
 * Everyone else gets the current design. Going live later = option econur_ds_mode = "live" (no code change).
 */
defined('ABSPATH') || exit;

const ECONUR_DS_VER = '0.1.0';

function econur_ds_key() {
    $k = (string) get_option('econur_ds_preview_key');
    if ('' === $k) {
        $k = wp_generate_password(20, false);
        update_option('econur_ds_preview_key', $k, false);
    }
    return $k;
}
function econur_ds_live() { return 'live' === get_option('econur_ds_mode'); }
// product pages keep the previous design for everyone unless the option econur_ds_pdp is "on"; ?ds_preview=<key> still shows the new one
function econur_ds_pdp_held() {
    return 'on' !== get_option('econur_ds_pdp') && function_exists('is_product') && is_product();
}
// true when the new design is live for this page (not only previewed)
function econur_ds_live_here() { return econur_ds_live() && !econur_ds_pdp_held(); }
// true when this request shows the new design
function econur_ds_active() {
    static $on = null;
    if (null !== $on) return $on;
    if (!did_action('wp')) return econur_ds_live(); // the page type is not known yet: answer, but do not remember
    if (econur_ds_live_here()) return $on = true;
    $key = econur_ds_key();
    $q = isset($_GET['ds_preview']) ? (string) wp_unslash($_GET['ds_preview']) : null; // phpcs:ignore WordPress.Security.NonceVerification
    if (null !== $q) {
        if ('off' === $q) return $on = false;
        if (hash_equals($key, $q)) return $on = true;
    }
    return $on = isset($_COOKIE['econur_ds']) && hash_equals($key, (string) $_COOKIE['econur_ds']) && is_user_logged_in();
}
function econur_ds_preview() { return econur_ds_active() && !econur_ds_live_here(); }

// remember / forget the preview, and never cache a preview page
add_action('template_redirect', function () {
    if (isset($_GET['ds_preview']) && !headers_sent()) { // phpcs:ignore WordPress.Security.NonceVerification
        $q = (string) wp_unslash($_GET['ds_preview']); // phpcs:ignore WordPress.Security.NonceVerification
        if ('off' === $q) setcookie('econur_ds', '', time() - HOUR_IN_SECONDS, COOKIEPATH, COOKIE_DOMAIN, is_ssl(), true);
        elseif (hash_equals(econur_ds_key(), $q)) setcookie('econur_ds', $q, time() + 7 * DAY_IN_SECONDS, COOKIEPATH, COOKIE_DOMAIN, is_ssl(), true);
    }
    if (!econur_ds_preview()) return;
    if (!defined('DONOTCACHEPAGE')) define('DONOTCACHEPAGE', true);
    do_action('litespeed_control_set_nocache', 'econur design preview');
    nocache_headers();
}, 1);

add_filter('body_class', function ($c) {
    if (econur_ds_active()) $c[] = 'ecn-ds';
    return $c;
});

// fonts: three families only (Fraunces for editorial headlines, Inter for the shop interface, Hind Siliguri for Bangla)
// product pages held on the previous design still take the homepage's fonts (family and weight only)
function econur_ds_fonts_only() { return econur_ds_live() && !econur_ds_active() && econur_ds_pdp_held(); }
add_filter('body_class', function ($c) {
    if (econur_ds_fonts_only()) $c[] = 'ecn-dsf';
    return $c;
});
add_action('wp_enqueue_scripts', function () {
    if (!econur_ds_active() && !econur_ds_fonts_only()) return;
    wp_dequeue_style('econur-fonts');
    wp_deregister_style('econur-fonts');
    wp_enqueue_style('econur-fonts', 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600'
        . '&family=Hind+Siliguri:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap', array(), null);
}, 20);

// the layer is printed after every other stylesheet, including the Customizer's Additional CSS (wp_head priority 101)
add_action('wp_head', function () {
    if (!econur_ds_active()) return;
    $f = get_stylesheet_directory() . '/assets/econur-ds.css';
    $v = ECONUR_DS_VER . (file_exists($f) ? '.' . substr(md5_file($f), 0, 8) : '');
    echo '<link rel="stylesheet" id="econur-ds-css" href="' . esc_url(get_stylesheet_directory_uri() . '/assets/econur-ds.css?ver=' . $v) . '" media="all">' . "\n";
}, 120);

add_action('wp_head', function () {
    if (!econur_ds_fonts_only()) return;
    $sans = '"Inter", "Hind Siliguri", "Noto Sans Bengali", Arial, sans-serif';
    $serif = '"Fraunces", "Hind Siliguri", Georgia, serif';
    $b = 'html body.ecn-dsf';
    $x = ':not(#ecn-dsf-x)';
    echo '<style id="econur-ds-fonts">'
        . "body.ecn-dsf{--ecn-font-head:$sans;--ecn-font-body:$sans;--ecn-font-en:$sans;--pd-serif:$sans;--pd-sans:$sans;--ehc-serif:$sans;--ecnf-serif:$sans}"
        // header: Inter like the homepage (was Manrope)
        . "$b :is(.main-header-menu .menu-link,.econur-header-login,.econur-header-login-t,.econur-header-cart,.econur-header-cart-t,.econur-cart-count,.econur-header-search-input)$x,"
        . "$b.ast-desktop #ast-desktop-header .main-header-menu > .menu-item > .menu-link,$b #ast-mobile-header .ast-mobile-header-content .main-header-menu > .menu-item > .menu-link,"
        . "$b #ast-mobile-header .ast-mobile-header-content .ast-header-account :is(a, .ast-header-account-text){font-family:$sans !important}"
        // headings: bold Inter, serif only where the homepage uses it
        . "$b .ecn-pdp .ecn-pdp-title$x,$b :is(.ecn-lp-h2,.econur-pit-title,.econur-pit-h3,#ecn-lp-routine-t)$x{font-family:$sans !important;font-weight:800 !important;font-style:normal !important}"
        . "$b :is(.enr-rv-title,.ecn-lp-final h2)$x{font-family:$serif !important;font-weight:600 !important;font-style:normal !important}"
        . "$b :is(.ecn-love-t,.econur-pit-kf,.enr-rv-eyebrow,.enr-rv-buy-name,.ecn-lp-label)$x{font-weight:700 !important}"
        . "$b .ecn-pdp :is(.ecn-pdp-price,.ecn-pdp-price .amount,.ecn-lp-pack-p)$x{font-weight:800 !important}"
        . "$b .ecn-pdp .ecn-pdp-cat$x{font-weight:500 !important}"
        . "$b .ecn-pdp .ecn-pdp-sz$x{font-weight:600 !important}"
        . "$b .ecn-pdp form.cart .single_add_to_cart_button$x{font-weight:700 !important}"
        . '</style>' . "\n";
}, 120);

// small marker so a preview is never mistaken for the live site
add_action('wp_footer', function () {
    if (!econur_ds_preview() || isset($_GET['ds_shot'])) return; // phpcs:ignore WordPress.Security.NonceVerification
    echo '<a class="ecn-ds-badge" href="' . esc_url(add_query_arg('ds_preview', 'off')) . '" title="Leave the design preview">Design preview · exit</a>';
});

/* ---------------------------------------------------------------- preview markup (approved mockup, real store data) */
// "Shop by category": a "View all products" button on the right (the shop page), larger round category photos
add_filter('do_shortcode_tag', function ($out, $tag) {
    if ('econur_category_trust' !== $tag || !econur_ds_active()) return $out;
    $shop = function_exists('wc_get_page_permalink') ? wc_get_page_permalink('shop') : home_url('/shop/');
    $btn = '<a class="ecn-ds-viewall" href="' . esc_url($shop) . '">View All Products <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>';
    $out = preg_replace('#<p class="econur-category-trust__tagline">.*?</p>#s', $btn, $out, 1);
    return str_replace('sizes="44px"', 'sizes="76px"', $out);
}, 10, 2);

// Offer banner: the saved headline ("Flat 60% OFF") and its countdown are not backed by a matching sale in WooCommerce,
// so the preview shows a neutral banner built only from facts already on the site (no percentage, no countdown).
add_filter('do_shortcode_tag', function ($out, $tag) {
    if ('econur_sale_banner' !== $tag || !econur_ds_active() || '' === trim($out)) return $out;
    $shop = function_exists('wc_get_page_permalink') ? wc_get_page_permalink('shop') : home_url('/shop/');
    return '<section class="ecn-sb ecn-ds-sb" id="ecn-sale" aria-labelledby="ecn-sb-title">'
        . '<div class="ecn-sb-copy"><div class="ecn-sb-top"><span class="ecn-sb-eyebrow">Botanical skincare</span></div>'
        . '<h2 class="ecn-sb-title" id="ecn-sb-title">Natural care for everyday life</h2>'
        . '<p class="ecn-sb-text" lang="bn">হাতে তৈরি বোটানিক্যাল বার। সারা দেশে ক্যাশ অন ডেলিভারি।</p></div>'
        . '<div class="ecn-sb-act"><a class="ecn-sb-cta" href="' . esc_url($shop) . '"><span lang="bn">সব পণ্য দেখুন</span> <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></div>'
        . '</section>';
}, 10, 2);

// product page: a small breadcrumb above the gallery (WooCommerce's own: Home > category > product, with its BreadcrumbList data)
add_action('woocommerce_before_single_product', function () {
    if (!econur_ds_active() || !function_exists('woocommerce_breadcrumb')) return;
    woocommerce_breadcrumb(array(
        'wrap_before' => '<nav class="woocommerce-breadcrumb ecn-ds-crumbs" aria-label="Breadcrumb">',
        'wrap_after'  => '</nav>',
        'delimiter'   => '<span class="ecn-ds-crumb-sep" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></span>',
        'home'        => 'Home',
    ));
}, 20);
