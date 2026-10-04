<?php
/**
 * Econur shop and category archive: header, category chips, trust row, toolbar, grid, closing band.
 */
defined('ABSPATH') || exit;

add_filter('loop_shop_per_page', function () { return 12; }, 30);
add_filter('loop_shop_columns', function () { return 2; }, 30);
add_filter('woocommerce_show_page_title', '__return_false');

add_action('wp', function () {
    if (!function_exists('is_shop') || !(is_shop() || is_product_taxonomy())) return;
    remove_action('woocommerce_before_shop_loop', 'woocommerce_result_count', 20);
    remove_action('woocommerce_before_shop_loop', 'woocommerce_catalog_ordering', 30);
    remove_action('woocommerce_before_main_content', 'woocommerce_breadcrumb', 20);
    remove_action('woocommerce_archive_description', 'woocommerce_taxonomy_archive_description', 10);
    remove_action('woocommerce_archive_description', 'woocommerce_product_archive_description', 10);
    add_action('woocommerce_before_shop_loop', 'econur_archive_header', 5);
    add_action('woocommerce_after_shop_loop', 'econur_archive_footer', 20);
    add_action('woocommerce_no_products_found', 'econur_archive_header', 5);
    add_action('wp_footer', 'econur_archive_js', 40);
}, 99);

function econur_archive_current_cat() {
    if (is_product_category()) { $t = get_queried_object(); return $t ? $t->slug : ''; }
    return 'all';
}

function econur_archive_header() {
    $cur   = econur_archive_current_cat();
    $term  = is_product_category() ? get_queried_object() : null;
    $title = $term ? $term->name : 'All products';
    $desc  = $term ? term_description($term->term_id, 'product_cat') : wp_kses_post(wpautop(get_option('econur_shop_intro', 'Every bar is handmade with cold-pressed oils and wrapped in compostable packaging that returns to the soil.')));
    global $wp_query;
    $total = (int) $wp_query->found_posts;

    $chips = array(array('slug' => 'all', 'name' => 'All', 'url' => wc_get_page_permalink('shop')));
    foreach (get_terms(array('taxonomy' => 'product_cat', 'hide_empty' => false)) as $t) {
        if ($t->slug === 'uncategorized') continue;
        $chips[] = array('slug' => $t->slug, 'name' => $t->name, 'url' => get_term_link($t));
    }
    usort($chips, function ($a, $b) { $o = array('all' => 0, 'face-care' => 1, 'baby-care' => 2, 'hair-care' => 3, 'daily-care' => 4); return ($o[$a['slug']] ?? 9) - ($o[$b['slug']] ?? 9); });

    $orderby = isset($_GET['orderby']) ? wc_clean(wp_unslash($_GET['orderby'])) : get_option('woocommerce_default_catalog_orderby', 'menu_order');
    $opts = array('menu_order' => 'Recommended', 'popularity' => 'Best selling', 'price' => 'Price: low to high', 'price-desc' => 'Price: high to low', 'date' => 'Newest');

    echo '<div class="ecn-arch">';
    echo '<nav class="ecn-arch-crumb" aria-label="Breadcrumb"><a href="' . esc_url(home_url('/')) . '">Home</a><span>/</span>' . ($term ? '<a href="' . esc_url(wc_get_page_permalink('shop')) . '">Shop</a><span>/</span><span>' . esc_html($title) . '</span>' : '<span>Shop</span>') . '</nav>';
    echo '<h1 class="ecn-arch-title">' . esc_html($title) . '</h1>';
    if ($desc) echo '<div class="ecn-arch-desc">' . $desc . '</div>';

    echo '<div class="ecn-arch-chips" role="navigation" aria-label="Categories">';
    foreach ($chips as $c) echo '<a class="ecn-arch-chip' . ($c['slug'] === $cur ? ' is-on' : '') . '" href="' . esc_url($c['url']) . '"' . ($c['slug'] === $cur ? ' aria-current="page"' : '') . '>' . esc_html($c['name']) . '</a>';
    echo '</div>';

    echo '<ul class="ecn-arch-trust"><li>Cash on delivery</li><li>Botanical ingredients</li><li>Zero plastic</li><li>Handmade in BD</li></ul>';

    echo '<div class="ecn-arch-bar"><span class="ecn-arch-count">' . esc_html($total) . ' ' . ($total === 1 ? 'product' : 'products') . '</span>';
    echo '<form class="ecn-arch-sort" method="get"><label for="ecn-orderby">Sort</label><select id="ecn-orderby" name="orderby">';
    foreach ($opts as $k => $l) echo '<option value="' . esc_attr($k) . '"' . selected($orderby, $k, false) . '>' . esc_html($l) . '</option>';
    echo '</select>';
    foreach ($_GET as $k => $v) { if ($k === 'orderby' || $k === 'paged' || !is_scalar($v)) continue; echo '<input type="hidden" name="' . esc_attr($k) . '" value="' . esc_attr(wc_clean(wp_unslash($v))) . '">'; }
    echo '</form></div>';
    echo '</div>';
}

function econur_archive_footer() {
    $wa = 'https://wa.me/8801410753555?text=' . rawurlencode('Hi Econur, can you help me choose the right bar for my skin?');
    echo '<div class="ecn-arch-end">';
    echo '<div class="ecn-arch-help"><div><b>Not sure which bar is right for you?</b><span>Tell us your skin type on WhatsApp and a real person will point you to the right one.</span></div><a class="ecn-pc-btn ecn-pc-btn-soft" href="' . esc_url($wa) . '" target="_blank" rel="noopener">Ask on WhatsApp</a></div>';
    if (function_exists('econur_trust_html')) echo econur_trust_html();
    echo '</div>';
}

function econur_archive_js() { ?>
<script>(function(){
var s=document.getElementById('ecn-orderby');if(s){s.addEventListener('change',function(){s.form.submit();});}
document.querySelectorAll('.ecn-pc-sizes').forEach(function(g){var card=g.closest('.ecn-pcard'),btn=card.querySelector('.ecn-pc-btn'),now=card.querySelector('.ecn-pc-now'),was=card.querySelector('.ecn-pc-was'),sz=card.querySelector('.ecn-pc-size');
g.querySelectorAll('.ecn-pc-sz').forEach(function(b){b.addEventListener('click',function(){g.querySelectorAll('.ecn-pc-sz').forEach(function(x){x.classList.remove('is-on');});b.classList.add('is-on');
if(now)now.textContent=b.dataset.price;if(sz)sz.textContent=b.textContent;
if(b.dataset.was){if(!was){was=document.createElement('s');was.className='ecn-pc-was';now.after(was);}was.textContent=b.dataset.was;}else if(was){was.remove();was=null;}
if(btn){btn.href=btn.dataset.base+'&variation_id='+encodeURIComponent(b.dataset.vid)+'&attribute_pa_size='+encodeURIComponent(b.dataset.slug);}});});});
})();</script>
<?php }