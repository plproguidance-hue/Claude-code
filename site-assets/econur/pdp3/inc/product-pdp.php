<?php
/**
 * Econur single product page, v6 (reference layout: gallery | buy box, tabs, related, trust strip, newsletter).
 * WooCommerce's content-single-product template part is pointed at inc/templates/content-single-product.php, which
 * calls econur_pdp_render(). Everything comes from WooCommerce data and the econur_* product fields; anything a
 * product does not have is left out (no placeholder content).
 * Styles: assets/product-pdp.css, script: assets/product-pdp.js (product pages only).
 * Previous version (v5): inc/product-page.php
 */
defined('ABSPATH') || exit;

const ECONUR_PDP_VER = '6.0.2';
const ECONUR_WA_NUMBER = '8801410753555';

/* ------------------------------------------------------------------ setup */

add_action('wp_enqueue_scripts', function () {
    if (!function_exists('is_product') || !is_product()) return;
    $u = get_stylesheet_directory_uri() . '/assets/';
    wp_enqueue_style('econur-pdp', $u . 'product-pdp.css', array('econur-child'), ECONUR_PDP_VER);
    wp_enqueue_script('econur-pdp', $u . 'product-pdp.js', array('jquery'), ECONUR_PDP_VER, array('in_footer' => true, 'strategy' => 'defer'));
}, 1000);

// Use this theme's product content template (inc/templates/content-single-product.php).
add_filter('wc_get_template_part', function ($template, $slug, $name) {
    if ('content' === $slug && 'single-product' === $name) {
        $t = get_stylesheet_directory() . '/inc/templates/content-single-product.php';
        if (file_exists($t)) return $t;
    }
    return $template;
}, 20, 3);

// Coming soon (no price yet) and the reference's button wording on the product page.
add_filter('woocommerce_product_single_add_to_cart_text', function ($text) {
    global $product; if ($product && '' === $product->get_price()) return 'Coming soon';
    return 'Add to Cart';
});
add_filter('woocommerce_product_add_to_cart_text', function ($text) { global $product; return ($product && '' === $product->get_price()) ? 'Coming soon' : $text; });

// Buy now: a second submit in the same form that goes straight to checkout (WooCommerce still validates size and stock).
add_action('woocommerce_before_add_to_cart_button', function () {
    global $product;
    if ($product && $product->is_type('simple') && econur_pdp_is_this($product)) echo '<input type="hidden" name="add-to-cart" value="' . esc_attr($product->get_id()) . '">';
});
add_action('woocommerce_after_add_to_cart_button', function () {
    global $product;
    if (!$product || !econur_pdp_is_this($product) || '' === $product->get_price()) return;
    echo '<button type="submit" name="ecn_buy_now" value="1" class="ecn-pdp-buynow">Buy Now</button>';
    echo '<a class="ecn-pdp-wa" href="' . esc_url(econur_pdp_wa_link('Hi Econur, I have a question about ' . $product->get_name() . '.')) . '" target="_blank" rel="noopener">' . econur_pdp_icon('whatsapp') . '<span>Chat on WhatsApp</span></a>';
    echo econur_pdp_heart($product);
});
add_filter('woocommerce_add_to_cart_redirect', function ($url) { return !empty($_REQUEST['ecn_buy_now']) ? wc_get_checkout_url() : $url; });
add_filter('wc_add_to_cart_message_html', function ($msg) { return !empty($_REQUEST['ecn_buy_now']) ? '' : $msg; });

// Main price shows the pre-selected size; the page script swaps it when another size is picked.
add_filter('woocommerce_variable_price_html', function ($html, $p) {
    if (!econur_pdp_is_this($p)) return $html;
    list($vid) = econur_pdp_default($p);
    $v = $vid ? wc_get_product($vid) : null;
    return $v ? $v->get_price_html() : $html;
}, 20, 2);

// Shop / breadcrumb band under the site header (full width, product pages only).
add_action('astra_content_before', function () {
    if (!function_exists('is_product') || !is_product()) return;
    $p = wc_get_product(get_queried_object_id()); if (!$p) return;
    $cat = econur_pdp_category($p);
    $crumbs = '<a href="' . esc_url(home_url('/')) . '">Home</a>';
    if ($cat) $crumbs .= '<span aria-hidden="true">/</span><a href="' . esc_url(get_term_link($cat)) . '">' . esc_html($cat->name) . '</a>';
    $crumbs .= '<span aria-hidden="true">/</span><span aria-current="page">' . esc_html($p->get_name()) . '</span>';
    echo '<div class="ecn-pdp-hero">' . econur_pdp_art('leaves', 'ecn-pdp-hero-art ecn-pdp-hero-art--l') . econur_pdp_art('leaves', 'ecn-pdp-hero-art ecn-pdp-hero-art--r')
        . '<p class="ecn-pdp-hero-t">Shop</p><nav class="ecn-pdp-crumbs" aria-label="Breadcrumb">' . $crumbs . '</nav></div>';
});

// Newsletter band before the footer: only when the site's newsletter tool (Hostinger Reach) is connected,
// so the form always reaches a real mailing list.
add_action('astra_content_after', function () {
    if (!function_exists('is_product') || !is_product() || !econur_pdp_newsletter_ready()) return;
    $form = do_blocks('<!-- wp:hostinger-reach/subscription /-->');
    if ('' === trim(wp_strip_all_tags($form, true)) && false === strpos($form, '<form')) return;
    echo '<section class="ecn-pdp-news" aria-labelledby="ecn-pdp-news-t">' . econur_pdp_art('leaves', 'ecn-pdp-news-art ecn-pdp-news-art--l') . econur_pdp_art('leaves', 'ecn-pdp-news-art ecn-pdp-news-art--r')
        . '<p class="ecn-pdp-eyebrow">Our Newsletter</p><h2 class="ecn-pdp-news-t" id="ecn-pdp-news-t">Subscribe to Our Newsletter to <span>Get Updates on Our Latest Offers</span></h2>'
        . '<p class="ecn-pdp-news-sub">New bars, restocks and offers, straight to your inbox.</p><div class="ecn-pdp-news-form">' . $form . '</div></section>';
});
function econur_pdp_newsletter_ready() { return '' !== (string) get_option('hostinger_reach_api_key', ''); }

/* ---------------------------------------------------------------- helpers */

function econur_pdp_is_this($p) {
    return !is_admin() && function_exists('is_product') && is_product() && $p && $p->get_id() === get_queried_object_id();
}
function econur_meta_list($id, $key) {
    return array_values(array_filter(array_map('trim', explode('|', (string) get_post_meta($id, $key, true)))));
}
// "Title::Text|Title::Text" product fields -> array of [title, text].
function econur_pdp_pairs($id, $key) {
    $out = array();
    foreach (econur_meta_list($id, $key) as $row) {
        $p = array_map('trim', explode('::', $row, 2));
        if ('' !== $p[0]) $out[] = array($p[0], isset($p[1]) ? $p[1] : '');
    }
    return $out;
}
function econur_pdp_wa_link($text) { return 'https://wa.me/' . ECONUR_WA_NUMBER . '?text=' . rawurlencode($text); }
function econur_pdp_money($n) { return html_entity_decode(wp_strip_all_tags(wc_price($n)), ENT_QUOTES, 'UTF-8'); }
function econur_pdp_category($p) {
    $terms = get_the_terms($p->get_id(), 'product_cat');
    if (!$terms || is_wp_error($terms)) return null;
    foreach ($terms as $t) if ('uncategorized' !== $t->slug) return $t;
    return $terms[0];
}

// The size WooCommerce pre-selects (saved default attributes), else the first in-stock size. [variation id, price].
function econur_pdp_default($p) {
    if (!$p->is_type('variable')) return array((int) $p->get_id(), (float) $p->get_price());
    $def = $p->get_default_attributes();
    if ($def) {
        $attrs = array();
        foreach ($def as $k => $v) $attrs['attribute_' . sanitize_title($k)] = $v;
        $vid = (new WC_Product_Data_Store_CPT())->find_matching_product_variation($p, $attrs);
        $v = $vid ? wc_get_product($vid) : null;
        if ($v && $v->is_purchasable() && $v->is_in_stock()) return array((int) $vid, (float) $v->get_price());
    }
    return array(0, 0.0);
}
// First buyable size, used by the related cards (default size first, then the lowest price).
function econur_pdp_card_variation($p) {
    if (!$p->is_type('variable')) return ($p->is_purchasable() && $p->is_in_stock()) ? $p : null;
    list($vid) = econur_pdp_default($p);
    if ($vid) return wc_get_product($vid);
    $best = null;
    foreach ($p->get_children() as $c) { $v = wc_get_product($c); if ($v && $v->is_purchasable() && $v->is_in_stock() && (!$best || (float) $v->get_price() < (float) $best->get_price())) $best = $v; }
    return $best;
}
// Size label of a variation ("50 gm"), from its real attribute terms.
function econur_pdp_size_label($v) {
    if (!$v || !$v->is_type('variation')) return '';
    $out = array();
    foreach ($v->get_variation_attributes() as $k => $val) {
        $tax = str_replace('attribute_', '', $k);
        $term = taxonomy_exists($tax) ? get_term_by('slug', $val, $tax) : null;
        $out[] = $term ? $term->name : $val;
    }
    return implode(' / ', array_filter($out));
}
// Stock badge: [state, label].
function econur_pdp_stock($p) {
    if ('' === $p->get_price()) return array('soon', 'Coming soon');
    if (!$p->is_in_stock()) return array('out', 'Out of stock');
    if ($p->is_on_backorder()) return array('soon', 'On backorder');
    return array('in', 'In Stock');
}
// Product photos: featured image, WooCommerce gallery, then the product's own homepage card photo.
function econur_pdp_images($p) {
    $ids = array_merge(array((int) $p->get_image_id()), array_map('intval', $p->get_gallery_image_ids()));
    $card = (int) get_post_meta($p->get_id(), 'econur_home_card_image', true);
    if ($card) $ids[] = $card;
    return array_values(array_unique(array_filter($ids, function ($id) { return $id && wp_attachment_is_image($id); })));
}

function econur_pdp_icon($n) {
    $p = array(
        'cleanse' => '<path d="M7 4.5c1.5 2.2 3 3.9 3 5.6a3 3 0 0 1-6 0c0-1.7 1.5-3.4 3-5.6Z"/><path d="M15.5 9.5c1.2 1.7 2.3 3 2.3 4.3a2.3 2.3 0 0 1-4.6 0c0-1.3 1.1-2.6 2.3-4.3Z"/><path d="M4 18.5h16"/>',
        'skin'    => '<path d="M12 3.5 14 9l5.5.5-4.2 3.6 1.3 5.4L12 15.6l-4.6 2.9 1.3-5.4L4.5 9.5 10 9Z"/>',
        'leaf'    => '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.9-5.5 5-6"/>',
        'hand'    => '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11"/><path d="M11 10.5V4.5a1.5 1.5 0 0 1 3 0v6"/><path d="M14 10.5V6a1.5 1.5 0 0 1 3 0v7.5c0 4-2.7 6.5-6.2 6.5-2.4 0-4-1.1-5.3-3L3.6 14a1.6 1.6 0 0 1 2.6-1.8L8 14"/>',
        'drop'    => '<path d="M12 3.5c3 4 6 7.3 6 10.5a6 6 0 0 1-12 0c0-3.2 3-6.5 6-10.5Z"/>',
        'check'   => '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
        'truck'   => '<path d="M10 17h4V6H3v11h1.5"/><path d="M14 9h4l3 3.5V17h-1.5"/><circle cx="7" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>',
        'cash'    => '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9.5v5M18 9.5v5"/>',
        'phone'   => '<path d="M21 16.9v2.6a1.8 1.8 0 0 1-2 1.8 17.8 17.8 0 0 1-7.8-2.8 17.5 17.5 0 0 1-5.4-5.4A17.8 17.8 0 0 1 3 5.2 1.8 1.8 0 0 1 4.8 3.2h2.6a1.8 1.8 0 0 1 1.8 1.6c.1.9.3 1.7.6 2.5a1.8 1.8 0 0 1-.4 1.9L8.3 10.3a14.4 14.4 0 0 0 5.4 5.4l1.1-1.1a1.8 1.8 0 0 1 1.9-.4c.8.3 1.6.5 2.5.6a1.8 1.8 0 0 1 1.6 1.8Z"/>',
        'heart'   => '<path d="M12 20s-7.5-4.6-7.5-10.3A4.3 4.3 0 0 1 12 7.1a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z"/>',
        'cart'    => '<path d="M5 6.5h15l-1.6 8.2a1.5 1.5 0 0 1-1.5 1.2H8.6a1.5 1.5 0 0 1-1.5-1.2L5 4H3"/><circle cx="9" cy="19.5" r="1.3"/><circle cx="17" cy="19.5" r="1.3"/>',
        'prev'    => '<path d="m15 18-6-6 6-6"/>',
        'next'    => '<path d="m9 18 6-6-6-6"/>',
        'link'    => '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    );
    $fill = array(
        'whatsapp'  => '<path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.56.12-.16.25-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.12-1.04-.38-1.99-1.23-.73-.66-1.23-1.47-1.37-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.16 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.46-.6 1.67-1.18.21-.58.21-1.08.14-1.18-.06-.1-.22-.16-.47-.28Z"/>',
        'facebook'  => '<path fill="currentColor" d="M13.6 21v-7.7h2.6l.4-3h-3V8.4c0-.9.3-1.5 1.5-1.5h1.6V4.2c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.9v3h2.6V21h3.1Z"/>',
        'x'         => '<path fill="currentColor" d="M17.8 3h3.1l-6.8 7.8 8 10.2h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.8 3h6.4l4.4 5.9Zm-1.1 16.2h1.7L7.4 4.7H5.6Z"/>',
        'pinterest' => '<path fill="currentColor" d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.2-5.2s-.3-.6-.3-1.5c0-1.4.8-2.4 1.8-2.4.9 0 1.3.6 1.3 1.4 0 .9-.6 2.2-.9 3.4-.2 1 .5 1.9 1.6 1.9 1.9 0 3.3-2 3.3-4.9 0-2.6-1.8-4.4-4.5-4.4-3.1 0-4.9 2.3-4.9 4.7 0 .9.4 1.9.8 2.5.1.1.1.2.1.3l-.3 1.2c0 .2-.2.3-.4.2-1.4-.7-2.3-2.7-2.3-4.3 0-3.5 2.6-6.8 7.4-6.8 3.9 0 6.9 2.8 6.9 6.5 0 3.9-2.4 7-5.8 7-1.1 0-2.2-.6-2.6-1.3l-.7 2.7c-.3 1-1 2.2-1.4 3A10 10 0 1 0 12 2Z"/>',
    );
    if (isset($fill[$n])) return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' . $fill[$n] . '</svg>';
    return isset($p[$n]) ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . $p[$n] . '</svg>' : '';
}
function econur_pdp_benefit_icon($t) {
    $t = strtolower($t);
    if (preg_match('/clean|exfol|scrub|purif|cleanse/', $t)) return 'cleanse';
    if (preg_match('/hand/', $t)) return 'hand';
    if (preg_match('/skin|mild|gentle|soft|little|tight/', $t)) return 'skin';
    if (preg_match('/hydrat|moist/', $t)) return 'drop';
    return 'leaf';
}
// Decorative botanical image from the media library (leaf spray), hidden from assistive technology.
function econur_pdp_art($which, $class) {
    $ids = array('leaves' => 154);
    if (empty($ids[$which]) || !wp_attachment_is_image($ids[$which])) return '';
    return wp_get_attachment_image($ids[$which], 'full', false, array('class' => $class, 'alt' => '', 'aria-hidden' => 'true', 'loading' => 'lazy', 'decoding' => 'async', 'sizes' => '220px'));
}
// Save button (same saved list as the homepage hearts: localStorage "ecn_saved").
function econur_pdp_heart($p, $class = 'ecn-pdp-heart') {
    return '<button type="button" class="' . esc_attr($class) . '" data-pid="' . esc_attr($p->get_id()) . '" aria-pressed="false" aria-label="' . esc_attr('Save ' . $p->get_name()) . '">' . econur_pdp_icon('heart') . '</button>';
}

/* -------------------------------------------------------------- the page */

function econur_pdp_render($product) {
    if (!$product instanceof WC_Product) return;
    $id    = $product->get_id();
    $name  = $product->get_name();
    $cat   = econur_pdp_category($product);
    $imgs  = econur_pdp_images($product);
    $stock = econur_pdp_stock($product);
    $rc    = (int) $product->get_review_count();
    $avg   = (float) $product->get_average_rating();
    $buyable = '' !== $product->get_price() && $product->is_purchasable();
    list($vid) = econur_pdp_default($product);
    $size  = $vid ? econur_pdp_size_label(wc_get_product($vid)) : '';

    echo '<div id="product-' . esc_attr($id) . '" class="' . esc_attr(implode(' ', wc_get_product_class('ecn-pdp', $product))) . '">';
    echo '<section class="ecn-pdp-main">';

    /* gallery */
    $n = count($imgs);
    echo '<div class="ecn-g' . ($n > 1 ? ' has-many' : '') . '" data-count="' . esc_attr($n) . '"><div class="ecn-g-main"><div class="ecn-g-track" tabindex="0" aria-label="' . esc_attr($name . ' photos') . '">';
    foreach ($imgs as $i => $img) {
        echo '<figure class="ecn-g-slide" id="ecn-g-' . esc_attr($i) . '"' . ($n > 1 ? ' aria-label="' . esc_attr(sprintf('Photo %d of %d', $i + 1, $n)) . '"' : '') . '>'
            . wp_get_attachment_image($img, 'full', false, array('class' => 'ecn-g-img', 'alt' => 0 === $i ? $name : $name . ' photo ' . ($i + 1), 'loading' => 0 === $i ? 'eager' : 'lazy', 'fetchpriority' => 0 === $i ? 'high' : 'auto', 'decoding' => 0 === $i ? 'sync' : 'async', 'sizes' => '(min-width: 1000px) 560px, calc(100vw - 32px)'))
            . '</figure>';
    }
    echo '</div>';
    if ($n > 1) echo '<button type="button" class="ecn-g-nav ecn-g-prev" aria-label="Previous photo">' . econur_pdp_icon('prev') . '</button><button type="button" class="ecn-g-nav ecn-g-next" aria-label="Next photo">' . econur_pdp_icon('next') . '</button>';
    echo '</div>';
    if ($n > 1) {
        echo '<div class="ecn-g-thumbs" aria-label="Choose a photo">';
        foreach ($imgs as $i => $img) echo '<button type="button" class="ecn-g-thumb' . (0 === $i ? ' is-on' : '') . '" data-i="' . esc_attr($i) . '" aria-label="' . esc_attr(sprintf('Show photo %d', $i + 1)) . '"' . (0 === $i ? ' aria-current="true"' : '') . '>' . wp_get_attachment_image($img, 'woocommerce_thumbnail', false, array('alt' => '', 'loading' => 'lazy', 'decoding' => 'async', 'sizes' => '96px')) . '</button>';
        echo '</div>';
    }
    echo '</div>';

    /* buy box */
    echo '<div class="ecn-pdp-info summary entry-summary">';
    if ($cat) echo '<a class="ecn-pdp-cat" href="' . esc_url(get_term_link($cat)) . '">' . esc_html($cat->name) . '</a>';
    echo '<div class="ecn-pdp-titlerow"><h1 class="ecn-pdp-title product_title">' . esc_html($name) . '</h1><span class="ecn-pdp-stock is-' . esc_attr($stock[0]) . '" data-ecn-stock>' . esc_html($stock[1]) . '</span></div>';
    if ($rc > 0) {
        echo '<a class="ecn-pdp-rating" href="#ecn-tab-reviews" data-tab-open="reviews"><span class="ecn-stars" style="--r:' . esc_attr(round($avg / 5 * 100)) . '%" aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span><span>' . esc_html(number_format_i18n($avg, 1)) . ' (' . esc_html($rc) . ' ' . (1 === $rc ? 'Review' : 'Reviews') . ')</span><span class="screen-reader-text">' . esc_html(sprintf('Rated %s out of 5', number_format_i18n($avg, 1))) . '</span></a>';
    } elseif (comments_open($id)) {
        echo '<a class="ecn-pdp-rating is-empty" href="#ecn-tab-reviews" data-tab-open="reviews"><span class="ecn-stars" style="--r:0%" aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span><span>No reviews yet</span></a>';
    }
    if ($buyable || '' !== $product->get_price()) echo '<div class="ecn-pdp-price">' . $product->get_price_html() . '</div>';
    if ($size) echo '<p class="ecn-pdp-size" data-ecn-size>' . esc_html($size) . '</p>';
    $short = $product->get_short_description();
    if ($short) echo '<div class="ecn-pdp-short">' . wp_kses_post(wpautop($short)) . '</div>';

    $ben = array_slice(econur_pdp_pairs($id, 'econur_highlights'), 0, 3);
    if ($ben) {
        echo '<ul class="ecn-pdp-benefits">';
        foreach ($ben as $b) { $t = ucfirst(strtolower($b[0])); echo '<li>' . econur_pdp_icon(econur_pdp_benefit_icon($t)) . '<span>' . esc_html($t) . '</span></li>'; }
        echo '</ul>';
    }

    if ($product->is_type('variable') && $buyable) echo '<p class="ecn-pdp-label">Size/Volume</p>';
    if ($buyable) {
        woocommerce_template_single_add_to_cart();
    } else {
        echo '<div class="ecn-pdp-coming"><p><b>Launching soon.</b> Want a message the day it is ready?</p><div class="ecn-pdp-coming-row">'
            . '<a class="ecn-pdp-wa is-main" href="' . esc_url(econur_pdp_wa_link('Hi Econur, please let me know when ' . $name . ' is available.')) . '" target="_blank" rel="noopener">' . econur_pdp_icon('whatsapp') . '<span>Notify me on WhatsApp</span></a>'
            . econur_pdp_heart($product) . '</div></div>';
    }

    /* meta: SKU, tags, share */
    $sku = $product->get_sku();
    $tags = wp_get_post_terms($id, 'product_tag', array('fields' => 'all'));
    $url = get_permalink($id);
    $img_url = $imgs ? wp_get_attachment_image_url($imgs[0], 'large') : '';
    echo '<dl class="ecn-pdp-meta">';
    if ($sku) echo '<div><dt>SKU</dt><dd data-ecn-sku>' . esc_html($sku) . '</dd></div>';
    if ($tags && !is_wp_error($tags)) {
        $tl = array(); foreach ($tags as $t) $tl[] = '<a href="' . esc_url(get_term_link($t)) . '">' . esc_html($t->name) . '</a>';
        echo '<div><dt>Tags</dt><dd>' . implode(', ', $tl) . '</dd></div>';
    }
    echo '<div class="ecn-pdp-share"><dt>Share</dt><dd>'
        . '<a href="' . esc_url('https://www.facebook.com/sharer/sharer.php?u=' . rawurlencode($url)) . '" target="_blank" rel="noopener" aria-label="Share on Facebook">' . econur_pdp_icon('facebook') . '</a>'
        . '<a href="' . esc_url('https://twitter.com/intent/tweet?url=' . rawurlencode($url) . '&text=' . rawurlencode($name)) . '" target="_blank" rel="noopener" aria-label="Share on X">' . econur_pdp_icon('x') . '</a>'
        . '<a href="' . esc_url('https://www.pinterest.com/pin/create/button/?url=' . rawurlencode($url) . '&media=' . rawurlencode($img_url) . '&description=' . rawurlencode($name)) . '" target="_blank" rel="noopener" aria-label="Share on Pinterest">' . econur_pdp_icon('pinterest') . '</a>'
        . '<a href="' . esc_url('https://wa.me/?text=' . rawurlencode($name . ' ' . $url)) . '" target="_blank" rel="noopener" aria-label="Share on WhatsApp">' . econur_pdp_icon('whatsapp') . '</a>'
        . '<button type="button" class="ecn-pdp-copy" data-url="' . esc_url($url) . '" aria-label="Copy link">' . econur_pdp_icon('link') . '</button>'
        . '</dd></div></dl>';
    echo '</div>'; // buy box
    echo '</section>';

    /* tabs */
    $rows = econur_pdp_rows($product);
    $table = '';
    if ($rows) {
        $table = '<div class="ecn-pdp-table-wrap"><table class="ecn-pdp-table"><thead><tr><th scope="col">Attribute</th><th scope="col">Details</th></tr></thead><tbody>';
        foreach ($rows as $r) $table .= '<tr><th scope="row">' . esc_html($r[0]) . '</th><td>' . esc_html($r[1]) . '</td></tr>';
        $table .= '</tbody></table></div>';
    }
    $desc = $product->get_description();
    $checks = econur_meta_list($id, 'econur_benefits');
    $tabs = array();
    if ($desc || $checks) {
        $b = $desc ? '<div class="ecn-pdp-desc">' . wp_kses_post(wpautop($desc)) . '</div>' : '';
        if ($checks) { $b .= '<ul class="ecn-pdp-checks">'; foreach ($checks as $c) $b .= '<li>' . econur_pdp_icon('check') . '<span>' . esc_html($c) . '</span></li>'; $b .= '</ul>'; }
        if ($table) $b .= '<div class="ecn-pdp-desc-table">' . $table . '</div>';
        $tabs['description'] = array('Description', $b);
    }
    if ($table) $tabs['info'] = array('Additional Information', $table, 'Additional Info');
    if (comments_open($id)) {
        ob_start(); comments_template(); $form = ob_get_clean();
        $head = $rc > 0
            ? '<div class="ecn-pdp-rev-sum"><p class="ecn-pdp-rev-avg"><b>' . esc_html(number_format_i18n($avg, 1)) . '</b><span class="ecn-stars" style="--r:' . esc_attr(round($avg / 5 * 100)) . '%" aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span></p><p class="ecn-pdp-rev-n">Based on ' . esc_html($rc) . ' customer ' . (1 === $rc ? 'review' : 'reviews') . '</p><a class="ecn-pdp-btn-outline" href="#review_form_wrapper">Write a review</a></div>'
            : '<div class="ecn-pdp-rev-sum is-empty"><p class="ecn-pdp-rev-empty">No reviews yet</p><p class="ecn-pdp-rev-n">Be the first to review ' . esc_html($name) . '.</p></div>';
        $tabs['reviews'] = array('Review', $head . '<div class="ecn-pdp-rev' . ($rc > 0 ? ' has-reviews' : ' no-reviews') . '">' . $form . '</div>', 'Review');
    }
    if ($tabs) {
        echo '<section class="ecn-pdp-tabs" id="ecn-pdp-tabs"><div class="ecn-pdp-tablist" role="tablist" aria-label="Product information">';
        $first = true;
        foreach ($tabs as $k => $t) {
            echo '<button type="button" role="tab" class="ecn-pdp-tab' . ($first ? ' is-on' : '') . '" id="ecn-tab-' . esc_attr($k) . '" aria-controls="ecn-panel-' . esc_attr($k) . '" aria-selected="' . ($first ? 'true' : 'false') . '" tabindex="' . ($first ? '0' : '-1') . '"><span class="ecn-t-full">' . esc_html($t[0]) . '</span>' . (!empty($t[2]) ? '<span class="ecn-t-short">' . esc_html($t[2]) . '</span>' : '') . '</button>';
            $first = false;
        }
        echo '</div>';
        $first = true;
        foreach ($tabs as $k => $t) {
            echo '<div class="ecn-pdp-panel ecn-pdp-panel--' . esc_attr($k) . '" role="tabpanel" id="ecn-panel-' . esc_attr($k) . '" aria-labelledby="ecn-tab-' . esc_attr($k) . '" tabindex="0"' . ($first ? '' : ' hidden') . '>' . $t[1] . '</div>';
            $first = false;
        }
        echo '</section>';
    }

    econur_pdp_related($product);

    /* trust strip (the store's own delivery and payment terms, as on the homepage); phones show the shorter wording */
    echo '<ul class="ecn-pdp-trust" aria-label="Delivery and payment">'
        . '<li>' . econur_pdp_icon('cash') . '<span><b>Cash on delivery</b><small><span class="ecn-tr-l">Pay when the parcel arrives, anywhere in Bangladesh.</span><span class="ecn-tr-s">Anywhere in Bangladesh</span></small></span></li>'
        . '<li>' . econur_pdp_icon('truck') . '<span><b>Delivery</b><small><span class="ecn-tr-l">Inside Dhaka 1 to 2 days, outside Dhaka 2 to 4 days.</span><span class="ecn-tr-s">Inside Dhaka 1–2 days, outside 2–4 days</span></small></span></li>'
        . '<li>' . econur_pdp_icon('phone') . '<span><b>We call to confirm</b><small><span class="ecn-tr-l">Every order is confirmed by phone within 12 hours.</span><span class="ecn-tr-s">Confirmed by phone within 12 hours</span></small></span></li>'
        . '</ul>';

    if (isset(WC()->structured_data)) WC()->structured_data->generate_product_data($product);
    echo '</div>';
}

// Additional information rows: product fields and attributes that exist for this product only.
function econur_pdp_rows($p) {
    $id = $p->get_id(); $rows = array();
    $skin = econur_meta_list($id, 'econur_skin_type');
    if ($skin) $rows[] = array('Skin Type', implode(', ', $skin));
    foreach ($p->get_attributes() as $k => $a) {
        if (!$a->get_visible() && !$a->get_variation()) continue;
        $vals = $a->is_taxonomy() ? wc_get_product_terms($id, $k, array('fields' => 'names')) : $a->get_options();
        if (!$vals) continue;
        $label = wc_attribute_label($a->get_name(), $p);
        if ('size' === strtolower($label)) $label = 'Size/Volume';
        $rows[] = array($label, implode(', ', $vals));
    }
    if ($p->get_weight()) $rows[] = array('Weight', wc_format_weight($p->get_weight()));
    $key = econur_meta_list($id, 'econur_key_ingredients');
    if ($key) $rows[] = array('Key Ingredients', implode(', ', $key));
    $full = trim((string) get_post_meta($id, 'econur_full_ingredients', true));
    if ($full) $rows[] = array('Ingredients', $full);
    $how = trim((string) get_post_meta($id, 'econur_how_to_use', true));
    if ($how) $rows[] = array('How to Use', $how);
    if ($rows) $rows[] = array('Packaging', 'Zero plastic, compostable wrap');
    return $rows;
}

// Related products: same category first, then the rest of the range; buyable products only, up to 8.
function econur_pdp_related($product) {
    $id = $product->get_id();
    $ids = array_merge(wc_get_related_products($id, 8), wc_get_products(array('status' => 'publish', 'limit' => 12, 'return' => 'ids', 'exclude' => array($id), 'orderby' => 'menu_order', 'order' => 'ASC')));
    $ids = array_values(array_unique(array_map('intval', $ids)));
    $cards = ''; $n = 0;
    foreach ($ids as $pid) {
        if ($n >= 8 || $pid === $id) continue;
        $p = wc_get_product($pid);
        if (!$p || !$p->is_visible() || '' === $p->get_price() || !$p->is_in_stock()) continue;
        $v = econur_pdp_card_variation($p);
        if (!$v) continue;
        $link = get_permalink($pid); $name = $p->get_name();
        $img = (int) get_post_meta($pid, 'econur_home_card_image', true);
        if (!$img || !wp_attachment_is_image($img)) $img = (int) $p->get_image_id();
        $focus = (string) get_post_meta($pid, 'econur_home_card_focus', true);
        $size = econur_pdp_size_label($v);
        $cards .= '<article class="ecn-rel-card"><div class="ecn-rel-media"><a href="' . esc_url($link) . '" tabindex="-1" aria-hidden="true">'
            . wp_get_attachment_image($img, 'medium_large', false, array('alt' => $name, 'loading' => 'lazy', 'decoding' => 'async', 'sizes' => '(min-width: 1000px) 270px, 62vw', 'style' => $focus ? 'object-position:' . esc_attr($focus) : ''))
            . '</a>' . econur_pdp_heart($p, 'ecn-rel-heart') . '</div><div class="ecn-rel-body"><h3 class="ecn-rel-name"><a href="' . esc_url($link) . '">' . esc_html($name) . '</a></h3>'
            . '<p class="ecn-rel-price">' . wp_kses_post($v->get_price_html()) . ($size ? '<small>' . esc_html($size) . '</small>' : '') . '</p>'
            . '<button type="button" class="ecn-rel-add" data-id="' . esc_attr($v->get_id()) . '" data-url="' . esc_url($link) . '" data-name="' . esc_attr($name . ($size ? ' (' . $size . ')' : '')) . '" aria-label="' . esc_attr('Add ' . $name . ($size ? ', ' . $size : '') . ' to cart') . '">' . econur_pdp_icon('cart') . '<span>Add to Cart</span></button></div></article>';
        $n++;
    }
    if (!$cards) return;
    echo '<section class="ecn-rel" aria-labelledby="ecn-rel-t"><p class="ecn-pdp-eyebrow ecn-rel-eyebrow">Related Products</p><h2 class="ecn-rel-t" id="ecn-rel-t">Explore <span>Related Products</span></h2>'
        . '<div class="ecn-rel-wrap"><div class="ecn-rel-track" tabindex="0" aria-label="Related products">' . $cards . '</div>'
        . ($n > 4 ? '<button type="button" class="ecn-rel-nav ecn-rel-prev" aria-label="Previous products">' . econur_pdp_icon('prev') . '</button><button type="button" class="ecn-rel-nav ecn-rel-next" aria-label="Next products">' . econur_pdp_icon('next') . '</button>' : '')
        . '</div><div class="ecn-rel-dots" aria-hidden="true"></div></section>';
}

/* --------------------------------------------- sticky bar, toast, config */

add_action('wp_footer', function () {
    if (!function_exists('is_product') || !is_product()) return;
    $product = wc_get_product(get_queried_object_id());
    if (!$product) return;
    $buyable = '' !== $product->get_price() && $product->is_purchasable() && $product->is_in_stock();
    list($vid, $price) = econur_pdp_default($product);
    if (!$vid && $product->is_type('simple')) $price = (float) $product->get_price();
    $size = $vid ? econur_pdp_size_label(wc_get_product($vid)) : '';
    echo '<div class="ecn-sbar" id="ecnSbar" aria-hidden="true">';
    if ($buyable) {
        echo '<div class="ecn-sbar-p"><b id="ecnSbarPrice">' . ($price > 0 ? esc_html(econur_pdp_money($price)) : '') . '</b><small id="ecnSbarSize">' . esc_html($size) . '</small></div>'
            . '<button type="button" class="ecn-sbar-btn" id="ecnSbarBtn" tabindex="-1">' . econur_pdp_icon('cart') . '<span>Add to Cart</span></button>';
    } else {
        echo '<div class="ecn-sbar-p"><b>' . esc_html($product->get_name()) . '</b><small>Coming soon</small></div><a class="ecn-sbar-btn" href="' . esc_url(econur_pdp_wa_link('Hi Econur, please let me know when ' . $product->get_name() . ' is available.')) . '" target="_blank" rel="noopener" tabindex="-1"><span>Notify me</span></a>';
    }
    echo '</div><div class="ecn-toast" id="ecnToast" role="status" aria-live="polite" hidden><span id="ecnToastTxt"></span><a href="' . esc_url(wc_get_checkout_url()) . '">Checkout</a></div>';
    $cfg = array('ajax' => WC_AJAX::get_endpoint('add_to_cart'), 'symbol' => trim(html_entity_decode(get_woocommerce_currency_symbol(), ENT_QUOTES, 'UTF-8'), " \xC2\xA0"), 'dec' => wc_get_price_decimals(), 'price' => $price, 'check' => econur_pdp_icon('check'));
    echo '<script>window.ECN_PD=' . wp_json_encode($cfg) . ';</script>';
}, 40);
