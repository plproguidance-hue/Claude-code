<?php
/**
 * Econur header social links: Facebook, Instagram, TikTok after the desktop header's Search / Account / Cart icons,
 * printed through Astra's desktop header column hook so they appear on every page with the main header
 * (econur_header_social_markup() also feeds the mobile dropdown menu, see inc/header-nav.php).
 * Placement and look (divider, 38px sage circles, shown from 1200px, also in the mobile menu) live in
 * assets/econur-header.css and inc/header-nav.php.
 *
 * URLs: Facebook and Instagram are the ones the footer already uses (econur_footer_config()).
 * TikTok: set the real profile URL in the option "econur_social_tiktok_url" (or the econur_social_tiktok_url filter);
 * until then the TikTok circle is shown as a plain icon (not a link), and it becomes a link as soon as the URL is set.
 */
defined('ABSPATH') || exit;

function econur_header_social_links() {
    $urls = array();
    if (function_exists('econur_footer_config')) {
        foreach (econur_footer_config()['social'] as $s) $urls[$s[0]] = $s[2];
    }
    $tiktok = trim((string) apply_filters('econur_social_tiktok_url', get_option('econur_social_tiktok_url', '')));
    $links = array(
        array('facebook',  'ECONUR on Facebook',  $urls['facebook'] ?? ''),
        array('instagram', 'ECONUR on Instagram', $urls['instagram'] ?? ''),
        array('tiktok',    'ECONUR on TikTok',    $tiktok),
    );
    // Facebook / Instagram need their URL; TikTok is always shown (as a plain icon until its URL is set)
    return array_filter($links, function ($l) { return '' !== $l[2] || 'tiktok' === $l[0]; });
}

// the footer's Facebook "f" and Instagram outline, plus the TikTok note in the same weight (24px grid, currentColor)
function econur_header_social_icon($n) {
    $p = array(
        'facebook'  => '<path fill="currentColor" d="M13.6 21v-7.7h2.6l.4-3h-3V8.4c0-.9.3-1.5 1.5-1.5h1.6V4.2c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.9v3h2.6V21h3.1Z"/>',
        'instagram' => '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/></g><circle cx="17.2" cy="6.8" r="1" fill="currentColor"/>',
        'tiktok'    => '<path fill="currentColor" d="M16.6 3c.3 2.2 1.6 3.6 3.9 3.8v2.6c-1.3.1-2.6-.3-3.9-1.1v5.1c0 3.3-2.3 5.6-5.4 5.6S5.8 16.8 5.8 14c0-3.1 2.6-5.4 5.9-5v2.7c-1.5-.4-3.1.5-3.1 2.2 0 1.3 1 2.3 2.4 2.3 1.6 0 2.6-1 2.6-2.9V3h3Z"/>',
    );
    return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">' . $p[$n] . '</svg>';
}

function econur_header_social_markup($extra = '') {
    $links = econur_header_social_links();
    if (!$links) return '';
    $o = '<ul class="ecn-hsocial' . ($extra ? ' ' . esc_attr($extra) : '') . '">';
    foreach ($links as $l) {
        if ('' === $l[2]) { // no URL yet: the same circle, not clickable and skipped by screen readers
            $o .= '<li><span class="ecn-hsocial-' . esc_attr($l[0]) . ' ecn-hsocial-nolink" aria-hidden="true">' . econur_header_social_icon($l[0]) . '</span></li>';
            continue;
        }
        $o .= '<li><a class="ecn-hsocial-' . esc_attr($l[0]) . '" href="' . esc_url($l[2]) . '" target="_blank" rel="noopener noreferrer" aria-label="' . esc_attr($l[1]) . '">'
            . econur_header_social_icon($l[0]) . '</a></li>';
    }
    return $o . '</ul>';
}

add_action('astra_render_header_column', function ($row, $column) {
    if ('primary' !== $row || 'right' !== $column) return;
    echo econur_header_social_markup();
}, 20, 2);
