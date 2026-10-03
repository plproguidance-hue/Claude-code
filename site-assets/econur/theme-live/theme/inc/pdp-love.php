<?php
/**
 * Econur product page: "Why You'll Love This" story section, full width under the product hero (gallery + purchase card
 * + details accordion) and above "Complete Your Routine". A photo (or a video, once one exists) on the left, four
 * numbered benefits on the right; stacked on tablets and phones.
 *
 * Content is per product (Products > Edit > "ECONUR Why You'll Love This"); the section only appears when benefits are set:
 *   econur_love_kicker, econur_love_title, econur_love_sub   label, heading, supporting line
 *   econur_love_benefits   one per line: "Title::Text::icon" (icon: cleanse, fresh, skin, leaf), up to four
 *   econur_love_image      Media Library attachment ID (an existing image, nothing is uploaded here)
 *   econur_love_image_pos  CSS object-position for the crop, e.g. "88% 55%"
 *   econur_love_image_alt  alt text for this use of the image
 *   econur_love_video      optional video URL (Media Library .mp4); a play button appears only when it is set
 * Printed by econur_pdp_render() in inc/product-pdp.php; styles and behaviour in assets/econur-pdp-love.css / .js.
 */
defined('ABSPATH') || exit;

const ECONUR_LOVE_VER = '1.0.0';

function econur_love_icon($n) {
    $p = array(
        'cleanse' => '<path d="M12 3.2c2.9 3.4 5.1 6.3 5.1 9.2a5.1 5.1 0 0 1-10.2 0c0-2.9 2.2-5.8 5.1-9.2Z"/><path d="M10 14.2a2.4 2.4 0 0 0 2.2 2.2"/><path d="M4.2 8.6v3.2M2.6 10.2h3.2"/><path d="M19.6 4.4v2.2M18.5 5.5h2.2"/>',
        'fresh'   => '<path d="M9.5 3.5 10.8 8a2 2 0 0 0 1.4 1.4l4.5 1.3-4.5 1.3a2 2 0 0 0-1.4 1.4l-1.3 4.5-1.3-4.5a2 2 0 0 0-1.4-1.4L2.3 10.7l4.5-1.3A2 2 0 0 0 8.2 8Z"/><path d="M18 14.5l.6 2a1 1 0 0 0 .7.7l2 .6-2 .6a1 1 0 0 0-.7.7l-.6 2-.6-2a1 1 0 0 0-.7-.7l-2-.6 2-.6a1 1 0 0 0 .7-.7Z"/><path d="M18.5 3v3M17 4.5h3"/>',
        'skin'    => '<path d="M12 3.2c-4 0-6.6 2.9-6.6 7 0 4.6 3 8.6 6.6 8.6s6.6-4 6.6-8.6c0-4.1-2.6-7-6.6-7Z"/><path d="M7.4 7.6c1.8.4 3.6-.2 5-1.7 1 1.4 2.7 2.1 4.3 2"/><path d="M9.6 11.4h.01M14.4 11.4h.01"/><path d="M10.3 14.6c1 .8 2.4.8 3.4 0"/><path d="M8.4 18.4 7.2 21M15.6 18.4l1.2 2.6"/>',
        'leaf'    => '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.9-5.5 5-6"/>',
    );
    if (!isset($p[$n])) $n = 'leaf';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . $p[$n] . '</svg>';
}

function econur_pdp_love($product) {
    if (!$product instanceof WC_Product) return;
    $id = $product->get_id();
    $m = function ($k) use ($id) { return trim((string) get_post_meta($id, $k, true)); };
    $items = array();
    foreach (preg_split('/\r\n|\r|\n/', $m('econur_love_benefits')) as $l) {
        $b = array_map('trim', explode('::', $l));
        if (count($b) >= 2 && '' !== $b[0]) $items[] = array($b[0], $b[1], $b[2] ?? 'leaf');
    }
    if (!$items) return; // only products whose section has been written
    $items = array_slice($items, 0, 4);
    $kicker = $m('econur_love_kicker') ?: "Why You\u{2019}ll Love This";
    $title = $m('econur_love_title');
    $sub = $m('econur_love_sub');
    $img_id = (int) $m('econur_love_image');
    $pos = $m('econur_love_image_pos');
    $alt = $m('econur_love_image_alt') ?: $product->get_name();
    $video = $m('econur_love_video');

    $media = '';
    if ($img_id && wp_attachment_is_image($img_id)) {
        $media = wp_get_attachment_image($img_id, 'full', false, array(
            'class' => 'ecn-love-img', 'alt' => $alt, 'loading' => 'lazy', 'decoding' => 'async',
            'sizes' => '(min-width: 1100px) 900px, (min-width: 640px) 100vw, 180vw',
            'style' => $pos && preg_match('/^[\d.\s%a-z-]+$/i', $pos) ? 'object-position:' . $pos : '',
        ));
    }
    if ($media && $video) { // a real video exists: the photo is its poster, the button loads the video on demand
        $media .= '<button type="button" class="ecn-love-play" data-ecn-love-video="' . esc_url($video) . '" aria-label="' . esc_attr('Play video: ' . $product->get_name()) . '">'
            . '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5.5v13l10.5-6.5Z" fill="currentColor"/></svg></button>';
    }

    $o = '<section class="ecn-lp-sec ecn-love" id="ecn-love" aria-labelledby="ecn-love-t" data-ecn-love><div class="ecn-love-panel">';
    if (function_exists('econur_pdp_art')) {
        $o .= econur_pdp_art('leaves', 'ecn-love-leaf ecn-love-leaf--tl') . econur_pdp_art('leaves', 'ecn-love-leaf ecn-love-leaf--tr');
    }
    if (function_exists('econur_lp_fleaf')) $o .= econur_lp_fleaf('ecn-love-fleaf is-a') . econur_lp_fleaf('ecn-love-fleaf is-b');
    $o .= '<div class="ecn-lp-head ecn-love-head" data-ecn-love-rv style="--i:0"><span class="ecn-lp-kicker">' . (function_exists('econur_pdp_icon') ? econur_pdp_icon('leaf') : '') . esc_html($kicker) . '</span>'
        . ($title ? '<h2 class="ecn-lp-h2" id="ecn-love-t">' . esc_html($title) . '</h2>' : '<h2 class="ecn-lp-h2" id="ecn-love-t">' . esc_html($kicker) . '</h2>')
        . ($sub ? '<p class="ecn-lp-lead">' . esc_html($sub) . '</p>' : '') . '</div>';
    $o .= '<div class="ecn-love-grid' . ($media ? '' : ' no-media') . '">';
    if ($media) $o .= '<div class="ecn-love-media" data-ecn-love-rv style="--i:1">' . $media . '</div>';
    $o .= '<ol class="ecn-love-list">';
    foreach ($items as $i => $it) {
        $o .= '<li class="ecn-love-item" data-ecn-love-rv style="--i:' . ($i + 2) . '"><span class="ecn-love-ic">' . econur_love_icon($it[2]) . '</span>'
            . '<div><span class="ecn-love-n" aria-hidden="true">' . sprintf('%02d', $i + 1) . '</span><h3 class="ecn-love-t">' . esc_html($it[0]) . '</h3>'
            . ($it[1] ? '<p class="ecn-love-p">' . esc_html($it[1]) . '</p>' : '') . '</div></li>';
    }
    echo $o . '</ol></div></div></section>';
}

add_action('wp_enqueue_scripts', function () {
    if (!function_exists('is_product') || !is_product()) return;
    if ('' === trim((string) get_post_meta(get_queried_object_id(), 'econur_love_benefits', true))) return;
    $u = get_stylesheet_directory_uri() . '/assets/';
    wp_enqueue_style('econur-pdp-love', $u . 'econur-pdp-love.css', array(), ECONUR_LOVE_VER);
    wp_enqueue_script('econur-pdp-love', $u . 'econur-pdp-love.js', array(), ECONUR_LOVE_VER, array('in_footer' => true, 'strategy' => 'defer'));
}, 25);

/* ---------------------------------------------------------------- Products > Edit */
function econur_love_fields() {
    return array(
        'econur_love_kicker' => array('Small label', "Default: Why You\u{2019}ll Love This", 1),
        'econur_love_title' => array('Heading', 'For example: A Cleaner, Fresher Feel Every Day.', 1),
        'econur_love_sub' => array('Supporting line', 'One short sentence under the heading.', 2),
        'econur_love_benefits' => array('Benefits (up to four)', 'One per line: Title::Text::icon (icons: cleanse, fresh, skin, leaf). Leave empty to hide the section on this product.', 5),
        'econur_love_image' => array('Image (Media Library ID)', 'The ID of an existing Media Library image (Media > Library > the image > the number in the address bar).', 1),
        'econur_love_image_pos' => array('Image crop focus', 'Optional, for example "88% 55%" (left-right, top-bottom).', 1),
        'econur_love_image_alt' => array('Image description (alt text)', 'Describe what the photo actually shows.', 1),
        'econur_love_video' => array('Video URL (optional)', 'Only for a real product video (.mp4 in the Media Library). A play button appears only when this is set.', 1),
    );
}
add_action('add_meta_boxes_product', function () {
    add_meta_box('econur-love', "ECONUR Why You\u{2019}ll Love This (section under the product hero)", function ($post) {
        wp_nonce_field('econur_love_save', 'econur_love_nonce');
        foreach (econur_love_fields() as $k => $f) {
            $v = (string) get_post_meta($post->ID, $k, true);
            echo '<p><label for="' . esc_attr($k) . '"><strong>' . esc_html($f[0]) . '</strong></label><br>';
            if ($f[2] > 1) echo '<textarea id="' . esc_attr($k) . '" name="' . esc_attr($k) . '" rows="' . (int) $f[2] . '" style="width:100%">' . esc_textarea($v) . '</textarea>';
            else echo '<input type="text" id="' . esc_attr($k) . '" name="' . esc_attr($k) . '" value="' . esc_attr($v) . '" style="width:100%">';
            echo '<br><span class="description">' . esc_html($f[1]) . '</span></p>';
        }
    }, 'product', 'normal', 'default');
});
add_action('save_post_product', function ($post_id) {
    if (!isset($_POST['econur_love_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['econur_love_nonce'])), 'econur_love_save')) return;
    if ((defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) || !current_user_can('edit_post', $post_id)) return;
    foreach (econur_love_fields() as $k => $f) {
        if (!isset($_POST[$k])) continue;
        $raw = wp_unslash($_POST[$k]);
        $v = 'econur_love_video' === $k ? esc_url_raw(trim($raw)) : ($f[2] > 1 ? sanitize_textarea_field($raw) : sanitize_text_field($raw));
        if ('' === trim($v)) delete_post_meta($post_id, $k); else update_post_meta($post_id, $k, $v);
    }
});
