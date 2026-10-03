<?php
/**
 * ECONUR product page: Description / FAQ / Reviews block, directly under the product hero (gallery + purchase card).
 * One rounded panel with three tabs:
 *   Description  product name, subtitle, short introduction, "Key Features" rows, and a product photo on the right;
 *   FAQ          the product page's own questions and answers (econur_lp_faq_items(), the same source as the FAQ section);
 *   Reviews (n)  the product's real WooCommerce review count and approved reviews; "Write a Review" opens the page's
 *                existing review form (the product page script handles [data-ecn-rv-write]). Nothing is invented.
 *
 * Content is per product (Products > Edit > "ECONUR Description tab"):
 *   econur_info_subtitle   line under the name
 *   econur_info_intro      short introduction (default: the product's WooCommerce short description)
 *   econur_info_features   one per line "Title::Text::icon" (icons: cleanse, drop, leaf, hand, fresh, skin)
 *                          (default: the product's econur_highlights "Title::Text|Title::Text")
 *   The block is shown only on products whose introduction or features are filled in (econur_info_on()).
 *   econur_info_image      Media Library ID of an existing photo (default: the product image)
 *   econur_info_image_alt / econur_info_image_pos   alt text, crop focus
 * Printed by econur_pdp_render() in inc/product-pdp.php; look and behaviour in assets/econur-pdp-info.css / .js.
 */
defined('ABSPATH') || exit;

const ECONUR_INFO_VER = '1.0.0';

function econur_info_icon($n) {
    $p = array(
        'cleanse' => '<path d="M12 3.2c2.9 3.4 5.1 6.3 5.1 9.2a5.1 5.1 0 0 1-10.2 0c0-2.9 2.2-5.8 5.1-9.2Z"/><path d="M10 14.2a2.4 2.4 0 0 0 2.2 2.2"/><path d="M4.2 8.6v3.2M2.6 10.2h3.2"/><path d="M19.6 4.4v2.2M18.5 5.5h2.2"/>',
        'drop'    => '<path d="M12 3.5c3 4 6 7.3 6 10.5a6 6 0 0 1-12 0c0-3.2 3-6.5 6-10.5Z"/><path d="M9.6 14.6a2.6 2.6 0 0 0 2.4 2.2"/>',
        'leaf'    => '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.9-5.5 5-6"/>',
        'hand'    => '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11"/><path d="M11 10.5V4.5a1.5 1.5 0 0 1 3 0v6"/><path d="M14 10.5V6a1.5 1.5 0 0 1 3 0v7.5c0 4-2.7 6.5-6.2 6.5-2.4 0-4-1.1-5.3-3L3.6 14a1.6 1.6 0 0 1 2.6-1.8L8 14"/>',
        'fresh'   => '<path d="M9.5 3.5 10.8 8a2 2 0 0 0 1.4 1.4l4.5 1.3-4.5 1.3a2 2 0 0 0-1.4 1.4l-1.3 4.5-1.3-4.5a2 2 0 0 0-1.4-1.4L2.3 10.7l4.5-1.3A2 2 0 0 0 8.2 8Z"/><path d="M18 14.5l.6 2a1 1 0 0 0 .7.7l2 .6-2 .6a1 1 0 0 0-.7.7l-.6 2-.6-2a1 1 0 0 0-.7-.7l-2-.6 2-.6a1 1 0 0 0 .7-.7Z"/>',
        'skin'    => '<path d="M12 3.2c-4 0-6.6 2.9-6.6 7 0 4.6 3 8.6 6.6 8.6s6.6-4 6.6-8.6c0-4.1-2.6-7-6.6-7Z"/><path d="M9.6 11.4h.01M14.4 11.4h.01"/><path d="M10.3 14.6c1 .8 2.4.8 3.4 0"/>',
        // tab icons
        'doc'     => '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.9-5.5 5-6"/>',
        'help'    => '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.6"/><path d="M12 17h.01"/>',
        'star'    => '<path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8Z"/>',
        'plus'    => '<path d="M12 5v14M5 12h14"/>',
        'pencil'  => '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>',
        'arrow'   => '<path d="M5 12h14M13 6l6 6-6 6"/>',
    );
    if (!isset($p[$n])) $n = 'leaf';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . $p[$n] . '</svg>';
}

// the Description tab's content for a product: its own fields first, then the product's existing data
function econur_info_data($product) {
    $id = $product->get_id();
    $m = function ($k) use ($id) { return trim((string) get_post_meta($id, $k, true)); };
    $intro = $m('econur_info_intro');
    if ('' === $intro) $intro = trim(wp_strip_all_tags($product->get_short_description()));
    $feats = array();
    foreach (preg_split('/\r\n|\r|\n/', $m('econur_info_features')) as $l) {
        $b = array_map('trim', explode('::', $l));
        if (count($b) >= 2 && '' !== $b[0]) $feats[] = array($b[0], $b[1], $b[2] ?? '');
    }
    if (!$feats) {
        foreach (explode('|', $m('econur_highlights')) as $l) {
            $b = array_map('trim', explode('::', $l));
            if (count($b) >= 2 && '' !== $b[0]) $feats[] = array($b[0], $b[1], '');
        }
    }
    foreach ($feats as &$f) if ('' === $f[2]) $f[2] = econur_info_guess_icon($f[0] . ' ' . $f[1]);
    unset($f);
    $img = (int) $m('econur_info_image');
    if (!$img || !wp_attachment_is_image($img)) $img = (int) $product->get_image_id();
    return array(
        'subtitle' => $m('econur_info_subtitle'), 'intro' => $intro, 'features' => array_slice($feats, 0, 6),
        'image' => $img, 'alt' => $m('econur_info_image_alt'), 'pos' => $m('econur_info_image_pos'),
    );
}
function econur_info_guess_icon($t) {
    $t = strtolower($t);
    if (preg_match('/clean|purif|charcoal|detox/', $t)) return 'cleanse';
    if (preg_match('/oil|hydrat|moist|sebum/', $t)) return 'drop';
    if (preg_match('/hand|craft/', $t)) return 'hand';
    if (preg_match('/gentle|everyday|daily|fresh/', $t)) return 'fresh';
    if (preg_match('/skin|face/', $t)) return 'skin';
    return 'leaf';
}

function econur_pdp_info($product, $lp = array()) {
    if (!$product instanceof WC_Product) return;
    $id = $product->get_id(); $name = $product->get_name();
    if (!econur_info_on($id)) return; // only products whose Description tab has been written
    $d = econur_info_data($product);

    /* ---------- Description ---------- */
    $copy = '<div class="econur-pit-copy"><p class="econur-pit-eyebrow" lang="en">ECONUR</p>'
        . '<h2 class="econur-pit-title">' . esc_html($name) . '</h2>'
        . ($d['subtitle'] ? '<p class="econur-pit-sub"' . econur_info_lang($d['subtitle']) . '>' . esc_html($d['subtitle']) . '</p>' : '')
        . ($d['intro'] ? '<p class="econur-pit-intro"' . econur_info_lang($d['intro']) . '>' . esc_html($d['intro']) . '</p>' : '');
    if ($d['features']) {
        $copy .= '<h3 class="econur-pit-kf"><span class="econur-pit-kf-ic">' . econur_info_icon('leaf') . '</span>Key Features</h3><ul class="econur-pit-feats">';
        foreach ($d['features'] as $f) {
            $copy .= '<li><span class="econur-pit-fic">' . econur_info_icon($f[2]) . '</span><span class="econur-pit-ftx"><b' . econur_info_lang($f[0]) . '>' . esc_html($f[0]) . '</b>'
                . ($f[1] ? '<span' . econur_info_lang($f[1]) . '>' . esc_html($f[1]) . '</span>' : '') . '</span></li>';
        }
        $copy .= '</ul>';
    }
    $copy .= '</div>';
    $media = '';
    if ($d['image']) {
        $alt = $d['alt'] ?: (string) get_post_meta($d['image'], '_wp_attachment_image_alt', true) ?: $name;
        $mt = wp_get_attachment_metadata($d['image']);
        $ar = (!empty($mt['width']) && !empty($mt['height'])) ? ' style="--pit-ar:' . (int) $mt['width'] . ' / ' . (int) $mt['height'] . '"' : '';
        $media = '<figure class="econur-pit-media"' . $ar . '>' . wp_get_attachment_image($d['image'], 'full', false, array(
            'class' => 'econur-pit-img', 'alt' => $alt, 'loading' => 'lazy', 'decoding' => 'async',
            'sizes' => '(min-width: 1100px) 640px, (min-width: 860px) 52vw, calc(100vw - 64px)',
            'style' => $d['pos'] && preg_match('/^[\d.\s%a-z-]+$/i', $d['pos']) ? 'object-position:' . $d['pos'] : '',
        )) . '</figure>';
    }
    $desc = '<div class="econur-pit-desc' . ($media ? '' : ' no-media') . '">' . $copy . $media . '</div>';

    /* ---------- FAQ (the product page's own questions) ---------- */
    $faq = '';
    $rows = function_exists('econur_lp_faq_items') ? econur_lp_faq_items($product, $lp, false) : array();
    foreach ($rows as $k => $row) {
        $n = $k + 1;
        $faq .= '<div class="econur-pit-faq-i"><h4 class="econur-pit-faq-q"><button type="button" id="econur-pit-fq' . $n . '" aria-expanded="false" aria-controls="econur-pit-fa' . $n . '">'
            . '<span' . econur_info_lang($row[0]) . '>' . esc_html($row[0]) . '</span><span class="econur-pit-faq-ic">' . econur_info_icon('plus') . '</span></button></h4>'
            . '<div class="econur-pit-faq-a" id="econur-pit-fa' . $n . '" role="region" aria-labelledby="econur-pit-fq' . $n . '"><div><p' . econur_info_lang($row[1]) . '>' . esc_html($row[1]) . '</p></div></div></div>';
    }

    /* ---------- Reviews (WooCommerce's real reviews for this product) ---------- */
    $rc = (int) $product->get_review_count(); $avg = (float) $product->get_average_rating();
    $open = comments_open($id);
    $can = $open && !('yes' === get_option('woocommerce_review_rating_verification_required') && !wc_customer_bought_product('', get_current_user_id(), $id));
    $rev = '<div class="econur-pit-rev-head"><div><h3 class="econur-pit-h3">Customer Reviews</h3><p>What our customers say about this product</p></div>'
        . ($can ? '<button type="button" class="econur-pit-write" data-ecn-rv-write aria-controls="ecn-rv-form" aria-expanded="false">' . econur_info_icon('pencil') . '<span>Write a Review</span></button>' : '') . '</div>';
    if ($rc < 1) {
        $rev .= '<div class="econur-pit-rev-empty"><span class="econur-pit-rev-empty-ic">' . econur_info_icon('star') . '</span><p>No reviews yet. Be the first to review this product.</p></div>';
    } else {
        $stars = function ($r) { $o = ''; for ($i = 1; $i <= 5; $i++) $o .= '<i class="' . ($i <= round($r) ? 'is-on' : '') . '">' . econur_info_icon('star') . '</i>'; return $o; };
        $rev .= '<div class="econur-pit-rev-sum"><b>' . esc_html(number_format_i18n($avg, 1)) . '</b><span class="econur-pit-stars" role="img" aria-label="' . esc_attr(sprintf('Rated %s out of 5', number_format_i18n($avg, 1))) . '">' . $stars($avg) . '</span>'
            . '<span>' . esc_html(sprintf('Based on %s %s', number_format_i18n($rc), 1 === $rc ? 'review' : 'reviews')) . '</span></div><ul class="econur-pit-rev-list">';
        foreach (get_comments(array('post_id' => $id, 'status' => 'approve', 'type' => 'review', 'parent' => 0, 'number' => 3)) as $c) {
            $r = (int) get_comment_meta($c->comment_ID, 'rating', true);
            $ver = function_exists('wc_review_is_from_verified_owner') && wc_review_is_from_verified_owner($c->comment_ID);
            $txt = trim(wp_strip_all_tags(get_comment_text($c)));
            $rev .= '<li><div class="econur-pit-rev-top"><b>' . esc_html(get_comment_author($c)) . '</b>' . ($ver ? '<span class="econur-pit-ver">Verified Purchase</span>' : '')
                . '<time datetime="' . esc_attr(get_comment_date('c', $c)) . '">' . esc_html(get_comment_date('M j, Y', $c)) . '</time></div>'
                . ($r ? '<span class="econur-pit-stars" role="img" aria-label="' . esc_attr(sprintf('Rated %d out of 5', $r)) . '">' . $stars($r) . '</span>' : '')
                . '<p' . econur_info_lang($txt) . '>' . esc_html(wp_trim_words($txt, 60)) . '</p></li>';
        }
        $rev .= '</ul>' . ($rc > 3 ? '<a class="econur-pit-allrev" href="#ecn-reviews">' . esc_html(sprintf('See all %s reviews', number_format_i18n($rc))) . econur_info_icon('arrow') . '</a>' : '');
    }
    if (!$can && $open) $rev .= '<p class="econur-pit-note">Reviews are open to customers who have purchased this product.</p>';

    /* ---------- the block ---------- */
    $tabs = array(
        array('desc', 'Description', 'doc', $desc),
        array('faq', 'FAQ', 'help', $faq ? '<h3 class="econur-pit-h3">Frequently Asked Questions</h3><div class="econur-pit-faq">' . $faq . '</div>' : ''),
        array('rev', 'Reviews (' . number_format_i18n($rc) . ')', 'star', $rev),
    );
    $tabs = array_values(array_filter($tabs, function ($t) { return '' !== $t[3]; }));
    $list = ''; $panels = '';
    foreach ($tabs as $i => $t) {
        $on = 0 === $i;
        $list .= '<button type="button" role="tab" class="econur-pit-tab" id="econur-pit-t-' . $t[0] . '" aria-controls="econur-pit-p-' . $t[0] . '" aria-selected="' . ($on ? 'true' : 'false') . '"' . ($on ? '' : ' tabindex="-1"') . '>'
            . '<span class="econur-pit-tab-ic">' . econur_info_icon($t[2]) . '</span><span>' . esc_html($t[1]) . '</span></button>';
        $panels .= '<div class="econur-pit-panel econur-pit-p-' . $t[0] . '" role="tabpanel" id="econur-pit-p-' . $t[0] . '" aria-labelledby="econur-pit-t-' . $t[0] . '" tabindex="0"' . ($on ? '' : ' hidden') . '>' . $t[3] . '</div>';
    }
    $deco = function_exists('econur_pdp_art') ? econur_pdp_art('leaves', 'econur-pit-leaf econur-pit-leaf--tl') . econur_pdp_art('leaves', 'econur-pit-leaf econur-pit-leaf--tr') : '';
    echo '<section class="econur-product-info-tabs" id="ecn-info" aria-label="' . esc_attr($name . ' product information') . '" data-econur-pit>' . $deco
        . '<div class="econur-pit-box"><div class="econur-pit-tabs" role="tablist" aria-label="Product information">' . $list . '</div>'
        . '<div class="econur-pit-body">' . $panels . '</div></div></section>';
}
// the block appears once a product's introduction or features are written (Products > Edit > ECONUR Description tab);
// the subtitle, photo and alt text are optional
function econur_info_on($id) {
    return '' !== trim((string) get_post_meta($id, 'econur_info_intro', true)) || '' !== trim((string) get_post_meta($id, 'econur_info_features', true));
}
function econur_info_lang($s) { return function_exists('econur_bn_attr') ? econur_bn_attr($s) : ''; }

add_action('wp_enqueue_scripts', function () {
    if (!function_exists('is_product') || !is_product() || !econur_info_on(get_queried_object_id())) return;
    $u = get_stylesheet_directory_uri() . '/assets/';
    wp_enqueue_style('econur-pdp-info', $u . 'econur-pdp-info.css', array(), ECONUR_INFO_VER);
    wp_enqueue_script('econur-pdp-info', $u . 'econur-pdp-info.js', array(), ECONUR_INFO_VER, array('in_footer' => true, 'strategy' => 'defer'));
}, 25);

/* ---------------------------------------------------------------- Products > Edit */
function econur_info_fields() {
    return array(
        'econur_info_subtitle' => array('Subtitle', 'The line under the product name, for example: Handmade Charcoal & Neem Cleansing Bar.', 1),
        'econur_info_intro' => array('Introduction', "Two or three sentences. Leave empty to use the product's short description.", 3),
        'econur_info_features' => array('Key Features', 'One per line: Title::Text::icon (icons: cleanse, drop, leaf, hand, fresh, skin), up to six. Leave empty to use the product highlights.', 6),
        'econur_info_image' => array('Photo (Media Library ID)', 'The ID of an existing Media Library image. Leave empty to use the product image.', 1),
        'econur_info_image_pos' => array('Photo crop focus', 'Optional, for example "50% 60%" (left-right, top-bottom).', 1),
        'econur_info_image_alt' => array('Photo description (alt text)', "Describe what the photo shows. Leave empty to use the image's own alt text.", 1),
    );
}
add_action('add_meta_boxes_product', function () {
    add_meta_box('econur-info', 'ECONUR Description tab (Description / FAQ / Reviews block under the product hero)', function ($post) {
        wp_nonce_field('econur_info_save', 'econur_info_nonce');
        foreach (econur_info_fields() as $k => $f) {
            $v = (string) get_post_meta($post->ID, $k, true);
            echo '<p><label for="' . esc_attr($k) . '"><strong>' . esc_html($f[0]) . '</strong></label><br>';
            if ($f[2] > 1) echo '<textarea id="' . esc_attr($k) . '" name="' . esc_attr($k) . '" rows="' . (int) $f[2] . '" style="width:100%">' . esc_textarea($v) . '</textarea>';
            else echo '<input type="text" id="' . esc_attr($k) . '" name="' . esc_attr($k) . '" value="' . esc_attr($v) . '" style="width:100%">';
            echo '<br><span class="description">' . esc_html($f[1]) . '</span></p>';
        }
        echo '<p class="description">The FAQ tab shows the same questions as the product page FAQ; the Reviews tab shows this product\'s real reviews.</p>';
    }, 'product', 'normal', 'default');
});
add_action('save_post_product', function ($post_id) {
    if (!isset($_POST['econur_info_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['econur_info_nonce'])), 'econur_info_save')) return;
    if ((defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) || !current_user_can('edit_post', $post_id)) return;
    foreach (econur_info_fields() as $k => $f) {
        if (!isset($_POST[$k])) continue;
        $raw = wp_unslash($_POST[$k]);
        $v = 'econur_info_image' === $k ? (string) absint($raw) : ($f[2] > 1 ? sanitize_textarea_field($raw) : sanitize_text_field($raw));
        if ('' === trim($v) || '0' === $v) delete_post_meta($post_id, $k); else update_post_meta($post_id, $k, $v);
    }
});
