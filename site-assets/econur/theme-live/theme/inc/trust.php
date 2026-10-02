<?php
/**
 * Econur trust and guarantees section. [econur_trust]
 * Phones: one soft card, icon rows. Tablet and up: three centred columns with dividers.
 */
defined('ABSPATH') || exit;

function econur_trust_html() {
    $items = array(
        array(
            'title' => 'Cash on delivery',
            'text'  => 'Pay when the parcel arrives, anywhere in Bangladesh.',
            'icon'  => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 7V5.5A1.5 1.5 0 0 0 17.5 4H5a2 2 0 0 0 0 4h14a1 1 0 0 1 1 1v3"/><path d="M3 6v12a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-3"/><path d="M21 12v4h-4a2 2 0 0 1 0-4h4Z"/></svg>',
        ),
        array(
            'title' => 'Delivery',
            'text'  => 'Inside Dhaka 1 to 2 days, outside Dhaka 2 to 4 days.',
            'icon'  => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 17h4V6H3v11h1.5"/><path d="M14 9h4l3 3.5V17h-1.5"/><circle cx="7" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/><path d="M1 9.5h3M0.5 12.5h3.5"/></svg>',
        ),
        array(
            'title' => 'We call to confirm',
            'text'  => 'Every order is confirmed by phone within 12 hours.',
            'icon'  => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 16.4v2.9a1.9 1.9 0 0 1-2.1 1.9 18.9 18.9 0 0 1-8.2-2.9 18.6 18.6 0 0 1-5.7-5.7A18.9 18.9 0 0 1 2.1 4.4 1.9 1.9 0 0 1 4 2.3h2.9a1.9 1.9 0 0 1 1.9 1.6c.1 1 .4 1.9.7 2.8a1.9 1.9 0 0 1-.4 2L7.8 10a15.2 15.2 0 0 0 5.7 5.7l1.2-1.2a1.9 1.9 0 0 1 2-.4c.9.3 1.8.6 2.8.7a1.9 1.9 0 0 1 1.5 1.6Z"/><path d="m15 5.5 1.8 1.8L20.5 3.6"/></svg>',
        ),
    );
    $h = '<section class="ecn-trustx" aria-label="Shopping with Econur"><ul class="ecn-trustx-list">';
    foreach ($items as $it) {
        $h .= '<li class="ecn-trustx-item"><span class="ecn-trustx-ico">' . $it['icon'] . '</span><span class="ecn-trustx-copy"><b>' . esc_html($it['title']) . '</b><span>' . esc_html($it['text']) . '</span></span></li>';
    }
    return $h . '</ul></section>';
}
add_shortcode('econur_trust', 'econur_trust_html');