<?php
/**
 * Econur "Good to know" FAQ + final call to action (homepage), shortcode [econur_help_cta].
 * One organic panel: FAQ intro and botanical soap art beside a single-open accordion, then the closing CTA with the
 * reassurance strip. Links reuse the destinations the old section used (#bestsellers, the store WhatsApp number).
 * Styles and script: assets/help-cta.css and assets/help-cta.js, loaded only on pages that use the shortcode.
 */
defined('ABSPATH') || exit;

function econur_help_cta_config() {
    return array(
        'faq' => array(
            array('q' => 'How do I pay?',
                  'a' => 'Cash on delivery, anywhere in Bangladesh. Order, we call within 12 hours to confirm, and you pay when the parcel arrives.'),
            array('q' => 'How long does delivery take?',
                  'a' => 'Inside Dhaka 1 to 2 working days (৳60). Outside Dhaka 2 to 4 working days (৳120). Charges are shown at checkout before you confirm.'),
            array('q' => 'Is it safe for sensitive skin or babies?',
                  'a' => 'Olivelle Bar is made for babies and sensitive skin: ultra-mild, fragrance-free, over 80% olive oil. For the other bars, patch-test first if your skin reacts easily.'),
            array('q' => 'How do I choose the right bar?',
                  'a' => 'Use the {finder} section above to match your skin concern with the most relevant ECONUR bar.'),
            array('q' => 'Can I order through WhatsApp?',
                  'a' => 'Yes. Tap “Chat on WhatsApp” and our team can help with product selection and ordering.'),
        ),
        'shop_url'     => '#bestsellers',
        'whatsapp_url' => 'https://wa.me/8801410753555',
        'finder_url'   => '#finder',
        // [icon, title, line]. Only statements the store settings support: cash on delivery is the payment method for
        // the Bangladesh-only shipping zone, the finder above matches bars to skin concerns, and every order is confirmed
        // by phone (the store's cash-on-delivery policy).
        'trust' => array(
            array('truck',  'Cash on delivery', 'Across Bangladesh'),
            array('leaf',   'Find your bar',    'Matched to your skin concern'),
            array('shield', 'We call to confirm', 'Every order, within 12 hours'),
        ),
        // media IDs: leaf spray, pale green + ivory soap bars on stone, soap on a wood slice, leaf sprig
        'art' => array('leaves' => 154, 'soaps' => 129, 'cta_soap' => 155, 'sprig' => 131),
    );
}

function econur_help_cta_icon($n) {
    $i = array(
        'truck'  => '<path d="M2.5 6.5h11v9h-11z"/><path d="M13.5 9.5h4l3 3v3h-7"/><circle cx="6.5" cy="17" r="1.8"/><circle cx="17" cy="17" r="1.8"/>',
        'leaf'   => '<path d="M5 19c0-8 5-13.5 15-14-.4 9.6-5.8 15-13.4 15"/><path d="M5 19c2.6-4.3 5.6-7.2 9.5-9.4"/>',
        'shield' => '<path d="M12 22s8-3.6 8-10V5l-8-3-8 3v7c0 6.4 8 10 8 10Z"/><path d="m8.8 12 2.2 2.2 4.3-4.4"/>',
        'arrow'  => '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    );
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . $i[$n] . '</svg>';
}

function econur_help_cta_whatsapp_icon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.56.12-.16.25-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.12-1.04-.38-1.99-1.23-.73-.66-1.23-1.47-1.37-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.16 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.46-.6 1.67-1.18.21-.58.21-1.08.14-1.18-.06-.1-.22-.16-.47-.28Z"/></svg>';
}

function econur_help_cta_img($id, $class, $sizes, $eager = false) {
    if (!$id || !wp_attachment_is_image($id)) return '';
    return wp_get_attachment_image($id, 'full', false, array('class' => $class, 'alt' => '', 'aria-hidden' => 'true', 'loading' => $eager ? 'eager' : 'lazy', 'decoding' => 'async', 'sizes' => $sizes));
}

add_shortcode('econur_help_cta', function () {
    $c = econur_help_cta_config();
    $uid = 'ehc-' . wp_unique_id();
    $finder = '<a href="' . esc_url($c['finder_url']) . '">“Find your bar”</a>';

    $items = '';
    foreach ($c['faq'] as $n => $f) {
        $open = 0 === $n;
        $q = $uid . '-q' . $n; $a = $uid . '-a' . $n;
        $answer = str_replace('{finder}', $finder, esc_html($f['a']));
        $items .= '<div class="ehc-item' . ($open ? ' is-open' : '') . '">'
            . '<h3 class="ehc-q"><button type="button" id="' . $q . '" aria-expanded="' . ($open ? 'true' : 'false') . '" aria-controls="' . $a . '">'
            . '<span class="ehc-q-text">' . esc_html($f['q']) . '</span><span class="ehc-pm" aria-hidden="true"></span></button></h3>'
            . '<div class="ehc-a" id="' . $a . '" role="region" aria-labelledby="' . $q . '"><div class="ehc-a-in"><p>' . $answer . '</p></div></div>'
            . '</div>';
    }

    $trust = '';
    foreach ($c['trust'] as $t) {
        $trust .= '<li class="ehc-trust-item"><span class="ehc-trust-ico">' . econur_help_cta_icon($t[0]) . '</span>'
            . '<span class="ehc-trust-copy"><b>' . esc_html($t[1]) . '</b><span>' . esc_html($t[2]) . '</span></span></li>';
    }

    $art = $c['art'];
    wp_enqueue_style('econur-help-cta');
    wp_enqueue_script('econur-help-cta');

    return '<section class="ehc" aria-labelledby="' . $uid . '-t">'
        . '<div class="ehc-faq">'
        . econur_help_cta_img($art['leaves'], 'ehc-art ehc-art--leaves', '(max-width: 699px) 120px, 300px')
        . '<div class="ehc-intro">'
        . '<p class="ehc-eyebrow">Help &amp; delivery</p>'
        . '<h2 class="ehc-title" id="' . $uid . '-t">Good to know</h2>'
        . '<p class="ehc-sub">Quick answers before you order.</p>'
        . econur_help_cta_img($art['soaps'], 'ehc-art ehc-art--soaps', '(max-width: 699px) 200px, 380px')
        . '</div>'
        . '<div class="ehc-acc">' . $items . '</div>'
        . '</div>'
        . '<div class="ehc-cta">'
        . econur_help_cta_img($art['sprig'], 'ehc-art ehc-art--sprig', '220px')
        . econur_help_cta_img($art['cta_soap'], 'ehc-art ehc-art--cta-soap', '(max-width: 699px) 120px, 240px')
        . '<p class="ehc-eyebrow">Ready to start?</p>'
        . '<h2 class="ehc-cta-title" id="' . $uid . '-ct">Honest skincare, delivered to your door.</h2>'
        . '<p class="ehc-cta-sub">Cash on delivery across Bangladesh. We call to confirm every order.</p>'
        . '<div class="ehc-btns">'
        . '<a class="ehc-btn ehc-btn--primary" href="' . esc_url($c['shop_url']) . '">Shop bestsellers ' . econur_help_cta_icon('arrow') . '</a>'
        . '<a class="ehc-btn ehc-btn--wa" href="' . esc_url($c['whatsapp_url']) . '">' . econur_help_cta_whatsapp_icon() . 'Chat on WhatsApp</a>'
        . '</div>'
        . '<ul class="ehc-trust">' . $trust . '</ul>'
        . '</div>'
        . '</section>';
});

add_action('wp_enqueue_scripts', function () {
    $v = '1.0.0';
    $u = get_stylesheet_directory_uri() . '/assets/';
    wp_register_style('econur-help-cta', $u . 'help-cta.css', array(), $v);
    wp_register_script('econur-help-cta', $u . 'help-cta.js', array(), $v, array('in_footer' => true, 'strategy' => 'defer'));
    // load the stylesheet in the head on pages that use the shortcode, so the section never renders unstyled
    if (is_singular()) {
        $id = get_queried_object_id();
        if (false !== strpos((string) get_post_field('post_content', $id) . (string) get_post_meta($id, '_elementor_data', true), '[econur_help_cta')) {
            wp_enqueue_style('econur-help-cta');
            wp_enqueue_script('econur-help-cta');
        }
    }
}, 20);
