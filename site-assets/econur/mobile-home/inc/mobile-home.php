<?php
/**
 * Econur homepage, phones only: loads assets/mobile-home.css (swipeable Bestsellers and Featured rows, tighter
 * section rhythm). Printed late in <head> so it comes after the theme's Additional CSS, and with a phone media
 * attribute so tablets and desktops never apply it.
 */
defined('ABSPATH') || exit;

add_action('wp_head', function () {
    if (!is_front_page()) return;
    printf("<link rel='stylesheet' id='econur-mobile-home-css' href='%s' media='(max-width: 767px)' />\n",
        esc_url(get_stylesheet_directory_uri() . '/assets/mobile-home.css?ver=1.0.0'));
}, 200);
