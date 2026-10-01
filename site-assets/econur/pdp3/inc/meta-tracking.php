<?php
/**
 * Econur Meta Pixel + Conversions API (Settings > Meta Pixel). Off until a Pixel ID is saved.
 *
 * Browser (Pixel): PageView everywhere; ViewContent on product pages; AddToCart from the product page and from
 * WooCommerce's own add-to-cart buttons; InitiateCheckout on the checkout page; Purchase once per order on the
 * thank-you page. Optional custom events from the product page: PackSelected, SizeSelected, WhatsAppClick,
 * BundleAddToCart.
 * AddToCart from the product page's own form (Add to Cart and Buy Now) is confirmed by WooCommerce first: when the
 * item is really in the cart the server sends the Conversions API event and leaves a short-lived cookie with the same
 * event_id, and the next page (product page again, or checkout for Buy Now) fires the browser event from it. A failed
 * add sends nothing.
 * Server (Conversions API, only when an access token is saved): the same standard events with the same event_id,
 * so Meta de-duplicates them. Event IDs are made in the browser (pages are cached, so they cannot be baked into
 * the HTML) and relayed through admin-ajax; Purchase is sent from the server when the order is first shown.
 */
defined('ABSPATH') || exit;

const ECONUR_META_API = 'https://graph.facebook.com/v21.0/';

function econur_meta_pixel_id() { $v = preg_replace('/\D/', '', (string) get_option('econur_meta_pixel_id', '')); return strlen($v) >= 10 ? $v : ''; }
function econur_meta_token() { return trim((string) get_option('econur_meta_capi_token', '')); }

/* ---------- settings page ---------- */

add_action('admin_menu', function () {
    add_options_page('Meta Pixel', 'Meta Pixel', 'manage_options', 'econur-meta', function () {
        if (!current_user_can('manage_options')) return;
        if (isset($_POST['econur_meta_save']) && check_admin_referer('econur_meta')) {
            update_option('econur_meta_pixel_id', preg_replace('/\D/', '', wp_unslash($_POST['econur_meta_pixel_id'] ?? '')));
            update_option('econur_meta_capi_token', sanitize_text_field(wp_unslash($_POST['econur_meta_capi_token'] ?? '')), false);
            update_option('econur_meta_test_code', sanitize_text_field(wp_unslash($_POST['econur_meta_test_code'] ?? '')), false);
            do_action('litespeed_purge_all');
            echo '<div class="notice notice-success"><p>Saved. Page cache cleared.</p></div>';
        }
        $on = econur_meta_pixel_id() !== '';
        echo '<div class="wrap"><h1>Meta Pixel</h1><p>Tracks PageView, ViewContent, AddToCart, InitiateCheckout and Purchase for Meta ads. '
            . ($on ? '<strong style="color:#00733a">Active.</strong>' : '<strong>Off: add your Pixel ID to turn it on.</strong>') . '</p>'
            . '<form method="post">' . wp_nonce_field('econur_meta', '_wpnonce', true, false) . '<table class="form-table">'
            . '<tr><th><label for="econur_meta_pixel_id">Pixel ID</label></th><td><input class="regular-text" id="econur_meta_pixel_id" name="econur_meta_pixel_id" value="' . esc_attr(get_option('econur_meta_pixel_id', '')) . '"><p class="description">Events Manager > Data sources > your pixel (numbers only).</p></td></tr>'
            . '<tr><th><label for="econur_meta_capi_token">Conversions API access token</label></th><td><input class="regular-text" type="password" autocomplete="off" id="econur_meta_capi_token" name="econur_meta_capi_token" value="' . esc_attr(econur_meta_token()) . '"><p class="description">Optional. Events Manager > Settings > Conversions API > Generate access token. With it, events are also sent from the server and de-duplicated.</p></td></tr>'
            . '<tr><th><label for="econur_meta_test_code">Test event code</label></th><td><input class="regular-text" id="econur_meta_test_code" name="econur_meta_test_code" value="' . esc_attr(get_option('econur_meta_test_code', '')) . '"><p class="description">Optional, only while checking events in Events Manager > Test events. Clear it afterwards.</p></td></tr>'
            . '</table><p><button class="button button-primary" name="econur_meta_save" value="1">Save</button></p></form></div>';
    });
});

/* ---------- browser pixel ---------- */

add_action('wp_head', function () {
    $pid = econur_meta_pixel_id(); if (!$pid || is_admin()) return;
    $cfg = array('ajax' => admin_url('admin-ajax.php'), 'capi' => econur_meta_token() !== '', 'currency' => function_exists('get_woocommerce_currency') ? get_woocommerce_currency() : 'BDT');
    ?>
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','<?php echo esc_js($pid); ?>');fbq('track','PageView');
(function(){var m=document.cookie.match(/(?:^|; )ecn_atc=([^;]+)/);if(!m)return;document.cookie='ecn_atc=; Max-Age=0; path=/; SameSite=Lax';try{var a=JSON.parse(decodeURIComponent(m[1]));if(a&&a.id&&a.d)fbq('track','AddToCart',a.d,{eventID:a.id});}catch(e){}})();
window.ECN_META=<?php echo wp_json_encode($cfg); ?>;
window.ecnMeta=function(ev,data,custom){try{var id=ev.toLowerCase()+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,9);data=data||{};if(!data.currency&&data.value!==undefined)data.currency=ECN_META.currency;
fbq(custom?'trackCustom':'track',ev,data,{eventID:id});
if(!custom&&ECN_META.capi){var fd=new FormData();fd.append('action','ecn_meta');fd.append('event',ev);fd.append('id',id);fd.append('url',location.href.split('#')[0]);fd.append('data',JSON.stringify(data));if(navigator.sendBeacon)navigator.sendBeacon(ECN_META.ajax,fd);else fetch(ECN_META.ajax,{method:'POST',body:fd,keepalive:true,credentials:'same-origin'});}return id;}catch(e){}};
</script>
<?php
}, 2);

// Product page: ViewContent. Other pages: AddToCart from WooCommerce's own add-to-cart buttons.
add_action('wp_footer', function () {
    if (!econur_meta_pixel_id() || !function_exists('WC')) return;
    if (function_exists('is_product') && is_product()) {
        $p = wc_get_product(get_queried_object_id()); if (!$p) return;
        $price = (float) $p->get_price();
        echo '<script>window.ecnMeta&&ecnMeta("ViewContent",' . wp_json_encode(array('content_ids' => array((string) $p->get_id()), 'content_type' => 'product', 'content_name' => $p->get_name(), 'value' => $price)) . ');</script>';
    } else {
        // jQuery event fired by WooCommerce's ajax add-to-cart buttons (shop, category, homepage blocks using it)
        echo '<script>window.jQuery&&jQuery(document.body).on("added_to_cart",function(e,f,h,b){if(!window.ecnMeta||!b||!b.length)return;var id=b.attr("data-product_id");if(!id)return;ecnMeta("AddToCart",{content_ids:[String(id)],content_type:"product",value:parseFloat(b.attr("data-ecn-price")||0)||undefined,quantity:parseInt(b.attr("data-quantity")||"1",10)});});</script>';
    }
    if (function_exists('is_checkout') && is_checkout() && !is_order_received_page() && WC()->cart && !WC()->cart->is_empty()) {
        $ids = array(); $n = 0;
        foreach (WC()->cart->get_cart() as $it) { $ids[] = (string) ($it['variation_id'] ? $it['variation_id'] : $it['product_id']); $n += (int) $it['quantity']; }
        echo '<script>window.ecnMeta&&ecnMeta("InitiateCheckout",' . wp_json_encode(array('content_ids' => $ids, 'content_type' => 'product', 'num_items' => $n, 'value' => (float) WC()->cart->get_total('edit'))) . ');</script>';
    }
}, 50);

// Purchase: once per order (browser + server with the same event_id).
add_action('woocommerce_thankyou', function ($order_id) {
    if (!econur_meta_pixel_id() || !$order_id) return;
    $order = wc_get_order($order_id);
    if (!$order || $order->get_meta('_ecn_meta_purchase')) return;
    $ids = array(); $contents = array(); $n = 0;
    foreach ($order->get_items() as $it) {
        $pid = (string) ($it->get_variation_id() ? $it->get_variation_id() : $it->get_product_id());
        $ids[] = $pid; $n += (int) $it->get_quantity();
        $contents[] = array('id' => $pid, 'quantity' => (int) $it->get_quantity(), 'item_price' => (float) $order->get_item_subtotal($it, false, true));
    }
    $data = array('content_ids' => $ids, 'contents' => $contents, 'content_type' => 'product', 'num_items' => $n, 'value' => (float) $order->get_total(), 'currency' => $order->get_currency());
    $eid = 'purchase_' . $order->get_id();
    echo '<script>window.fbq&&fbq("track","Purchase",' . wp_json_encode($data) . ',{eventID:' . wp_json_encode($eid) . '});</script>';
    $order->update_meta_data('_ecn_meta_purchase', current_time('mysql'));
    $order->save();
    $ud = econur_meta_user_data();
    $em = strtolower(trim($order->get_billing_email()));
    $ph = preg_replace('/\D/', '', $order->get_billing_phone());
    if ($ph && 0 === strpos($ph, '0')) $ph = '88' . $ph; // Bangladesh numbers without country code
    if ($em) $ud['em'] = array(hash('sha256', $em));
    if ($ph) $ud['ph'] = array(hash('sha256', $ph));
    if ($order->get_billing_city()) $ud['ct'] = array(hash('sha256', strtolower(preg_replace('/\s+/', '', $order->get_billing_city()))));
    $ud['country'] = array(hash('sha256', strtolower($order->get_billing_country() ? $order->get_billing_country() : 'bd')));
    econur_meta_send('Purchase', $eid, $order->get_checkout_order_received_url(), $data, $ud);
}, 5);

// AddToCart confirmed by WooCommerce for a normal form post (product page Add to Cart / Buy Now). Ajax adds (routine,
// favourites, shop buttons) report their own event after a successful response, so they are skipped here.
add_action('woocommerce_add_to_cart', function ($key, $product_id, $qty, $variation_id) {
    if (!econur_meta_pixel_id() || wp_doing_ajax() || !empty($_GET['wc-ajax']) || headers_sent()) return;
    $p = wc_get_product($variation_id ? $variation_id : $product_id); if (!$p) return;
    $pct = function_exists('econur_lp_pack_tiers') ? econur_lp_pack_pct(econur_lp_pack_tiers((int) $product_id), (int) $qty) : 0;
    $data = array('content_ids' => array((string) $p->get_id()), 'content_type' => 'product', 'content_name' => $p->get_name(), 'quantity' => (int) $qty,
        'value' => round((float) $p->get_price() * (int) $qty * (1 - $pct / 100), 2), 'currency' => get_woocommerce_currency());
    $eid = 'addtocart_' . strtolower(wp_generate_password(12, false));
    setcookie('ecn_atc', rawurlencode(wp_json_encode(array('id' => $eid, 'd' => $data))), array('expires' => time() + 300, 'path' => '/', 'secure' => is_ssl(), 'httponly' => false, 'samesite' => 'Lax'));
    econur_meta_send('AddToCart', $eid, wp_get_referer() ? wp_get_referer() : home_url('/'), $data);
}, 20, 4);

/* ---------- Conversions API ---------- */

function econur_meta_user_data() {
    $ud = array('client_ip_address' => isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : '', 'client_user_agent' => isset($_SERVER['HTTP_USER_AGENT']) ? substr((string) $_SERVER['HTTP_USER_AGENT'], 0, 400) : '');
    if (!empty($_COOKIE['_fbp']) && preg_match('/^fb\.\d\.\d+\.\d+$/', $_COOKIE['_fbp'])) $ud['fbp'] = $_COOKIE['_fbp'];
    if (!empty($_COOKIE['_fbc']) && preg_match('/^fb\.\d\.\d+\.[\w\-]+$/', $_COOKIE['_fbc'])) $ud['fbc'] = $_COOKIE['_fbc'];
    return $ud;
}
function econur_meta_send($event, $eid, $url, $data, $ud = null) {
    $pid = econur_meta_pixel_id(); $tok = econur_meta_token();
    if (!$pid || !$tok) return;
    $body = array('data' => array(array('event_name' => $event, 'event_time' => time(), 'event_id' => $eid, 'event_source_url' => $url, 'action_source' => 'website', 'user_data' => $ud ? $ud : econur_meta_user_data(), 'custom_data' => $data)));
    $test = trim((string) get_option('econur_meta_test_code', ''));
    if ($test) $body['test_event_code'] = $test;
    wp_remote_post(ECONUR_META_API . $pid . '/events?access_token=' . rawurlencode($tok), array('body' => wp_json_encode($body), 'headers' => array('Content-Type' => 'application/json'), 'timeout' => 5, 'blocking' => false));
}

// Relay for browser-made events (keeps the browser's event_id). Standard events only, values sanitised.
add_action('wp_ajax_ecn_meta', 'econur_meta_relay');
add_action('wp_ajax_nopriv_ecn_meta', 'econur_meta_relay');
function econur_meta_relay() {
    $ev = sanitize_text_field(wp_unslash($_POST['event'] ?? ''));
    $id = sanitize_text_field(wp_unslash($_POST['id'] ?? ''));
    if (!econur_meta_token() || !in_array($ev, array('ViewContent', 'AddToCart', 'InitiateCheckout'), true) || !preg_match('/^[a-z]+_[a-z0-9]{6,24}$/', $id)) wp_die('', '', array('response' => 204));
    $ip = isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : '';
    $key = 'ecn_meta_rl_' . md5($ip); $hits = (int) get_transient($key);
    if ($hits > 60) wp_die('', '', array('response' => 204));
    set_transient($key, $hits + 1, MINUTE_IN_SECONDS);
    $raw = json_decode(wp_unslash($_POST['data'] ?? '{}'), true); $raw = is_array($raw) ? $raw : array();
    $data = array();
    if (isset($raw['value']) && is_numeric($raw['value'])) $data['value'] = round((float) $raw['value'], 2);
    $data['currency'] = (isset($raw['currency']) && preg_match('/^[A-Z]{3}$/', $raw['currency'])) ? $raw['currency'] : 'BDT';
    if (!empty($raw['content_ids']) && is_array($raw['content_ids'])) $data['content_ids'] = array_slice(array_map(function ($x) { return preg_replace('/[^\w\-]/', '', (string) $x); }, $raw['content_ids']), 0, 20);
    if (!empty($raw['content_name'])) $data['content_name'] = substr(sanitize_text_field($raw['content_name']), 0, 120);
    $data['content_type'] = 'product';
    foreach (array('num_items', 'quantity') as $k) if (isset($raw[$k]) && is_numeric($raw[$k])) $data[$k] = (int) $raw[$k];
    $url = esc_url_raw(wp_unslash($_POST['url'] ?? ''));
    if ($url && 0 !== strpos($url, home_url())) $url = home_url('/');
    econur_meta_send($ev, $id, $url, $data);
    wp_die('', '', array('response' => 204));
}
