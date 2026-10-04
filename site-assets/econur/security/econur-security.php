<?php
/**
 * Plugin Name: ECONUR Security
 * Description: Hardening: XML-RPC off, account names kept out of public view (REST user list, author pages, user sitemap, link previews), one login error for wrong username or password, theme/plugin file editor off, version tags removed. Kill switch: option econur_security_mode = "off" (the file editor stays off while this file exists).
 * Version: 1.0.0
 *
 * Lives in wp-content/mu-plugins. The matching server rules (xmlrpc.php blocked, security headers)
 * are in .htaccess between "# BEGIN ECONUR Security" and "# END ECONUR Security".
 */
defined('ABSPATH') || exit;

// Theme/plugin file editor off (Appearance > Theme File Editor, Plugins > Plugin File Editor).
if (!defined('DISALLOW_FILE_EDIT')) define('DISALLOW_FILE_EDIT', true);

function ecn_sec_on() {
    return 'off' !== get_option('econur_security_mode');
}

/* 1. XML-RPC: off (the file itself is also blocked in .htaccess). Nothing on this store uses it. */
add_filter('xmlrpc_enabled', function ($on) { return ecn_sec_on() ? false : $on; }, 99);
add_filter('xmlrpc_methods', function ($m) { return ecn_sec_on() ? array() : $m; }, 99);
add_filter('wp_headers', function ($h) {
    if (ecn_sec_on()) unset($h['X-Pingback']);
    return $h;
}, 99);

/* 2. Account names out of public view. */
// REST user list / single user: only for signed-in staff (the block editor needs it).
add_filter('rest_pre_dispatch', function ($result, $server, $request) {
    if (!ecn_sec_on() || current_user_can('edit_posts')) return $result;
    if (preg_match('#^/wp/v2/users(?:/(?!me(?:/|$))|/?$)#', $request->get_route())) {
        return new WP_Error('rest_user_cannot_view', __('Sorry, you are not allowed to list users.'), array('status' => rest_authorization_required_code()));
    }
    return $result;
}, 10, 3);

// Author pages (/author/name/ and ?author=1) show "not found" instead of revealing the account name.
add_filter('redirect_canonical', function ($to) {
    return (ecn_sec_on() && !is_admin() && (isset($_GET['author']) || is_author())) ? false : $to;
});
add_action('template_redirect', function () {
    if (!ecn_sec_on() || !(is_author() || isset($_GET['author']))) return;
    global $wp_query;
    $wp_query->set_404();
    status_header(404);
    nocache_headers();
}, 1);

// No user sitemap.
add_filter('wp_sitemaps_add_provider', function ($provider, $name) {
    return (ecn_sec_on() && 'users' === $name) ? false : $provider;
}, 10, 2);

// Link previews (oEmbed) without the author name/link.
add_filter('oembed_response_data', function ($data) {
    if (ecn_sec_on()) unset($data['author_name'], $data['author_url']);
    return $data;
}, 99);

/* 3. One message for a wrong username/email or a wrong password (no "this username exists" hint). */
add_filter('authenticate', function ($user) {
    if (!ecn_sec_on() || !is_wp_error($user)) return $user;
    if (array_intersect($user->get_error_codes(), array('invalid_username', 'invalid_email', 'incorrect_password'))) {
        return new WP_Error('authentication_failed', __('<strong>Error:</strong> Invalid username, email address or incorrect password.'));
    }
    return $user;
}, 99);

/* 4. No version numbers in the page head (WordPress, WooCommerce, Elementor) and no XML-RPC discovery link. */
add_action('init', function () {
    if (!ecn_sec_on()) return;
    remove_action('wp_head', 'wp_generator');
    remove_action('wp_head', 'rsd_link');
    add_filter('the_generator', '__return_empty_string');
});
add_action('wp_head', function () {
    if (!ecn_sec_on()) return;
    global $wp_filter;
    if (empty($wp_filter['wp_head'])) return;
    foreach ($wp_filter['wp_head']->callbacks as $prio => $cbs) {
        foreach ($cbs as $cb) {
            $f = $cb['function'];
            if (is_array($f) && is_string($f[1]) && false !== stripos($f[1], 'generator')) remove_action('wp_head', $f, $prio);
        }
    }
}, 0);
