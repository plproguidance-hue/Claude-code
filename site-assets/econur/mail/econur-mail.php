<?php
/**
 * Plugin Name: ECONUR Mail
 * Description: Every email from the store goes out as "Econur <orders@econur.shop>" (WordPress's own emails too, which otherwise say "WordPress <wordpress@…>"). When the mailbox login is set in wp-config.php (ECONUR_SMTP_USER / ECONUR_SMTP_PASS), mail is sent through Hostinger Email (smtp.hostinger.com) so it is DKIM-signed for econur.shop and passes DMARC; if that login ever fails, the email is resent the old way so no order email is lost. Kill switch: option econur_mail_mode = "off".
 * Version: 1.1.0
 *
 * WooCommerce's own sender, Reply-To and colours are set in WooCommerce > Settings > Emails.
 */
defined('ABSPATH') || exit;

function ecn_mail_on() {
    return 'off' !== get_option('econur_mail_mode');
}

function ecn_mail_smtp() {
    return ecn_mail_on() && empty($GLOBALS['ecn_mail_no_smtp']) && defined('ECONUR_SMTP_USER') && defined('ECONUR_SMTP_PASS') && ECONUR_SMTP_USER && ECONUR_SMTP_PASS;
}

function ecn_mail_from() {
    if (ecn_mail_smtp()) return ECONUR_SMTP_USER; // Hostinger only sends as the signed-in mailbox
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

// WooCommerce's own From address follows the signed-in mailbox when SMTP is on.
add_filter('woocommerce_email_from_address', function ($from) {
    return ecn_mail_smtp() ? ECONUR_SMTP_USER : $from;
}, 20);

add_action('phpmailer_init', function ($m) {
    if (!ecn_mail_on()) return;
    if (ecn_mail_smtp()) {
        $m->isSMTP();
        $m->Host = defined('ECONUR_SMTP_HOST') ? ECONUR_SMTP_HOST : 'smtp.hostinger.com';
        $m->Port = 465;
        $m->SMTPSecure = 'ssl';
        $m->SMTPAuth = true;
        $m->Username = ECONUR_SMTP_USER;
        $m->Password = ECONUR_SMTP_PASS;
        $m->Timeout = 15;
        if (strtolower($m->From) !== strtolower(ECONUR_SMTP_USER)) $m->setFrom(ECONUR_SMTP_USER, $m->FromName ?: 'Econur', false);
        $m->Sender = ECONUR_SMTP_USER;
        $GLOBALS['ecn_mail_used_smtp'] = true;
        return;
    }
    // Envelope sender (Return-Path) on the same domain as the From address.
    if (empty($m->Sender) && '@econur.shop' === substr(strtolower($m->From), -12)) $m->Sender = $m->From;
});

// If the mailbox login fails (wrong password, server down), send the same email once more the old way.
add_action('wp_mail_failed', function ($error) {
    if (empty($GLOBALS['ecn_mail_used_smtp']) || !empty($GLOBALS['ecn_mail_no_smtp'])) return;
    $d = $error->get_error_data();
    if (!is_array($d) || empty($d['to'])) return;
    update_option('econur_mail_last_smtp_error', array('time' => current_time('mysql'), 'error' => $error->get_error_message()), false);
    $GLOBALS['ecn_mail_no_smtp'] = true;
    $GLOBALS['ecn_mail_used_smtp'] = false;
    wp_mail($d['to'], $d['subject'] ?? '', $d['message'] ?? '', $d['headers'] ?? array(), $d['attachments'] ?? array());
    $GLOBALS['ecn_mail_no_smtp'] = false;
});
