<?php
/**
 * Econur single product page, v5 (premium editorial, mobile-first).
 * Order: gallery, category, title, skin fit, rating (real reviews only), price, short description,
 * size pills, quantity, Add to cart, Buy now, trust grid; then full-width sections:
 * Why you'll love it, key ingredients, how to use, details accordion, customer reviews, You may also love.
 * Everything is read from WooCommerce data and econur_* product fields; empty data = section omitted.
 * Styles: assets/product-page.css (loaded on product pages only).
 * Previous version: inc/product-page.php.bak-pdp-20260924
 */
defined('ABSPATH') || exit;

/* ------------------------------------------------------------------ setup */

function econur_pd_unhook() {
    remove_action('woocommerce_after_single_product_summary', 'woocommerce_output_product_data_tabs', 10);
    remove_action('woocommerce_after_single_product_summary', 'woocommerce_upsell_display', 15);
    remove_action('woocommerce_after_single_product_summary', 'woocommerce_output_related_products', 20);
    remove_action('woocommerce_single_product_summary', 'woocommerce_template_single_meta', 40);
    remove_action('woocommerce_single_product_summary', 'woocommerce_template_single_rating', 10);
    remove_action('woocommerce_single_product_summary', 'woocommerce_template_single_excerpt', 20);
    remove_action('woocommerce_single_product_summary', 'woocommerce_template_single_sharing', 50);
}
add_action('init', 'econur_pd_unhook');
add_action('wp', 'econur_pd_unhook', 99);

add_action('wp_enqueue_scripts', function () {
    if (!function_exists('is_product') || !is_product()) return;
    $f = get_stylesheet_directory() . '/assets/product-page.css';
    if (file_exists($f)) wp_enqueue_style('econur-pdp', get_stylesheet_directory_uri() . '/assets/product-page.css', array('econur-child'), (string) filemtime($f));
}, 1000);

// Astra builds the buy box from this list; the template adds the rest itself.
add_filter('astra_get_option_single-product-structure', function () { return array('category', 'title', 'price', 'add_cart'); }, 99);
// Gallery: thumbnails when a product has more than one image (WooCommerce default navigation).
add_filter('woocommerce_single_product_carousel_options', function ($o) { $o['controlNav'] = 'thumbnails'; $o['directionNav'] = false; return $o; });

/* ---------------------------------------------------------------- helpers */

function econur_meta_list($id, $key) {
    return array_values(array_filter(array_map('trim', explode('|', (string) get_post_meta($id, $key, true)))));
}

function econur_pd_icon($n) {
    $p = array(
        'truck' => '<path d="M10 17h4V6H3v11h1.5"/><path d="M14 9h4l3 3.5V17h-1.5"/><circle cx="7" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>',
        'cash'  => '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9.5v5M18 9.5v5"/>',
        'leaf'  => '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.9-5.5 5-6"/>',
        'drop'  => '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/>',
        'sun'   => '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
        'box'   => '<path d="M21 8 12 3 3 8v8l9 5 9-5V8Z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
        'spark' => '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
        'hand'  => '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V12M14 11.5V6a1.5 1.5 0 0 1 3 0v7.5c0 4-2.5 7.5-7 7.5-3 0-4.6-1.6-6-4l-1.7-3a1.5 1.5 0 0 1 2.6-1.5L8 15"/>',
        'check' => '<path d="m5 12 5 5L20 7"/>',
        'sprout'=> '<path d="M12 21v-9"/><path d="M12 12C12 8.5 9.5 6 5 6c0 4 2.5 6 7 6Z"/><path d="M12 10c0-3.5 2.5-6 7-6 0 4-2.5 6-7 6Z"/>',
        'chev'  => '<path d="m9 6 6 6-6 6"/>',
        'arrow' => '<path d="M5 12h14M13 6l6 6-6 6"/>',
        'plus'  => '<path d="M12 5v14M5 12h14"/>',
        'bag'   => '<path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    );
    return isset($p[$n]) ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . $p[$n] . '</svg>' : '';
}

function econur_pd_wa_icon() {
    return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.5 4.1 1.6 5.9L0 24l6.4-1.7a11.8 11.8 0 0 0 5.7 1.4c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.1-3.4-8.4ZM12.1 21.7c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.8 1 1-3.7-.2-.4a9.8 9.8 0 0 1-1.5-5.2c0-5.4 4.4-9.8 9.9-9.8 2.6 0 5.1 1 6.9 2.9a9.7 9.7 0 0 1 2.9 6.9c0 5.4-4.4 9.9-9.8 9.9Zm5.4-7.3c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.4-1.5-.9-.8-1.5-1.8-1.6-2.1-.2-.3 0-.5.1-.6l.4-.5.3-.5c.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4Z"/></svg>';
}

// Real sale saving (largest across sizes), used for the small "Save x%" pill; 0 when no sale price is set.
function econur_sale_pct($p) {
    $max = 0;
    $items = $p->is_type('variable') ? array_filter(array_map('wc_get_product', $p->get_children())) : array($p);
    foreach ($items as $v) {
        $r = (float) $v->get_regular_price(); $s = $v->get_sale_price();
        if ($r > 0 && '' !== $s && (float) $s < $r) $max = max($max, (int) round((1 - (float) $s / $r) * 100));
    }
    return $max;
}

// The size WooCommerce pre-selects (the product's saved default attributes). No default = nothing pre-selected.
function econur_pd_default($p) {
    if ($p->is_type('variable')) {
        $def = $p->get_default_attributes();
        if (!$def) return array(0, 0.0);
        $attrs = array();
        foreach ($def as $k => $v) $attrs['attribute_' . sanitize_title($k)] = $v;
        $vid = (new WC_Product_Data_Store_CPT())->find_matching_product_variation($p, $attrs);
        $v = $vid ? wc_get_product($vid) : null;
        return ($v && $v->is_purchasable() && $v->is_in_stock()) ? array((int) $vid, (float) $v->get_price()) : array(0, 0.0);
    }
    return array((int) $p->get_id(), (float) $p->get_price());
}

// Variable product with more than one buyable size: the customer has to choose.
function econur_pd_needs_choice($p) {
    if (!$p->is_type('variable')) return false;
    $n = 0;
    foreach ($p->get_children() as $c) { $v = wc_get_product($c); if ($v && $v->is_purchasable() && $v->is_in_stock()) $n++; }
    return $n > 1;
}

function econur_pd_money($n) { return html_entity_decode(wp_strip_all_tags(wc_price($n)), ENT_QUOTES, 'UTF-8'); }

function econur_pd_is_this($p) {
    return !is_admin() && function_exists('is_product') && is_product() && $p && $p->get_id() === get_queried_object_id();
}

/* ------------------------------------------------------------------ price */

// Main price shows the pre-selected size (the page script swaps it when another size is picked).
add_filter('woocommerce_variable_price_html', function ($html, $p) {
    if (!econur_pd_is_this($p)) return $html;
    list($vid) = econur_pd_default($p);
    if (!$vid) return $html;
    $v = wc_get_product($vid);
    return $v ? $v->get_price_html() : $html;
}, 20, 2);

// Sale pill next to the main price (only when a real sale price is set).
add_filter('woocommerce_get_price_html', function ($html, $p) {
    if (!econur_pd_is_this($p)) return $html;
    $pct = econur_sale_pct($p);
    return $pct ? $html . '<span class="ecn-pd-off">Save ' . $pct . '%</span>' : $html;
}, 20, 2);

/* ---------------------------------------------------- title block + summary */

// Skin fit and rating (real reviews only) under the title.
add_action('astra_woo_single_title_after', function () {
    global $product; if (!$product) return;
    $id = $product->get_id();
    $skin = econur_meta_list($id, 'econur_skin_type');
    $rc = (int) $product->get_review_count(); $avg = (float) $product->get_average_rating();
    $h = '';
    if ($skin) $h .= '<p class="ecn-pd-fit">For ' . esc_html(strtolower(implode(', ', $skin))) . '</p>';
    if ($rc > 0) $h .= '<a class="ecn-pd-rating" href="#reviews"><span class="ecn-pd-stars" style="--r:' . esc_attr(round($avg / 5 * 100)) . '%" aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span><span>' . esc_html(number_format_i18n($avg, 1)) . ' (' . esc_html($rc) . ' ' . ($rc === 1 ? 'review' : 'reviews') . ')</span><span class="screen-reader-text">' . esc_html(sprintf('Rated %s out of 5', number_format_i18n($avg, 1))) . '</span></a>';
    if ($h) echo '<div class="ecn-pd-meta">' . $h . '</div>';
}, 10);

// Short description right after the price, before the size selector (Astra's price hook).
add_action('astra_woo_single_price_after', function () {
    global $product; if (!$product) return;
    $s = $product->get_short_description();
    if ($s) echo '<div class="ecn-pd-promise">' . wp_kses_post(wpautop($s)) . '</div>';
}, 10);

// Coming soon (no price yet).
add_filter('woocommerce_product_single_add_to_cart_text', 'econur_cs_text');
add_filter('woocommerce_product_add_to_cart_text', 'econur_cs_text');
function econur_cs_text($text) { global $product; return ($product && '' === $product->get_price()) ? 'Coming soon' : $text; }
add_action('woocommerce_single_product_summary', function () {
    global $product;
    if ($product && '' === $product->get_price()) {
        $wa = 'https://wa.me/8801410753555?text=' . rawurlencode('Hi Econur, please let me know when ' . $product->get_name() . ' is available.');
        echo '<div class="ecn-pd-coming"><b>Launching soon.</b> Want a message the day it is ready?<a class="ecn-pd-btn-outline" href="' . esc_url($wa) . '" target="_blank" rel="noopener">Notify me on WhatsApp</a></div>';
    }
}, 29);

// Buy now: second submit in the same form, goes straight to checkout (variation + stock validation still apply).
add_action('woocommerce_before_add_to_cart_button', function () {
    global $product;
    if ($product && $product->is_type('simple')) echo '<input type="hidden" name="add-to-cart" value="' . esc_attr($product->get_id()) . '">';
});
add_action('woocommerce_after_add_to_cart_button', function () {
    global $product;
    if (!$product || '' === $product->get_price()) return;
    echo '<button type="submit" name="ecn_buy_now" value="1" class="ecn-buy-now">Buy now</button>';
});
add_filter('woocommerce_add_to_cart_redirect', function ($url) { return !empty($_REQUEST['ecn_buy_now']) ? wc_get_checkout_url() : $url; });
add_filter('wc_add_to_cart_message_html', function ($msg) { return !empty($_REQUEST['ecn_buy_now']) ? '' : $msg; });

// Trust grid under the buttons.
add_action('woocommerce_after_add_to_cart_form', function () {
    global $product; if (!$product) return;
    $buyable = '' !== $product->get_price() && $product->is_purchasable();
    $t = array();
    if ($buyable) {
        if (!$product->is_in_stock()) { $st = array('is-out', 'Out of stock', 'Not available right now'); }
        else {
            $q = $product->managing_stock() ? (int) $product->get_stock_quantity() : 0;
            $st = ($q > 0 && $q <= 10) ? array('is-low', 'Only ' . $q . ' left', 'Ready to ship') : array('is-ok', 'In stock', 'Ready to ship');
        }
        $t[] = '<li class="ecn-tr-stock ' . $st[0] . '" data-ecn-stock>' . econur_pd_icon('box') . '<span><b>' . esc_html($st[1]) . '</b><small>' . esc_html($st[2]) . '</small></span></li>';
        $t[] = '<li>' . econur_pd_icon('truck') . '<span><b>Fast delivery</b><small>Inside Dhaka 1 to 2 days<br>Outside Dhaka 2 to 4 days</small></span></li>';
        $t[] = '<li>' . econur_pd_icon('cash') . '<span><b>Cash on delivery</b><small>Pay when your order arrives</small></span></li>';
    }
    $t[] = '<li>' . econur_pd_icon('leaf') . '<span><b>Zero-plastic packaging</b><small>Compostable wrap</small></span></li>';
    echo '<ul class="ecn-pd-trust" aria-label="Delivery and packaging">' . implode('', $t) . '</ul>';
}, 5);

/* ------------------------------------------------- full-width sections */

// "Title::Text|Title::Text" product fields -> array of [title, text].
function econur_pd_pairs($id, $key) {
    $out = array();
    foreach (econur_meta_list($id, $key) as $row) {
        $p = array_map('trim', explode('::', $row, 2));
        if ('' !== $p[0]) $out[] = array($p[0], isset($p[1]) ? $p[1] : '');
    }
    return $out;
}
function econur_pd_join($items) {
    $items = array_values($items); $n = count($items);
    if ($n < 2) return implode('', $items);
    return implode(', ', array_slice($items, 0, -1)) . ' and ' . $items[$n - 1];
}
function econur_pd_love_icon($title) {
    $t = strtolower($title);
    if (false !== strpos($t, 'pack')) return 'leaf';
    if (preg_match('/clean|exfol|scrub|purif/', $t)) return 'spark';
    if (preg_match('/botan|herb|ingred|formula/', $t)) return 'sprout';
    if (preg_match('/skin|mild|gentle|soft|hydrat|little/', $t)) return 'drop';
    return 'check';
}

add_action('woocommerce_after_single_product_summary', function () {
    global $product; if (!$product) return;
    $id   = $product->get_id();
    $key  = econur_meta_list($id, 'econur_key_ingredients');
    $how  = trim((string) get_post_meta($id, 'econur_how_to_use', true));
    $full = trim((string) get_post_meta($id, 'econur_full_ingredients', true));
    $desc = $product->get_description();
    $skin = econur_meta_list($id, 'econur_skin_type');

    echo '<div class="ecn-pdx">';

    // Why You'll Love It: up to 4 highlights (econur_highlights), else built from existing product fields.
    $love = econur_pd_pairs($id, 'econur_highlights');
    if (!$love && ($skin || $key)) {
        if ($skin) $love[] = array('Made for Your Skin', 'Best for ' . strtolower(econur_pd_join($skin)) . '.');
        if ($key)  $love[] = array('Key Botanicals', 'Made with ' . econur_pd_join($key) . '.');
        $love[] = array('Thoughtful Packaging', 'Zero plastic, in a compostable wrap that returns to the soil.');
    }
    $love = array_slice($love, 0, 4);
    if ($love) {
        echo '<section class="ecn-pdx-sec ecn-pdx-love" aria-labelledby="ecn-love-t"><h2 class="ecn-pdx-h" id="ecn-love-t">Why You&rsquo;ll Love It</h2><ul class="ecn-love ecn-n' . count($love) . '">';
        foreach ($love as $l) echo '<li><span class="ecn-love-ico">' . econur_pd_icon(econur_pd_love_icon($l[0])) . '</span><h3 class="ecn-love-t">' . esc_html($l[0]) . '</h3>' . ($l[1] ? '<p class="ecn-love-p">' . esc_html($l[1]) . '</p>' : '') . '</li>';
        echo '</ul></section>';
    }

    // Powered by Purposeful Ingredients: econur_ingredient_notes (name::note), else key ingredient names.
    $ing = econur_pd_pairs($id, 'econur_ingredient_notes');
    if (!$ing) foreach ($key as $k) $ing[] = array($k, '');
    $ing = array_slice($ing, 0, 3);
    if ($ing) {
        echo '<section class="ecn-pdx-sec ecn-pdx-ing" aria-labelledby="ecn-ing-t"><h2 class="ecn-pdx-h" id="ecn-ing-t">Powered by Purposeful Ingredients</h2><ol class="ecn-kin ecn-n' . count($ing) . '">';
        foreach ($ing as $i => $g) echo '<li class="ecn-kin-card"><span class="ecn-kin-no" aria-hidden="true">' . sprintf('%02d', $i + 1) . '</span><h3 class="ecn-kin-n">' . esc_html($g[0]) . '</h3>' . ($g[1] ? '<p class="ecn-kin-p">' . esc_html($g[1]) . '</p>' : '') . '</li>';
        echo '</ol>';
        if ($full) echo '<a class="ecn-pdx-link" href="#ecn-acc-ing" data-acc-open="ecn-acc-ing">See the full ingredient list' . econur_pd_icon('arrow') . '</a>';
        echo '</section>';
    }

    // How to Use: econur_how_steps (title::text) + econur_how_note, else the instructions split into sentences.
    $steps = econur_pd_pairs($id, 'econur_how_steps');
    $note  = trim((string) get_post_meta($id, 'econur_how_note', true));
    if (!$steps && $how) {
        foreach (array_values(array_filter(array_map('trim', preg_split('/(?<=[.!?])\s+(?=[A-Z0-9])/', $how)))) as $s) $steps[] = array('', $s);
    }
    $steps = array_slice($steps, 0, 4);
    if ($steps) {
        echo '<section class="ecn-pdx-sec ecn-pdx-how" aria-labelledby="ecn-how-t"><h2 class="ecn-pdx-h" id="ecn-how-t">How to Use</h2><ol class="ecn-how ecn-n' . count($steps) . '">';
        foreach ($steps as $i => $s) echo '<li><span class="ecn-how-n" aria-hidden="true">' . sprintf('%02d', $i + 1) . '</span>' . ($s[0] ? '<h3 class="ecn-how-t">' . esc_html($s[0]) . '</h3>' : '') . '<p>' . esc_html($s[1]) . '</p></li>';
        echo '</ol>';
        if ($note) echo '<p class="ecn-how-note">' . esc_html($note) . '</p>';
        echo '</section>';
    }

    // Product Details accordion.
    $acc = array();
    $b = '';
    if ($desc) $b .= '<div class="ecn-acc-rich">' . wp_kses_post(wpautop($desc)) . '</div>';
    if ($skin) $b .= '<p class="ecn-acc-kv"><b>Best for:</b> ' . esc_html(implode(', ', $skin)) . '</p>';
    if ($b) $acc['desc'] = array('Description', $b);
    $b = '';
    if ($key) $b .= '<p class="ecn-acc-kv"><b>Key ingredients:</b> ' . esc_html(implode(', ', $key)) . '</p>';
    if ($full) $b .= '<p class="ecn-acc-kv"><b>Full ingredient list:</b> ' . esc_html($full) . '</p>';
    if ($b) $acc['ing'] = array('Ingredients', $b);
    if ($how) $acc['how'] = array('How to Use', '<p>' . esc_html($how) . '</p>');
    $acc['pack'] = array('Packaging', '<p><b>Returns to the soil.</b> Zero plastic, ever. Bury the compostable wrap in a plant pot and let it break down.</p>');
    if (comments_open($id)) {
        $rc = (int) $product->get_review_count();
        $acc['rev'] = array($rc > 0 ? 'Reviews (' . $rc . ')' : 'Reviews', '', '#reviews');
    }
    echo '<section class="ecn-pdx-sec ecn-pdx-acc" aria-labelledby="ecn-acc-t"><h2 class="ecn-pdx-h" id="ecn-acc-t">Product Details</h2><div class="ecn-acc">';
    foreach ($acc as $k => $a) {
        if (!empty($a[2])) { echo '<a class="ecn-acc-row ecn-acc-link" href="' . esc_attr($a[2]) . '"><span>' . esc_html($a[0]) . '</span><i class="ecn-acc-go" aria-hidden="true">' . econur_pd_icon('chev') . '</i></a>'; continue; }
        echo '<details class="ecn-acc-item" id="ecn-acc-' . esc_attr($k) . '"><summary class="ecn-acc-row"><span>' . esc_html($a[0]) . '</span><i class="ecn-acc-pm" aria-hidden="true"></i></summary><div class="ecn-acc-body"><div class="ecn-acc-in">' . $a[1] . '</div></div></details>';
    }
    echo '</div></section>';

    // Customer Reviews: real WooCommerce reviews + form only.
    if (comments_open($id)) {
        $rc = (int) $product->get_review_count(); $avg = (float) $product->get_average_rating();
        echo '<section class="ecn-pdx-sec ecn-pdx-rev' . ($rc > 0 ? ' has-reviews' : ' no-reviews') . '" aria-labelledby="ecn-rev-t"><div class="ecn-rev-grid"><div class="ecn-rev-intro"><h2 class="ecn-pdx-h" id="ecn-rev-t">Customer Reviews</h2>';
        if ($rc > 0) {
            echo '<p class="ecn-rev-avg"><span class="ecn-rev-num">' . esc_html(number_format_i18n($avg, 1)) . '</span><span class="ecn-pd-stars" style="--r:' . esc_attr(round($avg / 5 * 100)) . '%" aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span></p><p class="ecn-rev-sub">Based on ' . esc_html($rc) . ' ' . ($rc === 1 ? 'review' : 'reviews') . '</p>';
        } else {
            echo '<p class="ecn-rev-empty">No reviews yet</p><p class="ecn-rev-sub">Be the first to share your experience.</p>';
        }
        echo '</div><div class="ecn-rev-main">';
        comments_template();
        echo '</div></div></section>';
    }

    echo '</div>';
}, 10);

// You May Also Love: up to 4 products. Products that need a size choice link to their page.
add_action('woocommerce_after_single_product_summary', function () {
    global $product; if (!$product) return;
    $id = $product->get_id();
    $ids = array_merge(wc_get_related_products($id, 8), wc_get_products(array('status' => 'publish', 'limit' => 12, 'return' => 'ids', 'exclude' => array($id))));
    $ids = array_values(array_unique(array_map('intval', $ids)));
    $cards = ''; $n = 0;
    foreach ($ids as $pid) {
        if ($n >= 4 || $pid === $id) continue;
        $p = wc_get_product($pid);
        if (!$p || !$p->is_visible() || '' === $p->get_price() || !$p->is_in_stock()) continue;
        $link = get_permalink($pid); $name = $p->get_name();
        if (econur_pd_needs_choice($p) || !$p->is_type('simple')) {
            $act = '<a class="ecn-aml-add" href="' . esc_url($link) . '" aria-label="' . esc_attr('Choose a size for ' . $name) . '">' . econur_pd_icon('arrow') . '</a>';
        } else {
            $act = '<button type="button" class="ecn-aml-add" data-id="' . esc_attr($pid) . '" data-url="' . esc_url($link) . '" data-name="' . esc_attr($name) . '" aria-label="' . esc_attr('Add ' . $name . ' to cart') . '">' . econur_pd_icon('bag') . '</button>';
        }
        $cards .= '<div class="ecn-aml-card"><a class="ecn-aml-img" href="' . esc_url($link) . '" tabindex="-1" aria-hidden="true">' . $p->get_image('woocommerce_single', array('loading' => 'lazy', 'decoding' => 'async', 'sizes' => '(min-width: 922px) 280px, 50vw')) . '</a><div class="ecn-aml-body"><a class="ecn-aml-name" href="' . esc_url($link) . '">' . esc_html($name) . '</a><div class="ecn-aml-foot"><span class="ecn-aml-price">' . wp_kses_post($p->get_price_html()) . '</span>' . $act . '</div></div></div>';
        $n++;
    }
    if (!$cards) return;
    echo '<section class="ecn-aml" aria-labelledby="ecn-aml-t"><div class="ecn-aml-head"><h2 class="ecn-pdx-h" id="ecn-aml-t">You May Also Love</h2><a class="ecn-aml-all" href="' . esc_url(wc_get_page_permalink('shop')) . '">See all</a></div><div class="ecn-aml-track ecn-n' . $n . '">' . $cards . '</div></section>';
}, 20);

/* ------------------------------------------- sticky bar, toast, page script */

add_action('wp_footer', function () {
    if (!function_exists('is_product') || !is_product()) return;
    $product = wc_get_product(get_queried_object_id());
    if (!$product) return;
    $buyable = '' !== $product->get_price() && $product->is_purchasable() && $product->is_in_stock();
    list($vid, $price) = econur_pd_default($product);
    $wa = 'https://wa.me/8801410753555?text=' . rawurlencode('Hi Econur, I have a question about ' . $product->get_name() . '.');
    echo '<div class="ecn-buybar" id="ecnBuybar" aria-hidden="true"><a class="ecn-buybar-wa" href="' . esc_url($wa) . '" target="_blank" rel="noopener" aria-label="Ask on WhatsApp" tabindex="-1">' . econur_pd_wa_icon() . '</a>';
    if ($buyable) {
        echo '<button type="button" class="ecn-buybar-btn" id="ecnBuyBtn" tabindex="-1"><span>Add to cart</span><b id="ecnBuyTotal">' . ($price > 0 ? esc_html(econur_pd_money($price)) : '') . '</b></button>';
    } else {
        $wn = 'https://wa.me/8801410753555?text=' . rawurlencode('Hi Econur, please let me know when ' . $product->get_name() . ' is available.');
        echo '<a class="ecn-buybar-btn" href="' . esc_url($wn) . '" target="_blank" rel="noopener" tabindex="-1"><span>Notify me on WhatsApp</span></a>';
    }
    echo '</div>';
    echo '<div class="ecn-toast" id="ecnToast" role="status" aria-live="polite" hidden><span id="ecnToastTxt"></span><a href="' . esc_url(wc_get_checkout_url()) . '">Checkout</a></div>';
    $cfg = array('ajax' => WC_AJAX::get_endpoint('add_to_cart'), 'symbol' => trim(html_entity_decode(get_woocommerce_currency_symbol(), ENT_QUOTES, 'UTF-8'), " \xC2\xA0"), 'dec' => wc_get_price_decimals(), 'price' => $price, 'check' => econur_pd_icon('check'));
    echo '<script>window.ECN_PD=' . wp_json_encode($cfg) . ';</script>';
    ?>
<script>(function(){
function init(){
  var C=window.ECN_PD||{}, form=document.querySelector('form.cart');
  function money(n){ return String(C.symbol||'').trim()+' '+Number(n).toLocaleString('en-US',{minimumFractionDigits:C.dec||0,maximumFractionDigits:C.dec||0}); }
  var isVar=!!(form && form.classList.contains('variations_form'));

  /* size pills (mirror the real select; WooCommerce keeps doing the work) */
  if(form){ form.querySelectorAll('table.variations select').forEach(function(sel){
    var wrap=document.createElement('div'); wrap.className='ecn-pd-sizes'; wrap.setAttribute('role','radiogroup');
    var lab=form.querySelector('label[for="'+sel.id+'"]'); if(lab){ wrap.setAttribute('aria-label',lab.textContent.trim()); }
    var vars=[]; try{ vars=JSON.parse(form.getAttribute('data-product_variations')||'[]')||[]; }catch(err){ vars=[]; }
    function priceFor(v){ for(var i=0;i<vars.length;i++){ var a=vars[i].attributes||{}; if(a[sel.name]===v) return vars[i]; } return null; }
    var opts=[], prices={};
    Array.prototype.forEach.call(sel.options,function(o){ if(!o.value) return; var pv=priceFor(o.value); opts.push({o:o,v:pv}); if(pv) prices[pv.display_price]=1; });
    var showPrice=Object.keys(prices).length>1;
    function sync(){ wrap.querySelectorAll('.ecn-pd-sz').forEach(function(x){ var on=x.getAttribute('data-v')===sel.value; x.classList.toggle('is-on',on); x.setAttribute('aria-checked',on?'true':'false'); x.tabIndex=on||(!sel.value && x===wrap.firstChild)?0:-1; }); }
    opts.forEach(function(it){ var b=document.createElement('button'); b.type='button'; b.className='ecn-pd-sz'; b.setAttribute('role','radio'); b.setAttribute('data-v',it.o.value);
      var html='<span class="ecn-sz-l">'+it.o.text+'</span>';
      if(showPrice && it.v){ html+='<span class="ecn-sz-p">'+money(it.v.display_price)+'</span>'; b.classList.add('has-price'); }
      b.innerHTML=html;
      b.addEventListener('click',function(){ sel.value=it.o.value; if(window.jQuery){ window.jQuery(sel).trigger('change'); } else { sel.dispatchEvent(new Event('change',{bubbles:true})); } sync(); });
      b.addEventListener('keydown',function(e){ if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft'&&e.key!=='ArrowDown'&&e.key!=='ArrowUp') return; e.preventDefault(); var all=[].slice.call(wrap.children), i=all.indexOf(b); var n=all[(i+((e.key==='ArrowRight'||e.key==='ArrowDown')?1:-1)+all.length)%all.length]; n.focus(); n.click(); });
      wrap.appendChild(b); });
    sel.insertAdjacentElement('afterend',wrap); sel.classList.add('ecn-hidden-select'); sel.setAttribute('tabindex','-1'); sel.setAttribute('aria-hidden','true');
    sel.addEventListener('change',sync); if(window.jQuery){ window.jQuery(form).on('reset_data woocommerce_update_variation_values',sync); } sync();
  }); }

  /* quantity stepper (keeps WooCommerce min/max) */
  var base=Number(C.price)||0, totalEl=document.getElementById('ecnBuyTotal'), q=form?form.querySelector('.quantity input.qty'):null;
  function upd(){ if(!totalEl) return; if(!base){ totalEl.textContent=''; return; } var n=q?Math.max(1,parseInt(q.value||'1',10)||1):1; totalEl.textContent=money(base*n); }
  if(q && !q.closest('.ecn-qty')){ var box=q.closest('.quantity'); if(box){ box.classList.add('ecn-qty');
    var m=document.createElement('button'), p=document.createElement('button'); m.type='button'; p.type='button'; m.className='ecn-qty-btn'; p.className='ecn-qty-btn'; m.innerHTML='&minus;'; p.textContent='+'; m.setAttribute('aria-label','Decrease quantity'); p.setAttribute('aria-label','Increase quantity');
    box.insertBefore(m,q); box.appendChild(p);
    m.addEventListener('click',function(){ var v=parseInt(q.value||'1',10)||1, mn=parseInt(q.getAttribute('min')||'1',10)||1; if(v>mn){ q.value=v-1; q.dispatchEvent(new Event('change',{bubbles:true})); upd(); } });
    p.addEventListener('click',function(){ var v=parseInt(q.value||'1',10)||1, mx=parseInt(q.getAttribute('max')||'0',10); if(!mx||v<mx){ q.value=v+1; q.dispatchEvent(new Event('change',{bubbles:true})); upd(); } }); } }
  if(q){ q.addEventListener('input',upd); q.addEventListener('change',upd); }

  /* live price + stock tile from the real variation data */
  var mp=document.querySelector('.summary p.price'), orig=mp?mp.innerHTML:'';
  if(window.jQuery && isVar){ window.jQuery(form).on('found_variation',function(e,v){
    if(!v) return;
    if(v.display_price!=null){ base=Number(v.display_price); upd(); }
    var st=document.querySelector('[data-ecn-stock]');
    if(st){ var b=st.querySelector('b'), s=st.querySelector('small');
      if(!v.is_in_stock){ st.className='ecn-tr-stock is-out'; b.textContent='Out of stock'; s.textContent='This size is not available'; }
      else if(v.max_qty && Number(v.max_qty)<=10){ st.className='ecn-tr-stock is-low'; b.textContent='Only '+v.max_qty+' left'; s.textContent='Ready to ship'; }
      else { st.className='ecn-tr-stock is-ok'; b.textContent='In stock'; s.textContent='Ready to ship'; } }
    if(v.price_html && mp){ var tmp=document.createElement('div'); tmp.innerHTML=v.price_html; var src=tmp.querySelector('.price'); if(src){ var pill=mp.querySelector('.ecn-pd-off'); mp.innerHTML=src.innerHTML; if(pill) mp.appendChild(pill); } }
  }).on('reset_data',function(){ base=0; upd(); if(mp) mp.innerHTML=orig; }); }
  upd();

  /* a size must be chosen before Add to cart / Buy now */
  function needsSize(){ if(!isVar) return false; var vid=form.querySelector('input[name=variation_id]'); return !(vid && parseInt(vid.value||'0',10)>0); }
  function flagSize(){ var sz=form.querySelector('.ecn-pd-sizes')||form; sz.scrollIntoView({behavior:'smooth',block:'center'}); sz.classList.add('ecn-flag'); var f=sz.querySelector('.ecn-pd-sz'); if(f) setTimeout(function(){ f.focus({preventScroll:true}); },350); setTimeout(function(){ sz.classList.remove('ecn-flag'); },1600); }
  var bn=form?form.querySelector('.ecn-buy-now'):null;
  if(bn){ bn.addEventListener('click',function(e){ if(needsSize()){ e.preventDefault(); flagSize(); return; } var add=form.querySelector('.single_add_to_cart_button'); if(add && add.classList.contains('wc-variation-is-unavailable')){ e.preventDefault(); } }); }

  /* sticky Add to cart: only after the main buttons scroll out of view */
  var bar=document.getElementById('ecnBuybar'), buy=document.getElementById('ecnBuyBtn'), anchor=form?(form.querySelector('.single_add_to_cart_button')||form):document.querySelector('.ecn-pd-coming');
  function showBar(on){ if(!bar) return; bar.classList.toggle('is-on',on); bar.setAttribute('aria-hidden',on?'false':'true'); bar.querySelectorAll('a,button').forEach(function(x){ x.tabIndex=on?0:-1; }); }
  if(bar && anchor && 'IntersectionObserver' in window){ var passed=false; new IntersectionObserver(function(en){ en.forEach(function(x){ passed=!x.isIntersecting && x.boundingClientRect.top<0; showBar(passed); }); },{threshold:0}).observe(anchor); }
  if(buy && form){ buy.addEventListener('click',function(){ if(needsSize()){ flagSize(); return; } var add=form.querySelector('.single_add_to_cart_button'); if(add){ buy.classList.add('is-busy'); add.click(); } }); }

  /* accordion: smooth open/close (native <details> without JS) */
  var reduce=window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.ecn-acc-item').forEach(function(d){ var s=d.querySelector('summary'), b=d.querySelector('.ecn-acc-body'); if(!s||!b||reduce) return;
    s.addEventListener('click',function(e){ e.preventDefault(); if(d.classList.contains('is-anim')) return; d.classList.add('is-anim');
      var done=function(){ b.style.height=''; d.classList.remove('is-anim'); };
      if(d.open){ b.style.height=b.scrollHeight+'px'; requestAnimationFrame(function(){ requestAnimationFrame(function(){ b.style.height='0px'; }); }); setTimeout(function(){ d.open=false; done(); },300); }
      else { d.open=true; var h=b.scrollHeight; b.style.height='0px'; requestAnimationFrame(function(){ requestAnimationFrame(function(){ b.style.height=h+'px'; }); }); setTimeout(done,300); } }); });

  /* accordion links (e.g. "Full ingredient list") */
  document.addEventListener('click',function(e){ var t=e.target.closest('[data-acc-open]'); if(!t) return; var d=document.getElementById(t.getAttribute('data-acc-open')); if(d){ e.preventDefault(); d.open=true; d.scrollIntoView({behavior:'smooth',block:'start'}); } });

  /* gallery counter (only with more than one image) */
  var gal=document.querySelector('.woocommerce-product-gallery'), slides=gal?gal.querySelectorAll('.woocommerce-product-gallery__image'):[];
  if(gal && slides.length>1){ var cnt=document.createElement('span'); cnt.className='ecn-gal-count'; cnt.setAttribute('aria-hidden','true'); gal.appendChild(cnt);
    var setC=function(){ var i=0; slides.forEach(function(s,k){ if(s.classList.contains('flex-active-slide')) i=k; }); cnt.textContent=(i+1)+' / '+slides.length; };
    setC(); if(window.jQuery){ window.jQuery(gal).on('click','.flex-control-nav li',function(){ setTimeout(setC,50); }); } new MutationObserver(setC).observe(gal,{subtree:true,attributes:true,attributeFilter:['class']}); }

  /* one-tap add from the carousel (single-size products only; others link to their page) */
  var toast=document.getElementById('ecnToast'), tt=document.getElementById('ecnToastTxt'), th=null;
  function showToast(msg){ if(!toast) return; tt.textContent=msg; toast.hidden=false; requestAnimationFrame(function(){ toast.classList.add('is-on'); }); clearTimeout(th); th=setTimeout(function(){ toast.classList.remove('is-on'); setTimeout(function(){ toast.hidden=true; },250); },3500); }
  document.querySelectorAll('button.ecn-aml-add').forEach(function(b){ b.addEventListener('click',function(){
    if(b.disabled) return; b.disabled=true; b.classList.add('is-busy');
    var fd=new FormData(); fd.append('product_id',b.getAttribute('data-id')); fd.append('quantity','1');
    fetch(C.ajax,{method:'POST',body:fd,credentials:'same-origin'}).then(function(r){ return r.json(); }).then(function(res){
      if(!res || res.error){ location.href=b.getAttribute('data-url'); return; }
      if(res.fragments){ Object.keys(res.fragments).forEach(function(k){ document.querySelectorAll(k).forEach(function(el){ el.outerHTML=res.fragments[k]; }); }); if(window.jQuery){ window.jQuery(document.body).trigger('added_to_cart',[res.fragments,res.cart_hash]); } }
      b.classList.add('is-done'); if(C.check){ b.innerHTML=C.check; } showToast(b.getAttribute('data-name')+' added to cart');
    }).catch(function(){ location.href=b.getAttribute('data-url'); }).then(function(){ b.disabled=false; b.classList.remove('is-busy'); });
  }); });
}
if(window.jQuery){ window.jQuery(function(){ setTimeout(init,0); }); } else if(document.readyState!=='loading'){ init(); } else { document.addEventListener('DOMContentLoaded',init); }
})();</script>
    <?php
}, 40);
