<?php
/**
 * Econur header: styles and the sticky behaviour for the Astra header builder output (assets/econur-header.css,
 * assets/econur-header.js), plus the social circles at the foot of the mobile dropdown menu. The logo, the menu
 * (Appearance > Menus), search, account and cart stay Astra's own; the desktop social circles come from
 * inc/header-social.php. Remove the require line in functions.php to return to the previous header.
 */
defined('ABSPATH') || exit;

const ECONUR_HEADER_VER = '1.0.2';

add_action('wp_enqueue_scripts', function () {
    $u = get_stylesheet_directory_uri() . '/assets/';
    wp_register_style('econur-header', $u . 'econur-header.css', array(), ECONUR_HEADER_VER);
    wp_enqueue_script('econur-header', $u . 'econur-header.js', array(), ECONUR_HEADER_VER, array('in_footer' => true, 'strategy' => 'defer'));
}, 20);

// printed after the Customizer CSS (101), econur-ui (120) and the motion layer (121), which also style the header
add_action('wp_head', function () {
    if (!is_admin() && wp_style_is('econur-header', 'registered')) wp_print_styles('econur-header');
}, 122);

// mobile dropdown: Facebook / Instagram / TikTok under the menu and the account link
add_action('astra_mobile_header_content', function ($row = '', $column = '') {
    if ('popup' !== $row || !function_exists('econur_header_social_markup')) return;
    echo econur_header_social_markup('ecn-hsocial--menu');
}, 20, 2);
