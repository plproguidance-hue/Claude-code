<?php
/**
 * Econur announcement bar above the Astra header (front page only, same as before).
 * Order: announcement bar -> main header -> hero.
 * Text is read from the existing Elementor HTML widget (page 43, widget 74bf20f),
 * so it can still be edited in Elementor. The in-content copy is hidden via style.css (patch 8).
 */
defined('ABSPATH') || exit;

function econur_top_announce_html() {
    $fallback = '<strong>Cash on delivery</strong> nationwide. We call to confirm every order within 12 hours.';
    $page_id  = (int) get_option('page_on_front');
    if (!$page_id) return $fallback;
    $data = json_decode((string) get_post_meta($page_id, '_elementor_data', true), true);
    if (!is_array($data)) return $fallback;
    $found = null;
    $walk = function ($els) use (&$walk, &$found) {
        foreach ((array) $els as $el) {
            if ($found !== null) return;
            if (($el['id'] ?? '') === '74bf20f' && !empty($el['settings']['html'])) { $found = $el['settings']['html']; return; }
            if (!empty($el['elements'])) $walk($el['elements']);
        }
    };
    $walk($data);
    if ($found === null) return $fallback;
    if (preg_match('/<div[^>]*ecn-announce[^>]*>(.*)<\/div>/s', $found, $m)) return $m[1];
    return $fallback;
}

add_action('astra_header_before', function () {
    if (!is_front_page()) return;
    echo '<div class="ecn ecn-announce ecn-announce--top" role="region" aria-label="Store notice">'
        . wp_kses(econur_top_announce_html(), array('strong' => array(), 'b' => array(), 'a' => array('href' => array()), 'span' => array('class' => array())))
        . '</div>';
}, 5);