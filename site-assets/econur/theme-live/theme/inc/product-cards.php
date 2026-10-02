<?php
/**
 * Econur, conversion-focused product cards shortcode + floating WhatsApp button.
 * [econur_products ids="14,18,22,26,30" cols="2"]
 * Order now = adds the default (50 gm) variation and goes straight to checkout.
 */

add_shortcode('econur_products', function ($atts) {
    // Renders the same card as the shop and category pages (woocommerce/content-product.php).
    $a = shortcode_atts(array('ids' => '', 'cols' => '2', 'class' => ''), $atts);
    $ids = array_filter(array_map('intval', explode(',', $a['ids'])));
    if (!$ids) return '';
    global $product, $post;
    // Homepage cards: no size selector; variable products link to the product page (see content-product.php).
    $GLOBALS['econur_home_cards'] = is_front_page();
    $out = '<div class="woocommerce ecn-grid-wrap ' . esc_attr($a['class']) . '"><ul class="products columns-' . intval($a['cols']) . ' ecn-home-grid">';
    foreach ($ids as $pid) {
        $post = get_post($pid); if (!$post) continue; setup_postdata($post);
        $product = wc_get_product($pid); if (!$product) continue;
        ob_start(); wc_get_template_part('content', 'product'); $out .= ob_get_clean();
    }
    wp_reset_postdata();
    $GLOBALS['econur_home_cards'] = false;
    return $out . '</ul></div>';
});
// Floating WhatsApp button (all pages except cart/checkout).
add_action('wp_footer', function () {
    if (is_cart() || is_checkout() || is_admin()) return;
    echo '<a class="ecn-wa-float" href="https://wa.me/8801410753555?text=' . rawurlencode('Hi Econur, I have a question about your soaps.') . '" target="_blank" rel="noopener" lang="bn" aria-label="WhatsApp-এ কথা বলুন"><svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden="true"><path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.5 4.1 1.6 5.9L0 24l6.4-1.7a11.8 11.8 0 0 0 5.7 1.4c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.1-3.4-8.4ZM12.1 21.7c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.8 1 1-3.7-.2-.4a9.8 9.8 0 0 1-1.5-5.2c0-5.4 4.4-9.8 9.9-9.8 2.6 0 5.1 1 6.9 2.9a9.7 9.7 0 0 1 2.9 6.9c0 5.4-4.4 9.9-9.8 9.9Zm5.4-7.3c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.4-1.5-.9-.8-1.5-1.8-1.6-2.1-.2-.3 0-.5.1-.6l.4-.5.3-.5c.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4Z"/></svg><span>কথা বলুন</span></a>';
});
