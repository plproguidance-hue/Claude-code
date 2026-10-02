<?php
/**
 * Econur product card for shop and category archives.
 * Overrides woocommerce/content-product.php. Mobile-first, one CTA, real ratings only.
 */
defined('ABSPATH') || exit;
global $product;
if (!$product || !$product->is_visible()) return;

$pid   = $product->get_id();
$link  = get_permalink($pid);
$name  = $product->get_name();
$skin  = array_values(array_filter(array_map('trim', explode('|', (string) get_post_meta($pid, 'econur_skin_type', true)))));
$skin  = $skin ? 'For ' . strtolower(implode(', ', $skin)) : '';
$rc    = (int) $product->get_review_count();
$avg   = (float) $product->get_average_rating();
$sales = (int) $product->get_total_sales();
$days  = (time() - get_post_time('U', true, $pid)) / DAY_IN_SECONDS;

$price = ''; $regular = ''; $size_label = ''; $vid = 0; $size_attr = ''; $sizes = array();
if ($product->is_type('variable')) {
    foreach ($product->get_children() as $cid) {
        $v = wc_get_product($cid);
        if (!$v || !$v->is_purchasable() || !$v->is_in_stock()) continue;
        $attrs = $v->get_attributes();
        $s = isset($attrs['pa_size']) ? $attrs['pa_size'] : '';
        $term = $s ? get_term_by('slug', $s, 'pa_size') : null;
        $sizes[] = array('vid' => $cid, 'slug' => $s, 'label' => $term ? $term->name : $s, 'price' => $v->get_price(), 'regular' => $v->get_regular_price(), 'sale' => $v->get_sale_price());
    }
    if ($sizes) { $d = $sizes[0]; $vid = $d['vid']; $size_attr = $d['slug']; $size_label = $d['label']; $price = $d['price']; $regular = $d['regular']; }
} else {
    $price = $product->get_price(); $regular = $product->get_regular_price();
}
$on_sale = ($price !== '' && $regular !== '' && (float) $regular > (float) $price);
$pct     = $on_sale ? round((1 - (float) $price / (float) $regular) * 100) : 0;
$coming  = ('' === $price);

$show_sizes = false;
if (count($sizes) > 1) { $ps = array_unique(array_map(function ($s) { return (string) $s['price']; }, $sizes)); $show_sizes = count($ps) > 1; }

// Homepage product cards: hide the size selector; if the customer must choose a size, send them to the product page.
$home_card = !empty($GLOBALS['econur_home_cards']);
$needs_choice = $home_card && count($sizes) > 1;
if ($home_card) $show_sizes = false;

$order_url = wc_get_checkout_url();
if (!$coming) {
    $args = array('add-to-cart' => $pid);
    if ($vid) { $args['variation_id'] = $vid; $args['attribute_pa_size'] = $size_attr; }
    $order_url = add_query_arg($args, $order_url);
}
if ($needs_choice) $order_url = $link;
$wa = 'https://wa.me/8801410753555?text=' . rawurlencode('Hi Econur, please let me know when ' . $name . ' is available.');

$badge = '';
if ($coming)              $badge = '<span class="ecn-pc-badge ecn-pc-badge-soon" lang="bn">শীঘ্রই আসছে</span>';
elseif ($on_sale)         $badge = '<span class="ecn-pc-badge ecn-pc-badge-sale">Save ' . $pct . '%</span>';
elseif ($sales >= 5)      $badge = '<span class="ecn-pc-badge">Best seller</span>';
elseif ($manual = trim((string) get_post_meta($pid, 'econur_badge', true))) $badge = '<span class="ecn-pc-badge">' . esc_html($manual) . '</span>';
?>
<li <?php wc_product_class('ecn-pcard' . ($coming ? ' ecn-pcard-soon' : ''), $product); ?>>
  <a class="ecn-pc-media" href="<?php echo esc_url($link); ?>" aria-label="<?php echo esc_attr($name); ?>">
    <?php
    // Homepage Bestsellers: optional card photo per product (meta econur_home_card_image, crop focus in econur_home_card_focus). Everywhere else: the product image.
    $card_img = $home_card ? (int) get_post_meta($pid, 'econur_home_card_image', true) : 0;
    if ($card_img && wp_attachment_is_image($card_img)) {
        // The 4:5 card crops a near-square photo, so the photo is painted about 1.3x the card width.
        $card_sizes = '(min-width: 1180px) 350px, (min-width: 1000px) 30vw, (min-width: 600px) 40vw, 57vw';
        $card_attr = array('loading' => 'lazy', 'decoding' => 'async', 'sizes' => $card_sizes);
        // WordPress puts "auto, " in front of lazy image sizes again when it filters the page content; keep this hint.
        if (empty($GLOBALS['econur_card_sizes_filter'])) { $GLOBALS['econur_card_sizes_filter'] = true; add_filter('wp_content_img_tag', function ($img) use ($card_sizes) { return str_replace('sizes="auto, ' . $card_sizes . '"', 'sizes="' . $card_sizes . '"', $img); }); }
        $focus = (string) get_post_meta($pid, 'econur_home_card_focus', true);
        if (preg_match('/^\d{1,3}% \d{1,3}%$/', $focus)) $card_attr['style'] = 'object-position:' . $focus;
        echo str_replace('sizes="auto, ', 'sizes="', wp_get_attachment_image($card_img, 'medium_large', false, $card_attr));
    } else {
        echo $product->get_image('medium_large', array('loading' => 'lazy', 'decoding' => 'async'));
    }
    ?>
    <?php echo $badge; ?>
  </a>
  <div class="ecn-pc-body">
    <?php if ($skin) : ?><span class="ecn-pc-skin"><?php echo esc_html($skin); ?></span><?php endif; ?>
    <h2 class="ecn-pc-title"><a href="<?php echo esc_url($link); ?>"><?php echo esc_html($name); ?></a></h2>
    <?php if ($rc > 0) : ?>
      <a class="ecn-pc-rating" href="<?php echo esc_url($link . '#reviews'); ?>" aria-label="<?php echo esc_attr(sprintf('Rated %s out of 5 from %d reviews', $avg, $rc)); ?>">
        <span class="ecn-pc-stars" style="--r:<?php echo esc_attr(round($avg / 5 * 100)); ?>%">★★★★★</span>
        <span class="ecn-pc-rc"><?php echo esc_html(number_format_i18n($avg, 1)); ?> (<?php echo esc_html($rc); ?>)</span>
      </a>
    <?php endif; ?>
    <?php if ($coming) : ?>
      <div class="ecn-pc-price"><span class="ecn-pc-soon-txt econur-bn-small" lang="bn">শীঘ্রই পাওয়া যাবে</span></div>
      <a class="ecn-pc-btn ecn-pc-btn-soft" href="<?php echo esc_url($wa); ?>" target="_blank" rel="noopener"><span lang="bn" class="econur-bn-cta">WhatsApp-এ আপডেট নিন</span></a>
    <?php else : ?>
      <div class="ecn-pc-price" data-vid="<?php echo esc_attr($vid); ?>">
        <span class="ecn-pc-now"><?php echo wp_kses_post(wc_price($price)); ?></span>
        <?php if ($on_sale) : ?><s class="ecn-pc-was"><?php echo wp_kses_post(wc_price($regular)); ?></s><?php endif; ?>
        <?php if ($size_label) : ?><span class="ecn-pc-size"><?php echo esc_html($size_label); ?></span><?php endif; ?>
      </div>
      <?php if ($show_sizes) : ?>
        <div class="ecn-pc-sizes" role="group" aria-label="Size">
          <?php foreach ($sizes as $i => $s) : ?>
            <button type="button" class="ecn-pc-sz<?php echo $i === 0 ? ' is-on' : ''; ?>" data-vid="<?php echo esc_attr($s['vid']); ?>" data-slug="<?php echo esc_attr($s['slug']); ?>" data-price="<?php echo esc_attr(wp_strip_all_tags(wc_price($s['price']))); ?>" data-was="<?php echo esc_attr(($s['sale'] !== '' && $s['regular'] !== '') ? wp_strip_all_tags(wc_price($s['regular'])) : ''); ?>"><?php echo esc_html($s['label']); ?></button>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
      <?php if ($needs_choice) : ?>
      <a class="ecn-pc-btn" href="<?php echo esc_url($order_url); ?>"><span lang="bn" class="econur-bn-cta">এখনই অর্ডার করুন</span></a>
      <?php else : ?>
      <a class="ecn-pc-btn" href="<?php echo esc_url($order_url); ?>" data-base="<?php echo esc_attr(add_query_arg(array('add-to-cart' => $pid), wc_get_checkout_url())); ?>" rel="nofollow"><span lang="bn" class="econur-bn-cta">এখনই অর্ডার করুন</span></a>
      <?php endif; ?>
    <?php endif; ?>
    <a class="ecn-pc-more" href="<?php echo esc_url($link); ?>" lang="bn">বিস্তারিত</a>
  </div>
</li>