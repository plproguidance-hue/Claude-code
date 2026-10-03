<?php
/**
 * ECONUR customer login page (inc/econur-login.php). A focused page: no site header or footer, the logo links home.
 * The form is WooCommerce's sign-in (fields, nonce and hooks of its own login form), styled for ECONUR.
 */
defined('ABSPATH') || exit;

$target  = econur_login_target();
$user    = isset($_POST['username']) ? sanitize_text_field(wp_unslash($_POST['username'])) : ''; // phpcs:ignore WordPress.Security.NonceVerification
$remember = !empty($_POST['rememberme']); // phpcs:ignore WordPress.Security.NonceVerification
// the form was sent but WooCommerce did not act on it (an expired security token): say so instead of a silent reload
if (econur_login_posted() && !is_user_logged_in() && !wc_notice_count('error')) {
    wc_add_notice('পেজটি অনেকক্ষণ খোলা ছিল। অনুগ্রহ করে আবার সাইন ইন করুন।', 'error');
}
if (isset($_GET['password-reset'])) { // phpcs:ignore WordPress.Security.NonceVerification
    wc_add_notice('আপনার পাসওয়ার্ড পরিবর্তন হয়েছে। নতুন পাসওয়ার্ড দিয়ে সাইন ইন করুন।', 'success');
}
$logo_id = (int) get_theme_mod('custom_logo');
$social  = (string) apply_filters('econur_login_social_buttons', ''); // only a configured provider fills this
$can_register = 'yes' === get_option('woocommerce_enable_myaccount_registration');
$guest   = 'yes' === get_option('woocommerce_enable_guest_checkout');
$shop    = wc_get_page_permalink('shop');
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<main class="econur-login-layout" id="econur-login">

	<section class="econur-login-left" aria-labelledby="econur-login-h">
		<?php echo econur_login_deco(154, 'econur-login-deco--leaves', '260px', true); // phpcs:ignore ?>
		<?php echo econur_login_deco(154, 'econur-login-deco--leaves2', '220px'); // phpcs:ignore ?>
		<div class="econur-login-inner">
			<a class="econur-login-brand" href="<?php echo esc_url(home_url('/')); ?>" aria-label="ECONUR হোমপেজ">
				<?php
				if ($logo_id && wp_attachment_is_image($logo_id)) {
					echo wp_get_attachment_image($logo_id, 'full', false, array('class' => 'econur-login-logo', 'alt' => 'ECONUR', 'loading' => 'eager', 'decoding' => 'async', 'fetchpriority' => 'high', 'sizes' => '210px'));
				} else {
					echo '<span class="econur-login-logo-text">' . esc_html(get_bloginfo('name')) . '</span>';
				}
				?>
			</a>
			<h1 class="econur-login-h" id="econur-login-h" lang="bn">আবার স্বাগতম!</h1>
			<p class="econur-login-lead" lang="bn">আপনার অ্যাকাউন্টে সাইন ইন করে, শপিং যাত্রা আরও সহজ ও উপভোগ্য করুন।</p>

			<div class="econur-login-notices" lang="bn"><?php wc_print_notices(); ?></div>

			<form class="econur-login-form woocommerce-form woocommerce-form-login login" method="post" action="<?php echo esc_url(add_query_arg(array())); ?>" novalidate lang="bn">
				<?php do_action('woocommerce_login_form_start'); ?>
				<div class="econur-login-field">
					<label class="econur-login-sr" for="econur_login_user">ইমেইল বা ইউজারনেম</label>
					<span class="econur-login-fic"><?php echo econur_login_icon('mail'); // phpcs:ignore ?></span>
					<input type="text" class="econur-login-input" name="username" id="econur_login_user" value="<?php echo esc_attr($user); ?>" placeholder="আপনার ইমেইল লিখুন" autocomplete="username" autocapitalize="off" spellcheck="false" inputmode="email" required aria-describedby="econur_login_user_err">
					<span class="econur-login-ferr" id="econur_login_user_err" hidden></span>
				</div>
				<div class="econur-login-field">
					<label class="econur-login-sr" for="econur_login_pass">পাসওয়ার্ড</label>
					<span class="econur-login-fic"><?php echo econur_login_icon('lock'); // phpcs:ignore ?></span>
					<input type="password" class="econur-login-input has-eye" name="password" id="econur_login_pass" placeholder="পাসওয়ার্ড লিখুন" autocomplete="current-password" required aria-describedby="econur_login_pass_err">
					<button type="button" class="econur-login-eye" data-econur-eye aria-controls="econur_login_pass" aria-pressed="false" aria-label="পাসওয়ার্ড দেখুন">
						<span class="econur-login-eye-show"><?php echo econur_login_icon('eye'); // phpcs:ignore ?></span><span class="econur-login-eye-hide" hidden><?php echo econur_login_icon('eyeoff'); // phpcs:ignore ?></span>
					</button>
					<span class="econur-login-ferr" id="econur_login_pass_err" hidden></span>
				</div>
				<?php do_action('woocommerce_login_form'); ?>
				<div class="econur-login-row">
					<label class="econur-login-remember" for="rememberme">
						<input type="checkbox" name="rememberme" id="rememberme" value="forever"<?php checked($remember); ?>>
						<span>আমাকে মনে রাখুন</span>
					</label>
					<a class="econur-login-forgot" href="<?php echo esc_url(wc_lostpassword_url()); ?>">পাসওয়ার্ড ভুলে গেছেন?</a>
				</div>
				<?php wp_nonce_field('woocommerce-login', 'woocommerce-login-nonce'); ?>
				<input type="hidden" name="redirect" value="<?php echo esc_url($target); ?>">
				<input type="hidden" name="login" value="1">
				<input type="hidden" name="econur_login_form" value="1">
				<button type="submit" class="econur-login-submit" data-label="সাইন ইন করুন">সাইন ইন করুন</button>
				<?php do_action('woocommerce_login_form_end'); ?>
			</form>

			<?php if ('' !== trim($social)) : ?>
				<div class="econur-login-or" lang="bn"><span>অথবা</span></div>
				<div class="econur-login-social"><?php echo $social; // phpcs:ignore -- markup from the configured provider ?></div>
			<?php endif; ?>

			<?php if ($can_register) : ?>
				<p class="econur-login-alt" lang="bn">নতুন এখানে? <a href="<?php echo esc_url(wc_get_page_permalink('myaccount')); ?>">একটি অ্যাকাউন্ট তৈরি করুন<?php echo econur_login_icon('arrow'); // phpcs:ignore ?></a></p>
			<?php elseif ($guest && $shop) : ?>
				<p class="econur-login-alt" lang="bn">নতুন এখানে? অ্যাকাউন্ট ছাড়াই অর্ডার করা যায়। <a href="<?php echo esc_url($shop); ?>">কেনাকাটা শুরু করুন<?php echo econur_login_icon('arrow'); // phpcs:ignore ?></a></p>
			<?php endif; ?>

			<div class="econur-login-mbenefits" lang="bn">
				<p class="econur-login-mbenefits-h">কেন ECONUR অ্যাকাউন্ট?</p>
				<ul>
					<li><?php echo econur_login_icon('check'); // phpcs:ignore ?>দ্রুত চেকআউট</li>
					<li><?php echo econur_login_icon('check'); // phpcs:ignore ?>অর্ডার ট্র্যাকিং</li>
					<li><?php echo econur_login_icon('check'); // phpcs:ignore ?>অর্ডার হিস্ট্রি</li>
				</ul>
			</div>
		</div>
	</section>

	<aside class="econur-login-right" aria-labelledby="econur-login-rh" lang="bn">
		<?php echo econur_login_deco(131, 'econur-login-deco--sprig', '320px'); // phpcs:ignore ?>
		<?php echo econur_login_deco(129, 'econur-login-deco--decor', '340px'); // phpcs:ignore ?>
		<div class="econur-login-right-inner">
			<span class="econur-login-avatar"><?php echo econur_login_icon('user'); // phpcs:ignore ?></span>
			<h2 class="econur-login-rh" id="econur-login-rh">প্রিয় পণ্যগুলো এখন <br>আরও সহজে আপনার সাথে</h2>
			<p class="econur-login-rlead">আপনার অ্যাকাউন্টে লগইন করে উপভোগ করুন <br>একটি ব্যক্তিগত ও নিরাপদ শপিং অভিজ্ঞতা।</p>
			<ul class="econur-login-benefits">
				<?php foreach (econur_login_benefits() as $i => $b) : ?>
					<li class="econur-login-benefit" style="--i:<?php echo (int) $i; ?>"><span class="econur-login-bic"><?php echo econur_login_icon($b[0]); // phpcs:ignore ?></span><span><b><?php echo esc_html($b[1]); ?></b><small><?php echo esc_html($b[2]); ?></small></span></li>
				<?php endforeach; ?>
			</ul>
			<ul class="econur-login-trust">
				<li><span class="econur-login-tic"><?php echo econur_login_icon('shield'); // phpcs:ignore ?></span><span><b>নিরাপদ চেকআউট</b><small>সুরক্ষিত অর্ডার প্রক্রিয়া</small></span></li>
				<li><span class="econur-login-tic"><?php echo econur_login_icon('cash'); // phpcs:ignore ?></span><span><b>ক্যাশ অন ডেলিভারি</b><small>পণ্য হাতে পেয়ে পেমেন্ট</small></span></li>
			</ul>
		</div>
	</aside>

</main>
<?php wp_footer(); ?>
</body>
</html>
