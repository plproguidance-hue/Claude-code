<?php
/**
 * Econur site footer: replaces the Astra footer-builder output with one organic, rounded footer card.
 * Desktop: brand | Shop | Help | Order & Support, then the legal strip. Phones: brand block, then Shop / Help /
 * Order & Support as accordions (all closed), the WhatsApp button and the stacked legal lines.
 * Links are the ones the previous footer used. The Astra footer settings are left untouched, so removing the
 * require line in functions.php brings the old footer back. Styles/script: assets/site-footer.css, site-footer.js.
 */
defined('ABSPATH') || exit;

function econur_footer_config() {
    $wa = 'https://wa.me/8801410753555';
    return array(
        'logo'  => 98, // econur-logo-official.webp (the official wordmark, also used in the header)
        'about' => 'Handcrafted, 100% natural, chemical-free skincare, made in Bangladesh from cold-pressed oils and plant botanicals, in packaging that returns to the soil.',
        'social' => array(
            array('facebook',  'Econur on Facebook',  'https://facebook.com/econurskincare'),
            array('instagram', 'Econur on Instagram', 'https://instagram.com/econur.skincare'),
            array('whatsapp',  'Chat with Econur on WhatsApp', $wa),
        ),
        'shop' => array(
            array('All products', '/shop/'),
            array('Face Care',    '/product-category/face-care/'),
            array('Baby Care',    '/product-category/baby-care/'),
            array('Hair Care',    '/product-category/hair-care/'),
            array('Daily Care',   '/product-category/daily-care/'),
        ),
        'help' => array(
            array('My account',       '/my-account/'),
            array('Cart',             '/cart/'),
            // shown only once the page is published (page 11 and page 3 are drafts today), so the footer never links to a 404
            array('Refund & returns', 'page:11'),
            array('Privacy policy',   'page:3'),
        ),
        // [icon, text, link]
        'support' => array(
            array('truck',    'সারা দেশে ক্যাশ অন ডেলিভারি', ''),
            array('phone',    'প্রতিটি অর্ডার 12 ঘণ্টার মধ্যে ফোনে নিশ্চিত করা হয়।', ''),
            array('whatsapp', 'WhatsApp: +880 1410-753555', $wa),
        ),
        'whatsapp_url' => $wa,
        // media IDs: leaf spray, soap bars on stone with flowers, soap on a wood slice with linen, leaf sprig
        'art' => array('leaves' => 154, 'soaps' => 129, 'soap_linen' => 155, 'sprig' => 131),
    );
}

function econur_footer_icon($n) {
    $line = array(
        'truck' => '<path d="M2.5 6.5h11v9h-11z"/><path d="M13.5 9.5h4l3 3v3h-7"/><circle cx="6.5" cy="17" r="1.8"/><circle cx="17" cy="17" r="1.8"/>',
        'phone' => '<path d="M21 16.9v2.6a1.8 1.8 0 0 1-2 1.8 17.8 17.8 0 0 1-7.8-2.8 17.5 17.5 0 0 1-5.4-5.4A17.8 17.8 0 0 1 3 5.2 1.8 1.8 0 0 1 4.8 3.2h2.6a1.8 1.8 0 0 1 1.8 1.6c.1.9.3 1.7.6 2.5a1.8 1.8 0 0 1-.4 1.9L8.3 10.3a14.4 14.4 0 0 0 5.4 5.4l1.1-1.1a1.8 1.8 0 0 1 1.9-.4c.8.3 1.6.5 2.5.6a1.8 1.8 0 0 1 1.6 1.8Z"/>',
        'arrow' => '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
        'leaf'  => '<path d="M5 19c0-8 5-13.5 15-14-.4 9.6-5.8 15-13.4 15"/><path d="M5 19c2.6-4.3 5.6-7.2 9.5-9.4"/>',
        'heart' => '<path d="M12 20s-7.5-4.6-7.5-10.3A4.3 4.3 0 0 1 12 7.1a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z"/>',
        'instagram' => '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".6" fill="currentColor" stroke="none"/>',
    );
    $fill = array(
        'facebook' => '<path fill="currentColor" d="M13.6 21v-7.7h2.6l.4-3h-3V8.4c0-.9.3-1.5 1.5-1.5h1.6V4.2c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.9v3h2.6V21h3.1Z"/>',
        'whatsapp' => '<path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.56.12-.16.25-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.12-1.04-.38-1.99-1.23-.73-.66-1.23-1.47-1.37-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.16 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.46-.6 1.67-1.18.21-.58.21-1.08.14-1.18-.06-.1-.22-.16-.47-.28Z"/>',
    );
    if (isset($fill[$n])) return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' . $fill[$n] . '</svg>';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . $line[$n] . '</svg>';
}

function econur_footer_art($id, $class, $sizes) {
    if (!$id || !wp_attachment_is_image($id)) return '';
    return wp_get_attachment_image($id, 'full', false, array('class' => 'ecnf-art ' . $class, 'alt' => '', 'aria-hidden' => 'true', 'loading' => 'lazy', 'decoding' => 'async', 'sizes' => $sizes));
}

function econur_footer_links($links) {
    $h = '<ul class="ecnf-links">';
    foreach ($links as $l) {
        $url = $l[1];
        if (0 === strpos($url, 'page:')) {
            $id = (int) substr($url, 5);
            if ('publish' !== get_post_status($id)) continue;
            $url = get_permalink($id);
        }
        $h .= '<li><a href="' . esc_url($url) . '">' . esc_html($l[0]) . '</a></li>';
    }
    return $h . '</ul>';
}

/* One column: a plain heading on desktop and tablets, an accordion button on phones (only one of the two is ever
   displayed, so assistive technology meets a single heading). */
function econur_footer_col($key, $title, $body, $nav = true) {
    $id = 'ecnf-' . $key;
    $tag = $nav ? 'nav' : 'div';
    return '<div class="ecnf-col ecnf-col--' . $key . '">'
        . '<h2 class="ecnf-h ecnf-h--static">' . esc_html($title) . '</h2>'
        . '<h2 class="ecnf-h ecnf-h--toggle"><button type="button" aria-expanded="false" aria-controls="' . $id . '-p">'
        . '<span>' . esc_html($title) . '</span><span class="ecnf-pm" aria-hidden="true"></span></button></h2>'
        . '<' . $tag . ' class="ecnf-panel" id="' . $id . '-p"' . ($nav ? ' aria-label="' . esc_attr($title) . '"' : '') . '><div class="ecnf-panel-in">' . $body . '</div></' . $tag . '>'
        . '</div>';
}

function econur_footer_markup() {
    $c = econur_footer_config();
    $art = $c['art'];

    $social = '<ul class="ecnf-social">';
    foreach ($c['social'] as $s) {
        $social .= '<li><a href="' . esc_url($s[2]) . '" target="_blank" rel="noopener" aria-label="' . esc_attr($s[1]) . '">' . econur_footer_icon($s[0]) . '</a></li>';
    }
    $social .= '</ul>';

    $support = '<ul class="ecnf-support">';
    foreach ($c['support'] as $s) {
        $text = esc_html($s[1]);
        if ($s[2]) $text = '<a href="' . esc_url($s[2]) . '" target="_blank" rel="noopener">' . $text . '</a>';
        $support .= '<li' . (function_exists('econur_bn_attr') ? econur_bn_attr($s[1]) : '') . '><span class="ecnf-ico">' . econur_footer_icon($s[0]) . '</span><span class="ecnf-support-t">' . $text . '</span></li>';
    }
    $support .= '</ul>';

    $logo = $c['logo'] && wp_attachment_is_image($c['logo'])
        ? wp_get_attachment_image($c['logo'], 'full', false, array('class' => 'ecnf-logo-img', 'alt' => 'Econur', 'loading' => 'lazy', 'decoding' => 'async', 'sizes' => '(max-width: 767px) 170px, 220px'))
        : '<span class="ecnf-logo-text">Econur</span>';

    wp_enqueue_style('econur-footer');
    wp_enqueue_script('econur-footer');

    return '<footer class="ecnf" id="colophon">'
        . '<div class="ecnf-card">'
        . econur_footer_art($art['leaves'], 'ecnf-art--shadow', '520px')
        . econur_footer_art($art['leaves'], 'ecnf-art--tl', '260px')
        . econur_footer_art($art['leaves'], 'ecnf-art--tr', '(max-width: 767px) 150px, 200px')
        . econur_footer_art($art['sprig'], 'ecnf-art--edge', '(max-width: 767px) 130px, 180px')
        . econur_footer_art($art['soaps'], 'ecnf-art--soaps', '360px')
        . econur_footer_art($art['soap_linen'], 'ecnf-art--linen', '170px')
        . '<div class="ecnf-main">'
        . '<div class="ecnf-brand">'
        . '<a class="ecnf-logo" href="' . esc_url(home_url('/')) . '" aria-label="Econur home">' . $logo . '</a>'
        . '<p class="ecnf-about">' . esc_html($c['about']) . '</p>'
        . $social
        . '</div>'
        . econur_footer_col('shop', 'Shop', econur_footer_links($c['shop']))
        . econur_footer_col('help', 'Help', econur_footer_links($c['help']))
        . '<div class="ecnf-support-wrap">'
        . econur_footer_col('support', 'Order & Support', $support, false)
        . '<a class="ecnf-wa" href="' . esc_url($c['whatsapp_url']) . '" target="_blank" rel="noopener">' . econur_footer_icon('whatsapp') . '<span lang="bn" class="econur-bn-cta">WhatsApp-এ কথা বলুন</span>' . econur_footer_icon('arrow') . '</a>'
        . '</div>'
        . '</div>'
        . '<div class="ecnf-legal">'
        . '<span class="ecnf-legal-leaf ecnf-legal-leaf--mid" aria-hidden="true">' . econur_footer_icon('leaf') . '</span>'
        . '<p class="ecnf-copy">© ' . esc_html(wp_date('Y')) . ' Econur. All rights reserved.</p>'
        . '<p class="ecnf-made">Handmade in Bangladesh.</p>'
        . '<p class="ecnf-slogan"><span class="ecnf-legal-leaf" aria-hidden="true">' . econur_footer_icon('leaf') . '</span>Good for you. Kinder to the planet.</p>'
        . '</div>'
        . '</div>'
        . '</footer>';
}

// swap the Astra footer-builder output for this footer (same hook and position)
add_action('wp', function () {
    if (is_admin() || !class_exists('Astra_Builder_Footer')) return;
    remove_action('astra_footer', array(Astra_Builder_Footer::get_instance(), 'footer_markup'), 10);
    // one global footer on every page (homepage, product pages, shop, account...); product pages keep their own closing call to action above it
    add_action('astra_footer', function () { echo econur_footer_markup(); }, 10);
});

add_action('wp_enqueue_scripts', function () {
    $v = '1.3.0';
    $u = get_stylesheet_directory_uri() . '/assets/';
    wp_enqueue_style('econur-footer', $u . 'site-footer.css', array(), $v);
    wp_register_script('econur-footer', $u . 'site-footer.js', array(), $v, array('in_footer' => true, 'strategy' => 'defer'));
    // shared UI polish (eyebrows, button sizes, small labels); printed last in <head>, below
    wp_register_style('econur-ui', $u . 'econur-ui.css', array(), '1.1.0');
}, 20);

// print the shared UI layer after the Customizer CSS (wp_head priority 101) so it can align earlier styles
add_action('wp_head', function () {
    if (!is_admin() && wp_style_is('econur-ui', 'registered')) wp_print_styles('econur-ui');
}, 120);
