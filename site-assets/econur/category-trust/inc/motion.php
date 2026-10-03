<?php
/**
 * Econur motion layer: one set of motion tokens, the homepage scroll reveal and quiet hover / press feedback
 * (assets/econur-motion.css, assets/econur-motion.js). The hero slider and the announcement bar keep their own
 * timers (inc/hero-slider.php, inc/announce-bar.php). Remove the require line in functions.php to switch it off.
 */
defined('ABSPATH') || exit;

const ECONUR_MOTION_VER = '1.0.1';

add_action('wp_enqueue_scripts', function () {
    $u = get_stylesheet_directory_uri() . '/assets/';
    wp_register_style('econur-motion', $u . 'econur-motion.css', array(), ECONUR_MOTION_VER);
    if (is_front_page()) {
        wp_enqueue_script('econur-motion', $u . 'econur-motion.js', array(), ECONUR_MOTION_VER, array('in_footer' => true, 'strategy' => 'defer'));
    }
}, 20);

// printed right after econur-ui.css (wp_head 120), so its hover rules sit on top of the component styles
add_action('wp_head', function () {
    if (!is_admin() && wp_style_is('econur-motion', 'registered')) wp_print_styles('econur-motion');
}, 121);
