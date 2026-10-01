<?php
/**
 * Econur single product content (used in place of WooCommerce content-single-product.php via the wc_get_template_part filter).
 * The page itself is built by econur_pdp_render() in inc/product-page.php; without that module this falls back to
 * WooCommerce's own template, so a product page can never render empty.
 */
defined('ABSPATH') || exit;

if (!function_exists('econur_pdp_render')) {
    include WC()->plugin_path() . '/templates/content-single-product.php';
    return;
}

global $product;

do_action('woocommerce_before_single_product');

if (post_password_required()) {
    echo get_the_password_form(); // WPCS: XSS ok.
    return;
}

econur_pdp_render($product);

do_action('woocommerce_after_single_product');
