<?php
/**
 * Econur homepage: sale banner + featured products carousel.
 *
 * [econur_sale_banner]  Shows only while a real WooCommerce sale price is active (or when
 *                       switched to "Always show" in settings). The discount, the countdown
 *                       and the end date come from the product sale prices and schedule.
 * [econur_featured]     Products starred as "Featured" in Products > All Products.
 *                       If none are starred, every purchasable product is shown.
 *                       Products on sale are always listed first.
 *
 * Settings: WooCommerce > Homepage sale
 */
defined('ABSPATH') || exit;

/* ------------------------------------------------------------------ settings */

function econur_sf_defaults() {
    return array(
        'mode'     => 'auto',   // auto | always | off
        'eyebrow'  => 'সীমিত সময়ের অফার',
        'headline' => '',       // empty = written automatically from the real discount
        'text'     => '',       // empty = written automatically
        'cta_text' => 'অফারের পণ্য দেখুন',
        'cta_link' => '#ecn-featured',
        'end'      => '',       // Y-m-d\TH:i, site time zone; empty = product sale end dates
        'fp_title' => 'Featured products',
        'fp_sub'   => 'বাছাই করা বার, ক্যাশ অন ডেলিভারিতে পাঠানোর জন্য প্রস্তুত।',
        'fp_limit' => 8,
    );
}

function econur_sf_opts() {
    $o = get_option('econur_sale_featured', array());
    return wp_parse_args(is_array($o) ? $o : array(), econur_sf_defaults());
}

/* ------------------------------------------------------------------ sale data */

/**
 * Reads the live sale from WooCommerce. Nothing here is invented: if no product has an
 * active sale price, 'items' is empty and the banner stays hidden from customers.
 */
function econur_sf_sale_data() {
    static $cache = null;
    if ($cache !== null) return $cache;

    $items = array(); $parents = array(); $pcts = array(); $ends = array();
    $now = time();

    foreach (array_unique(array_map('intval', wc_get_product_ids_on_sale())) as $id) {
        $p = wc_get_product($id);
        if (!$p || $p->is_type('variable') || $p->is_type('grouped')) continue;
        if ('publish' !== get_post_status($p->get_parent_id() ? $p->get_parent_id() : $id)) continue;
        if (!$p->is_on_sale() || !$p->is_purchasable() || !$p->is_in_stock()) continue;
        $reg = (float) $p->get_regular_price();
        $sale = (float) $p->get_sale_price();
        if ($reg <= 0 || $sale <= 0 || $sale >= $reg) continue;
        $pct = (int) round(($reg - $sale) / $reg * 100);
        if ($pct < 1) continue;
        $to = $p->get_date_on_sale_to();
        $end = $to ? $to->getTimestamp() : 0;
        if ($end && $end <= $now) continue;
        $pid = $p->get_parent_id() ? $p->get_parent_id() : $id;
        $items[] = array('id' => $id, 'parent' => $pid, 'pct' => $pct, 'end' => $end);
        $parents[$pid] = max(isset($parents[$pid]) ? $parents[$pid] : 0, $pct);
        $pcts[] = $pct;
        if ($end) $ends[] = $end;
    }

    // How many sellable products exist, to know if the sale covers "every bar".
    $all = wc_get_products(array('status' => 'publish', 'limit' => 200, 'return' => 'ids'));
    $sellable = 0;
    foreach ($all as $aid) { $ap = wc_get_product($aid); if ($ap && $ap->is_purchasable() && $ap->is_in_stock()) $sellable++; }

    $cache = array(
        'items'   => $items,
        'parents' => $parents,
        'max'     => $pcts ? max($pcts) : 0,
        'uniform' => $pcts && count(array_unique($pcts)) === 1,
        'all'     => $parents && count($parents) >= $sellable,
        'end'     => $ends ? min($ends) : 0,
    );
    return $cache;
}

function econur_sf_end_ts($o, $d) {
    if (!empty($o['end'])) {
        $dt = DateTime::createFromFormat('Y-m-d\TH:i', $o['end'], wp_timezone());
        if ($dt) return $dt->getTimestamp();
    }
    return (int) $d['end'];
}

function econur_sf_icon($n) {
    $p = array(
        'badge' => '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m15 9-6 6"/><path d="M9 9h.01"/><path d="M15 15h.01"/>',
        'arrow' => '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
        'heart' => '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
        'bag'   => '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
        'check' => '<path d="M20 6 9 17l-5-5"/>',
        'left'  => '<path d="m15 18-6-6 6-6"/>',
        'right' => '<path d="m9 18 6-6-6-6"/>',
    );
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . $p[$n] . '</svg>';
}

/* ------------------------------------------------------------------ sale banner */

add_shortcode('econur_sale_banner', function () {
    $o = econur_sf_opts();
    $d = econur_sf_sale_data();
    $end = econur_sf_end_ts($o, $d);
    $has_sale = !empty($d['items']);
    $expired = $end && $end <= time();
    $admin = current_user_can('manage_woocommerce');

    $live = !$expired && (
        ('auto' === $o['mode'] && $has_sale) ||
        ('always' === $o['mode'] && ($has_sale || '' !== trim($o['headline'])))
    );
    if (!$live && !$admin) return '';

    // Headline and supporting line, written from the real numbers when left empty.
    $preview = !$live;
    $pct = $has_sale ? $d['max'] : 20;
    $auto_head = ($has_sale && $d['uniform'] && $d['all']) ? 'Flat ' . $pct . '% OFF' : (($has_sale && $d['uniform']) ? $pct . '% OFF' : 'Up to ' . $pct . '% OFF');
    if ($preview && !$has_sale) $auto_head = 'Flat 20% OFF';
    $head = '' !== trim($o['headline']) ? $o['headline'] : $auto_head;

    $show_end = $end ? $end : ($preview ? time() + 2 * DAY_IN_SECONDS + 5 * HOUR_IN_SECONDS : 0);
    if ('' !== trim($o['text'])) {
        $text = $o['text'];
    } else {
        // Bangla supporting line (the campaign headline stays English); dates as "8 অক্টোবর"
        $scope = ($has_sale && $d['all']) || !$has_sale ? 'সব বারে' : 'নির্বাচিত বারে';
        $text = $show_end ? $scope . ', ' . econur_bn_date($show_end) . ' পর্যন্ত। সারা দেশে ক্যাশ অন ডেলিভারি।' : $scope . '। সারা দেশে ক্যাশ অন ডেলিভারি।';
    }

    $link = trim($o['cta_link']) ? $o['cta_link'] : '#ecn-featured';

    ob_start();
    ?>
    <section class="ecn-sb<?php echo $preview ? ' is-preview' : ''; ?>" id="ecn-sale" aria-labelledby="ecn-sb-title" data-end="<?php echo esc_attr($show_end); ?>" data-preview="<?php echo $preview ? '1' : '0'; ?>">
      <?php if ($preview) : ?>
        <p class="ecn-sb-note"><strong>Preview, only admins can see this.</strong> <?php echo $expired ? 'The sale end date has passed.' : ('off' === $o['mode'] ? 'The banner is switched off.' : 'It goes live on its own when a product has a sale price.'); ?><?php echo $has_sale ? '' : ' Numbers shown are samples.'; ?> <a href="<?php echo esc_url(admin_url('admin.php?page=econur-homepage-sale')); ?>">Sale settings</a></p>
      <?php endif; ?>
      <div class="ecn-sb-copy">
        <div class="ecn-sb-top"><span class="ecn-sb-ico"><?php echo econur_sf_icon('badge'); ?></span><span class="ecn-sb-eyebrow"<?php echo econur_bn_attr($o['eyebrow']); ?>><?php echo esc_html($o['eyebrow']); ?></span></div>
        <h2 class="ecn-sb-title" id="ecn-sb-title"><?php echo esc_html($head); ?></h2>
        <p class="ecn-sb-text"<?php echo econur_bn_attr($text); ?>><?php foreach (preg_split('/(?<=[.!?।])\s+/u', trim($text)) as $line) echo '<span class="ecn-sb-line">' . esc_html($line) . '</span> '; ?></p>
      </div>
      <div class="ecn-sb-act">
        <?php if ($show_end) : ?>
          <div class="ecn-sb-timer" role="timer" aria-label="Offer ends in">
            <span class="ecn-sb-lbl">Ends in</span>
            <div class="ecn-sb-units">
              <span class="ecn-sb-u" data-u="d"><b>00</b><small>Days</small></span>
              <span class="ecn-sb-u" data-u="h"><b>00</b><small>Hrs</small></span>
              <span class="ecn-sb-u" data-u="m"><b>00</b><small>Min</small></span>
              <span class="ecn-sb-u" data-u="s"><b>00</b><small>Sec</small></span>
            </div>
          </div>
        <?php endif; ?>
        <a class="ecn-sb-cta" href="<?php echo esc_url($link); ?>"><?php echo econur_bn($o['cta_text'], 'econur-bn-cta'); ?> <?php echo econur_sf_icon('arrow'); ?></a>
      </div>
    </section>
    <?php
    $GLOBALS['econur_sf_js'] = true;
    return ob_get_clean();
});

/* ------------------------------------------------------------------ featured products */

function econur_sf_pick_variation($p, $sale_ids) {
    // Prefer the cheapest variation that is on sale, then the default, then the first in stock.
    $best = null; $best_price = null; $first = null;
    foreach ($p->get_children() as $cid) {
        $v = wc_get_product($cid);
        if (!$v || !$v->is_purchasable() || !$v->is_in_stock()) continue;
        if (!$first) $first = $v;
        if (in_array($cid, $sale_ids, true) && (null === $best_price || (float) $v->get_price() < $best_price)) { $best = $v; $best_price = (float) $v->get_price(); }
    }
    if ($best) return $best;
    $def = $p->get_default_attributes();
    if ($def) {
        $vid = (new WC_Product_Data_Store_CPT())->find_matching_product_variation($p, array_combine(array_map(function ($k) { return 'attribute_' . $k; }, array_keys($def)), array_values($def)));
        $v = $vid ? wc_get_product($vid) : null;
        if ($v && $v->is_purchasable() && $v->is_in_stock()) return $v;
    }
    return $first;
}

function econur_fp_card_image($p, $name) {
    // Same photo as the homepage Bestsellers card when one is set (meta econur_home_card_image, crop focus econur_home_card_focus); otherwise the product image.
    $sizes = '(min-width: 1000px) 320px, (min-width: 700px) 36vw, 56vw';
    $cid = (int) get_post_meta($p->get_id(), 'econur_home_card_image', true);
    if ($cid && wp_attachment_is_image($cid)) {
        $attr = array('loading' => 'lazy', 'decoding' => 'async', 'sizes' => $sizes, 'alt' => $name);
        $focus = (string) get_post_meta($p->get_id(), 'econur_home_card_focus', true);
        if (preg_match('/^\d{1,3}% \d{1,3}%$/', $focus)) $attr['style'] = 'object-position:' . $focus;
        $img = wp_get_attachment_image($cid, 'medium_large', false, $attr);
    } else {
        $img = $p->get_image('medium_large', array('loading' => 'lazy', 'sizes' => $sizes, 'alt' => esc_attr($name)));
    }
    // WordPress puts "auto, " in front of lazy image sizes again when it filters the page content; keep this hint so the photo stays sharp.
    if (empty($GLOBALS['econur_fp_sizes_filter'])) { $GLOBALS['econur_fp_sizes_filter'] = true; add_filter('wp_content_img_tag', function ($tag) use ($sizes) { return str_replace('sizes="auto, ' . $sizes . '"', 'sizes="' . $sizes . '"', $tag); }); }
    return str_replace('sizes="auto, ', 'sizes="', $img);
}

add_shortcode('econur_featured', function () {
    $o = econur_sf_opts();
    $d = econur_sf_sale_data();
    $sale_ids = array_map(function ($i) { return (int) $i['id']; }, $d['items']);
    $limit = max(1, min(24, (int) $o['fp_limit']));

    $ids = wc_get_products(array('status' => 'publish', 'featured' => true, 'limit' => 50, 'orderby' => 'menu_order', 'order' => 'ASC', 'return' => 'ids'));
    if (!$ids) $ids = wc_get_products(array('status' => 'publish', 'limit' => 50, 'orderby' => 'menu_order', 'order' => 'ASC', 'return' => 'ids'));

    $rows = array();
    foreach ($ids as $pos => $id) {
        $p = wc_get_product($id);
        if (!$p || !$p->is_visible() || !$p->is_purchasable() || !$p->is_in_stock()) continue;
        $buy = $p->is_type('variable') ? econur_sf_pick_variation($p, $sale_ids) : ($p->is_type('simple') ? $p : null);
        if (!$buy) continue;
        $rows[] = array('p' => $p, 'buy' => $buy, 'sale' => isset($d['parents'][$id]) ? $d['parents'][$id] : 0, 'pos' => $pos);
    }
    if (!$rows) return '';
    usort($rows, function ($a, $b) { return ($b['sale'] > 0) - ($a['sale'] > 0) ?: $a['pos'] - $b['pos']; });
    $rows = array_slice($rows, 0, $limit);

    $cards = '';
    foreach ($rows as $r) {
        $p = $r['p']; $buy = $r['buy'];
        $name = $p->get_name(); $link = get_permalink($p->get_id());
        $size = $buy->is_type('variation') ? $buy->get_attribute('pa_size') : '';
        $on = $buy->is_on_sale() && (float) $buy->get_regular_price() > (float) $buy->get_price();
        $pct = $on ? (int) round(((float) $buy->get_regular_price() - (float) $buy->get_price()) / (float) $buy->get_regular_price() * 100) : 0;

        $rc = (int) $p->get_review_count(); $avg = (float) $p->get_average_rating();
        $sold = (int) $p->get_total_sales();
        if ($rc > 0) {
            $proof = '<a class="ecn-fp-rating" href="' . esc_url($link . '#reviews') . '" aria-label="' . esc_attr(sprintf('Rated %s out of 5 from %d reviews', number_format($avg, 1), $rc)) . '"><span class="ecn-pc-stars" style="--r:' . esc_attr(round($avg / 5 * 100)) . '%">★★★★★</span><b>' . esc_html(number_format($avg, 1)) . '</b><span>(' . esc_html($rc) . ')</span></a>';
        } else {
            $skin = array_values(array_filter(array_map('trim', explode('|', (string) get_post_meta($p->get_id(), 'econur_skin_type', true)))));
            $proof = $skin ? '<span class="ecn-fp-skin">For ' . esc_html(strtolower($skin[0])) . '</span>' : '';
        }
        if ($sold >= 10) $proof .= '<span class="ecn-fp-sold">' . esc_html(number_format_i18n($sold)) . ' sold</span>';

        $badge = $pct ? '<span class="ecn-fp-badge is-sale">&minus;' . esc_html($pct) . '%</span>' : ($sold >= 5 ? '<span class="ecn-fp-badge">Best seller</span>' : '');
        $price = '<b>' . wp_kses_post(wc_price($buy->get_price())) . '</b>' . ($on ? '<s>' . wp_kses_post(wc_price($buy->get_regular_price())) . '</s>' : '') . ($size ? '<small>' . esc_html($size) . '</small>' : '');
        $label = 'কার্টে যোগ করুন: ' . $name . ($size ? ', ' . $size : '');

        $cards .= '<article class="ecn-fp-card" data-pid="' . esc_attr($p->get_id()) . '">'
            . '<div class="ecn-fp-media"><a class="ecn-fp-img" href="' . esc_url($link) . '" tabindex="-1" aria-hidden="true">' . econur_fp_card_image($p, $name) . '</a>' . $badge
            . '<button type="button" class="ecn-fp-heart" aria-pressed="false" aria-label="' . esc_attr('সেভ করুন: ' . $name) . '">' . econur_sf_icon('heart') . '</button></div>'
            . '<div class="ecn-fp-body">' . ($proof ? '<div class="ecn-fp-proof">' . $proof . '</div>' : '')
            . '<h3 class="ecn-fp-name"><a href="' . esc_url($link) . '">' . esc_html($name) . '</a></h3>'
            . '<div class="ecn-fp-foot"><div class="ecn-fp-price">' . $price . '</div>'
            . '<button type="button" class="ecn-fp-add" data-id="' . esc_attr($buy->get_id()) . '" data-url="' . esc_url($link) . '" data-name="' . esc_attr($name . ($size ? ' (' . $size . ')' : '')) . '" aria-label="' . esc_attr($label) . '">' . econur_sf_icon('bag') . econur_sf_icon('check') . '<span class="ecn-fp-add-txt econur-bn-cta" lang="bn">কার্টে যোগ করুন</span></button></div>'
            . '</div></article>';
    }

    $GLOBALS['econur_sf_js'] = true;
    return '<section class="ecn-fp" id="ecn-featured" aria-labelledby="ecn-fp-title">'
        . '<div class="ecn-sh ecn-fp-head"><div>' . (($eb = apply_filters('econur_fp_eyebrow', 'Natural care for everyday life')) ? '<p class="ecn-fp-eyebrow">' . esc_html($eb) . '</p>' : '') . '<h2 class="ecn-sh-title" id="ecn-fp-title">' . esc_html($o['fp_title']) . '</h2>' . ($o['fp_sub'] ? '<p class="ecn-sh-sub"' . econur_bn_attr($o['fp_sub']) . '>' . esc_html($o['fp_sub']) . '</p>' : '') . '</div>'
        . '<div class="ecn-fp-tools"><button type="button" class="ecn-fp-saved" aria-pressed="false" hidden>' . econur_sf_icon('heart') . '<span lang="bn">সেভ করা</span><b>0</b></button>'
        . '<button type="button" class="ecn-fp-nav" data-dir="-1" aria-label="Previous products">' . econur_sf_icon('left') . '</button><button type="button" class="ecn-fp-nav" data-dir="1" aria-label="Next products">' . econur_sf_icon('right') . '</button></div></div>'
        . '<div class="ecn-fp-track" tabindex="0" aria-label="' . esc_attr($o['fp_title']) . '">' . $cards . '</div>'
        . '<div class="ecn-fp-dots" aria-hidden="true"></div>'
        . '<p class="ecn-fp-empty" lang="bn" hidden>এখনও কিছু সেভ করা হয়নি। পরে দেখার জন্য বারের হার্ট আইকনে ট্যাপ করুন।</p>'
        . '</section>';
});

/* ------------------------------------------------------------------ front-end script */

add_action('wp_footer', function () {
    if (empty($GLOBALS['econur_sf_js'])) return;
    $cfg = array(
        'ajax'     => WC_AJAX::get_endpoint('add_to_cart'),
        'checkout' => wc_get_checkout_url(),
    );
    echo '<div class="ecn-toast" id="ecnFpToast" role="status" aria-live="polite" lang="bn" hidden><span></span><a href="' . esc_url($cfg['checkout']) . '">চেকআউট</a></div>';
    ?>
<script>(function(){
var CFG=<?php echo wp_json_encode($cfg); ?>;
function pad(n){return (n<10?'0':'')+n;}
/* countdown */
document.querySelectorAll('.ecn-sb[data-end]').forEach(function(sb){
  var end=parseInt(sb.getAttribute('data-end'),10)*1000; if(!end) return;
  var u={}; sb.querySelectorAll('.ecn-sb-u').forEach(function(x){u[x.getAttribute('data-u')]=x;});
  function tick(){
    var left=end-Date.now();
    if(left<=0){ if(sb.getAttribute('data-preview')!=='1'){ var w=sb.closest('.elementor-widget'); (w||sb).hidden=true; if(w) w.style.display='none'; } clearInterval(t); return; }
    var s=Math.floor(left/1000), d=Math.floor(s/86400), h=Math.floor(s%86400/3600), m=Math.floor(s%3600/60), sec=s%60;
    if(u.d){ u.d.hidden=d<1; u.d.querySelector('b').textContent=pad(d); }
    if(u.h) u.h.querySelector('b').textContent=pad(h);
    if(u.m) u.m.querySelector('b').textContent=pad(m);
    if(u.s) u.s.querySelector('b').textContent=pad(sec);
  }
  var t=setInterval(tick,1000); tick();
});
/* smooth scroll for in-page CTA */
document.querySelectorAll('.ecn-sb-cta[href^="#"]').forEach(function(a){ a.addEventListener('click',function(e){ var el=document.querySelector(a.getAttribute('href')); if(!el) return; e.preventDefault(); el.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}); }); });
/* toast */
var toast=document.getElementById('ecnFpToast'), th=null;
function showToast(msg,withLink){ if(!toast) return; toast.querySelector('span').textContent=msg; toast.querySelector('a').hidden=!withLink; toast.hidden=false; requestAnimationFrame(function(){toast.classList.add('is-on');}); clearTimeout(th); th=setTimeout(function(){ toast.classList.remove('is-on'); setTimeout(function(){toast.hidden=true;},250); },3200); }
/* featured */
document.querySelectorAll('.ecn-fp').forEach(function(fp){
  var track=fp.querySelector('.ecn-fp-track'), savedBtn=fp.querySelector('.ecn-fp-saved'), empty=fp.querySelector('.ecn-fp-empty'), filter=false, KEY='ecn_saved';
  function load(){ try{ var a=JSON.parse(localStorage.getItem(KEY)||'[]'); return Array.isArray(a)?a.map(String):[]; }catch(e){ return []; } }
  function save(a){ try{ localStorage.setItem(KEY,JSON.stringify(a)); }catch(e){} }
  function paint(){
    var saved=load(), n=0;
    fp.querySelectorAll('.ecn-fp-card').forEach(function(c){ var on=saved.indexOf(c.getAttribute('data-pid'))>-1, h=c.querySelector('.ecn-fp-heart'); if(on) n++; h.classList.toggle('is-on',on); h.setAttribute('aria-pressed',on?'true':'false'); c.hidden=filter && !on; });
    savedBtn.querySelector('b').textContent=n; savedBtn.hidden=!n && !filter; savedBtn.setAttribute('aria-pressed',filter?'true':'false'); savedBtn.classList.toggle('is-on',filter);
    empty.hidden=!(filter && !n);
    navState();
  }
  fp.querySelectorAll('.ecn-fp-heart').forEach(function(h){ h.addEventListener('click',function(){ var id=h.closest('.ecn-fp-card').getAttribute('data-pid'), a=load(), i=a.indexOf(id); if(i>-1){ a.splice(i,1); } else { a.push(id); showToast('সেভ হয়েছে। তালিকা দেখতে উপরের “সেভ করা” বাটনে ট্যাপ করুন।',false); } save(a); paint(); }); });
  savedBtn.addEventListener('click',function(){ filter=!filter; paint(); track.scrollLeft=0; });
  fp.querySelectorAll('.ecn-fp-nav').forEach(function(b){ b.addEventListener('click',function(){ var card=track.querySelector('.ecn-fp-card:not([hidden])'); var gap=parseFloat(getComputedStyle(track).columnGap)||16, step=card?card.getBoundingClientRect().width+gap:track.clientWidth*.8, per=Math.max(1,Math.round((track.clientWidth+gap)/step)); track.scrollBy({left:step*parseInt(b.getAttribute('data-dir'),10)*Math.min(2,per),behavior:'smooth'}); }); });
  var dots=fp.querySelector('.ecn-fp-dots');
  function dotState(){ if(!dots) return; var cs=[].slice.call(track.querySelectorAll('.ecn-fp-card:not([hidden])')); if(!cs.length){ dots.innerHTML=''; dots.hidden=true; return; } var gap=parseFloat(getComputedStyle(track).columnGap)||16, step=cs[0].getBoundingClientRect().width+gap, per=Math.max(1,Math.round((track.clientWidth+gap)/step)), n=Math.max(1,cs.length-per+1); if(dots.children.length!==n){ dots.innerHTML=new Array(n+1).join('<i></i>'); } var a=track.scrollLeft>=track.scrollWidth-track.clientWidth-2?n-1:Math.min(n-1,Math.round(track.scrollLeft/step)); [].forEach.call(dots.children,function(d,i){ d.classList.toggle('is-on',i===a); }); dots.hidden=n<2; }
  if(dots) dots.addEventListener('click',function(e){ var i=[].indexOf.call(dots.children,e.target), c=track.querySelector('.ecn-fp-card:not([hidden])'); if(i<0||!c) return; track.scrollTo({left:i*(c.getBoundingClientRect().width+(parseFloat(getComputedStyle(track).columnGap)||16)),behavior:'smooth'}); });
  function navState(){ var max=track.scrollWidth-track.clientWidth-2; fp.querySelectorAll('.ecn-fp-nav').forEach(function(b){ var dir=parseInt(b.getAttribute('data-dir'),10); b.disabled = dir<0 ? track.scrollLeft<=2 : track.scrollLeft>=max; }); dotState(); }
  track.addEventListener('scroll',navState,{passive:true}); window.addEventListener('resize',navState); window.addEventListener('load',navState); if('ResizeObserver' in window){ new ResizeObserver(function(){ navState(); }).observe(track); } navState();
  fp.querySelectorAll('.ecn-fp-add').forEach(function(b){ b.addEventListener('click',function(){
    if(b.classList.contains('is-busy')) return; b.classList.add('is-busy');
    var body=new URLSearchParams(); body.append('product_id',b.getAttribute('data-id')); body.append('quantity','1');
    fetch(CFG.ajax,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},body:body.toString()})
      .then(function(r){return r.json();})
      .then(function(res){
        b.classList.remove('is-busy');
        if(!res || res.error){ if(res && res.product_url){ window.location=res.product_url; } else { window.location=b.getAttribute('data-url'); } return; }
        if(res.fragments){ Object.keys(res.fragments).forEach(function(k){ document.querySelectorAll(k).forEach(function(el){ el.outerHTML=res.fragments[k]; }); }); if(window.jQuery){ window.jQuery(document.body).trigger('added_to_cart',[res.fragments,res.cart_hash]); } }
        b.classList.add('is-done'); setTimeout(function(){ b.classList.remove('is-done'); },1800);
        showToast(b.getAttribute('data-name')+' কার্টে যোগ হয়েছে',true);
      })
      .catch(function(){ b.classList.remove('is-busy'); window.location=b.getAttribute('data-url'); });
  }); });
  paint();
});
})();</script>
    <?php
}, 45);

/* ------------------------------------------------------------------ keep cached pages in step with sale dates */

function econur_sf_purge() {
    do_action('litespeed_purge_all');
}
add_action('wc_product_start_scheduled_sale', 'econur_sf_purge', 99);
add_action('wc_product_end_scheduled_sale', 'econur_sf_purge', 99);
add_action('woocommerce_scheduled_sales', 'econur_sf_purge', 99);

/* ------------------------------------------------------------------ admin: WooCommerce > Homepage sale */

add_action('admin_menu', function () {
    add_submenu_page('woocommerce', 'Homepage sale', 'Homepage sale', 'manage_woocommerce', 'econur-homepage-sale', 'econur_sf_admin_page');
}, 60);

function econur_sf_admin_page() {
    if (!current_user_can('manage_woocommerce')) return;
    $saved = false;
    if (isset($_POST['econur_sf_nonce'], $_POST['sf']) && is_array($_POST['sf']) && wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['econur_sf_nonce'])), 'econur_sf_save')) {
        $in = wp_unslash($_POST['sf']);
        $link = trim((string) ($in['cta_link'] ?? ''));
        $link = (0 === strpos($link, '#')) ? '#' . preg_replace('/[^A-Za-z0-9_-]/', '', substr($link, 1)) : esc_url_raw($link);
        $end = trim((string) ($in['end'] ?? ''));
        if ($end && !DateTime::createFromFormat('Y-m-d\TH:i', $end, wp_timezone())) $end = '';
        $mode = in_array($in['mode'] ?? '', array('auto', 'always', 'off'), true) ? $in['mode'] : 'auto';
        update_option('econur_sale_featured', array(
            'mode'     => $mode,
            'eyebrow'  => sanitize_text_field($in['eyebrow'] ?? ''),
            'headline' => sanitize_text_field($in['headline'] ?? ''),
            'text'     => sanitize_text_field($in['text'] ?? ''),
            'cta_text' => sanitize_text_field($in['cta_text'] ?? '') ?: 'অফারের পণ্য দেখুন',
            'cta_link' => $link ?: '#ecn-featured',
            'end'      => $end,
            'fp_title' => sanitize_text_field($in['fp_title'] ?? '') ?: 'Featured products',
            'fp_sub'   => sanitize_text_field($in['fp_sub'] ?? ''),
            'fp_limit' => max(1, min(24, (int) ($in['fp_limit'] ?? 8))),
        ), false);
        econur_sf_purge();
        $saved = true;
    }
    $o = econur_sf_opts();
    $d = econur_sf_sale_data();
    $end = econur_sf_end_ts($o, $d);
    $featured = wc_get_products(array('status' => 'publish', 'featured' => true, 'limit' => 50, 'return' => 'objects'));
    ?>
    <div class="wrap">
      <h1>Homepage sale &amp; featured products</h1>
      <?php if ($saved) : ?><div class="notice notice-success is-dismissible"><p>Saved. The homepage cache was cleared.</p></div><?php endif; ?>

      <div class="card" style="max-width:820px">
        <h2 style="margin-top:0">Right now</h2>
        <?php if ($d['items']) : ?>
          <p><strong style="color:#0D585F">Sale banner is LIVE.</strong> <?php echo esc_html(count($d['parents'])); ?> product(s) on sale, up to <?php echo esc_html($d['max']); ?>% off<?php echo $end ? ', ends ' . esc_html(wp_date('D, j M Y, g:i a', $end)) : ', no end date set (no countdown)'; ?>.</p>
          <ul style="list-style:disc;padding-left:20px">
            <?php foreach ($d['items'] as $it) { $ip = wc_get_product($it['id']); echo '<li>' . esc_html($ip->get_name()) . ': ' . esc_html($it['pct']) . '% off' . ($it['end'] ? ', until ' . esc_html(wp_date('j M Y', $it['end'])) : '') . '</li>'; } ?>
          </ul>
        <?php elseif ('always' === $o['mode'] && trim($o['headline'])) : ?>
          <p><strong style="color:#0D585F">Sale banner is LIVE</strong> (Always show) with your own headline.</p>
        <?php else : ?>
          <p><strong>Sale banner is hidden from customers.</strong> No product has an active sale price. It appears on its own as soon as one does. While you are logged in you see a preview on the homepage.</p>
        <?php endif; ?>
        <p><strong>Featured products section:</strong> <?php echo $featured ? 'showing your starred products: ' . esc_html(implode(', ', array_map(function ($p) { return $p->get_name(); }, $featured))) . '.' : 'no products are starred, so it shows every product that can be bought.'; ?> <a href="<?php echo esc_url(admin_url('edit.php?post_type=product')); ?>">Change in Products</a></p>
      </div>

      <form method="post" style="max-width:820px">
        <?php wp_nonce_field('econur_sf_save', 'econur_sf_nonce'); ?>
        <h2>Sale banner</h2>
        <table class="form-table" role="presentation">
          <tr><th scope="row">Show the banner</th><td>
            <label><input type="radio" name="sf[mode]" value="auto" <?php checked($o['mode'], 'auto'); ?>> Automatic: only while products have a sale price (recommended)</label><br>
            <label><input type="radio" name="sf[mode]" value="always" <?php checked($o['mode'], 'always'); ?>> Always: for coupon offers (write your own headline below)</label><br>
            <label><input type="radio" name="sf[mode]" value="off" <?php checked($o['mode'], 'off'); ?>> Hide</label>
          </td></tr>
          <tr><th scope="row"><label for="sf-eyebrow">Small top line</label></th><td><input class="regular-text" id="sf-eyebrow" name="sf[eyebrow]" value="<?php echo esc_attr($o['eyebrow']); ?>" placeholder="Limited-time offer"><p class="description">For example: Eid Sale is live</p></td></tr>
          <tr><th scope="row"><label for="sf-headline">Headline</label></th><td><input class="regular-text" id="sf-headline" name="sf[headline]" value="<?php echo esc_attr($o['headline']); ?>" placeholder="Leave empty to write it from your sale prices"><p class="description">Leave empty and it writes "Flat 20% OFF" or "Up to 20% OFF" from the real sale prices.</p></td></tr>
          <tr><th scope="row"><label for="sf-text">Short description</label></th><td><input class="large-text" id="sf-text" name="sf[text]" value="<?php echo esc_attr($o['text']); ?>" placeholder="Leave empty to write it automatically"></td></tr>
          <tr><th scope="row"><label for="sf-cta">Button text</label></th><td><input class="regular-text" id="sf-cta" name="sf[cta_text]" value="<?php echo esc_attr($o['cta_text']); ?>"></td></tr>
          <tr><th scope="row"><label for="sf-link">Button link</label></th><td><input class="regular-text" id="sf-link" name="sf[cta_link]" value="<?php echo esc_attr($o['cta_link']); ?>"><p class="description">#ecn-featured scrolls to the featured products just below (sale items come first). You can also paste any page link.</p></td></tr>
          <tr><th scope="row"><label for="sf-end">Countdown end (optional)</label></th><td><input type="datetime-local" id="sf-end" name="sf[end]" value="<?php echo esc_attr($o['end']); ?>"><p class="description">Leave empty to count down to the product sale end date. Time zone: <?php echo esc_html(wp_timezone_string()); ?>. When the time runs out the banner disappears.</p></td></tr>
        </table>
        <h2>Featured products</h2>
        <table class="form-table" role="presentation">
          <tr><th scope="row"><label for="sf-fpt">Section title</label></th><td><input class="regular-text" id="sf-fpt" name="sf[fp_title]" value="<?php echo esc_attr($o['fp_title']); ?>"></td></tr>
          <tr><th scope="row"><label for="sf-fps">Subtitle</label></th><td><input class="large-text" id="sf-fps" name="sf[fp_sub]" value="<?php echo esc_attr($o['fp_sub']); ?>"></td></tr>
          <tr><th scope="row"><label for="sf-fpl">How many products</label></th><td><input type="number" min="1" max="24" id="sf-fpl" name="sf[fp_limit]" value="<?php echo esc_attr($o['fp_limit']); ?>" style="width:80px"></td></tr>
        </table>
        <p class="submit"><button type="submit" class="button button-primary">Save changes</button></p>
      </form>
    </div>
    <?php
}