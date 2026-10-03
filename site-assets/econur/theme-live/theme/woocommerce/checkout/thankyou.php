<?php
/**
 * Thankyou page (ECONUR order success page).
 *
 * Shown by WooCommerce only for a real order it has created (order-received endpoint with the order key). Order number,
 * total, payment method and address all come from that order. WooCommerce's own order details follow below.
 *
 * @see https://woocommerce.com/document/template-structure/
 * @package WooCommerce\Templates
 * @version 8.1.0
 *
 * @var WC_Order $order
 */

defined( 'ABSPATH' ) || exit;
?>

<div class="woocommerce-order econur-thanks">

	<?php
	if ( $order ) :

		do_action( 'woocommerce_before_thankyou', $order->get_id() );
		?>

		<?php if ( $order->has_status( 'failed' ) ) : ?>

			<section class="econur-thanks-hero is-failed" lang="bn">
				<h1 class="econur-thanks-h">অর্ডারটি সম্পন্ন হয়নি</h1>
				<p class="woocommerce-notice woocommerce-notice--error woocommerce-thankyou-order-failed"><?php esc_html_e( 'Unfortunately your order cannot be processed as the originating bank/merchant has declined your transaction. Please attempt your purchase again.', 'woocommerce' ); ?></p>
				<p class="econur-thanks-actions woocommerce-thankyou-order-failed-actions">
					<a href="<?php echo esc_url( $order->get_checkout_payment_url() ); ?>" class="econur-thanks-btn is-primary">আবার চেষ্টা করুন</a>
					<a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="econur-thanks-btn is-ghost">হোমপেজে ফিরে যান</a>
				</p>
			</section>

		<?php else : ?>

			<?php
			$econur_states = WC()->countries->get_states( $order->get_billing_country() );
			$econur_state  = $order->get_billing_state();
			$econur_div    = $order->get_meta( '_billing_econur_division' );
			$econur_divs   = function_exists( 'econur_bd_divisions' ) ? econur_bd_divisions() : array();
			$econur_addr   = array_filter(
				array(
					$order->get_billing_address_1(),
					$order->get_billing_city(),
					isset( $econur_states[ $econur_state ] ) ? trim( $econur_states[ $econur_state ] ) : $econur_state,
					isset( $econur_divs[ $econur_div ] ) ? $econur_divs[ $econur_div ][0] : '',
				)
			);
			?>
			<section class="econur-thanks-hero" aria-labelledby="econur-thanks-h" lang="bn">
				<span class="econur-thanks-leaf econur-thanks-leaf--tl" aria-hidden="true"></span>
				<span class="econur-thanks-leaf econur-thanks-leaf--br" aria-hidden="true"></span>
				<span class="econur-thanks-check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>
				<h1 class="econur-thanks-h" id="econur-thanks-h">আপনার অর্ডার সফলভাবে সম্পন্ন হয়েছে!</h1>
				<p class="econur-thanks-no">আপনার অর্ডার নম্বর: <b>#<?php echo esc_html( $order->get_order_number() ); ?></b></p>
				<p class="econur-thanks-lead">আমরা খুব শীঘ্রই আপনার সাথে যোগাযোগ করব।</p>

				<dl class="econur-thanks-facts woocommerce-order-overview woocommerce-thankyou-order-details order_details">
					<div><dt>মোট</dt><dd><?php echo wp_kses_post( $order->get_formatted_order_total() ); ?></dd></div>
					<?php if ( $order->get_payment_method_title() ) : ?>
						<div><dt>পেমেন্ট পদ্ধতি</dt><dd><?php echo wp_kses_post( $order->get_payment_method_title() ); ?></dd></div>
					<?php endif; ?>
					<?php if ( $econur_addr ) : ?>
						<div class="is-wide"><dt>ডেলিভারি ঠিকানা</dt><dd><?php echo esc_html( implode( ', ', $econur_addr ) ); ?></dd></div>
					<?php endif; ?>
					<?php if ( $order->get_billing_phone() ) : ?>
						<div><dt>মোবাইল</dt><dd><?php echo esc_html( $order->get_billing_phone() ); ?></dd></div>
					<?php endif; ?>
				</dl>

				<p class="econur-thanks-actions">
					<a href="#econur-order-details" class="econur-thanks-btn is-primary">অর্ডার বিস্তারিত দেখুন</a>
					<a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="econur-thanks-btn is-ghost">হোমপেজে ফিরে যান</a>
				</p>
			</section>

		<?php endif; ?>

		<div class="econur-thanks-details" id="econur-order-details">
			<?php do_action( 'woocommerce_thankyou_' . $order->get_payment_method(), $order->get_id() ); ?>
			<?php do_action( 'woocommerce_thankyou', $order->get_id() ); ?>
		</div>

	<?php else : ?>

		<?php wc_get_template( 'checkout/order-received.php', array( 'order' => false ) ); ?>

	<?php endif; ?>

</div>
