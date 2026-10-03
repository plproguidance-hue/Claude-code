<?php
/**
 * Review order table (ECONUR order summary: photo, name, size, quantity × price; subtotal, delivery, discount, total).
 * The delivery area itself is chosen in the left column (econur_checkout_shipping_cards()); here only its charge shows.
 *
 * @see https://woocommerce.com/document/template-structure/
 * @package WooCommerce\Templates
 * @version 11.0.0
 */

defined( 'ABSPATH' ) || exit;

$econur_discount = WC()->cart->get_discount_total() + ( WC()->cart->display_prices_including_tax() ? WC()->cart->get_discount_tax() : 0 );
?>
<table class="shop_table woocommerce-checkout-review-order-table econur-summary">
	<thead class="screen-reader-text">
		<tr>
			<th class="product-name"><?php esc_html_e( 'Product', 'woocommerce' ); ?></th>
			<th class="product-total"><?php esc_html_e( 'Subtotal', 'woocommerce' ); ?></th>
		</tr>
	</thead>
	<tbody>
		<?php
		do_action( 'woocommerce_review_order_before_cart_contents' );

		foreach ( WC()->cart->get_cart() as $cart_item_key => $cart_item ) {
			$_product = apply_filters( 'woocommerce_cart_item_product', $cart_item['data'], $cart_item, $cart_item_key );

			/** This filter is documented in WooCommerce's review-order.php. */
			$visible = apply_filters( 'woocommerce_checkout_cart_item_visible', true, $cart_item, $cart_item_key );

			if ( $_product instanceof WC_Product && $_product->exists() && $cart_item['quantity'] > 0 && $visible ) {
				$econur_qty  = (int) $cart_item['quantity'];
				$econur_bits = array();
				if ( false !== stripos( $_product->get_name(), 'bar' ) ) {
					$econur_bits[] = $econur_qty . ' ' . ( $econur_qty > 1 ? 'Bars' : 'Bar' );
				}
				if ( $_product->is_type( 'variation' ) ) {
					foreach ( $_product->get_variation_attributes() as $econur_attr => $econur_val ) {
						$econur_tax  = str_replace( 'attribute_', '', $econur_attr );
						$econur_term = taxonomy_exists( $econur_tax ) ? get_term_by( 'slug', $econur_val, $econur_tax ) : false;
						if ( $econur_val ) {
							$econur_bits[] = $econur_term ? $econur_term->name : $econur_val;
						}
					}
				}
				?>
				<tr class="<?php echo esc_attr( apply_filters( 'woocommerce_cart_item_class', 'cart_item', $cart_item, $cart_item_key ) ); ?>">
					<td class="product-name">
						<span class="econur-sum-item">
							<span class="econur-sum-img"><?php echo $_product->get_image( 'woocommerce_gallery_thumbnail', array( 'alt' => '' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></span>
							<span class="econur-sum-txt">
								<span class="econur-sum-name"><?php echo wp_kses_post( apply_filters( 'woocommerce_cart_item_name', $_product->is_type( 'variation' ) ? wc_get_product( $_product->get_parent_id() )->get_name() : $_product->get_name(), $cart_item, $cart_item_key ) ); ?></span>
								<?php if ( $econur_bits ) : ?><span class="econur-sum-meta"><?php echo esc_html( implode( ' • ', $econur_bits ) ); ?></span><?php endif; ?>
								<?php echo apply_filters( 'woocommerce_checkout_cart_item_quantity', '<span class="econur-sum-qty product-quantity">' . WC()->cart->get_product_price( $_product ) . ' &times; ' . $econur_qty . '</span>', $cart_item, $cart_item_key ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
							</span>
						</span>
					</td>
					<td class="product-total">
						<?php echo apply_filters( 'woocommerce_cart_item_subtotal', WC()->cart->get_product_subtotal( $_product, $cart_item['quantity'] ), $cart_item, $cart_item_key ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
					</td>
				</tr>
				<?php
			}
		}

		do_action( 'woocommerce_review_order_after_cart_contents' );
		?>
	</tbody>
	<tfoot>

		<tr class="cart-subtotal">
			<th lang="bn">সাবটোটাল</th>
			<td><?php wc_cart_totals_subtotal_html(); ?></td>
		</tr>

		<?php if ( WC()->cart->needs_shipping() && WC()->cart->show_shipping() ) : ?>

			<?php do_action( 'woocommerce_review_order_before_shipping' ); ?>

			<?php
			$econur_ship_total = null;
			$econur_chosen     = WC()->session ? (array) WC()->session->get( 'chosen_shipping_methods' ) : array();
			foreach ( WC()->shipping()->get_packages() as $econur_i => $econur_pkg ) {
				$econur_id = isset( $econur_chosen[ $econur_i ] ) ? $econur_chosen[ $econur_i ] : '';
				if ( $econur_id && isset( $econur_pkg['rates'][ $econur_id ] ) ) {
					$econur_rate       = $econur_pkg['rates'][ $econur_id ];
					$econur_ship_total = (float) $econur_ship_total + (float) $econur_rate->get_cost() + array_sum( (array) $econur_rate->get_taxes() );
				}
			}
			?>
			<tr class="woocommerce-shipping-totals shipping econur-sum-ship">
				<th lang="bn">ডেলিভারি চার্জ</th>
				<td lang="bn"><?php echo null === $econur_ship_total ? 'ডেলিভারি এলাকা নির্বাচন করুন' : ( $econur_ship_total > 0 ? wp_kses_post( wc_price( $econur_ship_total ) ) : 'ফ্রি' ); ?></td>
			</tr>

			<?php do_action( 'woocommerce_review_order_after_shipping' ); ?>

		<?php endif; ?>

		<?php foreach ( WC()->cart->get_coupons() as $code => $coupon ) : ?>
			<tr class="cart-discount coupon-<?php echo esc_attr( sanitize_title( $code ) ); ?>">
				<th><?php wc_cart_totals_coupon_label( $coupon ); ?></th>
				<td><?php wc_cart_totals_coupon_html( $coupon ); ?></td>
			</tr>
		<?php endforeach; ?>

		<?php if ( ! WC()->cart->get_coupons() ) : ?>
			<tr class="econur-sum-discount">
				<th lang="bn">ডিসকাউন্ট</th>
				<td><?php echo wp_kses_post( wc_price( $econur_discount ) ); ?></td>
			</tr>
		<?php endif; ?>

		<?php foreach ( WC()->cart->get_fees() as $fee ) : ?>
			<tr class="fee">
				<th><?php echo esc_html( $fee->name ); ?></th>
				<td><?php wc_cart_totals_fee_html( $fee ); ?></td>
			</tr>
		<?php endforeach; ?>

		<?php if ( wc_tax_enabled() && ! WC()->cart->display_prices_including_tax() ) : ?>
			<?php if ( 'itemized' === get_option( 'woocommerce_tax_total_display' ) ) : ?>
				<?php foreach ( WC()->cart->get_tax_totals() as $code => $tax ) : // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited ?>
					<tr class="tax-rate tax-rate-<?php echo esc_attr( sanitize_title( $code ) ); ?>">
						<th><?php echo esc_html( $tax->label ); ?></th>
						<td><?php echo wp_kses_post( $tax->formatted_amount ); ?></td>
					</tr>
				<?php endforeach; ?>
			<?php else : ?>
				<tr class="tax-total">
					<th><?php echo esc_html( WC()->countries->tax_or_vat() ); ?></th>
					<td><?php wc_cart_totals_taxes_total_html(); ?></td>
				</tr>
			<?php endif; ?>
		<?php endif; ?>

		<?php do_action( 'woocommerce_review_order_before_order_total' ); ?>

		<tr class="order-total">
			<th lang="bn">মোট</th>
			<td><?php wc_cart_totals_order_total_html(); ?></td>
		</tr>

		<?php do_action( 'woocommerce_review_order_after_order_total' ); ?>

	</tfoot>
</table>
