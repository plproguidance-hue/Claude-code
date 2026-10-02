<?php
/**
 * Econur homepage layout passes, loaded on the front page only.
 * - assets/mobile-home.css  (phones, max-width 767px): swipeable Bestsellers and Featured rows, tighter section rhythm.
 * - assets/desktop-home.css (desktop, min-width 1000px): Bestsellers as one row of four, tighter section rhythm.
 * - assets/desktop-home.js: previous/next arrows for the desktop Bestsellers row (manual only, no autoplay).
 * The stylesheets are printed late in <head> so they come after the theme's Additional CSS, each with its own media
 * attribute so other screen sizes never apply them.
 */
defined('ABSPATH') || exit;

add_action('wp_head', function () {
    if (!is_front_page()) return;
    $u = get_stylesheet_directory_uri() . '/assets/';
    printf("<link rel='stylesheet' id='econur-mobile-home-css' href='%s' media='(max-width: 767px)' />\n", esc_url($u . 'mobile-home.css?ver=1.0.1'));
    printf("<link rel='stylesheet' id='econur-desktop-home-css' href='%s' media='(min-width: 1000px)' />\n", esc_url($u . 'desktop-home.css?ver=1.1.0'));
}, 200);

add_action('wp_enqueue_scripts', function () {
    if (!is_front_page()) return;
    wp_enqueue_script('econur-desktop-home', get_stylesheet_directory_uri() . '/assets/desktop-home.js', array(), '1.1.0', array('in_footer' => true, 'strategy' => 'defer'));
}, 20);
