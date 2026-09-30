<?php
/**
 * Review requests after delivery: WhatsApp / SMS buttons on completed orders, a review line in the
 * "Completed order" email, and a direct link to each product's review form (product URL + #reviews).
 */
defined('ABSPATH') || exit;

/* ---------- messages ---------- */

// {name}, {products} and {links} are filled per order. Bangla is the default language.
function enr_rr_messages() {
    return apply_filters('econur_review_request_messages', array(
        'bn' => array(
            'label'    => 'বাংলা',
            'greeting' => 'প্রিয় {name},',
            'anon'     => 'প্রিয় গ্রাহক,',
            'body'     => "ECONUR থেকে অর্ডার করার জন্য অনেক ধন্যবাদ! আশা করি {products} আপনার ভালো লাগছে।\nএক মিনিট সময় নিয়ে একটি রিভিউ দিলে আমরা খুব খুশি হব:\n{links}\nরিভিউ দেওয়ার সময় অর্ডারে যে ইমেইলটি ব্যবহার করেছিলেন সেটিই দিন, তাহলে আপনার রিভিউটি যাচাইকৃত ক্রেতার (verified owner) রিভিউ হিসেবে দেখাবে।\nধন্যবাদ,\nECONUR",
            'and'      => ' ও ',
            'email'    => "আপনার অর্ডারটি কেমন লাগলো? একটি রিভিউ দিয়ে জানালে আমরা খুব খুশি হব। অর্ডারে যে ইমেইলটি ব্যবহার করেছিলেন সেটিই দিন, তাহলে রিভিউটি যাচাইকৃত ক্রেতার (verified owner) রিভিউ হিসেবে দেখাবে।",
        ),
        'en' => array(
            'label'    => 'English',
            'greeting' => 'Hi {name},',
            'anon'     => 'Hi there,',
            'body'     => "Thank you for ordering from ECONUR! We hope you're enjoying your {products}.\nCould you spare a minute to leave a review?\n{links}\nPlease use the same email you ordered with, so your review shows as a verified purchase (\"verified owner\").\nThank you,\nECONUR",
            'and'      => ' and ',
            'email'    => "How are you finding your order? We'd love a quick review. Please use the same email you ordered with, so your review shows as a verified purchase (\"verified owner\").",
        ),
    ));
}

// Published products in the order (variations resolved to their parent), each with its review-form link.
function enr_rr_products($order) {
    $out = array();
    foreach ($order->get_items() as $item) {
        $pid = (int) $item->get_product_id();
        if (!$pid || isset($out[$pid])) continue;
        $p = wc_get_product($pid);
        if (!$p || 'publish' !== $p->get_status()) continue;
        $out[$pid] = array('name' => $p->get_name(), 'link' => get_permalink($pid) . '#reviews');
    }
    return array_values($out);
}

function enr_rr_join($names, $and) {
    if (count($names) < 2) return (string) reset($names);
    $last = array_pop($names);
    return implode(', ', $names) . $and . $last;
}

function enr_rr_message($order, $lang) {
    $m = enr_rr_messages(); $m = $m[$lang] ?? $m['bn'];
    $products = enr_rr_products($order);
    if (!$products) return '';
    $name = trim(wp_strip_all_tags($order->get_billing_first_name()));
    $links = implode("\n", array_map(function ($p) { return $p['name'] . ': ' . $p['link']; }, $products));
    $body = strtr($m['body'], array('{products}' => enr_rr_join(wp_list_pluck($products, 'name'), $m['and']), '{links}' => $links));
    return ($name !== '' ? str_replace('{name}', $name, $m['greeting']) : $m['anon']) . "\n" . $body;
}

/* ---------- phone numbers ---------- */

// Bangladeshi mobile number in international form without "+" (8801XXXXXXXXX), or '' when it isn't one.
function enr_rr_bd_mobile($raw) {
    $d = preg_replace('/\D+/', '', (string) $raw);
    if (strpos($d, '00880') === 0) $d = substr($d, 2);
    if (preg_match('/^01[3-9]\d{8}$/', $d)) $d = '88' . $d;
    elseif (preg_match('/^1[3-9]\d{8}$/', $d)) $d = '880' . $d;
    return preg_match('/^8801[3-9]\d{8}$/', $d) ? $d : '';
}

/* ---------- order screen ---------- */

function enr_rr_order_screen() {
    $hpos = class_exists('\Automattic\WooCommerce\Internal\DataStores\Orders\CustomOrdersTableController')
        && wc_get_container()->get(\Automattic\WooCommerce\Internal\DataStores\Orders\CustomOrdersTableController::class)->custom_orders_table_usage_is_enabled();
    return $hpos ? wc_get_page_screen_id('shop-order') : 'shop_order';
}

add_action('add_meta_boxes', function ($screen_id, $object = null) {
    if ($screen_id !== enr_rr_order_screen()) return;
    $order = $object instanceof WC_Order ? $object : ($object instanceof WP_Post ? wc_get_order($object->ID) : null);
    if (!$order || !$order->has_status('completed')) return; // only once the order is delivered and marked Completed
    add_meta_box('enr-review-request', 'Ask for a review', 'enr_rr_metabox', $screen_id, 'side', 'high');
}, 30, 2);

function enr_rr_log($order) {
    $log = $order->get_meta('_enr_review_requests');
    return is_array($log) ? $log : array();
}

function enr_rr_method_label($m) { return 'sms' === $m ? 'SMS' : 'WhatsApp'; }

function enr_rr_metabox($object) {
    $order = $object instanceof WC_Order ? $object : wc_get_order($object->ID);
    if (!$order) return;
    $phone = enr_rr_bd_mobile($order->get_billing_phone());
    $langs = enr_rr_messages();
    $links = array();
    foreach ($langs as $code => $l) {
        $text = enr_rr_message($order, $code);
        $links[$code] = array('wa' => 'https://wa.me/' . $phone . '?text=' . rawurlencode($text), 'sms' => 'sms:+' . $phone . '?&body=' . rawurlencode($text), 'text' => $text);
    }
    $log = enr_rr_log($order);
    echo '<div class="enr-rr" data-order="' . esc_attr($order->get_id()) . '" data-nonce="' . esc_attr(wp_create_nonce('enr_rr_' . $order->get_id())) . '">';
    if (!enr_rr_products($order)) {
        echo '<p class="enr-rr-note is-warn">No published product in this order to review.</p></div>';
        return;
    }
    if ('' === $phone) {
        $raw = trim($order->get_billing_phone());
        echo '<p class="enr-rr-note is-warn"><strong>No valid Bangladeshi mobile number on this order.</strong><br>'
            . ($raw === '' ? 'The billing phone is empty.' : 'The billing phone "' . esc_html($raw) . '" is not a valid Bangladeshi mobile number (01XXXXXXXXX).')
            . ' Edit the billing phone above to enable WhatsApp and SMS.</p></div>';
        return;
    }
    echo '<p class="enr-rr-to">To <strong>+' . esc_html($phone) . '</strong></p>';
    echo '<fieldset class="enr-rr-lang"><legend>Message language</legend>';
    $first = true;
    foreach ($langs as $code => $l) {
        echo '<label><input type="radio" name="enr_rr_lang" value="' . esc_attr($code) . '"' . ($first ? ' checked' : '') . '> ' . esc_html($l['label']) . '</label>';
        $first = false;
    }
    echo '</fieldset>';
    echo '<a class="button button-primary enr-rr-btn" data-method="whatsapp" target="_blank" rel="noopener" href="' . esc_url($links['bn']['wa'], array('https')) . '">Ask for a review – WhatsApp</a>';
    echo '<a class="button enr-rr-btn" data-method="sms" href="' . esc_url($links['bn']['sms'], array('sms')) . '">Ask for a review – SMS</a>';
    echo '<details class="enr-rr-preview"><summary>Preview message</summary><pre>' . esc_html($links['bn']['text']) . '</pre></details>';
    echo '<ul class="enr-rr-log">';
    foreach (array_reverse($log) as $e) echo '<li>' . esc_html(enr_rr_log_line($e)) . '</li>';
    echo '</ul>';
    echo '<script type="application/json" class="enr-rr-data">' . wp_json_encode($links) . '</script></div>';
}

function enr_rr_log_line($e) {
    $u = get_userdata((int) $e['user']);
    return sprintf('Sent via %s (%s), %s by %s', enr_rr_method_label($e['method']), 'en' === $e['lang'] ? 'English' : 'বাংলা',
        wp_date(get_option('date_format') . ' ' . get_option('time_format'), (int) $e['time']), $u ? $u->display_name : 'unknown user');
}

add_action('admin_footer', function () {
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->id !== enr_rr_order_screen()) return;
    ?>
<style>
.enr-rr .button.enr-rr-btn{ display:flex; align-items:center; justify-content:center; width:100%; min-height:44px; margin:0 0 8px; font-size:14px; white-space:normal; text-align:center; }
.enr-rr-to{ margin:0 0 8px; }
.enr-rr-lang{ display:flex; gap:16px; margin:0 0 10px; }
.enr-rr-lang legend{ margin-bottom:4px; font-weight:600; }
.enr-rr-lang label{ display:inline-flex; align-items:center; gap:4px; min-height:32px; }
.enr-rr-note{ margin:0; padding:8px 10px; border-left:4px solid #dba617; background:#fcf9e8; }
.enr-rr-preview pre{ white-space:pre-wrap; word-break:break-word; max-height:220px; overflow:auto; padding:8px; background:#f6f7f7; font-size:12px; }
.enr-rr-log{ margin:8px 0 0; color:#50575e; }
.enr-rr-log li{ margin:0 0 4px; padding-left:18px; position:relative; }
.enr-rr-log li::before{ content:"✓"; position:absolute; left:0; color:#008a20; }
</style>
<script>
(function(){
  var box=document.querySelector('.enr-rr'); if(!box || !box.querySelector('.enr-rr-data')) return;
  var data=JSON.parse(box.querySelector('.enr-rr-data').textContent), wa=box.querySelector('[data-method="whatsapp"]'), sms=box.querySelector('[data-method="sms"]'), pre=box.querySelector('.enr-rr-preview pre'), log=box.querySelector('.enr-rr-log');
  function lang(){ var r=box.querySelector('input[name="enr_rr_lang"]:checked'); return r ? r.value : 'bn'; }
  box.querySelectorAll('input[name="enr_rr_lang"]').forEach(function(r){ r.addEventListener('change',function(){ var d=data[lang()]; wa.href=d.wa; sms.href=d.sms; pre.textContent=d.text; }); });
  [wa,sms].forEach(function(a){ a.addEventListener('click',function(e){
    if(log.children.length && !window.confirm('A review request was already sent for this order ('+log.firstElementChild.textContent+'). Send another one?')){ e.preventDefault(); return; }
    var f=new FormData(); f.append('action','enr_rr_log'); f.append('order_id',box.dataset.order); f.append('nonce',box.dataset.nonce); f.append('method',a.dataset.method); f.append('lang',lang());
    fetch(window.ajaxurl||'/wp-admin/admin-ajax.php',{method:'POST',body:f,credentials:'same-origin',keepalive:true}).then(function(r){return r.json();}).then(function(j){ if(j && j.success){ var li=document.createElement('li'); li.textContent=j.data.line; log.insertBefore(li,log.firstChild); } }).catch(function(){});
  }); });
})();
</script>
    <?php
});

// Records each request on the order (order note + meta) so staff can see it was already sent.
add_action('wp_ajax_enr_rr_log', function () {
    $id = absint($_POST['order_id'] ?? 0);
    check_ajax_referer('enr_rr_' . $id, 'nonce');
    $order = wc_get_order($id);
    if (!$order || !current_user_can('edit_shop_orders')) wp_send_json_error(null, 403);
    $method = 'sms' === ($_POST['method'] ?? '') ? 'sms' : 'whatsapp';
    $lang = 'en' === ($_POST['lang'] ?? '') ? 'en' : 'bn';
    $entry = array('time' => time(), 'method' => $method, 'lang' => $lang, 'user' => get_current_user_id());
    $log = enr_rr_log($order); $log[] = $entry;
    $order->update_meta_data('_enr_review_requests', $log);
    $order->add_order_note(sprintf('Review request opened for sending via %s (%s) to +%s.', enr_rr_method_label($method), 'en' === $lang ? 'English' : 'Bangla', enr_rr_bd_mobile($order->get_billing_phone())), 0, true);
    $order->save();
    wp_send_json_success(array('line' => enr_rr_log_line($entry)));
});

/* ---------- "Completed order" email ---------- */

// Off until the wording is approved: update_option('econur_reviews_email_line', 'yes') turns it on.
add_action('woocommerce_email_after_order_table', 'enr_rr_email_line', 15, 4);
function enr_rr_email_line($order, $sent_to_admin, $plain_text, $email, $force = false) {
    if ($sent_to_admin || !$email || 'customer_completed_order' !== $email->id || !$order instanceof WC_Order) return;
    if (!$force && 'yes' !== get_option('econur_reviews_email_line')) return;
    $products = enr_rr_products($order);
    if (!$products) return;
    $m = enr_rr_messages();
    if ($plain_text) {
        echo "\n----------------------------------------\n" . $m['bn']['email'] . "\n" . $m['en']['email'] . "\n";
        foreach ($products as $p) echo $p['name'] . ': ' . $p['link'] . "\n";
        return;
    }
    echo '<div class="enr-rr-email" style="margin:0 0 32px;padding:16px 18px;border:1px solid #e5e5e5;border-radius:6px;">'
        . '<p style="margin:0 0 8px;">' . esc_html($m['bn']['email']) . '</p>'
        . '<p style="margin:0 0 12px;">' . esc_html($m['en']['email']) . '</p><ul style="margin:0;padding-left:18px;">';
    foreach ($products as $p) echo '<li style="margin:0 0 6px;"><a href="' . esc_url($p['link']) . '">' . esc_html($p['name']) . '</a></li>';
    echo '</ul></div>';
}

/* ---------- test addresses ---------- */

// Orders and reviews using the reserved, undeliverable ".invalid" domain (used for tests) never trigger store emails
// or moderation notices.
function enr_rr_is_test_email($email) { return (bool) preg_match('/@[^@]+\.invalid$/i', (string) $email); }
add_action('init', function () {
    foreach (array('new_order', 'cancelled_order', 'failed_order', 'customer_on_hold_order', 'customer_processing_order', 'customer_completed_order', 'customer_refunded_order', 'customer_invoice', 'customer_note') as $id) {
        add_filter('woocommerce_email_enabled_' . $id, function ($on, $order = null) {
            return ($order instanceof WC_Order && enr_rr_is_test_email($order->get_billing_email())) ? false : $on;
        }, 99, 2);
    }
});
foreach (array('notify_moderator', 'notify_post_author') as $f) {
    add_filter($f, function ($on, $comment_id) { $c = get_comment($comment_id); return ($c && enr_rr_is_test_email($c->comment_author_email)) ? false : $on; }, 99, 2);
}
