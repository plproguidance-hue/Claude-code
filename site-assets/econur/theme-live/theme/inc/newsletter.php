<?php
/**
 * Econur newsletter sign-up.
 * Every sign-up is saved in WordPress (admin: Newsletter > Subscribers, with a CSV download). When Hostinger Reach is
 * connected, the address is also handed to Reach through its own "hostinger_reach_submit" action.
 * No discount or offer is promised here; the wording lives with the section that prints the form.
 */
defined('ABSPATH') || exit;

const ECONUR_NL_TYPE = 'ecn_subscriber';

add_action('init', function () {
    register_post_type(ECONUR_NL_TYPE, array(
        'labels'          => array('name' => 'Subscribers', 'singular_name' => 'Subscriber', 'menu_name' => 'Newsletter', 'all_items' => 'Subscribers', 'search_items' => 'Search subscribers', 'not_found' => 'No subscribers yet'),
        'public'          => false,
        'show_ui'         => true,
        'show_in_menu'    => true,
        'show_in_rest'    => false,
        'menu_icon'       => 'dashicons-email-alt',
        'menu_position'   => 58,
        'supports'        => array('title'),
        'capability_type' => 'post',
        'capabilities'    => array('create_posts' => 'do_not_allow', 'edit_posts' => 'manage_woocommerce', 'edit_others_posts' => 'manage_woocommerce', 'delete_posts' => 'manage_woocommerce', 'delete_others_posts' => 'manage_woocommerce', 'read_private_posts' => 'manage_woocommerce', 'edit_private_posts' => 'manage_woocommerce', 'delete_private_posts' => 'manage_woocommerce', 'publish_posts' => 'manage_woocommerce'),
        'map_meta_cap'    => true,
        'rewrite'         => false,
        'query_var'       => false,
    ));
});

// The form. $source says where it was shown (e.g. "product-14").
function econur_newsletter_form($source = '', $opt = array()) {
    $opt = array_merge(array('placeholder' => 'Enter Email Address', 'button' => 'Subscribe', 'button_html' => ''), $opt);
    $uid = 'ecn-nl-' . wp_unique_id();
    // result of a sign-up sent without JavaScript (the handler redirects back with ?ecn_nl=ok|error)
    $state = isset($_GET['ecn_nl']) && in_array($_GET['ecn_nl'], array('ok', 'error'), true) ? $_GET['ecn_nl'] : '';
    $msg = 'ok' === $state ? 'Thank you for subscribing! We will keep you posted.' : ('error' === $state ? 'Please enter a valid email address.' : '');
    return '<form class="ecn-nl-form" action="' . esc_url(admin_url('admin-post.php')) . '" method="post" novalidate>'
        . '<input type="hidden" name="action" value="ecn_newsletter"><input type="hidden" name="src" value="' . esc_attr($source) . '">'
        . '<label class="screen-reader-text" for="' . esc_attr($uid) . '">Email address</label>'
        . '<input class="ecn-nl-email" id="' . esc_attr($uid) . '" type="email" name="email" required autocomplete="email" inputmode="email" placeholder="' . esc_attr($opt['placeholder']) . '">'
        . '<span class="ecn-nl-hp" aria-hidden="true"><input type="text" name="ecn_hp" tabindex="-1" autocomplete="off" value=""></span>'
        . ($opt['button_html'] ? '<button class="ecn-nl-btn" type="submit" aria-label="' . esc_attr($opt['button']) . '">' . $opt['button_html'] . '</button>' : '<button class="ecn-nl-btn" type="submit">' . esc_html($opt['button']) . '</button>')
        . '<p class="ecn-nl-msg' . esc_attr($state ? ' is-' . $state : '') . '" role="status" aria-live="polite">' . esc_html($msg) . '</p></form>';
}

add_action('admin_post_nopriv_ecn_newsletter', 'econur_newsletter_submit');
add_action('admin_post_ecn_newsletter', 'econur_newsletter_submit');
function econur_newsletter_submit() {
    $ajax = !empty($_SERVER['HTTP_X_REQUESTED_WITH']) && 'xmlhttprequest' === strtolower($_SERVER['HTTP_X_REQUESTED_WITH']);
    $back = wp_get_referer() ? wp_get_referer() : home_url('/');
    $reply = function ($ok, $msg) use ($ajax, $back) {
        if ($ajax) { wp_send_json(array('ok' => $ok, 'message' => $msg), $ok ? 200 : 400); }
        wp_safe_redirect(add_query_arg('ecn_nl', $ok ? 'ok' : 'error', $back) . '#ecnf-connect'); exit;
    };
    // bots fill the hidden field: accept quietly, store nothing
    if (!empty($_POST['ecn_hp'])) $reply(true, 'Thank you for subscribing!');

    $email = sanitize_email(wp_unslash($_POST['email'] ?? ''));
    if (!is_email($email)) $reply(false, 'Please enter a valid email address.');
    $email = strtolower($email);

    // at most 5 sign-ups per visitor address every 10 minutes
    $ip = isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : '';
    $key = 'ecn_nl_' . md5($ip . wp_salt('nonce'));
    $hits = (int) get_transient($key);
    if ($hits >= 5) $reply(false, 'Too many attempts. Please try again in a few minutes.');
    set_transient($key, $hits + 1, 10 * MINUTE_IN_SECONDS);

    $existing = get_posts(array('post_type' => ECONUR_NL_TYPE, 'post_status' => 'any', 'title' => $email, 'fields' => 'ids', 'numberposts' => 1, 'suppress_filters' => true));
    if ($existing) $reply(true, 'You are already subscribed. Thank you!');

    $src = sanitize_text_field(wp_unslash($_POST['src'] ?? ''));
    $id = wp_insert_post(array('post_type' => ECONUR_NL_TYPE, 'post_status' => 'private', 'post_title' => $email, 'meta_input' => array('_ecn_nl_source' => $src)), true);
    if (is_wp_error($id)) $reply(false, 'Sorry, something went wrong. Please try again.');

    // hand the contact to Hostinger Reach when it is connected
    if ('' !== (string) get_option('hostinger_reach_api_key', '') && has_action('hostinger_reach_submit')) {
        do_action('hostinger_reach_submit', array('email' => $email, 'group' => 'Econur website', 'metadata' => array('plugin' => 'econur-theme')));
        update_post_meta($id, '_ecn_nl_reach', current_time('mysql'));
    }
    $reply(true, 'Thank you for subscribing! We will keep you posted.');
}

// Admin list: email, where it was signed up, date; plus a CSV download.
add_filter('manage_' . ECONUR_NL_TYPE . '_posts_columns', function () {
    return array('cb' => '<input type="checkbox">', 'title' => 'Email', 'ecn_src' => 'Signed up on', 'date' => 'Date');
});
add_action('manage_' . ECONUR_NL_TYPE . '_posts_custom_column', function ($col, $id) {
    if ('ecn_src' !== $col) return;
    $src = (string) get_post_meta($id, '_ecn_nl_source', true);
    if (preg_match('/^product-(\d+)$/', $src, $m) && get_post($m[1])) echo '<a href="' . esc_url(get_permalink($m[1])) . '">' . esc_html(get_the_title($m[1])) . '</a>';
    else echo esc_html($src ? $src : '—');
}, 10, 2);
add_filter('post_row_actions', function ($actions, $post) {
    if (ECONUR_NL_TYPE === $post->post_type) { unset($actions['inline hide-if-no-js'], $actions['edit'], $actions['view']); }
    return $actions;
}, 10, 2);
add_action('admin_notices', function () {
    $s = get_current_screen();
    if (!$s || 'edit-' . ECONUR_NL_TYPE !== $s->id || !current_user_can('manage_woocommerce')) return;
    $url = wp_nonce_url(admin_url('admin-post.php?action=ecn_nl_export'), 'ecn_nl_export');
    $reach = '' !== (string) get_option('hostinger_reach_api_key', '');
    echo '<div class="notice notice-info"><p>Sign-ups from the website newsletter form. <a class="button" href="' . esc_url($url) . '">Download CSV</a> '
        . ($reach ? 'New sign-ups are also sent to Hostinger Reach.' : 'Hostinger Reach is not connected, so sign-ups are kept here only.') . '</p></div>';
});
add_action('admin_post_ecn_nl_export', function () {
    if (!current_user_can('manage_woocommerce')) wp_die('Not allowed.');
    check_admin_referer('ecn_nl_export');
    nocache_headers();
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=econur-subscribers-' . gmdate('Y-m-d') . '.csv');
    $out = fopen('php://output', 'w');
    fputcsv($out, array('email', 'signed_up', 'source'));
    foreach (get_posts(array('post_type' => ECONUR_NL_TYPE, 'post_status' => 'any', 'numberposts' => -1, 'orderby' => 'date', 'order' => 'ASC')) as $p) {
        fputcsv($out, array($p->post_title, $p->post_date, (string) get_post_meta($p->ID, '_ecn_nl_source', true)));
    }
    fclose($out); exit;
});
