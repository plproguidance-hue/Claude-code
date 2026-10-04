<?php
/**
 * Plugin Name: ECONUR Speed
 * Description: Front-end speed: self-hosted Google fonts, page styles served as cached files instead of inline blocks, no emoji script, cache warm-up, background tasks start after the shopper's page is delivered. Kill switch: option econur_speed_mode = "off" (or delete this file).
 * Version: 1.2.0
 *
 * Lives in wp-content/mu-plugins. Nothing here changes how the site looks: fonts are the
 * same files with the same @font-face rules, and every inline style block is replaced by a
 * <link> printed at exactly the same spot with exactly the same CSS.
 */
defined('ABSPATH') || exit;

function ecn_speed_on() {
    if (is_admin() || wp_doing_ajax() || is_customize_preview()) return false;
    if ('off' !== get_option('econur_speed_mode')) return true;
    // While switched off, ?ecnspeed=<key> previews it (testing only).
    $k = get_option('econur_speed_key');
    return $k && isset($_GET['ecnspeed']) && hash_equals($k, (string) $_GET['ecnspeed']);
}

function ecn_speed_dir() {
    $u = wp_upload_dir(null, false);
    return array($u['basedir'] . '/econur-speed', set_url_scheme($u['baseurl'] . '/econur-speed'));
}

/** Write $css once to econur-speed/<name>-<hash>.css and return its URL (null on failure). */
function ecn_speed_file($name, $css) {
    list($dir, $url) = ecn_speed_dir();
    $file = $name . '-' . substr(md5($css), 0, 12) . '.css';
    if (!file_exists("$dir/$file")) {
        if (!wp_mkdir_p($dir)) return null;
        $tmp = "$dir/$file." . wp_generate_password(6, false) . '.tmp';
        if (false === @file_put_contents($tmp, $css) || !@rename($tmp, "$dir/$file")) { @unlink($tmp); return null; }
    }
    return "$url/$file";
}

/** Inline CSS with page-relative url()s would break once moved to a file, so leave it inline. */
function ecn_speed_movable($css) {
    return strlen($css) >= 2048 && !preg_match('#url\(\s*+[\'"]?+(?!data:|https?:|//|/|\#)#i', $css);
}

/* 1. Theme/WooCommerce inline styles -> cached files, printed right where the inline block was. */
add_action('wp_print_styles', function () {
    if (!ecn_speed_on()) return;
    $ws = wp_styles();
    foreach (array('astra-theme-css', 'woocommerce-general') as $h) {
        if (empty($ws->registered[$h]->src)) continue;
        $after = $ws->get_data($h, 'after');
        if (!$after) continue;
        $css = implode("\n", $after);
        if (!ecn_speed_movable($css) || !($url = ecn_speed_file('inline-' . $h, $css))) continue;
        $GLOBALS['ecn_speed_ext'][$h] = $url;
        $ws->registered[$h]->extra['after'] = array();
    }
}, 1);

add_filter('style_loader_tag', function ($tag, $h) {
    if (!empty($GLOBALS['ecn_speed_ext'][$h])) {
        $tag .= sprintf("<link rel='stylesheet' id='%s-ext-css' href='%s' media='all' />\n", esc_attr($h), esc_url($GLOBALS['ecn_speed_ext'][$h]));
    }
    return $tag;
}, 10, 2);

/* 2. Customizer "Additional CSS" -> cached file at the same spot (wp_head 101 -> 100, nothing sits between). */
add_action('wp_head', function () {
    if (!ecn_speed_on()) return;
    $css = wp_get_custom_css();
    if (!ecn_speed_movable($css) || !($url = ecn_speed_file('custom', $css))) return;
    remove_action('wp_head', 'wp_custom_css_cb', 101);
    printf("<link rel='stylesheet' id='wp-custom-css-ext' href='%s' media='all' />\n", esc_url($url));
}, 100);

/* 3. Google fonts served from this site (same files, same @font-face rules). */
/** Google URL without WordPress' ?ver= (no query parsing: the URL repeats family=). */
function ecn_speed_font_src($src) {
    return rtrim(preg_replace('#([?&])ver=[^&]*(&|$)#', '$1', html_entity_decode($src)), '?&');
}

function ecn_speed_font_map() {
    $m = get_option('econur_speed_fonts');
    return is_array($m) ? $m : array();
}

add_filter('style_loader_src', function ($src, $h) {
    if ('econur-fonts' !== $h || !ecn_speed_on() || false === strpos($src, 'fonts.googleapis.com')) return $src;
    $clean = ecn_speed_font_src($src);
    $map = ecn_speed_font_map();
    if (!empty($map[md5($clean)]['css'])) return $map[md5($clean)]['css'];
    if (get_option('econur_speed_fonts_pending') !== $clean) update_option('econur_speed_fonts_pending', $clean, false);
    if (!wp_next_scheduled('ecn_speed_build_fonts')) wp_schedule_single_event(time() + 30, 'ecn_speed_build_fonts');
    return $src;
}, 10, 2);

add_action('ecn_speed_build_fonts', 'ecn_speed_build_fonts');
/** Download the theme's Google Fonts CSS + woff2 files into uploads/econur-speed/fonts. */
function ecn_speed_build_fonts($src = null) {
    $src = $src ? ecn_speed_font_src($src) : get_option('econur_speed_fonts_pending');
    if (!$src || 0 !== strpos($src, 'https://fonts.googleapis.com/')) return new WP_Error('nofonts', 'no Google Fonts URL to build');
    $ua = array('timeout' => 20, 'user-agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36');
    $r = wp_remote_get($src, $ua);
    $css = wp_remote_retrieve_body($r);
    if (200 !== wp_remote_retrieve_response_code($r) || false === strpos($css, '@font-face')) return new WP_Error('fetch', 'font css fetch failed');
    list($dir, $url) = ecn_speed_dir();
    if (!wp_mkdir_p("$dir/fonts")) return new WP_Error('mkdir', 'cannot create font dir');
    preg_match_all('#url\((https://fonts\.gstatic\.com/s/([a-z0-9]+)/[^)]+?/([A-Za-z0-9_-]+\.woff2))\)#', $css, $m, PREG_SET_ORDER);
    $done = array();
    foreach ($m as $x) {
        $local = $x[2] . '-' . $x[3];
        if (empty($done[$x[1]])) {
            if (!file_exists("$dir/fonts/$local")) {
                $f = wp_remote_get($x[1], $ua);
                $body = wp_remote_retrieve_body($f);
                if (200 !== wp_remote_retrieve_response_code($f) || strlen($body) < 1000 || 'wOF2' !== substr($body, 0, 4)) return new WP_Error('font', 'font download failed: ' . $x[1]);
                file_put_contents("$dir/fonts/$local", $body);
            }
            $done[$x[1]] = $local;
        }
    }
    $local_css = strtr($css, array_map(function ($l) { return 'fonts/' . $l; }, $done));
    $local_css = "/* Self-hosted copy of {$src} */\n" . $local_css;
    $file = 'fonts-' . substr(md5($local_css), 0, 12) . '.css';
    file_put_contents("$dir/$file", $local_css);
    // Preload the body font (Inter, latin) so text settles without a visible swap.
    $preload = array();
    if (preg_match("#/\* latin \*/\s*@font-face\s*\{\s*font-family:\s*'Inter';[^}]*?url\((fonts/[^)]+)\)#", $local_css, $p)) $preload[] = "$url/" . $p[1];
    $map = ecn_speed_font_map();
    $map[md5($src)] = array('css' => "$url/$file", 'preload' => $preload, 'built' => time(), 'files' => count($done));
    update_option('econur_speed_fonts', $map, true);
    return $map[md5($src)];
}

add_action('wp_head', function () {
    if (!ecn_speed_on()) return;
    foreach (ecn_speed_font_map() as $f) {
        foreach ((array) ($f['preload'] ?? array()) as $p) printf("<link rel='preload' href='%s' as='font' type='font/woff2' crossorigin />\n", esc_url($p));
    }
}, 2);

/* Google Fonts preconnects are no longer needed once the fonts are local. */
add_filter('wp_resource_hints', function ($urls, $type) {
    if (!ecn_speed_on() || !ecn_speed_font_map()) return $urls;
    return array_values(array_filter($urls, function ($u) {
        $href = is_array($u) ? ($u['href'] ?? '') : $u;
        return false === strpos($href, 'fonts.googleapis.com') && false === strpos($href, 'fonts.gstatic.com');
    }));
}, 20, 2);

/* 4. Emoji detection script/styles (every current phone and browser shows emoji natively). */
add_action('template_redirect', function () {
    if (!ecn_speed_on()) return;
    remove_action('wp_head', 'print_emoji_detection_script', 7);
    remove_action('wp_print_styles', 'print_emoji_styles');
    remove_action('wp_enqueue_scripts', 'wp_enqueue_emoji_styles');
    add_filter('emoji_svg_url', '__return_false');
});

/* 5. Keep the page cache warm so shoppers get the fast cached copy, not a fresh build. */
function ecn_speed_warm_urls() {
    $urls = array(home_url('/'));
    if (function_exists('wc_get_page_permalink')) $urls[] = wc_get_page_permalink('shop');
    foreach (get_posts(array('post_type' => 'product', 'post_status' => 'publish', 'numberposts' => 50, 'fields' => 'ids')) as $id) $urls[] = get_permalink($id);
    foreach ((array) get_terms(array('taxonomy' => 'product_cat', 'hide_empty' => true)) as $t) {
        if ($t instanceof WP_Term) $urls[] = get_term_link($t);
    }
    return array_values(array_unique(array_filter($urls, 'is_string')));
}

function ecn_speed_warm() {
    if ('off' === get_option('econur_speed_mode')) return;
    foreach (ecn_speed_warm_urls() as $u) {
        wp_remote_get($u, array('timeout' => 20, 'redirection' => 0, 'user-agent' => 'Mozilla/5.0 (compatible; EconurCacheWarm/1.0; +' . home_url('/') . ')'));
    }
}
add_action('ecn_speed_warm', 'ecn_speed_warm');
add_action('ecn_speed_warm_once', 'ecn_speed_warm');

add_action('init', function () {
    if (!wp_next_scheduled('ecn_speed_warm')) wp_schedule_event(time() + 600, 'hourly', 'ecn_speed_warm');
});

add_action('litespeed_purged_all', function () {
    if (!wp_next_scheduled('ecn_speed_warm_once')) wp_schedule_single_event(time() + 90, 'ecn_speed_warm_once');
});

/* 6. Background tasks (WP-Cron) never hold up a shopper's page.
 * WordPress starts due background tasks at the end of a page request (shutdown), and on this host the
 * shopper's browser waited ~0.2-0.4 s for that hand-off. When a task is due, close the response to the
 * shopper first (the page is already flushed at shutdown priority 1), then let WordPress start the tasks
 * at priority 10 as usual. Same tasks, same schedule; only the shopper stops waiting. */
add_action('shutdown', function () {
    if ('off' === get_option('econur_speed_mode') || !function_exists('litespeed_finish_request')) return;
    if (wp_doing_cron() || (defined('DISABLE_WP_CRON') && DISABLE_WP_CRON) || defined('WP_CLI')) return;
    $jobs = wp_get_ready_cron_jobs();
    if (empty($jobs)) return;
    $lock = (float) get_transient('doing_cron');
    if ($lock && $lock + WP_CRON_LOCK_TIMEOUT > microtime(true) && $lock <= microtime(true) + 10 * MINUTE_IN_SECONDS) return; // no spawn would happen
    litespeed_finish_request();
}, 5);

/* 7. Theme files carry their own change time in the address (?ver=1.0.2.1791129000), so an edited CSS/JS file
 * reaches visitors at once instead of after the browser/CDN cache (7 days) runs out. */
function ecn_speed_bust($src) {
    if (!is_string($src) || false === strpos($src, '/themes/econur/') || 'off' === get_option('econur_speed_mode')) return $src;
    $path = wp_parse_url($src, PHP_URL_PATH);
    $file = $path ? untrailingslashit(ABSPATH) . $path : '';
    if (!$file || !is_file($file)) return $src;
    $ver = preg_match('/[?&]ver=([^&]+)/', $src, $m) ? $m[1] : '';
    if (preg_match('/\.\d{9,}$/', $ver)) return $src; // already stamped
    return add_query_arg('ver', ($ver ? $ver . '.' : '') . filemtime($file), $src);
}
add_filter('style_loader_src', 'ecn_speed_bust', 20);
add_filter('script_loader_src', 'ecn_speed_bust', 20);
