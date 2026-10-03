<?php
/**
 * ECONUR cart drawer + floating cart tab (product pages and shop / category pages; not the homepage, cart or checkout),
 * and the ECONUR heading, Bengali labels and styling for the WooCommerce Cart block on the cart page.
 *
 * WooCommerce stays the source of truth: the drawer reads and changes the real cart through the WooCommerce Store API
 * (/wp-json/wc/store/v1/cart), so prices, pack discounts, stock and totals are WooCommerce's own. The header cart count
 * is refreshed through WooCommerce's cart fragments after every change.
 * Markup: wp_footer below. Behaviour: assets/econur-cart.js. Look: assets/econur-cart.css (classes start with econur-).
 */
defined('ABSPATH') || exit;

const ECONUR_CART_VER = '1.0.0';

function econur_cart_drawer_here() {
    if (is_admin() || !function_exists('is_product')) return false;
    if (is_cart() || is_checkout() || is_front_page()) return false; // the homepage keeps its own add-to-cart toast
    return is_product() || is_shop() || is_product_taxonomy();
}

function econur_cart_icon($n) {
    $p = array(
        'cart'  => '<path d="M5 6.5h15l-1.6 8.2a1.5 1.5 0 0 1-1.5 1.2H8.6a1.5 1.5 0 0 1-1.5-1.2L5 4H3"/><circle cx="9" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/>',
        'close' => '<path d="M6 6l12 12M18 6 6 18"/>',
        'box'   => '<path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
        'truck' => '<path d="M3 6.5h11v9H3zM14 9.5h4l3 3v3h-7z"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="17.5" cy="17.5" r="1.6"/>',
        'phone' => '<path d="M21 16.9v2.6a1.8 1.8 0 0 1-2 1.8 17.8 17.8 0 0 1-7.8-2.8 17.5 17.5 0 0 1-5.4-5.4A17.8 17.8 0 0 1 3 5.2 1.8 1.8 0 0 1 4.8 3.2h2.6a1.8 1.8 0 0 1 1.8 1.6c.1.9.3 1.7.6 2.5a1.8 1.8 0 0 1-.4 1.9L8.3 10.3a14.4 14.4 0 0 0 5.4 5.4l1.1-1.1a1.8 1.8 0 0 1 1.9-.4c.8.3 1.6.5 2.5.6a1.8 1.8 0 0 1 1.6 1.8Z"/>',
        'arrow' => '<path d="M5 12h14M13 6l6 6-6 6"/>',
    );
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . $p[$n] . '</svg>';
}

add_action('wp_enqueue_scripts', function () {
    $u = get_stylesheet_directory_uri() . '/assets/';
    if (econur_cart_drawer_here()) {
        wp_enqueue_style('econur-cart', $u . 'econur-cart.css', array(), ECONUR_CART_VER);
        wp_enqueue_script('econur-cart', $u . 'econur-cart.js', array('jquery', 'wc-cart-fragments'), ECONUR_CART_VER, array('in_footer' => true, 'strategy' => 'defer'));
        wp_add_inline_script('econur-cart', 'window.ECN_CART=' . wp_json_encode(array(
            'api' => esc_url_raw(rest_url('wc/store/v1/')),
            'cart' => wc_get_cart_url(),
            'checkout' => wc_get_checkout_url(),
            'unit' => array('bar', 'bars'),
        )) . ';', 'before');
    }
    if (function_exists('is_cart') && is_cart()) {
        wp_enqueue_style('econur-cart-page', $u . 'econur-cart.css', array(), ECONUR_CART_VER);
    }
}, 30);

/* ---------------------------------------------------------------- drawer + floating tab */
add_action('wp_footer', function () {
    if (!econur_cart_drawer_here()) return;
    $shop = function_exists('wc_get_page_permalink') ? wc_get_page_permalink('shop') : home_url('/');
    echo '<div class="econur-cart-overlay" data-ecn-cart-close hidden></div>'
        . '<aside class="econur-cart-drawer" id="econur-cart-drawer" role="dialog" aria-modal="true" aria-labelledby="econur-cart-title" aria-hidden="true" tabindex="-1" lang="bn" hidden>'
        . '<header class="econur-cart-head"><h2 class="econur-cart-title" id="econur-cart-title">' . econur_cart_icon('cart') . '<span>আপনার কার্ট</span> <span class="econur-cart-n" data-ecn-cart-count></span></h2>'
        . '<button type="button" class="econur-cart-x" data-ecn-cart-close aria-label="কার্ট বন্ধ করুন">' . econur_cart_icon('close') . '</button></header>'
        . '<div class="econur-cart-body"><p class="econur-cart-msg" data-ecn-cart-msg role="alert" hidden></p>'
        . '<ul class="econur-cart-items" data-ecn-cart-items aria-label="কার্টের পণ্য"></ul>'
        . '<div class="econur-cart-empty" data-ecn-cart-empty hidden><p>আপনার কার্ট এখন খালি।</p><a class="econur-cart-btn is-ghost" href="' . esc_url($shop) . '">কেনাকাটা শুরু করুন</a></div>'
        . '<div class="econur-cart-loading" data-ecn-cart-loading aria-hidden="true"><i></i><i></i></div></div>'
        . '<footer class="econur-cart-foot" data-ecn-cart-foot hidden>'
        . '<div class="econur-cart-sub"><span>সাবটোটাল</span><b data-ecn-cart-subtotal></b></div>'
        . '<p class="econur-cart-note">ডেলিভারি চার্জ চেকআউটে যোগ হবে</p>'
        . '<div class="econur-cart-actions"><a class="econur-cart-btn is-ghost" href="' . esc_url(wc_get_cart_url()) . '">কার্ট দেখুন</a>'
        . '<a class="econur-cart-btn is-primary" href="' . esc_url(wc_get_checkout_url()) . '">চেকআউট করুন' . econur_cart_icon('arrow') . '</a></div>'
        . '<ul class="econur-cart-trust"><li>' . econur_cart_icon('box') . 'পণ্য হাতে পেয়ে পেমেন্ট</li><li>' . econur_cart_icon('truck') . 'সারা বাংলাদেশে ডেলিভারি</li><li>' . econur_cart_icon('phone') . 'অর্ডার নিশ্চিত করতে ফোন করি</li></ul>'
        . '</footer></aside>'
        . '<button type="button" class="econur-cart-tab" data-ecn-cart-open aria-controls="econur-cart-drawer" aria-expanded="false" lang="bn" hidden>'
        . econur_cart_icon('cart') . '<span class="econur-cart-tab-n" data-ecn-tab-count></span><b class="econur-cart-tab-t" data-ecn-tab-total></b></button>';
}, 40);

/* ---------------------------------------------------------------- cart page (WooCommerce Cart block) */
// ECONUR heading above the cart; the theme's plain "Cart" title steps aside on the cart page
add_filter('render_block_woocommerce/cart', function ($html) {
    return '<header class="econur-cartpage-head" lang="bn"><h1>আপনার কার্ট</h1><p>আপনার অর্ডারের পণ্যগুলো যাচাই করুন</p></header>' . $html;
});
add_filter('astra_the_title_enabled', function ($on) {
    return (function_exists('is_cart') && (is_cart() || is_checkout())) ? false : $on;
});
add_filter('body_class', function ($c) {
    if (function_exists('is_cart') && is_cart()) $c[] = 'econur-cartpage';
    return $c;
});
// Bengali labels for the Cart block (its own words, through WordPress's translation system; prices and totals untouched)
add_action('wp_enqueue_scripts', function () {
    if (!function_exists('is_cart') || !is_cart()) return;
    $t = array(
        'Product' => 'পণ্য', 'Total' => 'মোট', 'Quantity' => 'পরিমাণ', 'Price' => 'দাম',
        'Cart totals' => 'অর্ডার সারাংশ', 'Subtotal' => 'সাবটোটাল', 'Estimated total' => 'মোট', 'Details' => 'বিবরণ',
        'Proceed to Checkout' => 'চেকআউটে যান', 'Proceed to checkout' => 'চেকআউটে যান',
        'Add coupons' => 'কুপন কোড', 'Add a coupon' => 'কুপন কোড', 'Enter code' => 'কুপন কোড লিখুন', 'Apply' => 'প্রয়োগ করুন',
        'Coupon code' => 'কুপন কোড', 'Discount' => 'ডিসকাউন্ট',
        'Remove item' => 'সরান', 'Remove %s from cart' => '%s কার্ট থেকে সরান',
        'Reduce quantity of %s' => '%s এর পরিমাণ কমান', 'Increase quantity of %s' => '%s এর পরিমাণ বাড়ান',
        'Delivery' => 'ডেলিভারি', 'Shipping' => 'ডেলিভারি', 'Shipping options' => 'ডেলিভারি এলাকা',
        'Calculate shipping' => 'ডেলিভারি চার্জ দেখুন', 'Change address' => 'ঠিকানা বদলান', 'Enter address to check delivery options' => 'ডেলিভারি চার্জ চেকআউটে ঠিক হবে',
        'Your cart is currently empty!' => 'আপনার কার্ট এখন খালি।', 'Browse store' => 'কেনাকাটা শুরু করুন',
        'Your cart' => 'আপনার কার্ট', 'Size' => 'সাইজ',
        'The quantity of "%1$s" was changed to %2$d.' => '"%1$s" এর পরিমাণ %2$d করা হয়েছে।',
        '"%s" was removed from your cart.' => '"%s" কার্ট থেকে সরানো হয়েছে।', 'Undo' => 'ফিরিয়ে আনুন',
        'Coupon code "%s" has been applied to your cart.' => '"%s" কুপন প্রয়োগ হয়েছে।', 'Coupon code "%s" has been removed from your cart.' => '"%s" কুপন সরানো হয়েছে।',
    );
    $locale = array('' => array('domain' => 'woocommerce', 'lang' => 'bn'));
    foreach ($t as $en => $bn) $locale[$en] = array($bn);
    wp_add_inline_script('wp-i18n', 'wp.i18n.setLocaleData(' . wp_json_encode($locale, JSON_UNESCAPED_UNICODE) . ',"woocommerce");', 'after');
}, 5);
