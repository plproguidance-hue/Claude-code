<?php
/**
 * Plugin Name: ECONUR Mail
 * Description: Every email from the store goes out as "Econur <orders@econur.shop>" (WordPress's own emails too, which otherwise say "WordPress <wordpress@…>"), with the envelope sender on the same domain so SPF/DMARC line up. Kill switch: option econur_mail_mode = "off".
 * Version: 1.0.0
 *
 * WooCommerce's own sender, Reply-To and colours are set in WooCommerce > Settings > Emails.
 */
defined('ABSPATH') || exit;

function ecn_mail_on() {
    return 'off' !== get_option('econur_mail_mode');
}

function ecn_mail_from() {
    $from = get_option('woocommerce_email_from_address');
    return ($from && is_email($from) && '@econur.shop' === substr($from, -12)) ? $from : 'orders@econur.shop';
}

// WordPress core emails (password resets, account notices): replace the default wordpress@ sender and "WordPress" name.
add_filter('wp_mail_from', function ($from) {
    if (!ecn_mail_on()) return $from;
    return (0 === strpos($from, 'wordpress@') || false !== stripos($from, '@gmail.com')) ? ecn_mail_from() : $from;
}, 20);
add_filter('wp_mail_from_name', function ($name) {
    return (ecn_mail_on() && 'WordPress' === $name) ? (get_option('woocommerce_email_from_name') ?: 'Econur') : $name;
}, 20);

// Envelope sender (Return-Path) on the same domain as the From address, so SPF passes for econur.shop.
add_action('phpmailer_init', function ($m) {
    if (!ecn_mail_on() || !empty($m->Sender)) return;
    if ('@econur.shop' === substr(strtolower($m->From), -12)) $m->Sender = $m->From;
});
