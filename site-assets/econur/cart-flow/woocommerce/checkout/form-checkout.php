<?php
/**
 * Checkout Form (ECONUR layout).
 *
 * Left: delivery details, delivery area, payment method. Right: order summary with the order button.
 * Every hook of WooCommerce's own template is kept, in the same order. Fields: inc/econur-checkout.php.
 *
 * @see https://woocommerce.com/document/template-structure/
 * @package WooCommerce\Templates
 * @version 9.4.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

do_action( 'woocommerce_before_checkout_form', $checkout );

// If checkout registration is disabled and not logged in, the user cannot checkout.
if ( ! $checkout->is_registration_enabled() && $checkout->is_registration_required() && ! is_user_logged_in() ) {
	echo esc_html( apply_filters( 'woocommerce_checkout_must_be_logged_in_message', __( 'You must be logged in to checkout.', 'woocommerce' ) ) );
	return;
}

?>

<form name="checkout" method="post" class="checkout woocommerce-checkout econur-checkout" action="<?php echo esc_url( wc_get_checkout_url() ); ?>" enctype="multipart/form-data" aria-label="<?php echo esc_attr__( 'Checkout', 'woocommerce' ); ?>">

	<div class="econur-co-grid">
		<div class="econur-co-main">

			<?php if ( $checkout->get_checkout_fields() ) : ?>

				<?php do_action( 'woocommerce_checkout_before_customer_details' ); ?>

				<section class="econur-checkout-card econur-co-details" id="customer_details" aria-labelledby="econur-co-h-details">
					<h2 class="econur-co-h" id="econur-co-h-details" lang="bn"><span class="econur-co-step" aria-hidden="true">1</span>ডেলিভারি ঠিকানা দিন</h2>
					<?php do_action( 'woocommerce_checkout_billing' ); ?>
					<?php do_action( 'woocommerce_checkout_shipping' ); ?>
				</section>

				<?php do_action( 'woocommerce_checkout_after_customer_details' ); ?>

			<?php endif; ?>

			<?php if ( WC()->cart && WC()->cart->needs_shipping() ) : ?>
				<section class="econur-checkout-card econur-co-area" aria-labelledby="econur-co-h-area">
					<h2 class="econur-co-h" id="econur-co-h-area" lang="bn"><span class="econur-co-step" aria-hidden="true">2</span>ডেলিভারি এলাকা</h2>
					<?php econur_checkout_shipping_cards(); ?>
				</section>
			<?php endif; ?>

			<section class="econur-checkout-card econur-co-pay" aria-labelledby="econur-co-h-pay">
				<h2 class="econur-co-h" id="econur-co-h-pay" lang="bn"><span class="econur-co-step" aria-hidden="true"><?php echo WC()->cart && WC()->cart->needs_shipping() ? '3' : '2'; ?></span>পেমেন্ট পদ্ধতি নির্বাচন করুন</h2>
				<?php woocommerce_checkout_payment(); ?>
			</section>

		</div>

		<aside class="econur-co-side">
			<div class="econur-checkout-card econur-co-summary">

				<?php do_action( 'woocommerce_checkout_before_order_review_heading' ); ?>

				<h2 class="econur-co-h" id="order_review_heading" lang="bn">অর্ডার সারাংশ</h2>

				<?php do_action( 'woocommerce_checkout_before_order_review' ); ?>

				<div id="order_review" class="woocommerce-checkout-review-order">
					<?php do_action( 'woocommerce_checkout_order_review' ); ?>
				</div>

				<?php do_action( 'woocommerce_checkout_after_order_review' ); ?>

			</div>
		</aside>
	</div>

</form>

<?php do_action( 'woocommerce_after_checkout_form', $checkout ); ?>
