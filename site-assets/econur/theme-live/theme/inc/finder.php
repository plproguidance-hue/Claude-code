<?php
/**
 * Econur "Find your bar" concern finder. [econur_finder]
 * Pick a skin concern, see the matching bar. Title, price, photo, link and ingredients come from WooCommerce;
 * the reassurance row under it is the existing [econur_trust] block (econur_trust_html in inc/trust.php).
 * Edit the concerns in econur_finder_concerns().
 */
defined('ABSPATH') || exit;

/**
 * Concern list: shopping guidance only, no treatment claims.
 * product = WooCommerce product ID, thumb = media ID of the round ingredient photo,
 * label = full name (desktop), tab = short name (phone tabs), line = one-line note, badge = pill on the photo,
 * chips = which of the product's own highlight titles (econur_highlights) to show; only ones its description supports.
 */
function econur_finder_concerns() {
    return array(
        array('key' => 'oily',      'product' => 14, 'thumb' => 141, 'label' => 'Oily / acne-prone skin',            'tab' => 'Oily skin',      'line' => 'Deep cleansing that feels clean, never tight.',  'badge' => 'Best for oily / acne-prone skin',            'chips' => array('Deep Cleansing', 'Made for Oily Skin')),
        array('key' => 'tone',      'product' => 18, 'thumb' => 142, 'label' => 'Dark spots / uneven-looking tone',  'tab' => 'Uneven tone',    'line' => 'A gentle daily bar for an uneven-looking tone.',  'badge' => 'Best for an uneven-looking tone',            'chips' => array('Gentle Brightening', 'Made for Normal to Combination Skin')),
        array('key' => 'dull',      'product' => 22, 'thumb' => 143, 'label' => 'Dull / congested-feeling skin',     'tab' => 'Dull skin',      'line' => 'Coffee-ground exfoliation for dull-looking skin.', 'badge' => 'Best for dull / congested-feeling skin',     'chips' => array('Two-Way Exfoliation', 'Smoother-Looking Texture', 'Soft Finish')),
        array('key' => 'daily',     'product' => 26, 'thumb' => 144, 'label' => 'Daily cleanse',                     'tab' => 'Daily cleanse',  'line' => 'Herbal cleansing for daily use.',                  'badge' => 'Best for a daily cleanse',                   'chips' => array('Herbal Deep Cleanse', 'Gentle Exfoliation', 'Nourishing, Not Stripping')),
        array('key' => 'sensitive', 'product' => 30, 'thumb' => 145, 'label' => 'Very dry / sensitive-feeling skin', 'tab' => 'Sensitive skin', 'line' => 'Ultra-mild and fragrance-free.',                   'badge' => 'Best for very dry / sensitive-feeling skin', 'chips' => array('Ultra-Mild Formula', 'Gentle for Little Ones', 'Soft, Never Tight')),
    );
}

function econur_finder_icon($n) {
    $i = array(
        'arrow' => '<path d="m9 6 6 6-6 6"/>',
        'go'    => '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
        'leaf'  => '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
    );
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . $i[$n] . '</svg>';
}

// "Neem|Activated Charcoal|Tea Tree EO" -> "Neem, activated charcoal and tea tree EO."
function econur_finder_ingredients($pid) {
    $parts = array_values(array_filter(array_map('trim', explode('|', (string) get_post_meta($pid, 'econur_key_ingredients', true)))));
    if (!$parts) return '';
    $last = array_pop($parts);
    return econur_finder_sentence(($parts ? implode(', ', $parts) . ' and ' . $last : $last) . '.');
}

// Sentence case that keeps acronyms: "Made for Oily Skin" -> "Made for oily skin", "Two-Way" -> "Two-way", "Tea Tree EO" stays "EO".
function econur_finder_sentence($s) {
    $w = explode(' ', $s);
    foreach ($w as $n => $x) {
        $parts = explode('-', $x);
        foreach ($parts as $i => $pt) if (($n > 0 || $i > 0) && $pt !== strtoupper($pt)) $parts[$i] = lcfirst($pt);
        $w[$n] = implode('-', $parts);
    }
    return implode(' ', $w);
}

// The product's own highlight titles ("Title::Text|Title::Text") that the concern lists in 'chips', in product order.
// A title that is no longer on the product is simply not shown.
function econur_finder_highlights($pid, $allow) {
    $allow = array_map('strtolower', (array) $allow); $out = array();
    foreach (explode('|', (string) get_post_meta($pid, 'econur_highlights', true)) as $h) {
        $t = trim(strtok($h, ':'));
        if ($t !== '' && in_array(strtolower($t), $allow, true)) $out[] = econur_finder_sentence($t);
    }
    return array_slice($out, 0, 3);
}

add_shortcode('econur_finder', function () {
    $sale_ids = function_exists('econur_sf_sale_data') ? array_map(function ($i) { return (int) $i['id']; }, econur_sf_sale_data()['items']) : array();
    $sizes = '(min-width: 1180px) 680px, (min-width: 900px) 58vw, (min-width: 600px) 46vw, 100vw';
    $tabs = ''; $panels = ''; $n = 0;

    foreach (econur_finder_concerns() as $c) {
        $p = wc_get_product($c['product']);
        if (!$p || 'publish' !== $p->get_status()) continue;
        $buy = $p->is_type('variable') && function_exists('econur_sf_pick_variation') ? econur_sf_pick_variation($p, $sale_ids) : $p;
        $name = $p->get_name(); $link = get_permalink($p->get_id()); $on = ($n === 0); $k = sanitize_key($c['key']);

        if ($buy) {
            $sale = $buy->is_on_sale() && (float) $buy->get_regular_price() > (float) $buy->get_price();
            $size = $buy->is_type('variation') ? $buy->get_attribute('pa_size') : '';
            $price = '<b>' . wp_kses_post(wc_price($buy->get_price())) . '</b>' . ($sale ? '<s>' . wp_kses_post(wc_price($buy->get_regular_price())) . '</s>' : '') . ($size ? '<small>' . esc_html($size) . '</small>' : '');
        } else {
            $price = '<b>' . wp_kses_post($p->get_price_html()) . '</b>';
        }

        $img_id = (int) get_post_meta($p->get_id(), 'econur_home_card_image', true);
        $attr = array('loading' => 'lazy', 'decoding' => 'async', 'sizes' => $sizes, 'alt' => $name);
        if ($img_id && wp_attachment_is_image($img_id)) {
            $focus = (string) get_post_meta($p->get_id(), 'econur_home_card_focus', true);
            if (preg_match('/^\d{1,3}% \d{1,3}%$/', $focus)) $attr['style'] = 'object-position:' . $focus;
        } else {
            $img_id = (int) $p->get_image_id();
        }
        $img = $img_id ? str_replace('sizes="auto, ', 'sizes="', wp_get_attachment_image($img_id, 'large', false, $attr)) : '';
        $thumb = $c['thumb'] ? wp_get_attachment_image((int) $c['thumb'], 'thumbnail', false, array('class' => 'ecn-fy-thumb', 'alt' => '', 'loading' => 'lazy', 'decoding' => 'async')) : '';

        $attrs = '';
        foreach (econur_finder_highlights($p->get_id(), $c['chips'] ?? array()) as $h) $attrs .= '<li>' . econur_finder_icon('leaf') . '<span>' . esc_html($h) . '</span></li>';
        $ing = econur_finder_ingredients($p->get_id());

        $tabs .= '<button type="button" class="ecn-fy-tab' . ($on ? ' is-on' : '') . '" role="tab" id="ecn-fy-tab-' . $k . '" aria-controls="ecn-fy-panel-' . $k . '" aria-selected="' . ($on ? 'true' : 'false') . '" tabindex="' . ($on ? '0' : '-1') . '">'
            . $thumb
            . '<span class="ecn-fy-tab-copy"><b><span class="ecn-fy-full">' . esc_html($c['label']) . '</span><span class="ecn-fy-short">' . esc_html($c['tab']) . '</span></b><small>' . esc_html($c['line']) . '</small></span>'
            . '<span class="ecn-fy-tab-go">' . econur_finder_icon('arrow') . '</span></button>';

        $panels .= '<article class="ecn-fy-panel" role="tabpanel" id="ecn-fy-panel-' . $k . '" aria-labelledby="ecn-fy-tab-' . $k . '"' . ($on ? '' : ' hidden') . '>'
            . '<div class="ecn-fy-media"><a class="ecn-fy-img" href="' . esc_url($link) . '" tabindex="-1" aria-hidden="true">' . $img . '</a>'
            . '<span class="ecn-fy-badge">' . econur_finder_icon('leaf') . esc_html($c['badge']) . '</span></div>'
            . '<div class="ecn-fy-body"><h3 class="ecn-fy-name"><a href="' . esc_url($link) . '">' . esc_html($name) . '</a></h3>'
            . ($ing ? '<p class="ecn-fy-ing">' . esc_html($ing) . '</p>' : '')
            . ($attrs ? '<ul class="ecn-fy-attrs">' . $attrs . '</ul>' : '')
            . '<div class="ecn-fy-foot"><div class="ecn-fy-price">' . $price . '</div>'
            . '<a class="ecn-fy-cta" href="' . esc_url($link) . '"><span lang="bn" class="econur-bn-cta">পণ্যটি দেখুন</span><span class="screen-reader-text">: ' . esc_html($name) . '</span> ' . econur_finder_icon('go') . '</a></div>'
            . '</div></article>';
        $n++;
    }
    if (!$n) return '';

    $GLOBALS['econur_finder_js'] = true;
    return '<section class="ecn-fy" aria-labelledby="ecn-fy-title">'
        . '<div class="ecn-fy-head"><p class="ecn-fy-eyebrow">Shop by concern</p><h2 class="ecn-fy-title" id="ecn-fy-title">Find your bar</h2><p class="ecn-fy-sub" lang="bn">আপনার ত্বকের প্রয়োজন অনুযায়ী সঠিক বারটি বেছে নিন।</p></div>'
        . '<div class="ecn-fy-tabs" role="tablist" aria-label="Skin concerns">' . $tabs . '</div>'
        . '<div class="ecn-fy-panels">' . $panels . '</div>'
        . (function_exists('econur_trust_html') ? '<div class="ecn-fy-trust">' . econur_trust_html() . '</div>' : '')
        . '</section>';
});

add_action('wp_footer', function () {
    if (empty($GLOBALS['econur_finder_js'])) return;
    ?>
<script>(function(){
document.querySelectorAll('.ecn-fy').forEach(function(fy){
  var tabs=[].slice.call(fy.querySelectorAll('[role="tab"]')), row=fy.querySelector('.ecn-fy-tabs');
  function select(t,focus){
    tabs.forEach(function(x){
      var on=(x===t), p=document.getElementById(x.getAttribute('aria-controls'));
      x.setAttribute('aria-selected',on?'true':'false'); x.tabIndex=on?0:-1; x.classList.toggle('is-on',on);
      if(!p) return;
      if(on){ if(p.hidden){ p.hidden=false; p.classList.remove('is-in'); void p.offsetWidth; p.classList.add('is-in'); } } else { p.hidden=true; }
    });
    if(focus) t.focus({preventScroll:true});
    if(row && row.scrollWidth>row.clientWidth+2){ row.scrollTo({left:Math.max(0,t.offsetLeft-(row.clientWidth-t.offsetWidth)/2),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}); }
  }
  tabs.forEach(function(t,i){
    t.addEventListener('click',function(){ select(t,false); });
    t.addEventListener('keydown',function(e){
      var n=null;
      if(e.key==='ArrowRight'||e.key==='ArrowDown') n=tabs[(i+1)%tabs.length];
      else if(e.key==='ArrowLeft'||e.key==='ArrowUp') n=tabs[(i-1+tabs.length)%tabs.length];
      else if(e.key==='Home') n=tabs[0];
      else if(e.key==='End') n=tabs[tabs.length-1];
      if(n){ e.preventDefault(); select(n,true); }
    });
  });
});
})();</script>
    <?php
}, 46);
