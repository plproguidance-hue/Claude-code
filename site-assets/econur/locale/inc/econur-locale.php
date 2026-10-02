<?php
/**
 * ECONUR locale layer: English for identity, Bangla for buying and guidance.
 *  - Hind Siliguri for Bengali characters (Google Fonts, 400 and 600 only, about 72 KB each; only the Bengali subset is
 *    downloaded). Latin text inside Bangla lines keeps DM Sans, so product names, WhatsApp and prices look the same as everywhere else (see assets/econur-ui.css, section 7).
 *  - helpers that tag Bangla strings with lang="bn" (screen readers, line breaking, the Bangla type tokens)
 *  - Bangla product-page copy: a product meta "<key>_bn" (for example econur_how_steps_bn) is used on the product page
 *    instead of the English "<key>" when it is filled in. The English field stays as it is (admin, feeds, homepage).
 *  - one price format everywhere: ৳280 (symbol, no space)
 */
defined('ABSPATH') || exit;

const ECONUR_LOCALE_VER = '1.0.0';

function econur_has_bn($s) { return (bool) preg_match('/[\x{0980}-\x{09FF}]/u', (string) $s); }
// ' lang="bn"' for a string that contains Bangla, '' otherwise
function econur_bn_attr($s) { return econur_has_bn($s) ? ' lang="bn"' : ''; }
// escaped text; wrapped in <span lang="bn"> when it is Bangla
function econur_bn($s, $class = '') {
    $c = $class ? ' class="' . esc_attr($class) . '"' : '';
    if (econur_has_bn($s)) return '<span lang="bn"' . $c . '>' . esc_html($s) . '</span>';
    return $class ? '<span' . $c . '>' . esc_html($s) . '</span>' : esc_html($s);
}

// "8 অক্টোবর" (Latin digits, the same convention as prices and delivery days)
function econur_bn_date($ts) {
    $m = array('জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর');
    return wp_date('j', $ts) . ' ' . $m[(int) wp_date('n', $ts) - 1];
}

// skin types from the product data (econur_skin_type) in Bangla, for the product FAQ; unknown values stay as written
function econur_bn_skin($s) {
    $map = array(
        'oily skin' => 'তৈলাক্ত ত্বক', 'acne-prone skin' => 'ব্রণপ্রবণ ত্বক', 'normal skin' => 'স্বাভাবিক ত্বক',
        'combination skin' => 'মিশ্র ত্বক', 'mildly oily skin' => 'হালকা তৈলাক্ত ত্বক', 'very dry skin' => 'খুব শুষ্ক ত্বক',
        'babies & young children' => 'শিশু ও ছোট বাচ্চা', 'sensitive skin' => 'সংবেদনশীল ত্বক', 'dry skin' => 'শুষ্ক ত্বক',
    );
    $k = strtolower(trim($s));
    return isset($map[$k]) ? $map[$k] : $s;
}

/* ---------------------------------------------------------------- font */
add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style('econur-bn-font', 'https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600&display=swap', array(), null);
}, 5);
add_filter('wp_resource_hints', function ($urls, $rel) {
    if ('preconnect' === $rel && !is_admin()) {
        $urls[] = 'https://fonts.googleapis.com';
        $urls[] = array('href' => 'https://fonts.gstatic.com', 'crossorigin');
    }
    return $urls;
}, 10, 2);

/* ---------------------------------------------------------------- Bangla product-page copy */
function econur_bn_meta_keys() {
    return array('econur_lp_subtitle', 'econur_lp_bullets', 'econur_lp_why_lead', 'econur_ingredient_notes', 'econur_ingredient_pills',
        'econur_how_steps', 'econur_how_note', 'econur_how_pills', 'econur_card_line');
}
add_filter('get_post_metadata', function ($value, $id, $key, $single) {
    if (null !== $value || is_admin() || !in_array($key, econur_bn_meta_keys(), true)) return $value;
    if (!function_exists('is_product') || !did_action('wp') || !is_product()) return $value;
    $bn = get_post_meta($id, $key . '_bn', true);
    return (is_string($bn) && '' !== trim($bn)) ? array($bn) : $value;
}, 10, 4);

/* ---------------------------------------------------------------- price format: ৳280 */
// WooCommerce's own BDT symbol carries a non-breaking space ("&#2547;&nbsp;"); the symbol alone gives ৳280
add_filter('woocommerce_currency_symbol', function ($symbol, $currency) {
    return 'BDT' === $currency ? '&#2547;' : $symbol;
}, 20, 2);
add_filter('woocommerce_price_format', function ($format, $pos) {
    return in_array($pos, array('left', 'left_space'), true) ? '%1$s%2$s' : $format;
}, 20, 2);
