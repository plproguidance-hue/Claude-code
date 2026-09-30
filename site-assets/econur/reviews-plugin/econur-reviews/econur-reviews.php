<?php
/**
 * Plugin Name:       ECONUR Reviews
 * Description:       "What customers say" section for the homepage, shortcode [econur_reviews]. Shows approved WooCommerce product reviews once there are enough of them, and the customer testimonials the store owner has confirmed until then.
 * Version:           1.1.0
 * Requires Plugins:  woocommerce
 * Author:            ECONUR
 * Text Domain:       econur-reviews
 */
defined('ABSPATH') || exit;

define('ECONUR_REVIEWS_VERSION', '1.1.0');

require_once __DIR__ . '/includes/review-requests.php';

/*
 * Two modes, chosen automatically:
 *  - live:     at least `live_min` approved product reviews exist. Cards are the newest approved reviews rated
 *              `min_rating` or higher; the rating row is calculated from ALL approved reviews.
 *  - fallback: fewer reviews than that. Cards are the confirmed testimonials below, with only what is known about
 *              each one: no stars, no "Verified buyer", no "Purchased", no date and no rating row.
 *
 * The plugin only takes over [econur_reviews] when the option `econur_reviews_active` is 'yes'. Until then the
 * existing section keeps rendering, and the new one is visible only on a preview URL (?enr_preview=<key>).
 */
function enr_reviews_settings() {
    return apply_filters('econur_reviews_settings', array(
        'live_min'   => 3,
        'limit'      => 9,
        'min_rating' => 4,
        // Confirmed by the store owner as real customers. Wording is the customers' own; do not edit.
        'testimonials' => array(
            array('name' => 'Nadia Rahman', 'city' => 'Dhaka',
                  'about' => array('image' => 140, 'focus' => '32% 74%', 'title' => 'An ECONUR bar', 'line' => 'A permanent fixture in the shower'),
                  'text' => 'Softest my skin has felt in years. This bar is a permanent fixture in my shower now and I will not go back to commercial soap.'),
            array('name' => 'Tanvir Hossain', 'city' => 'Chattogram', 'product' => 14, 'product_label' => 'Product mentioned',
                  'text' => 'The Active Defense Bar cleared my blackheads in two weeks. Genuinely impressed.'),
            array('name' => 'Priya Chowdhury', 'city' => 'Sylhet',
                  'about' => array('image' => 103, 'focus' => '58% 42%', 'title' => 'A full ECONUR set', 'line' => 'Ordered as a gift'),
                  'text' => 'Ordered a full set as a gift. The packaging and the scents are beautiful, everyone loved them.'),
        ),
        'eyebrow' => 'Loved by customers',
        'title'   => 'What customers say',
        'sub' => array(
            'fallback'      => 'Real feedback shared by ECONUR customers.',
            'live'          => 'Real feedback from ECONUR customers.',
            'live_verified' => 'Real feedback from customers who have purchased ECONUR products.',
        ),
        // [icon, title, line]. live_verified is used only when every review shown is from a verified owner.
        // Product claims (e.g. handmade, natural, packaging) appear here only once the owner has confirmed them.
        // Current lines are checked against store settings: reviews are open on every product, and cash on delivery
        // is the enabled payment method for the Bangladesh-only shipping zone.
        'trust' => array(
            'fallback' => array(
                array('chat', 'Real customer feedback', 'Shared with us by ECONUR customers.'),
                array('star', 'Share your experience', 'Leave a review on any product page.'),
                array('cash', 'Cash on delivery', 'Available across Bangladesh.'),
            ),
            'live' => array(
                array('chat', 'Customer reviews', 'Approved reviews from our product pages.'),
                array('star', 'Star-rated', 'Every review includes a 1 to 5 star rating.'),
                array('sync', 'Updated from WooCommerce', '%latest%'),
            ),
            'live_verified' => array(
                array('cart', 'Verified purchases', 'Reviews from confirmed customers.'),
                array('chat', 'Real product reviews', 'Honest feedback from real buyers.'),
                array('sync', 'Updated from WooCommerce', '%latest%'),
            ),
        ),
        'decor'       => array('tl' => 154, 'tr' => 155, 'bl' => 131, 'br' => 131),
        'thumb_focus' => array(14 => '30% 62%'),
    ));
}

/* ---------- activation, preview and page cache ---------- */

register_activation_hook(__FILE__, function () {
    add_option('econur_reviews_active', 'no');
    if (!get_option('econur_reviews_preview_key')) update_option('econur_reviews_preview_key', wp_generate_password(20, false), false);
});

function enr_reviews_is_preview() {
    static $is = null;
    if (null === $is) {
        $key = (string) get_option('econur_reviews_preview_key');
        $is = $key !== '' && isset($_GET['enr_preview']) && hash_equals($key, (string) wp_unslash($_GET['enr_preview']));
    }
    return $is;
}

function enr_reviews_is_on() {
    return 'yes' === get_option('econur_reviews_active') || enr_reviews_is_preview();
}

// Take over the shortcode after the theme has registered its own version of it.
add_action('init', function () {
    if (!enr_reviews_is_on()) return;
    remove_shortcode('econur_reviews');
    add_shortcode('econur_reviews', 'enr_reviews_shortcode');
}, 20);

// A preview is never cached or indexed.
add_action('template_redirect', function () {
    if (!enr_reviews_is_preview()) return;
    if (!defined('DONOTCACHEPAGE')) define('DONOTCACHEPAGE', true);
    do_action('litespeed_control_set_nocache', 'econur reviews preview');
    nocache_headers();
}, 0);
add_filter('wp_robots', function ($r) { if (enr_reviews_is_preview()) $r['noindex'] = true; return $r; });

/* ---------- data ---------- */

const ENR_REVIEWS_CACHE = 'econur_reviews_data_v1';

function enr_reviews_flush() {
    delete_transient(ENR_REVIEWS_CACHE);
    $front = (int) get_option('page_on_front');
    if ($front) do_action('litespeed_purge_post', $front);
}
foreach (array('comment_post', 'edit_comment', 'wp_set_comment_status', 'deleted_comment', 'trashed_comment', 'untrashed_comment', 'spammed_comment', 'unspammed_comment', 'woocommerce_update_product', 'woocommerce_delete_product', 'woocommerce_trash_product') as $h) {
    add_action($h, 'enr_reviews_flush');
}
foreach (array('added_comment_meta', 'updated_comment_meta', 'deleted_comment_meta') as $h) {
    add_action($h, function ($mid, $cid, $key) { if (in_array($key, array('rating', 'verified'), true)) enr_reviews_flush(); }, 10, 3);
}

// Rating figures across ALL approved, rated product reviews on published products.
function enr_reviews_stats() {
    global $wpdb;
    $row = $wpdb->get_row(
        "SELECT COUNT(*) AS n, AVG(CAST(r.meta_value AS DECIMAL(4,2))) AS average, SUM(CASE WHEN v.meta_value = '1' THEN 1 ELSE 0 END) AS verified
         FROM {$wpdb->comments} c
         JOIN {$wpdb->posts} p ON p.ID = c.comment_post_ID AND p.post_type = 'product' AND p.post_status = 'publish'
         JOIN {$wpdb->commentmeta} r ON r.comment_id = c.comment_ID AND r.meta_key = 'rating' AND CAST(r.meta_value AS UNSIGNED) BETWEEN 1 AND 5
         LEFT JOIN {$wpdb->commentmeta} v ON v.comment_id = c.comment_ID AND v.meta_key = 'verified'
         WHERE c.comment_approved = '1' AND c.comment_type = 'review' AND c.comment_parent = 0",
        ARRAY_A
    );
    return array('count' => (int) $row['n'], 'average' => $row['n'] ? round((float) $row['average'], 1) : 0, 'verified' => (int) $row['verified']);
}

// The reviewer's city, only when it is on record: the linked account's billing city, else their latest paid order's.
function enr_reviews_city($comment) {
    $city = '';
    if ($comment->user_id) $city = (string) get_user_meta($comment->user_id, 'billing_city', true);
    if ($city === '' && is_email($comment->comment_author_email) && function_exists('wc_get_orders')) {
        $orders = wc_get_orders(array('billing_email' => $comment->comment_author_email, 'status' => array('wc-processing', 'wc-completed'), 'limit' => 1, 'orderby' => 'date', 'order' => 'DESC'));
        if ($orders) $city = (string) $orders[0]->get_billing_city();
    }
    return trim(wp_strip_all_tags($city));
}

function enr_reviews_build($cfg) {
    $stats = enr_reviews_stats();
    $items = array();
    if ($stats['count'] >= (int) $cfg['live_min']) {
        $comments = get_comments(array('type' => 'review', 'status' => 'approve', 'post_type' => 'product', 'post_status' => 'publish', 'parent' => 0,
                                       'number' => (int) $cfg['limit'] * 4, 'orderby' => 'comment_date_gmt', 'order' => 'DESC'));
        foreach ($comments as $c) {
            $rating = (int) get_comment_meta($c->comment_ID, 'rating', true);
            $text = trim(wp_strip_all_tags($c->comment_content));
            if ($text === '' || $rating < (int) $cfg['min_rating']) continue;
            $items[] = array(
                'name'     => $c->comment_author !== '' ? $c->comment_author : 'ECONUR customer',
                'city'     => enr_reviews_city($c),
                'rating'   => $rating,
                'verified' => function_exists('wc_review_is_from_verified_owner') && wc_review_is_from_verified_owner($c->comment_ID),
                'product'  => (int) $c->comment_post_ID,
                'date'     => $c->comment_date,
                'text'     => $text,
            );
            if (count($items) >= (int) $cfg['limit']) break;
        }
    }
    // Not enough approved reviews (or none that qualify for a card): the confirmed testimonials.
    if (!$items) return array('mode' => 'fallback', 'stats' => $stats, 'items' => array_values((array) $cfg['testimonials']));
    return array('mode' => 'live', 'stats' => $stats, 'items' => $items);
}

function enr_reviews_data($cfg, $cache = true) {
    if ($cache) {
        $d = get_transient(ENR_REVIEWS_CACHE);
        if (is_array($d) && isset($d['mode'])) return $d;
    }
    $d = enr_reviews_build($cfg);
    if ($cache) set_transient(ENR_REVIEWS_CACHE, $d, 12 * HOUR_IN_SECONDS);
    return $d;
}

/* ---------- markup helpers ---------- */

function enr_reviews_icon($n) {
    $i = array(
        'cart'  => '<circle cx="9" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/><path d="M2.5 3.5h2.6l2.3 11.1a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.2l1.6-6.7H6.1"/>',
        'chat'  => '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/><path d="M8 8.5h8"/><path d="M8 12h5"/>',
        'check' => '<path d="m7.5 12.3 3 3 6-6.2"/>',
        'star'  => '<path d="M12 3.2l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.6l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8Z"/>',
        'sync'  => '<path d="M20 11a8 8 0 0 0-14.3-4.3L4 8.5"/><path d="M4 4v4.5h4.5"/><path d="M4 13a8 8 0 0 0 14.3 4.3L20 15.5"/><path d="M20 20v-4.5h-4.5"/>',
        'cash'  => '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5"/><path d="M18 9.5v5"/>',
        'prev'  => '<path d="m15 6-6 6 6 6"/>',
        'next'  => '<path d="m9 6 6 6-6 6"/>',
    );
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . $i[$n] . '</svg>';
}

// Five stars filled to $n (partial fill for decimals), with the rating as text for screen readers.
function enr_reviews_stars($n, $class = 'enr-rv-stars') {
    static $uid = 0;
    $n = max(0, min(5, round((float) $n, 1))); $out = '';
    $path = 'M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.3L12 17.1l-5.7 3.1 1.2-6.3L2.8 9.5l6.4-.8Z';
    for ($i = 1; $i <= 5; $i++) {
        $fill = max(0, min(1, $n - $i + 1));
        if ($fill >= 1 || $fill <= 0) {
            $out .= '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="' . ($fill >= 1 ? 'is-on' : 'is-off') . '" d="' . $path . '"/></svg>';
        } else {
            $id = 'enr-rv-g' . (++$uid); $pc = round($fill * 100) . '%';
            $out .= '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><defs><linearGradient id="' . $id . '"><stop offset="' . $pc . '" stop-color="#C9A24A"/><stop offset="' . $pc . '" stop-color="#E4DDCD"/></linearGradient></defs><path fill="url(#' . $id . ')" d="' . $path . '"/></svg>';
        }
    }
    $label = sprintf('Rated %s out of 5', rtrim(rtrim(number_format($n, 1), '0'), '.'));
    return '<span class="' . esc_attr($class) . '" role="img" aria-label="' . esc_attr($label) . '">' . $out . '</span>';
}

// One line about a product: its key ingredients, else the start of its short description.
function enr_reviews_product_line($product) {
    if (function_exists('econur_finder_ingredients')) { $l = econur_finder_ingredients($product->get_id()); if ($l) return $l; }
    $parts = array_values(array_filter(array_map('trim', explode('|', (string) get_post_meta($product->get_id(), 'econur_key_ingredients', true)))));
    if ($parts) return implode(', ', $parts);
    return wp_trim_words(wp_strip_all_tags($product->get_short_description()), 8, '…');
}

function enr_reviews_thumb($img_id, $alt, $focus, $sizes) {
    if (!$img_id || !wp_attachment_is_image($img_id)) return '';
    $attr = array('class' => 'enr-rv-thumb', 'alt' => $alt, 'loading' => 'lazy', 'decoding' => 'async', 'sizes' => $sizes);
    if (preg_match('/^\d{1,3}% \d{1,3}%$/', (string) $focus)) $attr['style'] = 'object-position:' . $focus;
    return str_replace('sizes="auto, ', 'sizes="', wp_get_attachment_image($img_id, 'medium', false, $attr));
}

function enr_reviews_card($r, $n, $total, $live, $cfg) {
    $name = trim($r['name']);
    $initial = function_exists('mb_substr') ? mb_strtoupper(mb_substr($name, 0, 1)) : strtoupper(substr($name, 0, 1));
    $verified = $live && !empty($r['verified']);

    $lower = '';
    $p = !empty($r['product']) ? wc_get_product((int) $r['product']) : null;
    if ($p && 'publish' === $p->get_status()) {
        $link = get_permalink($p->get_id());
        $img_id = (int) get_post_meta($p->get_id(), 'econur_home_card_image', true);
        if (!$img_id || !wp_attachment_is_image($img_id)) $img_id = (int) $p->get_image_id();
        $img = enr_reviews_thumb($img_id, $p->get_name(), $cfg['thumb_focus'][$p->get_id()] ?? '', '112px');
        $label = $live ? ($verified ? 'Purchased' : 'Reviewed') : ($r['product_label'] ?? 'Product mentioned');
        $line = enr_reviews_product_line($p);
        $lower = '<div class="enr-rv-buy">'
            . ($img ? '<a class="enr-rv-buy-img" href="' . esc_url($link) . '" tabindex="-1" aria-hidden="true">' . $img . '</a>' : '')
            . '<div class="enr-rv-buy-copy"><span class="enr-rv-buy-eyebrow">' . esc_html($label) . '</span>'
            . '<a class="enr-rv-buy-name" href="' . esc_url($link) . '">' . esc_html($p->get_name()) . '</a>'
            . ($line ? '<span class="enr-rv-buy-line">' . esc_html($line) . '</span>' : '')
            . '</div></div>';
    } elseif (!$live && !empty($r['about']['title'])) {
        $a = $r['about'];
        $img = enr_reviews_thumb((int) ($a['image'] ?? 0), $a['title'], $a['focus'] ?? '', '240px');
        $lower = '<div class="enr-rv-buy">' . ($img ? '<span class="enr-rv-buy-img">' . $img . '</span>' : '')
            . '<div class="enr-rv-buy-copy"><span class="enr-rv-buy-eyebrow">About</span><span class="enr-rv-buy-name">' . esc_html($a['title']) . '</span>'
            . (!empty($a['line']) ? '<span class="enr-rv-buy-line">' . esc_html($a['line']) . '</span>' : '') . '</div></div>';
    }

    $date = '';
    if ($live && !empty($r['date']) && ($ts = strtotime($r['date']))) {
        $date = '<time class="enr-rv-date" datetime="' . esc_attr(gmdate('Y-m-d', $ts)) . '">' . esc_html(date_i18n(get_option('date_format'), $ts)) . '</time>';
    }

    if ($verified) $status = '<span class="enr-rv-verified"><span class="enr-rv-tick">' . enr_reviews_icon('check') . '</span>Verified buyer</span>';
    elseif (!$live) $status = '<span class="enr-rv-verified enr-rv-shared"><span class="enr-rv-tick">' . enr_reviews_icon('chat') . '</span>Shared with ECONUR</span>';
    else $status = '';

    $quote = '<svg class="enr-rv-quote" viewBox="0 0 34 26" aria-hidden="true" focusable="false"><path d="M13.6 2.2C7.4 3.9 2.6 8.8 2.6 16v7.4h10.2V13.2H7.9c.4-3.9 2.9-6.6 6.9-8Zm17 0c-6.2 1.7-11 6.6-11 13.8v7.4h10.2V13.2h-4.9c.4-3.9 2.9-6.6 6.9-8Z"/></svg>';

    return '<li class="enr-rv-slide" role="group" aria-roledescription="slide" aria-label="' . esc_attr($n . ' of ' . $total) . '"><article class="enr-rv-card' . ($lower ? ' has-buy' : '') . '">'
        . '<div class="enr-rv-top">' . $quote . ($live && !empty($r['rating']) ? enr_reviews_stars($r['rating']) : '') . '</div>'
        . '<blockquote class="enr-rv-text"><p>' . esc_html($r['text']) . '</p></blockquote>'
        . '<div class="enr-rv-who"><span class="enr-rv-avatar" aria-hidden="true">' . esc_html($initial) . '</span>'
        . '<div class="enr-rv-who-copy"><b class="enr-rv-name">' . esc_html($name) . '</b>'
        . (!empty($r['city']) ? '<span class="enr-rv-city">' . esc_html($r['city']) . '</span>' : '')
        . $status . '</div></div>'
        . $lower . $date
        . '</article></li>';
}

/* ---------- section ---------- */

function enr_reviews_render($data, $cfg) {
    $live = 'live' === $data['mode'];
    $items = $data['items'];
    $total = count($items);
    if (!$total) return '';
    $all_verified = $live && !array_filter($items, function ($r) { return empty($r['verified']); });
    $variant = $live ? ($all_verified ? 'live_verified' : 'live') : 'fallback';

    $cards = ''; $n = 0;
    foreach ($items as $r) $cards .= enr_reviews_card($r, ++$n, $total, $live, $cfg);

    $summary = '';
    if ($live && $data['stats']['count']) {
        $s = $data['stats'];
        $what = $s['verified'] === $s['count'] ? _n('verified review', 'verified reviews', $s['count'], 'econur-reviews') : _n('review', 'reviews', $s['count'], 'econur-reviews');
        $summary = '<div class="enr-rv-summary"><div class="enr-rv-summary-row"><span class="enr-rv-avg" aria-hidden="true">' . esc_html(number_format_i18n($s['average'], 1)) . '</span>'
            . enr_reviews_stars($s['average'], 'enr-rv-stars enr-rv-stars--lg') . '</div>'
            . '<p class="enr-rv-count">Based on <b>' . esc_html(number_format_i18n($s['count'])) . '</b> ' . esc_html($what) . '</p></div>';
    }

    $dots = '';
    for ($i = 0; $i < $total; $i++) $dots .= '<button type="button" class="enr-rv-dot' . ($i ? '' : ' is-on') . '" aria-label="Show review ' . ($i + 1) . '"' . ($i ? '' : ' aria-current="true"') . '></button>';
    $uid = 'enr-rv-' . wp_unique_id();
    $main = '<div class="enr-rv-carousel" role="region" aria-roledescription="carousel" aria-label="Customer reviews">'
        . '<ul class="enr-rv-track" id="' . $uid . '-track" tabindex="0" aria-label="Reviews, use the arrow keys to move">' . $cards . '</ul>'
        . '<div class="enr-rv-nav"' . ($total < 2 ? ' hidden' : '') . '><button type="button" class="enr-rv-arrow enr-rv-prev" aria-controls="' . $uid . '-track" aria-label="Previous review" disabled>' . enr_reviews_icon('prev') . '</button>'
        . '<div class="enr-rv-dots">' . $dots . '</div>'
        . '<button type="button" class="enr-rv-arrow enr-rv-next" aria-controls="' . $uid . '-track" aria-label="Next review">' . enr_reviews_icon('next') . '</button></div>'
        . '</div>';

    $latest = (int) $cfg['min_rating'] > 1 ? sprintf('Shows our latest %d- and 5-star reviews.', (int) $cfg['min_rating']) : 'Automatically shows the latest reviews.';
    if ((int) $cfg['min_rating'] >= 5) $latest = 'Shows our latest 5-star reviews.';
    $trust = '';
    foreach ($cfg['trust'][$variant] as $t) {
        $trust .= '<li class="enr-rv-trust-item"><span class="enr-rv-trust-ico">' . enr_reviews_icon($t[0]) . '</span><span class="enr-rv-trust-copy"><b>' . esc_html($t[1]) . '</b><span>' . esc_html(str_replace('%latest%', $latest, $t[2])) . '</span></span></li>';
    }

    $decor = '';
    foreach ((array) $cfg['decor'] as $pos => $id) {
        $src = $id ? wp_get_attachment_image_src((int) $id, 'full') : false;
        if ($src) $decor .= '<img class="enr-rv-deco enr-rv-deco--' . esc_attr($pos) . '" src="' . esc_url($src[0]) . '" width="' . (int) $src[1] . '" height="' . (int) $src[2] . '" alt="" aria-hidden="true" loading="lazy" decoding="async">';
    }

    return '<section class="enr-rv enr-reviews enr-rv--' . esc_attr($data['mode']) . ' enr-rv--n' . min($total, 3) . '" aria-labelledby="' . $uid . '-title" data-mode="' . esc_attr($data['mode']) . '">'
        . $decor
        . '<div class="enr-rv-head"><p class="enr-rv-eyebrow">' . esc_html($cfg['eyebrow']) . '</p><h2 class="enr-rv-title" id="' . $uid . '-title">' . esc_html($cfg['title']) . '</h2>'
        . '<p class="enr-rv-sub">' . esc_html($cfg['sub'][$variant]) . '</p>' . $summary . '</div>'
        . $main
        . '<ul class="enr-rv-trust">' . $trust . '</ul>'
        . '</section>';
}

function enr_reviews_shortcode($atts = array()) {
    $cfg = enr_reviews_settings();
    $atts = shortcode_atts(array('limit' => $cfg['limit'], 'min_rating' => $cfg['min_rating']), $atts, 'econur_reviews');
    $cfg['limit'] = max(1, min(20, (int) $atts['limit']));
    $cfg['min_rating'] = max(1, min(5, (int) $atts['min_rating']));
    $default = $cfg['limit'] === (int) enr_reviews_settings()['limit'] && $cfg['min_rating'] === (int) enr_reviews_settings()['min_rating'];
    $html = enr_reviews_render(enr_reviews_data($cfg, $default), $cfg);
    if ($html) enr_reviews_enqueue();
    return $html;
}

/* ---------- assets: only on pages that use the section ---------- */

function enr_reviews_enqueue() {
    $u = plugin_dir_url(__FILE__) . 'assets/';
    wp_enqueue_style('econur-reviews', $u . 'econur-reviews.css', array(), ECONUR_REVIEWS_VERSION);
    wp_enqueue_script('econur-reviews', $u . 'econur-reviews.js', array(), ECONUR_REVIEWS_VERSION, array('in_footer' => true, 'strategy' => 'defer'));
}

add_action('wp_enqueue_scripts', function () {
    if (!enr_reviews_is_on() || !is_singular()) return;
    $id = get_queried_object_id();
    $content = (string) get_post_field('post_content', $id) . (string) get_post_meta($id, '_elementor_data', true);
    if (false !== strpos($content, '[econur_reviews')) enr_reviews_enqueue();
});
