<?php
/**
 * Econur "Shop by category" + trust strip for the homepage: [econur_category_trust]
 * Heading with a small tagline, five category cards (All products + the four WooCommerce categories, links taken from
 * WooCommerce, photos from the existing product cards) and one trust panel (four benefits). Desktop: one row of cards
 * and a four-column panel; phones: a swipeable card row and a 2 x 2 panel. Styles: assets/econur-category-trust.css.
 * It replaces the earlier Elementor HTML widgets (chips + "ecn-trust3" strip) on the homepage.
 */
defined('ABSPATH') || exit;

const ECONUR_CATTRUST_VER = '1.0.0';

function econur_cattrust_config() {
    return apply_filters('econur_cattrust_config', array(
        // [product_cat slug, image attachment id (the photo the old category chip used)]
        'cats'  => array(array('face-care', 109), array('baby-care', 111), array('hair-care', 114), array('daily-care', 115)),
        // [label, supporting text, short text for small phones, icon]
        'trust' => array(
            array('Botanical', 'Simple, listed ingredients', 'Listed ingredients', 'leaf'), // Oct 2026: was "100% Natural" (the bars also contain tallow and lye)
            array('Eco Friendly', 'Better for you & Earth', 'Better for Earth', 'sprout'),
            array('Handmade', 'Crafted with love', 'Crafted with love', 'hand'),
            array('Cash on Delivery', 'Shop with confidence', 'Shop confidently', 'truck'),
        ),
    ));
}

function econur_cattrust_icon($n) {
    $p = array(
        'leaf'   => '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.9-5.5 5-6"/>',
        'sprout' => '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8Z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2Z"/>',
        'hand'   => '<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
        'truck'  => '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
        'arrow'  => '<path d="m9 6 6 6-6 6"/>',
    );
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . $p[$n] . '</svg>';
}

function econur_cattrust_card($url, $label, $media, $active = false) {
    return '<a class="econur-category-card' . ($active ? ' econur-category-card--active' : '') . '" href="' . esc_url($url) . '">'
        . '<span class="econur-category-card__media">' . $media . '</span>'
        . '<span class="econur-category-card__label">' . esc_html($label) . '</span>'
        . '<span class="econur-category-card__arrow">' . econur_cattrust_icon('arrow') . '</span></a>';
}

add_shortcode('econur_category_trust', function () {
    $c = econur_cattrust_config();
    $shop = function_exists('wc_get_page_permalink') ? wc_get_page_permalink('shop') : home_url('/shop/');
    // "All products" is the default (selected) entry: the full range
    $cards = econur_cattrust_card($shop, 'All products', '<span class="econur-category-card__icon">' . econur_cattrust_icon('leaf') . '</span>', true);
    foreach ($c['cats'] as $cat) {
        $term = get_term_by('slug', $cat[0], 'product_cat');
        if (!$term || is_wp_error($term)) continue;
        $link = get_term_link($term);
        if (is_wp_error($link)) continue;
        // the card's text names the category, so the photo itself is decorative (alt="")
        $img = $cat[1] ? wp_get_attachment_image((int) $cat[1], 'thumbnail', false, array('class' => 'econur-category-card__img', 'alt' => '', 'loading' => 'lazy', 'decoding' => 'async', 'sizes' => '44px')) : '';
        $cards .= econur_cattrust_card($link, $term->name, $img);
    }
    $trust = '';
    foreach ($c['trust'] as $t) {
        $trust .= '<li class="econur-trust-item"><span class="econur-trust-item__icon">' . econur_cattrust_icon($t[3]) . '</span>'
            . '<span class="econur-trust-item__copy"><b class="econur-trust-item__label">' . esc_html($t[0]) . '</b>'
            . '<span class="econur-trust-item__text">' . esc_html($t[1]) . '</span>'
            . '<span class="econur-trust-item__text econur-trust-item__text--short">' . esc_html($t[2]) . '</span></span></li>';
    }
    return '<section class="econur-category-trust" aria-labelledby="econur-cat-title">'
        . '<header class="econur-category-trust__header"><h2 class="econur-category-trust__title" id="econur-cat-title">Shop by <span>category</span></h2>'
        . '<p class="econur-category-trust__tagline">Natural care for everyday life</p></header>'
        . '<nav class="econur-category-list" aria-label="Product categories">' . $cards . '</nav>'
        . '<ul class="econur-trust-strip" aria-label="Why ECONUR">' . $trust . '</ul>'
        . '</section>';
});

add_action('wp_enqueue_scripts', function () {
    if (!is_front_page()) return;
    wp_enqueue_style('econur-category-trust', get_stylesheet_directory_uri() . '/assets/econur-category-trust.css', array(), ECONUR_CATTRUST_VER);
}, 20);
