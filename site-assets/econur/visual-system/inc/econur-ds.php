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
// true when this request shows the new design
function econur_ds_active() {
    static $on = null;
    if (null !== $on) return $on;
    if (econur_ds_live()) return $on = true;
    $key = econur_ds_key();
    $q = isset($_GET['ds_preview']) ? (string) wp_unslash($_GET['ds_preview']) : null; // phpcs:ignore WordPress.Security.NonceVerification
    if (null !== $q) {
        if ('off' === $q) return $on = false;
        if (hash_equals($key, $q)) return $on = true;
    }
    return $on = isset($_COOKIE['econur_ds']) && hash_equals($key, (string) $_COOKIE['econur_ds']) && is_user_logged_in();
}
function econur_ds_preview() { return econur_ds_active() && !econur_ds_live(); }

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
add_action('wp_enqueue_scripts', function () {
    if (!econur_ds_active()) return;
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
