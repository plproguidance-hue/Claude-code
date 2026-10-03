<?php
/**
 * ECONUR checkout (WooCommerce classic checkout, [woocommerce_checkout] on the checkout page) and order success page.
 *
 * WooCommerce keeps doing the work: fields are WooCommerce checkout fields, delivery areas are the store's real shipping
 * methods (WooCommerce > Settings > Shipping), payment methods are the enabled gateways, totals / coupons / stock /
 * order creation are WooCommerce's own. This file only shapes the form for Bangladesh:
 *   one name field, mobile number (+ optional second number), full address, division > district > thana / area;
 *   no email, company, postcode or order notes; Bangladesh mobile numbers checked and saved as 01XXXXXXXXX.
 * Layout: woocommerce/checkout/form-checkout.php, payment.php, review-order.php, thankyou.php (child theme overrides).
 * Look and behaviour: assets/econur-checkout.css / .js.
 */
defined('ABSPATH') || exit;

const ECONUR_CHECKOUT_VER = '1.0.0';

/* ---------------------------------------------------------------- Bangladesh: divisions and their districts (WooCommerce codes) */
function econur_bd_divisions() {
    return array(
        'barishal'   => array('বরিশাল', array('BD-02', 'BD-06', 'BD-07', 'BD-25', 'BD-51', 'BD-50')),
        'chattogram' => array('চট্টগ্রাম', array('BD-01', 'BD-04', 'BD-09', 'BD-10', 'BD-08', 'BD-11', 'BD-16', 'BD-29', 'BD-31', 'BD-47', 'BD-56')),
        'dhaka'      => array('ঢাকা', array('BD-13', 'BD-15', 'BD-18', 'BD-17', 'BD-26', 'BD-36', 'BD-33', 'BD-35', 'BD-40', 'BD-42', 'BD-53', 'BD-62', 'BD-63')),
        'khulna'     => array('খুলনা', array('BD-05', 'BD-12', 'BD-22', 'BD-23', 'BD-27', 'BD-30', 'BD-37', 'BD-39', 'BD-43', 'BD-58')),
        'mymensingh' => array('ময়মনসিংহ', array('BD-21', 'BD-34', 'BD-41', 'BD-57')),
        'rajshahi'   => array('রাজশাহী', array('BD-03', 'BD-24', 'BD-48', 'BD-44', 'BD-45', 'BD-49', 'BD-54', 'BD-59')),
        'rangpur'    => array('রংপুর', array('BD-14', 'BD-19', 'BD-28', 'BD-32', 'BD-46', 'BD-52', 'BD-55', 'BD-64')),
        'sylhet'     => array('সিলেট', array('BD-20', 'BD-38', 'BD-61', 'BD-60')),
    );
}
function econur_bd_division_of($state) {
    foreach (econur_bd_divisions() as $k => $d) if (in_array($state, $d[1], true)) return $k;
    return '';
}
// "০১৭১২-৩৪৫ ৬৭৮" / "+8801712345678" -> "01712345678"
function econur_bd_phone($v) {
    $v = strtr((string) $v, array('০' => '0', '১' => '1', '২' => '2', '৩' => '3', '৪' => '4', '৫' => '5', '৬' => '6', '৭' => '7', '৮' => '8', '৯' => '9'));
    $v = preg_replace('/[^\d+]/', '', $v);
    if (0 === strpos($v, '+880')) $v = '0' . substr($v, 4);
    elseif (0 === strpos($v, '880') && 13 === strlen($v)) $v = '0' . substr($v, 3);
    return $v;
}
function econur_bd_phone_ok($v) { return (bool) preg_match('/^01[3-9]\d{8}$/', $v); }

/* ---------------------------------------------------------------- fields */
add_filter('woocommerce_checkout_fields', function ($f) {
    if (!isset($f['billing'])) return $f;
    $b = $f['billing'];
    foreach (array('billing_last_name', 'billing_company', 'billing_address_2', 'billing_postcode', 'billing_email') as $k) unset($b[$k]);
    $div = array('' => 'বিভাগ নির্বাচন করুন');
    foreach (econur_bd_divisions() as $k => $d) $div[$k] = $d[0];
    $set = function ($k, $a) use (&$b) { $b[$k] = array_merge(isset($b[$k]) ? $b[$k] : array(), $a); };
    $set('billing_first_name', array('label' => 'পূর্ণ নাম', 'placeholder' => 'আপনার পূর্ণ নাম লিখুন', 'class' => array('form-row-first'), 'priority' => 10, 'autocomplete' => 'name', 'required' => true));
    $set('billing_phone', array('type' => 'tel', 'label' => 'মোবাইল নম্বর', 'placeholder' => '01XXXXXXXXX', 'class' => array('form-row-last'), 'priority' => 20, 'required' => true, 'validate' => array(), 'autocomplete' => 'tel', 'custom_attributes' => array('inputmode' => 'tel', 'maxlength' => '20')));
    $set('billing_econur_alt_phone', array('type' => 'tel', 'label' => 'বিকল্প মোবাইল নম্বর (ঐচ্ছিক)', 'placeholder' => '01XXXXXXXXX', 'class' => array('form-row-wide'), 'priority' => 25, 'required' => false, 'custom_attributes' => array('inputmode' => 'tel', 'maxlength' => '20')));
    $set('billing_address_1', array('label' => 'সম্পূর্ণ ঠিকানা', 'placeholder' => 'বাসা / হোল্ডিং নম্বর, রোড, এলাকা', 'class' => array('form-row-wide', 'address-field'), 'priority' => 30, 'required' => true));
    $set('billing_country', array('class' => array('form-row-wide', 'address-field', 'update_totals_on_change', 'econur-co-hidden'), 'priority' => 35));
    $set('billing_econur_division', array('type' => 'select', 'label' => 'বিভাগ', 'options' => $div, 'class' => array('form-row-first', 'econur-division'), 'priority' => 40, 'required' => true));
    $set('billing_state', array('type' => 'state', 'label' => 'জেলা', 'placeholder' => 'জেলা নির্বাচন করুন', 'class' => array('form-row-last', 'address-field'), 'priority' => 50, 'required' => true, 'validate' => array('state')));
    $set('billing_city', array('label' => 'থানা / এলাকা', 'placeholder' => 'যেমন: মিরপুর', 'class' => array('form-row-wide', 'address-field'), 'priority' => 60, 'required' => true));
    uasort($b, function ($x, $y) { return (int) ($x['priority'] ?? 0) <=> (int) ($y['priority'] ?? 0); });
    $f['billing'] = $b;
    unset($f['order']['order_comments']);
    return $f;
}, 20);
add_filter('woocommerce_enable_order_notes_field', '__return_false');
// labels the address script re-applies when it loads (same words, same order as above)
add_filter('woocommerce_get_country_locale', function ($l) {
    $l['BD'] = array_merge(isset($l['BD']) ? $l['BD'] : array(), array(
        'first_name' => array('label' => 'পূর্ণ নাম', 'priority' => 10, 'class' => array('form-row-first')),
        'last_name'  => array('required' => false, 'hidden' => true),
        'company'    => array('required' => false, 'hidden' => true),
        'phone'      => array('label' => 'মোবাইল নম্বর', 'placeholder' => '01XXXXXXXXX', 'required' => true, 'priority' => 20, 'class' => array('form-row-last')),
        'address_1'  => array('label' => 'সম্পূর্ণ ঠিকানা', 'placeholder' => 'বাসা / হোল্ডিং নম্বর, রোড, এলাকা', 'priority' => 30, 'class' => array('form-row-wide', 'address-field')),
        'address_2'  => array('required' => false, 'hidden' => true),
        'country'    => array('priority' => 35, 'class' => array('form-row-wide', 'address-field', 'update_totals_on_change', 'econur-co-hidden')),
        'state'      => array('label' => 'জেলা', 'placeholder' => 'জেলা নির্বাচন করুন', 'required' => true, 'priority' => 50, 'class' => array('form-row-last', 'address-field')),
        'city'       => array('label' => 'থানা / এলাকা', 'placeholder' => 'যেমন: মিরপুর', 'priority' => 60, 'class' => array('form-row-wide', 'address-field')),
        'postcode'   => array('required' => false, 'hidden' => true),
    ));
    return $l;
});
// a guest's district starts empty (the store's own address is not the customer's)
add_filter('default_checkout_billing_state', function ($v) { return is_user_logged_in() ? $v : ''; });

/* ---------------------------------------------------------------- validation (errors show under each field; see econur-checkout.js) */
add_filter('woocommerce_process_checkout_field_billing_phone', 'econur_bd_phone');
add_filter('woocommerce_process_checkout_field_billing_econur_alt_phone', 'econur_bd_phone');
add_filter('woocommerce_checkout_required_field_notice', function ($notice, $label, $key = '') {
    $fields = WC()->checkout() ? WC()->checkout()->get_checkout_fields('billing') : array();
    if ($key && isset($fields[$key]['label'])) $label = preg_replace('/\s*\(.*\)$/u', '', $fields[$key]['label']);
    return sprintf('<strong>%s</strong> দিতে হবে।', esc_html(wp_strip_all_tags($label)));
}, 10, 3);
add_action('woocommerce_after_checkout_validation', function ($data, $errors) {
    if (!empty($data['billing_phone']) && !econur_bd_phone_ok($data['billing_phone'])) {
        $errors->remove('billing_phone_validation');
        $errors->add('billing_phone_validation', 'সঠিক মোবাইল নম্বর দিন: ১১ সংখ্যা, 01 দিয়ে শুরু (যেমন 01712345678)।', array('id' => 'billing_phone'));
    }
    if (!empty($data['billing_econur_alt_phone']) && !econur_bd_phone_ok($data['billing_econur_alt_phone'])) {
        $errors->add('billing_econur_alt_phone_validation', 'বিকল্প মোবাইল নম্বরটি সঠিক নয় (যেমন 01712345678), অথবা ঘরটি খালি রাখুন।', array('id' => 'billing_econur_alt_phone'));
    }
    $div = isset($data['billing_econur_division']) ? $data['billing_econur_division'] : '';
    if ($div && !isset(econur_bd_divisions()[$div])) $errors->add('billing_econur_division_validation', 'একটি বিভাগ নির্বাচন করুন।', array('id' => 'billing_econur_division'));
    if ($div && !empty($data['billing_state']) && econur_bd_division_of($data['billing_state']) !== $div) {
        $errors->add('billing_state_validation', 'নির্বাচিত জেলাটি এই বিভাগের নয়। জেলাটি আবার নির্বাচন করুন।', array('id' => 'billing_state'));
    }
}, 10, 2);

/* ---------------------------------------------------------------- order: division + second number in the admin */
add_action('woocommerce_admin_order_data_after_billing_address', function ($order) {
    $div = $order->get_meta('_billing_econur_division'); $alt = $order->get_meta('_billing_econur_alt_phone');
    $d = econur_bd_divisions();
    if ($div) echo '<p><strong>বিভাগ (Division):</strong> ' . esc_html(isset($d[$div]) ? $d[$div][0] . ' / ' . ucfirst($div) : $div) . '</p>';
    if ($alt) echo '<p><strong>বিকল্প মোবাইল (Alt. phone):</strong> <a href="tel:' . esc_attr($alt) . '">' . esc_html($alt) . '</a></p>';
});

/* ---------------------------------------------------------------- layout pieces */
// the payment methods move to the left column; the order button stays with the summary on the right
add_action('wp', function () {
    remove_action('woocommerce_checkout_order_review', 'woocommerce_checkout_payment', 20);
    add_action('woocommerce_checkout_order_review', 'econur_checkout_place_order', 20);
});
add_filter('woocommerce_order_button_text', function () { return 'অর্ডার সম্পন্ন করুন'; });

function econur_ship_label($rate) {
    $t = trim(wp_strip_all_tags($rate->get_label())); $days = '';
    if (preg_match('/^(.*?)\s*\(([^)]*)\)\s*$/u', $t, $m)) { $t = $m[1]; $days = $m[2]; }
    $map = array('inside dhaka' => 'ঢাকার ভিতরে', 'outside dhaka' => 'ঢাকার বাইরে');
    $name = isset($map[strtolower($t)]) ? $map[strtolower($t)] : $t;
    $days = trim(str_ireplace(array('days', 'day'), 'দিন', $days));
    return array($name, $days);
}
// delivery areas as cards: the store's real shipping methods and costs (radio inputs WooCommerce's checkout script reads)
function econur_checkout_shipping_cards() {
    echo '<div class="econur-ship-options" id="econur_shipping_field">';
    if (!WC()->cart || !WC()->cart->needs_shipping()) { echo '<p class="econur-ship-none">এই অর্ডারে ডেলিভারির প্রয়োজন নেই।</p></div>'; return; }
    $packages = WC()->shipping()->get_packages();
    $chosen = WC()->session ? (array) WC()->session->get('chosen_shipping_methods') : array();
    foreach ($packages as $i => $package) {
        $rates = isset($package['rates']) ? $package['rates'] : array();
        if (!$rates) { echo '<p class="econur-ship-none">ঠিকানা দিলে ডেলিভারি এলাকা দেখা যাবে।</p>'; continue; }
        $ch = isset($chosen[$i]) ? $chosen[$i] : '';
        if (!isset($rates[$ch])) $ch = 1 === count($rates) ? key($rates) : $ch;
        echo '<div class="econur-ship-cards" role="radiogroup" aria-label="ডেলিভারি এলাকা">';
        foreach ($rates as $id => $rate) {
            list($name, $days) = econur_ship_label($rate);
            $cost = (float) $rate->get_cost() + array_sum((array) $rate->get_taxes());
            $iid = 'shipping_method_' . $i . '_' . sanitize_title($id);
            echo '<label class="econur-ship-card' . ($id === $ch ? ' is-on' : '') . '" for="' . esc_attr($iid) . '">'
                . '<input type="radio" name="shipping_method[' . (int) $i . ']" data-index="' . (int) $i . '" id="' . esc_attr($iid) . '" value="' . esc_attr($id) . '" class="shipping_method"' . checked($id, $ch, false) . '>'
                . '<span class="econur-ship-dot" aria-hidden="true"></span><span class="econur-ship-t"><b>' . esc_html($name) . '</b>'
                . '<small>ডেলিভারি চার্জ: ' . ($cost > 0 ? wp_kses_post(wc_price($cost)) : 'ফ্রি') . ($days ? ' (' . esc_html($days) . ')' : '') . '</small></span></label>';
        }
        echo '</div>';
    }
    echo '</div>';
}
// the order button (WooCommerce's own button, terms and security token) under the summary
function econur_checkout_place_order() {
    $text = apply_filters('woocommerce_order_button_text', __('Place order', 'woocommerce'));
    echo '<div class="form-row place-order econur-place-order">';
    wc_get_template('checkout/terms.php');
    do_action('woocommerce_review_order_before_submit');
    echo apply_filters('woocommerce_order_button_html', '<button type="submit" class="button alt econur-place-btn" name="woocommerce_checkout_place_order" id="place_order" value="' . esc_attr($text) . '" data-value="' . esc_attr($text) . '">' . esc_html($text) . '</button>'); // phpcs:ignore
    do_action('woocommerce_review_order_after_submit');
    wp_nonce_field('woocommerce-process_checkout', 'woocommerce-process-checkout-nonce');
    echo '<p class="econur-co-note" lang="bn">পণ্য হাতে পেয়ে পেমেন্ট। অর্ডার নিশ্চিত করতে আমরা ফোন করি।</p></div>';
}
// keep both in step when WooCommerce refreshes the totals
add_filter('woocommerce_update_order_review_fragments', function ($fr) {
    ob_start(); econur_checkout_shipping_cards(); $fr['.econur-ship-options'] = ob_get_clean();
    ob_start(); econur_checkout_place_order(); $fr['.econur-place-order'] = ob_get_clean();
    return $fr;
});
add_action('woocommerce_before_checkout_form', function () {
    echo '<header class="econur-co-head" lang="bn"><h1>চেকআউট</h1><p>ডেলিভারি তথ্য দিন, পেমেন্ট পদ্ধতি বেছে নিন এবং অর্ডার সম্পন্ন করুন।</p></header>';
}, 1);

/* ---------------------------------------------------------------- WooCommerce's remaining words on checkout and order pages, in Bengali */
add_filter('gettext', function ($tr, $text, $domain) {
    static $map = array(
        'Have a coupon?' => 'কুপন কোড আছে?', 'Click here to enter your code' => 'এখানে লিখুন',
        'If you have a coupon code, please apply it below.' => 'কুপন কোড থাকলে নিচে লিখে প্রয়োগ করুন।',
        'Coupon code' => 'কুপন কোড', 'Apply coupon' => 'প্রয়োগ করুন', 'Coupon:' => 'কুপন:', 'Coupon: %s' => 'কুপন: %s', '[Remove]' => '[সরান]',
        'Coupon code applied successfully.' => 'কুপন প্রয়োগ হয়েছে।', 'Coupon has been removed.' => 'কুপন সরানো হয়েছে।',
        'Please enter a coupon code.' => 'একটি কুপন কোড লিখুন।', 'Coupon code already applied!' => 'এই কুপনটি আগেই প্রয়োগ করা হয়েছে।',
        'Coupon "%s" does not exist!' => '"%s" কুপনটি সঠিক নয়।', 'Coupon &quot;%s&quot; cannot be applied because it does not exist.' => '"%s" কুপনটি সঠিক নয়।',
        'Select an option&hellip;' => 'জেলা নির্বাচন করুন', 'Select an option…' => 'জেলা নির্বাচন করুন',
        'Order details' => 'অর্ডারের বিস্তারিত', 'Product' => 'পণ্য', 'Total' => 'মোট', 'Subtotal:' => 'সাবটোটাল:', 'Shipping:' => 'ডেলিভারি চার্জ:',
        'Payment method:' => 'পেমেন্ট পদ্ধতি:', 'Total:' => 'মোট:', 'Billing address' => 'অর্ডারকারীর তথ্য', 'Shipping address' => 'ডেলিভারি ঠিকানা', 'Discount:' => 'ডিসকাউন্ট:',
        'Note:' => 'নোট:', 'Order again' => 'আবার অর্ডার করুন',
        'Please read and accept the terms and conditions to proceed with your order.' => 'অর্ডার করতে শর্তাবলীতে সম্মতি দিন।',
        'Invalid payment method.' => 'একটি পেমেন্ট পদ্ধতি নির্বাচন করুন।',
        'No shipping method has been selected. Please double check your address, or contact us if you need any help.' => 'একটি ডেলিভারি এলাকা নির্বাচন করুন।',
        'There are some issues with the items in your cart. Please go back to the cart page and resolve these issues before checking out.' => 'আপনার কার্টের কিছু পণ্যে সমস্যা আছে। কার্টে ফিরে গিয়ে ঠিক করে নিন।',
        'Unfortunately your order cannot be processed as the originating bank/merchant has declined your transaction. Please attempt your purchase again.' => 'দুঃখিত, আপনার অর্ডারটি সম্পন্ন করা যায়নি। আবার চেষ্টা করুন।',
    );
    if ('woocommerce' !== $domain || is_admin() || !isset($map[$text])) return $tr;
    if (!did_action('wp') || !function_exists('is_checkout') || !(is_checkout() || wp_doing_ajax())) return $tr;
    return $map[$text];
}, 20, 3);

// WooCommerce's privacy line under the order button, in Bengali (same meaning, same privacy policy link)
add_filter('woocommerce_get_privacy_policy_text', function ($text, $type) {
    return 'checkout' === $type ? 'আপনার ব্যক্তিগত তথ্য অর্ডার প্রসেস করতে, এই ওয়েবসাইটে আপনার অভিজ্ঞতা সহজ রাখতে এবং আমাদের [privacy_policy]-এ বর্ণিত অন্যান্য উদ্দেশ্যে ব্যবহার করা হবে।' : $text;
}, 10, 2);

/* ---------------------------------------------------------------- assets + page */
add_action('wp_enqueue_scripts', function () {
    if (!function_exists('is_checkout') || !is_checkout()) return;
    $u = get_stylesheet_directory_uri() . '/assets/';
    wp_enqueue_style('econur-checkout', $u . 'econur-checkout.css', array(), ECONUR_CHECKOUT_VER);
    if (is_order_received_page()) return;
    // plain selects (no search box) for division and district: faster on phones
    wp_dequeue_script('selectWoo'); wp_dequeue_style('select2');
    wp_enqueue_script('econur-checkout', $u . 'econur-checkout.js', array('jquery', 'wc-checkout'), ECONUR_CHECKOUT_VER, array('in_footer' => true));
    $map = array(); foreach (econur_bd_divisions() as $k => $d) $map[$k] = $d[1];
    wp_add_inline_script('econur-checkout', 'window.ECN_CO=' . wp_json_encode(array('divisions' => $map)) . ';', 'before');
}, 100);
add_filter('body_class', function ($c) {
    if (function_exists('is_checkout') && is_checkout()) $c[] = is_order_received_page() ? 'econur-thankspage' : 'econur-checkoutpage';
    return $c;
});
