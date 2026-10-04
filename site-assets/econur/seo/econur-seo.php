<?php
/**
 * Plugin Name: ECONUR SEO
 * Description: Search and sharing basics without a heavy SEO plugin: meta descriptions, Facebook/WhatsApp/X share previews (Open Graph + Twitter cards), canonical links on shop and category pages, business details for Google (Organization + WebSite), and a sitemap without cart/checkout/account pages. Descriptions come from the product's short description or the category description, and can be overridden per page, product or category ("Search & sharing" box). Kill switch: option econur_seo_mode = "off". Steps aside automatically if Yoast SEO, Rank Math, SEOPress, AIOSEO or Slim SEO is activated.
 * Version: 1.0.0
 */
defined('ABSPATH') || exit;

function ecn_seo_on() {
    if ('off' === get_option('econur_seo_mode')) return false;
    // Another SEO plugin owns these tags if it is active.
    return !(defined('WPSEO_VERSION') || class_exists('RankMath') || defined('SEOPRESS_VERSION') || defined('AIOSEO_VERSION') || defined('SLIM_SEO_VER'));
}

const ECN_SEO_COD = 'Cash on delivery across Bangladesh.';

/* ------------------------------------------------------------------ text helpers */
function ecn_seo_clean($t) {
    $t = wp_strip_all_tags(strip_shortcodes((string) $t));
    return trim(preg_replace('/\s+/u', ' ', html_entity_decode($t, ENT_QUOTES, 'UTF-8')));
}

/** Fit to ~160 characters, cutting at a word, then add the delivery line if it still fits. */
function ecn_seo_fit($t, $cod = true) {
    $t = ecn_seo_clean($t);
    if ('' === $t) return '';
    if ($cod && false === stripos($t, 'cash on delivery') && mb_strlen($t) + 1 + mb_strlen(ECN_SEO_COD) <= 160) {
        $t = rtrim($t, ' .') . '. ' . ECN_SEO_COD;
    }
    if (mb_strlen($t) > 160) {
        $t = mb_substr($t, 0, 158);
        $t = preg_replace('/\s+\S*$/u', '', $t) . '…';
    }
    return $t;
}

function ecn_seo_hero_image() {
    $slides = function_exists('econur_hero_slides') ? econur_hero_slides() : array();
    $id = $slides ? (int) $slides[0]['desktop'] : 0;
    return $id ? ecn_seo_image($id, '1536x1536') : null;
}

function ecn_seo_image($id, $size = 'full') {
    $src = $id ? wp_get_attachment_image_src($id, $size) : false;
    if (!$src) return null;
    return array('url' => $src[0], 'w' => (int) $src[1], 'h' => (int) $src[2], 'alt' => ecn_seo_clean(get_post_meta($id, '_wp_attachment_image_alt', true)), 'type' => get_post_mime_type($id));
}

/* ------------------------------------------------------------------ what this page is */
function ecn_seo_data() {
    static $d = null;
    if (null !== $d) return $d;
    $d = array('desc' => '', 'type' => 'website', 'url' => '', 'image' => null, 'product' => null);
    $paged = max(1, (int) get_query_var('paged'));

    if (is_front_page()) {
        $d['desc'] = get_option('econur_seo_home_desc') ?: 'Handmade botanical skincare bars from Bangladesh for oily, acne-prone, dull and sensitive skin, and gentle bars for babies. ' . ECN_SEO_COD;
        $d['url'] = home_url('/');
        $d['image'] = ecn_seo_hero_image();
    } elseif (function_exists('is_shop') && is_shop()) {
        $d['desc'] = get_post_meta(wc_get_page_id('shop'), '_econur_seo_desc', true) ?: 'Shop all Econur botanical skincare bars: face care for oily, acne-prone, dull or uneven skin, and ultra-mild bars for babies and sensitive skin.';
        $d['url'] = $paged > 1 ? get_pagenum_link($paged, false) : wc_get_page_permalink('shop');
        $d['image'] = ecn_seo_hero_image();
    } elseif (is_tax(array('product_cat', 'product_tag'))) {
        $term = get_queried_object();
        $d['desc'] = get_term_meta($term->term_id, '_econur_seo_desc', true) ?: ($term->description ?: sprintf('%s by Econur, handmade botanical skincare from Bangladesh.', $term->name));
        $d['url'] = $paged > 1 ? get_pagenum_link($paged, false) : get_term_link($term);
        $thumb = (int) get_term_meta($term->term_id, 'thumbnail_id', true);
        if (!$thumb) {
            $first = get_posts(array('post_type' => 'product', 'post_status' => 'publish', 'numberposts' => 1, 'fields' => 'ids', 'tax_query' => array(array('taxonomy' => $term->taxonomy, 'terms' => $term->term_id))));
            $thumb = $first ? (int) get_post_thumbnail_id($first[0]) : 0;
        }
        $d['image'] = ecn_seo_image($thumb) ?: ecn_seo_hero_image();
    } elseif (is_singular()) {
        $post = get_queried_object();
        $d['url'] = wp_get_canonical_url($post) ?: get_permalink($post);
        $over = get_post_meta($post->ID, '_econur_seo_desc', true);
        if ('product' === $post->post_type && function_exists('wc_get_product') && ($p = wc_get_product($post->ID))) {
            $d['desc'] = $over ?: ($p->get_short_description() ?: $p->get_description());
            $d['type'] = 'product';
            $d['image'] = ecn_seo_image($p->get_image_id());
            $price = $p->is_type('variable') ? $p->get_variation_price('min', true) : $p->get_price();
            if ('' === (string) $price || !$p->is_purchasable()) $d['nocod'] = true; // "coming soon": no delivery line
            $d['product'] = array('price' => '' !== (string) $price ? wc_format_decimal($price, wc_get_price_decimals()) : '', 'currency' => get_woocommerce_currency(), 'availability' => $p->is_in_stock() ? ('onbackorder' === $p->get_stock_status() ? 'preorder' : 'instock') : 'oos');
        } else {
            $d['desc'] = $over ?: (has_excerpt($post) ? get_the_excerpt($post) : '');
            $d['type'] = 'article';
            $d['image'] = has_post_thumbnail($post) ? ecn_seo_image(get_post_thumbnail_id($post)) : null;
        }
    }
    if ($d['desc']) $d['desc'] = ecn_seo_fit($d['desc'], empty($d['nocod']) && (!is_singular() || 'product' === $d['type'] || is_front_page()));
    if (!$d['image']) $d['image'] = ecn_seo_hero_image();
    return $d;
}

/* ------------------------------------------------------------------ head output */
add_action('wp_head', function () {
    if (!ecn_seo_on() || is_404() || is_search()) return;
    $d = ecn_seo_data();
    $out = array();
    if ($d['desc']) $out[] = sprintf('<meta name="description" content="%s" />', esc_attr($d['desc']));

    // Canonical for the shop and category listings (WordPress only adds it to single pages).
    if ($d['url'] && !is_singular()) $out[] = sprintf('<link rel="canonical" href="%s" />', esc_url($d['url']));

    $title = wp_get_document_title();
    $og = array(
        'og:locale' => 'en_US',
        'og:site_name' => get_bloginfo('name'),
        'og:type' => $d['type'],
        'og:title' => $title,
        'og:description' => $d['desc'],
        'og:url' => $d['url'],
    );
    foreach ($og as $k => $v) if ('' !== (string) $v) $out[] = sprintf('<meta property="%s" content="%s" />', $k, esc_attr($v));
    if ($d['image']) {
        $out[] = sprintf('<meta property="og:image" content="%s" />', esc_url($d['image']['url']));
        $out[] = sprintf('<meta property="og:image:width" content="%d" />', $d['image']['w']);
        $out[] = sprintf('<meta property="og:image:height" content="%d" />', $d['image']['h']);
        if ($d['image']['type']) $out[] = sprintf('<meta property="og:image:type" content="%s" />', esc_attr($d['image']['type']));
        if ($d['image']['alt']) $out[] = sprintf('<meta property="og:image:alt" content="%s" />', esc_attr($d['image']['alt']));
    }
    if ($d['product'] && '' !== $d['product']['price']) {
        $out[] = sprintf('<meta property="product:price:amount" content="%s" />', esc_attr($d['product']['price']));
        $out[] = sprintf('<meta property="product:price:currency" content="%s" />', esc_attr($d['product']['currency']));
        $out[] = sprintf('<meta property="product:availability" content="%s" />', esc_attr($d['product']['availability']));
    }
    $out[] = '<meta name="twitter:card" content="summary_large_image" />';
    $out[] = sprintf('<meta name="twitter:title" content="%s" />', esc_attr($title));
    if ($d['desc']) $out[] = sprintf('<meta name="twitter:description" content="%s" />', esc_attr($d['desc']));
    if ($d['image']) $out[] = sprintf('<meta name="twitter:image" content="%s" />', esc_url($d['image']['url']));

    // Business details for Google on the homepage.
    if (is_front_page()) {
        $same = array_values(array_filter((array) get_option('econur_seo_same_as', array('https://www.facebook.com/econurskincare', 'https://www.instagram.com/econur.skincare'))));
        $graph = array(
            array('@type' => 'Organization', '@id' => home_url('/#organization'), 'name' => get_bloginfo('name'), 'url' => home_url('/'), 'logo' => get_site_icon_url(512) ?: null, 'sameAs' => $same ?: null),
            array('@type' => 'WebSite', '@id' => home_url('/#website'), 'name' => get_bloginfo('name'), 'url' => home_url('/'), 'publisher' => array('@id' => home_url('/#organization')), 'inLanguage' => 'en-US',
                'potentialAction' => array('@type' => 'SearchAction', 'target' => array('@type' => 'EntryPoint', 'urlTemplate' => home_url('/?s={search_term_string}&post_type=product')), 'query-input' => 'required name=search_term_string')),
        );
        $graph = array_map(function ($n) { return array_filter($n, function ($v) { return null !== $v; }); }, $graph);
        $out[] = '<script type="application/ld+json">' . wp_json_encode(array('@context' => 'https://schema.org', '@graph' => $graph), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . '</script>';
    }

    $sv = get_option('econur_seo_verify', array());
    if (!empty($sv['google'])) $out[] = sprintf('<meta name="google-site-verification" content="%s" />', esc_attr($sv['google']));
    if (!empty($sv['bing'])) $out[] = sprintf('<meta name="msvalidate.01" content="%s" />', esc_attr($sv['bing']));
    if (!empty($sv['facebook'])) $out[] = sprintf('<meta name="facebook-domain-verification" content="%s" />', esc_attr($sv['facebook']));

    echo "<!-- ECONUR SEO -->\n" . implode("\n", $out) . "\n";
}, 3);

/* ------------------------------------------------------------------ sitemap: no cart/checkout/account/login, no empty "Uncategorized" */
add_filter('wp_sitemaps_posts_query_args', function ($args, $post_type) {
    if (!ecn_seo_on() || 'page' !== $post_type || !function_exists('wc_get_page_id')) return $args;
    $skip = array_filter(array(wc_get_page_id('cart'), wc_get_page_id('checkout'), wc_get_page_id('myaccount')));
    $login = get_page_by_path('login');
    if ($login) $skip[] = $login->ID;
    $args['post__not_in'] = array_merge(isset($args['post__not_in']) ? (array) $args['post__not_in'] : array(), array_map('intval', $skip));
    return $args;
}, 10, 2);
add_filter('wp_sitemaps_taxonomies_query_args', function ($args, $taxonomy) {
    if (!ecn_seo_on() || 'product_cat' !== $taxonomy) return $args;
    $args['exclude'] = array_merge(isset($args['exclude']) ? (array) $args['exclude'] : array(), array((int) get_option('default_product_cat')));
    return $args;
}, 10, 2);

/* ------------------------------------------------------------------ "Search & sharing" fields (owner can override any description) */
add_action('add_meta_boxes', function () {
    foreach (array('page', 'product') as $pt) {
        add_meta_box('econur-seo', 'Search & sharing', function ($post) {
            wp_nonce_field('econur_seo_save', 'econur_seo_nonce');
            $v = get_post_meta($post->ID, '_econur_seo_desc', true);
            echo '<p><label for="econur-seo-desc"><strong>Search description</strong> (shown under the title on Google and in Facebook/WhatsApp previews; about 150 characters)</label></p>';
            echo '<textarea id="econur-seo-desc" name="econur_seo_desc" rows="3" style="width:100%" maxlength="300">' . esc_textarea($v) . '</textarea>';
            echo '<p class="description">Leave empty to use the product short description automatically.</p>';
        }, $pt, 'normal', 'low');
    }
});
add_action('save_post', function ($id) {
    if (!isset($_POST['econur_seo_nonce']) || !wp_verify_nonce($_POST['econur_seo_nonce'], 'econur_seo_save') || !current_user_can('edit_post', $id) || wp_is_post_revision($id)) return;
    $v = sanitize_textarea_field(wp_unslash($_POST['econur_seo_desc'] ?? ''));
    if ('' === $v) delete_post_meta($id, '_econur_seo_desc'); else update_post_meta($id, '_econur_seo_desc', $v);
});
add_action('product_cat_edit_form_fields', function ($term) {
    wp_nonce_field('econur_seo_term', 'econur_seo_term_nonce');
    printf('<tr class="form-field"><th scope="row"><label for="econur-seo-desc">Search description</label></th><td><textarea id="econur-seo-desc" name="econur_seo_desc" rows="3" maxlength="300">%s</textarea><p class="description">Shown on Google and in share previews. Leave empty to use the category description.</p></td></tr>', esc_textarea(get_term_meta($term->term_id, '_econur_seo_desc', true)));
});
add_action('edited_product_cat', function ($term_id) {
    if (!isset($_POST['econur_seo_term_nonce']) || !wp_verify_nonce($_POST['econur_seo_term_nonce'], 'econur_seo_term') || !current_user_can('manage_product_terms')) return;
    $v = sanitize_textarea_field(wp_unslash($_POST['econur_seo_desc'] ?? ''));
    if ('' === $v) delete_term_meta($term_id, '_econur_seo_desc'); else update_term_meta($term_id, '_econur_seo_desc', $v);
});
