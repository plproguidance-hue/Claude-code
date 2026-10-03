<?php
/**
 * ECONUR social sign-in: Google and Facebook through the Nextend Social Login plugin (free, WordPress.org).
 *
 * Nextend does the OAuth work on the server (its callback is /wp-login.php?loginSocial=google|facebook, the client secret
 * stays in its settings, the state parameter guards the callback) and keeps only a user ID <-> provider ID link in its
 * wp_social_users table. Accounts are ordinary WordPress users. This file decides how that fits ECONUR:
 *   - buttons on /login/ (filter econur_login_social_buttons) only for a provider Nextend reports enabled, which it allows
 *     only after the admin "Verify settings" test passed, and only while the Privacy Policy page is public;
 *   - a first social sign-in creates a WooCommerce customer (role customer, WooCommerce's own new-account email);
 *   - an existing account is never joined because the email matches: the visitor is asked to use the password, and can
 *     connect Google / Facebook later from My Account > Account details while signed in;
 *   - no account without a usable email address (Facebook can return none), never a placeholder address;
 *   - staff accounts (anyone who can edit content or manage the shop) cannot sign in with Google / Facebook;
 *   - Nextend's messages come back to /login/ (or My Account) in Bengali instead of /wp-login.php;
 *   - nothing is added to /wp-login.php or the WordPress profile screen, and Nextend's own front-end CSS / JS stay off
 *     (the buttons here are plain links, the sign-in happens in the same window).
 * Returning to checkout / cart / My Account uses the page's own safe target (econur_login_target); Nextend checks it again
 * with wp_validate_redirect before redirecting.
 */
defined('ABSPATH') || exit;

const ECONUR_SOCIAL_IDS = array('google', 'facebook');

function econur_social_ready() {
    return class_exists('NextendSocialLogin', false) && !empty(NextendSocialLogin::$settings);
}
function econur_social_label($id) {
    return 'facebook' === $id ? 'Facebook' : 'Google';
}
// providers to show: enabled in Nextend (configured + verified) and a public Privacy Policy page
function econur_social_providers() {
    $out = array();
    if (econur_social_ready() && '' !== get_privacy_policy_url()) {
        foreach (ECONUR_SOCIAL_IDS as $id) {
            if (NextendSocialLogin::isProviderEnabled($id)) $out[$id] = NextendSocialLogin::$enabledProviders[$id];
        }
    }
    return apply_filters('econur_social_providers', $out);
}
function econur_social_is_staff($user_id) {
    return user_can($user_id, 'edit_posts') || user_can($user_id, 'manage_woocommerce');
}
// sign in with the provider, then come back to $back (Nextend validates it again)
function econur_social_url($provider, $back) {
    return add_query_arg('redirect', urlencode($back), $provider->getLoginUrl());
}
function econur_social_icon($id) {
    if ('facebook' === $id) {
        return '<svg class="econur-social-ic" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path fill="#0866FF" d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.026 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>';
    }
    return '<svg class="econur-social-ic" viewBox="0 0 48 48" width="20" height="20" aria-hidden="true" focusable="false"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
}

/* ---------------------------------------------------------------- the buttons on /login/ */
add_filter('econur_login_social_buttons', function ($html) {
    $providers = econur_social_providers();
    if (!$providers) return $html;
    $back = econur_login_target();
    foreach ($providers as $id => $p) {
        $html .= sprintf(
            '<a class="econur-social-btn econur-social-btn--%1$s" href="%2$s" rel="nofollow">%3$s<span>%4$s দিয়ে সাইন ইন</span></a>',
            esc_attr($id), esc_url(econur_social_url($p, $back)), econur_social_icon($id), esc_html(econur_social_label($id))
        );
    }
    return $html;
});

/* ---------------------------------------------------------------- Nextend: quiet outside its own work */
add_action('init', function () {
    if (!econur_social_ready()) return;
    // no "link your account" box on the WordPress profile screen (staff do not use social sign-in)
    remove_action('profile_personal_options', 'NextendSocialLogin::addLinkAndUnlinkButtons');
});
// front end: Nextend's button CSS / popup script are not used by the ECONUR buttons
add_action('wp', function () {
    if (econur_social_ready()) NextendSocialLogin::removeFrontendAssets();
});

/* ---------------------------------------------------------------- who may sign up / sign in */
$GLOBALS['econur_social_msg'] = '';
function econur_social_back() {
    $to = '';
    if (class_exists('\NSL\Persistent\Persistent', false)) $to = (string) \NSL\Persistent\Persistent::get('redirect');
    $to = $to ? wp_validate_redirect($to, '') : '';
    return econur_login_url($to);
}
add_filter('nsl_is_register_allowed', function ($allowed, $provider = null) {
    if (!$allowed || !is_object($provider)) return $allowed;
    $label = econur_social_label($provider->getId());
    if (!econur_login_can_register()) {
        $GLOBALS['econur_social_msg'] = 'এই মুহূর্তে নতুন অ্যাকাউন্ট তৈরি করা যাচ্ছে না।';
        return false;
    }
    $email = (string) $provider->getAuthUserData('email');
    $me = method_exists($provider, 'getMe') ? (array) $provider->getMe() : array();
    if ('' === $email || !is_email($email) || (isset($me['verified_email']) && !$me['verified_email'])) {
        $GLOBALS['econur_social_msg'] = 'facebook' === $provider->getId()
            ? 'আপনার Facebook অ্যাকাউন্ট থেকে ইমেইল পাওয়া যায়নি। অনুগ্রহ করে Google দিয়ে সাইন ইন করুন অথবা ইমেইল দিয়ে অ্যাকাউন্ট তৈরি করুন।'
            : "আপনার {$label} অ্যাকাউন্ট থেকে যাচাই করা ইমেইল পাওয়া যায়নি। অনুগ্রহ করে ইমেইল দিয়ে অ্যাকাউন্ট তৈরি করুন।";
        return false;
    }
    return true;
}, 20, 2);
add_filter('nsl_disabled_register_error_message', function ($m) { return $GLOBALS['econur_social_msg'] ?: ($m ?: 'এই মুহূর্তে নতুন অ্যাকাউন্ট তৈরি করা যাচ্ছে না।'); });
add_filter('nsl_disabled_register_redirect_url', function () { return econur_social_back(); });
// Google: ask for the "verified_email" flag with the profile, so an unverified address is refused above
add_filter('nsl_google_sync_node_fields', function ($fields, $node = '') {
    if ('me' === $node && is_array($fields)) $fields[] = 'verified_email';
    return $fields;
}, 10, 2);

// never join an existing account because the email matches
foreach (ECONUR_SOCIAL_IDS as $econur_sid) {
    add_filter("nsl_{$econur_sid}_auto_link_allowed", function () {
        if (class_exists('\NSL\Notices', false)) \NSL\Notices::addError('এই ইমেইলে আগে থেকেই একটি অ্যাকাউন্ট আছে। অনুগ্রহ করে আপনার পাসওয়ার্ড দিয়ে সাইন ইন করুন।');
        return false;
    }, 99);
    // staff accounts sign in with their password only
    add_filter("nsl_{$econur_sid}_is_login_allowed", function ($allowed, $provider = null, $user_id = 0) {
        if ($allowed && $user_id && econur_social_is_staff($user_id)) {
            $GLOBALS['econur_social_msg'] = 'এই অ্যাকাউন্টে Google বা Facebook দিয়ে সাইন ইন করা যায় না। অনুগ্রহ করে পাসওয়ার্ড দিয়ে সাইন ইন করুন।';
            return false;
        }
        return $allowed;
    }, 99, 3);
}
unset($econur_sid);
add_filter('nsl_autolink_error_redirect_url', function () { return econur_social_back(); });
add_filter('nsl_disabled_login_error_message', function ($m) { return $GLOBALS['econur_social_msg'] ?: $m; });
add_filter('nsl_disabled_login_redirect_url', function ($u) { return $GLOBALS['econur_social_msg'] ? econur_social_back() : $u; });

/* ---------------------------------------------------------------- a new social account is a WooCommerce customer */
function econur_social_customer_role() { return 'customer'; }
add_action('nsl_pre_register_new_user', function () {
    add_filter('pre_option_default_role', 'econur_social_customer_role');
});
add_action('nsl_register_new_user', function ($user_id) {
    remove_filter('pre_option_default_role', 'econur_social_customer_role');
    $u = get_userdata($user_id);
    if ($u && !in_array('customer', (array) $u->roles, true) && !econur_social_is_staff($user_id)) $u->set_role('customer');
    // WooCommerce's own "account created" email instead of WordPress's set-a-password email (none to the admin, as for
    // accounts created on /login/)
    remove_action('register_new_user', 'wp_send_new_user_notifications');
    if (function_exists('WC')) WC()->mailer()->customer_new_account($user_id, array(), false);
}, 5);

/* ---------------------------------------------------------------- Nextend's messages, in Bengali, on ECONUR pages */
function econur_social_notice_bn($msg, $type) {
    $plain = trim(wp_strip_all_tags((string) $msg));
    if ('' === $plain) return '';
    if (preg_match('/[\x{0980}-\x{09FF}]/u', $plain)) return $plain; // already ours
    foreach (ECONUR_SOCIAL_IDS as $id) {
        $l = econur_social_label($id);
        if (false === strpos($plain, $l)) continue;
        if (false !== stripos($plain, 'successfully linked')) return "আপনার {$l} অ্যাকাউন্ট যুক্ত হয়েছে। এখন থেকে {$l} দিয়েও সাইন ইন করতে পারবেন।";
        if (false !== stripos($plain, 'already linked to another user')) return "এই {$l} অ্যাকাউন্টটি অন্য একটি অ্যাকাউন্টের সাথে যুক্ত আছে।";
        if (false !== stripos($plain, 'already linked a')) return "আপনার অ্যাকাউন্টে আগেই একটি {$l} অ্যাকাউন্ট যুক্ত আছে।";
    }
    if (false !== stripos($plain, 'Unlink successful')) return 'সংযোগ বিচ্ছিন্ন হয়েছে।';
    return 'success' === $type ? 'সম্পন্ন হয়েছে।' : 'সাইন ইন সম্পন্ন হয়নি। অনুগ্রহ করে আবার চেষ্টা করুন।';
}
add_action('template_redirect', function () {
    if (empty($_GET['nsl-notice']) || !econur_social_ready() || !class_exists('\NSL\Persistent\Persistent', false)) return; // phpcs:ignore WordPress.Security.NonceVerification
    if (!econur_is_login_page() && !(function_exists('is_account_page') && is_account_page())) return;
    $n = maybe_unserialize(\NSL\Persistent\Persistent::get('notices'));
    if (class_exists('\NSL\Notices', false)) \NSL\Notices::clear();
    if (!is_array($n)) return;
    foreach (array('error', 'success') as $type) {
        foreach ((array) ($n[$type] ?? array()) as $m) {
            $bn = econur_social_notice_bn($m, $type);
            if ($bn && !wc_has_notice($bn, $type)) wc_add_notice($bn, $type);
        }
    }
}, 5);
// any other Nextend hand-back to /wp-login.php (it adds nsl-notice=1) goes to the ECONUR page instead
add_action('login_init', function () {
    if (empty($_GET['nsl-notice']) || !empty($_REQUEST['loginSocial']) || isset($_REQUEST['interim-login']) || isset($_GET['interim_login'])) return; // phpcs:ignore WordPress.Security.NonceVerification
    if (!econur_social_ready() || !econur_login_live()) return;
    $to = is_user_logged_in() ? wc_get_account_endpoint_url('edit-account') : econur_social_back();
    wp_safe_redirect(add_query_arg('nsl-notice', 1, $to));
    exit;
}, 1);

/* ---------------------------------------------------------------- My Account > Account details: connect Google / Facebook */
add_action('woocommerce_after_edit_account_form', function () {
    $providers = econur_social_providers();
    $uid = get_current_user_id();
    if (!$providers || !$uid || econur_social_is_staff($uid)) return;
    $back = wc_get_account_endpoint_url('edit-account');
    echo '<section class="econur-social-connect" lang="bn" aria-labelledby="econur-social-connect-h">';
    echo '<h3 id="econur-social-connect-h">সংযুক্ত অ্যাকাউন্ট</h3><p>যুক্ত করলে পরের বার এক ক্লিকে সাইন ইন করতে পারবেন।</p><ul>';
    foreach ($providers as $id => $p) {
        $l = econur_social_label($id);
        echo '<li>';
        if ($p->isCurrentUserConnected()) {
            echo '<span class="econur-social-on">' . econur_social_icon($id) . esc_html("{$l} যুক্ত আছে") . '</span>'; // phpcs:ignore
        } else {
            $url = add_query_arg(array('action' => 'link', 'redirect' => urlencode($back)), $p->getLoginUrl());
            echo '<a class="econur-social-btn econur-social-btn--' . esc_attr($id) . '" href="' . esc_url($url) . '" rel="nofollow">' . econur_social_icon($id) . '<span>' . esc_html("{$l} অ্যাকাউন্ট যুক্ত করুন") . '</span></a>'; // phpcs:ignore
        }
        echo '</li>';
    }
    echo '</ul></section>';
    ?>
<style>
.econur-social-connect{ margin-top:32px; padding-top:24px; border-top:1px solid #E8E3D8; }
.econur-social-connect h3{ margin:0 0 4px; font-size:18px; }
.econur-social-connect p{ margin:0 0 14px; color:#5F6A65; font-size:14px; }
.econur-social-connect ul{ display:flex; flex-wrap:wrap; gap:10px; margin:0; padding:0; list-style:none; }
.econur-social-connect li{ margin:0; }
.econur-social-connect .econur-social-btn, .econur-social-connect .econur-social-on{ display:inline-flex; align-items:center; gap:10px; min-height:48px; padding:0 18px; border:1px solid #DCD6CA; border-radius:12px; background:#fff; color:#183F43; font-weight:600; font-size:15px; line-height:1.2; text-decoration:none; }
.econur-social-connect .econur-social-btn:hover{ border-color:#B9B2A4; background:#FBF9F4; }
.econur-social-connect .econur-social-btn:focus-visible{ outline:2px solid #1B7A80; outline-offset:2px; }
.econur-social-connect .econur-social-on{ background:#EAF1E8; border-color:#D3E3D0; }
.econur-social-connect svg{ flex:none; width:20px; height:20px; }
</style>
    <?php
});
