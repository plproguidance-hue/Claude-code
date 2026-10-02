<?php
/**
 * Econur product landing page: per-product copy and settings (Products > Edit > "ECONUR landing page" box).
 * Every field is optional. When a field is empty the page falls back to the product's existing data
 * (short description, econur_benefits, econur_highlights, econur_how_* and so on), so nothing is invented.
 *
 *  econur_lp_subtitle  one line under the title
 *  econur_lp_bullets   quick benefits, one per line (up to 3)
 *  econur_lp_badges    the three badges on the main photo, one per line
 *  econur_lp_faq       extra FAQ entries, one per line: "Question :: Answer"
 *  econur_lp_routine   product IDs for "Complete your routine", e.g. "18, 22"
 *  econur_lp_step      this product's step label in a routine, e.g. "Cleanse"
 *  econur_lp_why_lead  the line under "Why [product]?"
 *  econur_lp_packs     pack discounts by quantity, e.g. "2:5, 3:10" (percent). Empty = no pack discount.
 *  econur_lp_cta       heading of the closing call to action
 *  econur_lp_angles    ad angles for message match, one per line: "key | subtitle | benefit; benefit; benefit"
 *                      (a link with ?angle=key shows that subtitle and those benefits)
 */
defined('ABSPATH') || exit;

function econur_lp_field_defs() {
    return array(
        'econur_lp_subtitle' => array('Subtitle', 'text', 'One short line under the title. Empty = the short description.'),
        'econur_lp_bullets'  => array('Quick benefits', 'lines', 'One per line, up to 3. Empty = the first two benefits from the product\'s benefit list, plus "Handcrafted in Bangladesh".'),
        'econur_lp_badges'   => array('Photo badges', 'lines', 'Three short labels shown on the main photo, one per line. Empty = the first highlights plus "Handcrafted in Bangladesh".'),
        'econur_lp_faq'      => array('Extra FAQ', 'lines', 'One per line: Question :: Answer. Shown before the standard questions.'),
        'econur_lp_routine'  => array('Complete your routine', 'text', 'Product IDs to pair with this one, e.g. 18, 22. Empty = two other bars from the "Find your bar" guide.'),
        'econur_lp_step'     => array('Routine step', 'text', 'One word for this product\'s step in "Complete your routine", e.g. Cleanse. Empty = from its "Find your bar" concern.'),
        'econur_lp_why_lead' => array('"Why" intro line', 'text', 'Short line under "Why [product]?". Empty = the first sentence of the description.'),
        'econur_lp_packs'    => array('Pack discount', 'text', 'Optional percent off by quantity, e.g. 2:5, 3:10 (5% off 2 or more, 10% off 3 or more). Applied in the cart. Empty = no pack discount.'),
        'econur_lp_cta'      => array('Closing heading', 'text', 'Heading of the call to action at the bottom of the page.'),
        'econur_lp_angles'   => array('Ad angles', 'lines', 'For Meta ads message match, one per line: key | subtitle | benefit; benefit; benefit. Link to the product with ?angle=key.'),
    );
}

add_action('add_meta_boxes_product', function () {
    add_meta_box('econur-lp', 'ECONUR landing page', function ($post) {
        wp_nonce_field('econur_lp_save', 'econur_lp_nonce');
        echo '<p style="margin-top:0;color:#646970">Everything here is optional. Empty fields use the product\'s existing information.</p>';
        foreach (econur_lp_field_defs() as $key => $d) {
            $v = (string) get_post_meta($post->ID, $key, true);
            echo '<p><label for="' . esc_attr($key) . '"><strong>' . esc_html($d[0]) . '</strong></label><br>';
            if ('lines' === $d[1]) echo '<textarea class="widefat" rows="4" id="' . esc_attr($key) . '" name="' . esc_attr($key) . '">' . esc_textarea($v) . '</textarea>';
            else echo '<input class="widefat" type="text" id="' . esc_attr($key) . '" name="' . esc_attr($key) . '" value="' . esc_attr($v) . '">';
            echo '<span class="description">' . esc_html($d[2]) . '</span></p>';
        }
    }, 'product', 'normal', 'default');
});
add_action('save_post_product', function ($post_id) {
    if (!isset($_POST['econur_lp_nonce']) || !wp_verify_nonce($_POST['econur_lp_nonce'], 'econur_lp_save')) return;
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!current_user_can('edit_post', $post_id)) return;
    foreach (econur_lp_field_defs() as $key => $d) {
        if (!isset($_POST[$key])) continue;
        $v = 'lines' === $d[1] ? sanitize_textarea_field(wp_unslash($_POST[$key])) : sanitize_text_field(wp_unslash($_POST[$key]));
        if ('' === trim($v)) delete_post_meta($post_id, $key); else update_post_meta($post_id, $key, $v);
    }
});

function econur_lp_lines($id, $key) {
    return array_values(array_filter(array_map('trim', preg_split('/\r\n|\r|\n/', (string) get_post_meta($id, $key, true)))));
}

// Pack discount tiers: array(quantity => percent), highest quantity first. Empty when not configured.
function econur_lp_pack_tiers($product_id) {
    $out = array();
    foreach (explode(',', (string) get_post_meta($product_id, 'econur_lp_packs', true)) as $t) {
        if (preg_match('/^\s*(\d+)\s*:\s*(\d+(?:\.\d+)?)\s*$/', $t, $m) && (int) $m[1] > 1 && (float) $m[2] > 0 && (float) $m[2] < 90) $out[(int) $m[1]] = (float) $m[2];
    }
    krsort($out);
    return $out;
}
function econur_lp_pack_pct($tiers, $qty) {
    foreach ($tiers as $q => $pct) if ($qty >= $q) return $pct;
    return 0;
}

// Apply a configured pack discount to the cart line (by quantity of that line). Off unless econur_lp_packs is set.
add_action('woocommerce_before_calculate_totals', function ($cart) {
    if (is_admin() && !wp_doing_ajax()) return;
    foreach ($cart->get_cart() as $item) {
        $data = $item['data'];
        $parent = $data->get_parent_id() ? $data->get_parent_id() : $data->get_id();
        $tiers = econur_lp_pack_tiers($parent);
        if (!$tiers) continue;
        $pct = econur_lp_pack_pct($tiers, (int) $item['quantity']);
        $fresh = wc_get_product($data->get_id());
        if (!$fresh) continue;
        $base = (float) $fresh->get_price();
        $data->set_price($pct ? round($base * (1 - $pct / 100), wc_get_price_decimals()) : $base);
    }
}, 20);

/**
 * Everything the landing page needs for one product, from the fields above or the product's own data.
 * A campaign angle (?angle=key) can replace the subtitle and quick benefits.
 */
function econur_lp_data($product) {
    $id = $product->get_id();
    $d = array();

    $short = trim(wp_strip_all_tags($product->get_short_description()));
    $d['subtitle'] = trim((string) get_post_meta($id, 'econur_lp_subtitle', true));
    if ('' === $d['subtitle']) $d['subtitle'] = $short;

    // three short benefits at the top of the page (approved design)
    $b = econur_lp_lines($id, 'econur_lp_bullets');
    if (!$b) {
        $b = array_slice(econur_meta_list($id, 'econur_benefits'), 0, 2);
        if ($b) $b[] = 'Handcrafted in Bangladesh';
    }
    $d['bullets'] = array_slice($b, 0, 3);

    // ad angle (message match)
    $d['angle'] = '';
    $want = isset($_GET['angle']) ? sanitize_key(wp_unslash($_GET['angle'])) : '';
    if ($want) foreach (econur_lp_lines($id, 'econur_lp_angles') as $row) {
        $p = array_map('trim', explode('|', $row));
        if (sanitize_key($p[0]) !== $want) continue;
        if (!empty($p[1])) $d['subtitle'] = $p[1];
        if (!empty($p[2])) $d['bullets'] = array_slice(array_values(array_filter(array_map('trim', explode(';', $p[2])))), 0, 5);
        $d['angle'] = $want;
        break;
    }

    $badges = econur_lp_lines($id, 'econur_lp_badges');
    if (!$badges) {
        foreach (array_slice(econur_pdp_pairs($id, 'econur_highlights'), 0, 2) as $h) $badges[] = $h[0];
        $badges[] = 'Handcrafted in Bangladesh';
    }
    $d['badges'] = array_slice($badges, 0, 3);

    $d['faq_extra'] = array();
    foreach (econur_lp_lines($id, 'econur_lp_faq') as $row) {
        $p = array_map('trim', explode('::', $row, 2));
        if (!empty($p[0]) && !empty($p[1])) $d['faq_extra'][] = $p;
    }
    $d['routine'] = array_values(array_filter(array_map('intval', explode(',', (string) get_post_meta($id, 'econur_lp_routine', true)))));
    $d['why_lead'] = trim((string) get_post_meta($id, 'econur_lp_why_lead', true));
    $d['tiers'] = econur_lp_pack_tiers($id);
    $d['cta'] = trim((string) get_post_meta($id, 'econur_lp_cta', true));
    return $d;
}
