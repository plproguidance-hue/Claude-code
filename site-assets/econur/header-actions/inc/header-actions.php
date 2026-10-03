<?php
/**
 * ECONUR header actions: the right side of the header.
 *  Desktop: [ Search Product ......  (search) ]  (user) Login  (cart) Cart + count badge
 *  Mobile:  (search) (user) (cart + badge), the search icon opens a full-width search panel under the header.
 *
 * WooCommerce stays the source of truth:
 *  - search is the normal WordPress / WooCommerce product search (GET /?s=TERM&post_type=product);
 *  - Login goes to the ECONUR sign-in page (/login/, inc/econur-login.php); "Account" (signed in) to My Account;
 *  - the badge is the real cart quantity, kept current by WooCommerce's cart fragments (key a.econur-header-cart);
 *  - Cart opens the ECONUR side cart drawer (inc/econur-cart.php, data-ecn-cart-open); without the drawer
 *    (cart and checkout pages) it is a plain link to the cart page.
 * Astra's own search / account / cart icons stay in its header builder and are only hidden by the stylesheet,
 * so removing the require line in functions.php brings them back unchanged.
 * Look: assets/econur-header-actions.css. Behaviour (search panel, empty-search guard): assets/econur-header-actions.js.
 */
defined('ABSPATH') || exit;

const ECONUR_HEADER_ACTIONS_VER = '1.0.0';

function econur_ha_icon($n) {
    $p = array(
        'search' => '<circle cx="11" cy="11" r="6.6"/><path d="m20 20-4.3-4.3"/>',
        'user'   => '<circle cx="12" cy="8.3" r="3.8"/><path d="M4.8 20.2c.8-3.7 3.6-5.8 7.2-5.8s6.4 2.1 7.2 5.8"/>',
        'cart'   => '<path d="M5 6.5h15l-1.6 8.2a1.5 1.5 0 0 1-1.5 1.2H8.6a1.5 1.5 0 0 1-1.5-1.2L5 4H3"/><circle cx="9" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/>',
        'close'  => '<path d="M6 6l12 12M18 6 6 18"/>',
    );
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . $p[$n] . '</svg>';
}

function econur_ha_search_form($id) {
    return '<form class="econur-header-search" role="search" method="get" action="' . esc_url(home_url('/')) . '">'
        . '<label class="econur-sr" for="' . esc_attr($id) . '">Search products</label>'
        . '<input class="econur-header-search-input" id="' . esc_attr($id) . '" type="search" name="s" value="' . esc_attr(get_search_query()) . '" placeholder="Search Product" autocomplete="off" enterkeyhint="search">'
        . '<input type="hidden" name="post_type" value="product">'
        . '<button class="econur-header-search-btn" type="submit" aria-label="Search products">' . econur_ha_icon('search') . '</button>'
        . '</form>';
}

// signed in: My Account; signed out: the ECONUR sign-in page (inc/econur-login.php), coming back to the cart or
// checkout when the visitor was there
function econur_ha_account_url() {
    if (!is_user_logged_in() && function_exists('econur_login_live') && econur_login_live()) {
        $back = '';
        if (function_exists('is_checkout') && is_checkout() && !is_wc_endpoint_url('order-received')) $back = wc_get_checkout_url();
        elseif (function_exists('is_cart') && is_cart()) $back = wc_get_cart_url();
        return econur_login_url($back);
    }
    $u = function_exists('wc_get_page_permalink') ? wc_get_page_permalink('myaccount') : '';
    return $u ? $u : wp_login_url();
}

function econur_ha_login($mobile) {
    $in = is_user_logged_in();
    $label = $mobile ? 'My Account' : ($in ? 'My Account' : 'Login to My Account');
    return '<a class="econur-header-login" href="' . esc_url(econur_ha_account_url()) . '" aria-label="' . esc_attr($label) . '">'
        . econur_ha_icon('user') . '<span class="econur-header-login-t">' . ($in ? 'Account' : 'Login') . '</span></a>';
}

// one markup for the desktop and mobile headers (the mobile stylesheet hides the "Cart" word), so a single
// WooCommerce fragment keeps both badges and both labels current
function econur_header_cart_markup() {
    $n = (function_exists('WC') && WC()->cart) ? (int) WC()->cart->get_cart_contents_count() : 0;
    $label = 'Cart, ' . $n . ' ' . (1 === $n ? 'item' : 'items');
    $url = function_exists('wc_get_cart_url') ? wc_get_cart_url() : home_url('/cart/');
    return '<a class="econur-header-cart" href="' . esc_url($url) . '" data-ecn-cart-open aria-label="' . esc_attr($label) . '" data-count="' . $n . '">'
        . '<span class="econur-header-cart-ic">' . econur_ha_icon('cart') . '<span class="econur-cart-count" aria-hidden="true">' . ($n > 99 ? '99+' : $n) . '</span></span>'
        . '<span class="econur-header-cart-t">Cart</span></a>';
}

function econur_ha_toggle() {
    return '<button type="button" class="econur-header-search-toggle" data-ecn-search-toggle aria-controls="econur-mobile-search" aria-expanded="false" aria-label="Search products">'
        . econur_ha_icon('search') . '</button>';
}

// desktop header, right column (Astra's items render at 10, the social circles at 20)
add_action('astra_render_header_column', function ($row, $column) {
    if ('primary' !== $row || 'right' !== $column) return;
    echo '<div class="econur-header-actions" lang="en">' . econur_ha_search_form('econur-hs-desktop') . econur_ha_toggle()
        . econur_ha_login(false) . econur_header_cart_markup() . '</div>';
}, 15, 2);

// mobile header, right column, plus the search panel (moved under the header by the script)
add_action('astra_render_mobile_header_column', function ($row, $column) {
    if ('primary' !== $row || 'right' !== $column) return;
    echo '<div class="econur-header-actions is-mobile" lang="en">' . econur_ha_toggle() . econur_ha_login(true) . econur_header_cart_markup() . '</div>'
        . '<div class="econur-mobile-search-panel" id="econur-mobile-search" lang="en" hidden><div class="econur-mobile-search-in">'
        . econur_ha_search_form('econur-hs-panel')
        . '<button type="button" class="econur-mobile-search-x" data-ecn-search-close aria-label="Close search">' . econur_ha_icon('close') . '</button>'
        . '</div></div>';
}, 15, 2);

// live badge + aria-label through WooCommerce's cart fragments
add_filter('woocommerce_add_to_cart_fragments', function ($f) {
    $f['a.econur-header-cart'] = econur_header_cart_markup();
    return $f;
});
// a new name for the fragments WooCommerce keeps in sessionStorage, so carts saved before the header change
// fetch the new badge once instead of showing the cached page's count
add_filter('woocommerce_cart_fragment_name', function ($name) { return $name . '_ecnh1'; });

add_action('wp_enqueue_scripts', function () {
    $u = get_stylesheet_directory_uri() . '/assets/';
    wp_register_style('econur-header-actions', $u . 'econur-header-actions.css', array(), ECONUR_HEADER_ACTIONS_VER);
    wp_enqueue_script('econur-header-actions', $u . 'econur-header-actions.js', array(), ECONUR_HEADER_ACTIONS_VER, array('in_footer' => true, 'strategy' => 'defer'));
}, 20);
// printed right after the header stylesheet (inc/header-nav.php prints it at 122)
add_action('wp_head', function () {
    if (!is_admin() && wp_style_is('econur-header-actions', 'registered')) wp_print_styles('econur-header-actions');
}, 123);
