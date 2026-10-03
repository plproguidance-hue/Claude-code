<?php
/**
 * ECONUR customer login page (/login/): a split-screen sign-in page for customers.
 *
 * Authentication is WooCommerce's own: the form posts the fields WooCommerce's login handler reads
 * (WC_Form_Handler::process_login on wp_loaded: username or email, password, "remember me", its nonce and a redirect),
 * so WordPress checks the password, sets the session cookies and WooCommerce validates the redirect (same site only).
 * Nothing is stored here and nothing is decided in JavaScript.
 *   - logged-in visitors are sent on to My Account (or the safe redirect_to address);
 *   - "Forgot password" is WooCommerce's lost-password page; after a reset the visitor comes back here;
 *   - account registration follows WooCommerce > Settings > Accounts (off on this store, so no "create account" link);
 *   - social sign-in buttons appear only if a real provider prints them (filter econur_login_social_buttons);
 *   - /wp-login.php and the WordPress admin sign-in are not touched.
 * The page is a WordPress page (option econur_login_page_id) shown with templates/econur-login.php instead of the theme's
 * header and footer. The header Login link and the My Account hand-over follow once econur_login_live = "yes".
 * Look and behaviour: assets/econur-login.css / .js.
 */
defined('ABSPATH') || exit;

const ECONUR_LOGIN_VER = '1.0.0';

function econur_login_page_id() {
    $id = (int) get_option('econur_login_page_id');
    return ($id && 'publish' === get_post_status($id)) ? $id : 0;
}
// the header Login link and the My Account hand-over use the page once it is switched on (option econur_login_live = yes)
function econur_login_live() {
    return econur_login_page_id() && 'yes' === get_option('econur_login_live');
}
function econur_is_login_page() {
    $id = econur_login_page_id();
    return $id && is_page($id);
}
// the sign-in address, optionally with a page to return to (only addresses on this site are kept)
function econur_login_url($back = '') {
    $id = econur_login_page_id();
    if (!$id) return function_exists('wc_get_page_permalink') ? wc_get_page_permalink('myaccount') : wp_login_url($back);
    $url = get_permalink($id);
    $back = $back ? wp_validate_redirect($back, '') : '';
    return $back ? add_query_arg('redirect_to', rawurlencode($back), $url) : $url;
}
// where to go after signing in: a safe redirect_to, otherwise My Account
function econur_login_target() {
    $acc = wc_get_page_permalink('myaccount');
    $raw = isset($_REQUEST['redirect_to']) ? esc_url_raw(wp_unslash($_REQUEST['redirect_to'])) : ''; // phpcs:ignore WordPress.Security.NonceVerification
    $to = $raw ? wp_validate_redirect($raw, '') : '';
    if (!$to || false !== strpos($to, 'wp-login.php') || untrailingslashit(strtok($to, '?')) === untrailingslashit(get_permalink(econur_login_page_id()))) $to = $acc;
    return $to;
}

/* ---------------------------------------------------------------- routing */
add_action('template_redirect', function () {
    if (econur_is_login_page()) {
        if (is_user_logged_in()) { wp_safe_redirect(econur_login_target()); exit; }
        // the form carries a security token, so this page is never cached
        if (!defined('DONOTCACHEPAGE')) define('DONOTCACHEPAGE', true);
        do_action('litespeed_control_set_nocache', 'econur customer login form');
        nocache_headers();
        return;
    }
    // registration is off: a signed-out visitor at My Account (the WooCommerce sign-in form) sees this page instead;
    // the lost-password and other account addresses stay WooCommerce's own
    if (econur_login_live() && function_exists('is_account_page') && is_account_page() && !is_user_logged_in()
        && !is_wc_endpoint_url() && 'GET' === ($_SERVER['REQUEST_METHOD'] ?? '') && 'yes' !== get_option('woocommerce_enable_myaccount_registration')) {
        $url = get_permalink(econur_login_page_id());
        if (isset($_GET['password-reset'])) $url = add_query_arg('password-reset', 'true', $url); // phpcs:ignore WordPress.Security.NonceVerification
        wp_safe_redirect($url); exit;
    }
}, 5);

add_filter('template_include', function ($tpl) {
    if (!econur_is_login_page()) return $tpl;
    $own = get_stylesheet_directory() . '/templates/econur-login.php';
    return file_exists($own) ? $own : $tpl;
}, 99);

add_filter('wp_robots', function ($r) { if (econur_is_login_page()) { $r['noindex'] = true; $r['follow'] = true; } return $r; });
add_filter('pre_get_document_title', function ($t) { return econur_is_login_page() ? 'সাইন ইন – ' . get_bloginfo('name') : $t; }, 20);
add_filter('body_class', function ($c) { if (econur_is_login_page()) $c[] = 'econur-login-page'; return $c; });

add_action('wp_enqueue_scripts', function () {
    if (!econur_is_login_page()) return;
    $u = get_stylesheet_directory_uri() . '/assets/';
    wp_enqueue_style('econur-login', $u . 'econur-login.css', array(), ECONUR_LOGIN_VER);
    wp_enqueue_script('econur-login', $u . 'econur-login.js', array(), ECONUR_LOGIN_VER, array('in_footer' => true, 'strategy' => 'defer'));
}, 40);

/* ---------------------------------------------------------------- messages from WooCommerce / WordPress, in Bengali */
// Only for this form's own requests. "Unknown user" and "wrong password" get one shared message.
function econur_login_posted() { return isset($_POST['econur_login_form']); } // phpcs:ignore WordPress.Security.NonceVerification
add_filter('woocommerce_add_error', function ($msg) {
    if (!econur_login_posted()) return $msg;
    $t = strtolower(wp_strip_all_tags((string) $msg));
    if (false !== strpos($t, 'username is required')) return 'ইমেইল বা ইউজারনেম লিখুন।';
    if (false !== strpos($t, 'password field is empty') || false !== strpos($t, 'password is required')) return 'পাসওয়ার্ড লিখুন।';
    if (preg_match('/incorrect|not registered|unknown (email|username)|invalid (username|email)/', $t)) {
        return 'ইমেইল / ইউজারনেম অথবা পাসওয়ার্ড সঠিক নয়। আবার চেষ্টা করুন, অথবা <a href="' . esc_url(wc_lostpassword_url()) . '">পাসওয়ার্ড রিসেট করুন</a>।';
    }
    return $msg;
}, 20);

/* ---------------------------------------------------------------- content */
function econur_login_icon($n) {
    $p = array(
        'mail'    => '<rect x="3" y="5.5" width="18" height="13" rx="2.2"/><path d="m4 7.5 8 6 8-6"/>',
        'lock'    => '<rect x="4.5" y="10.5" width="15" height="10" rx="2.2"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/>',
        'eye'     => '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
        'eyeoff'  => '<path d="M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.2 6.9C3.9 8.5 2.5 12 2.5 12S6 18.5 12 18.5c1.7 0 3.2-.5 4.5-1.2"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="m3 3 18 18"/>',
        'user'    => '<circle cx="12" cy="8.3" r="3.8"/><path d="M4.8 20.2c.8-3.7 3.6-5.8 7.2-5.8s6.4 2.1 7.2 5.8"/>',
        'sparkle' => '<path d="M9.5 3.5 10.8 8a2 2 0 0 0 1.4 1.4l4.5 1.3-4.5 1.3a2 2 0 0 0-1.4 1.4l-1.3 4.5-1.3-4.5a2 2 0 0 0-1.4-1.4L2.3 10.7l4.5-1.3A2 2 0 0 0 8.2 8Z"/><path d="M18 14.5l.6 2a1 1 0 0 0 .7.7l2 .6-2 .6a1 1 0 0 0-.7.7l-.6 2-.6-2a1 1 0 0 0-.7-.7l-2-.6 2-.6a1 1 0 0 0 .7-.7Z"/>',
        'cart'    => '<path d="M5 6.5h15l-1.6 8.2a1.5 1.5 0 0 1-1.5 1.2H8.6a1.5 1.5 0 0 1-1.5-1.2L5 4H3"/><circle cx="9" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/>',
        'box'     => '<path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
        'history' => '<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3.5 4.5V9H8"/><path d="M12 7.5V12l3 2"/>',
        'shield'  => '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6Z"/><path d="m8.8 12.2 2.2 2.2 4.4-4.6"/>',
        'cash'    => '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9.5v5M18 9.5v5"/>',
        'arrow'   => '<path d="M5 12h14M13 6l6 6-6 6"/>',
        'check'   => '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
        'alert'   => '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/>',
    );
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . ($p[$n] ?? '') . '</svg>';
}
// account benefits: what a WooCommerce customer account actually offers on this store
function econur_login_benefits() {
    return array(
        array('sparkle', 'ব্যক্তিগত শপিং অভিজ্ঞতা', 'আপনার অ্যাকাউন্ট থেকে সহজে কেনাকাটা করুন'),
        array('cart', 'দ্রুত ও নিরাপদ চেকআউট', 'সহজে ও দ্রুত অর্ডার করুন'),
        array('box', 'অর্ডার ট্র্যাক করুন', 'আপনার অর্ডারের বর্তমান অবস্থা দেখুন'),
        array('history', 'অর্ডার হিস্ট্রি ও অ্যাকাউন্ট', 'আগের অর্ডার ও তথ্য সহজে দেখুন'),
    );
}
// decorative images: existing Media Library pictures only (alt="", hidden from screen readers)
function econur_login_deco($id, $class, $sizes = '300px', $eager = false) {
    if (!wp_attachment_is_image($id)) return '';
    return wp_get_attachment_image($id, 'full', false, array('class' => 'econur-login-deco ' . $class, 'alt' => '', 'aria-hidden' => 'true', 'loading' => $eager ? 'eager' : 'lazy', 'decoding' => 'async', 'sizes' => $sizes));
}
