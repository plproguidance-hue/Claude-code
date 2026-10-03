<?php
/**
 * Econur product page: "product details" accordion under the purchase card (right column of the product hero).
 * Four rows: Why You'll Love This / How to Use / Ingredients / Good to Know. One open at a time, all closed at first.
 *
 * Content is per product (Products > Edit > "ECONUR product details"):
 *   econur_acc_love   paragraph lines; lines starting with "- " become bullet points
 *   econur_acc_how    paragraph lines; "Title::text" lines become numbered steps
 *   econur_full_ingredients   the product's full ingredient list (the same field the product FAQ already shows)
 *   econur_acc_good   one point per line; {size} shows the size picked above (50 gm / 100 gm)
 * The accordion appears only on products that have this content. Printed by econur_pdp_render() in
 * inc/product-pdp.php; styles and behaviour in assets/econur-pdp-accordion.css / .js.
 */
defined('ABSPATH') || exit;

const ECONUR_ACC_VER = '1.0.0';
const ECONUR_ACC_INGREDIENTS_PLACEHOLDER = 'Full verified ingredient list will be added here.';

function econur_acc_icon($n) {
    $p = array(
        'leaf'  => '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.9-5.5 5-6"/>',
        'drop'  => '<path d="M12 2.7c3.4 4 6 7.4 6 10.8a6 6 0 0 1-12 0c0-3.4 2.6-6.8 6-10.8Z"/><path d="M9.2 14.2a2.9 2.9 0 0 0 2.6 2.6"/>',
        'sprout'=> '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8Z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2Z"/>',
        'info'  => '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path d="M12 7.6v.01"/>',
    );
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . $p[$n] . '</svg>';
}

// "text\n- point" -> <p> + <ul>; "Title::text" -> numbered steps
function econur_acc_format($raw, $size = '') {
    $lines = array_values(array_filter(array_map('trim', preg_split('/\r\n|\r|\n/', (string) $raw)), 'strlen'));
    $out = ''; $list = array(); $steps = array();
    $flush = function () use (&$out, &$list, &$steps) {
        if ($list) { $out .= '<ul class="ecn-acc-list"><li>' . implode('</li><li>', $list) . '</li></ul>'; $list = array(); }
        if ($steps) {
            $out .= '<ol class="ecn-acc-steps">';
            foreach ($steps as $i => $s) $out .= '<li><span class="ecn-acc-step-n" aria-hidden="true">' . sprintf('%02d', $i + 1) . '</span><span><b>' . $s[0] . '</b>' . $s[1] . '</span></li>';
            $out .= '</ol>'; $steps = array();
        }
    };
    foreach ($lines as $l) {
        $txt = esc_html(ltrim($l, "-•* \t"));
        $txt = str_replace('{size}', '<span data-ecn-acc-size>' . esc_html($size) . '</span>', $txt);
        if (preg_match('/^[-•*]\s/u', $l)) { if ($steps) $flush(); $list[] = $txt; }
        elseif (false !== strpos($l, '::')) { if ($list) $flush(); list($t, $d) = array_map('trim', explode('::', $l, 2)); $steps[] = array(esc_html($t), esc_html($d)); }
        else { $flush(); $out .= '<p>' . $txt . '</p>'; }
    }
    $flush();
    return $out;
}

function econur_pdp_accordion($product, $size = '') {
    if (!$product instanceof WC_Product) return;
    $id = $product->get_id();
    $love = trim((string) get_post_meta($id, 'econur_acc_love', true));
    $how  = trim((string) get_post_meta($id, 'econur_acc_how', true));
    $good = trim((string) get_post_meta($id, 'econur_acc_good', true));
    if ('' === $love . $how . $good) return; // only products whose details have been written
    $ing  = trim((string) get_post_meta($id, 'econur_full_ingredients', true));
    $rows = array(
        array('love', "Why You\u{2019}ll Love This", 'leaf', econur_acc_format($love, $size)),
        array('how', 'How to Use', 'drop', econur_acc_format($how, $size)),
        array('ing', 'Ingredients', 'sprout', '' !== $ing ? '<p class="ecn-acc-ing">' . esc_html($ing) . '</p>' : '<p class="ecn-acc-ing is-pending">' . esc_html(ECONUR_ACC_INGREDIENTS_PLACEHOLDER) . '</p>'),
        array('good', 'Good to Know', 'info', econur_acc_format($good, $size)),
    );
    $o = '<div class="ecn-acc" data-ecn-acc>';
    if (function_exists('econur_pdp_art')) {
        $o .= econur_pdp_art('leaves', 'ecn-acc-leaf ecn-acc-leaf--tl') . econur_pdp_art('sprig', 'ecn-acc-leaf ecn-acc-leaf--br');
    }
    foreach ($rows as $r) {
        $bid = 'ecn-acc-b-' . $r[0] . '-' . $id; $pid = 'ecn-acc-p-' . $r[0] . '-' . $id;
        $o .= '<div class="ecn-acc-item"><h2 class="ecn-acc-h">'
            . '<button type="button" class="ecn-acc-btn" id="' . esc_attr($bid) . '" aria-expanded="false" aria-controls="' . esc_attr($pid) . '">'
            . '<span class="ecn-acc-ic">' . econur_acc_icon($r[2]) . '</span><span class="ecn-acc-t">' . esc_html($r[1]) . '</span><span class="ecn-acc-pm" aria-hidden="true"></span></button></h2>'
            . '<div class="ecn-acc-p" id="' . esc_attr($pid) . '" role="region" aria-labelledby="' . esc_attr($bid) . '"><div class="ecn-acc-in"><div class="ecn-acc-body">' . $r[3] . '</div></div></div></div>';
    }
    echo $o . '</div>';
}

add_action('wp_enqueue_scripts', function () {
    if (!function_exists('is_product') || !is_product()) return;
    $u = get_stylesheet_directory_uri() . '/assets/';
    wp_enqueue_style('econur-pdp-accordion', $u . 'econur-pdp-accordion.css', array(), ECONUR_ACC_VER);
    wp_enqueue_script('econur-pdp-accordion', $u . 'econur-pdp-accordion.js', array(), ECONUR_ACC_VER, array('in_footer' => true, 'strategy' => 'defer'));
}, 25);

/* ---------------------------------------------------------------- Products > Edit: the four texts */
add_action('add_meta_boxes_product', function () {
    add_meta_box('econur-acc', 'ECONUR product details (accordion under the purchase card)', function ($post) {
        wp_nonce_field('econur_acc_save', 'econur_acc_nonce');
        $f = array(
            'econur_acc_love' => array("Why You\u{2019}ll Love This", 'A short paragraph. Lines starting with "- " become bullet points.'),
            'econur_acc_how' => array('How to Use', 'Steps as "Title::text", one per line (they are numbered). Plain lines become paragraphs.'),
            'econur_full_ingredients' => array('Ingredients (full list)', 'The verified complete ingredient list. Also shown in the product FAQ. Empty: "' . ECONUR_ACC_INGREDIENTS_PLACEHOLDER . '"'),
            'econur_acc_good' => array('Good to Know', 'One point per line. {size} shows the size the customer picked (for example "Net Weight: {size}").'),
        );
        echo '<p>Leave Why / How / Good to Know empty to hide the accordion on this product.</p>';
        foreach ($f as $k => $l) {
            echo '<p><label for="' . esc_attr($k) . '"><strong>' . esc_html($l[0]) . '</strong></label><br><textarea id="' . esc_attr($k) . '" name="' . esc_attr($k) . '" rows="5" style="width:100%">' . esc_textarea((string) get_post_meta($post->ID, $k, true)) . '</textarea><br><span class="description">' . esc_html($l[1]) . '</span></p>';
        }
    }, 'product', 'normal', 'default');
});
add_action('save_post_product', function ($post_id) {
    if (!isset($_POST['econur_acc_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['econur_acc_nonce'])), 'econur_acc_save')) return;
    if ((defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) || !current_user_can('edit_post', $post_id)) return;
    foreach (array('econur_acc_love', 'econur_acc_how', 'econur_full_ingredients', 'econur_acc_good') as $k) {
        if (!isset($_POST[$k])) continue;
        $v = sanitize_textarea_field(wp_unslash($_POST[$k]));
        if ('' === trim($v)) delete_post_meta($post_id, $k); else update_post_meta($post_id, $k, $v);
    }
});
