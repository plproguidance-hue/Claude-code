<?php
/**
 * Customer photos with product reviews (the "Add photos (optional)" strip of the review form).
 *
 *  - Up to 3 photos per review: JPG, PNG or WebP, at most 5 MB each. The file type is checked from the file itself,
 *    then every photo is re-encoded as a new JPEG (max 1600px), which drops anything hidden in the original file
 *    (EXIF, GPS location, embedded data).
 *  - Photos of a review waiting for approval are kept in a private folder (uploads/ecn-review-pending, closed to the
 *    web). Moderators can see them on the Comments screen. When the review is approved they move into the Media
 *    Library, attached to the product, and show on the review. Spam reviews keep no photos.
 *  - Reviews themselves still go through WordPress / WooCommerce as before (rating required, name and email required,
 *    flood and duplicate checks, moderation).
 * Turn the feature off with: add_filter('econur_review_photos_enabled', '__return_false');
 */
defined('ABSPATH') || exit;

const ECONUR_RV_MAX_PHOTOS = 3;
const ECONUR_RV_MAX_BYTES  = 5242880; // 5 MB
const ECONUR_RV_MAX_CHARS  = 1000;    // review text limit, also shown as the counter under the text box

function econur_rv_photos_enabled() {
    return (bool) apply_filters('econur_review_photos_enabled', true);
}

// Private folder for photos of reviews that are not approved yet.
function econur_rv_pending_dir() {
    $u = wp_upload_dir(null, false);
    $d = trailingslashit($u['basedir']) . 'ecn-review-pending';
    if (!is_dir($d)) wp_mkdir_p($d);
    if (!file_exists($d . '/.htaccess')) file_put_contents($d . '/.htaccess', "<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\nOrder deny,allow\nDeny from all\n</IfModule>\n");
    if (!file_exists($d . '/index.php')) file_put_contents($d . '/index.php', "<?php\n// Silence is golden.\n");
    return $d;
}

function econur_rv_is_product_review($post_id, $parent = 0) {
    return $post_id && 'product' === get_post_type($post_id) && !$parent;
}

/* ---------- checks before the review is saved: honeypot and text length ---------- */
add_filter('preprocess_comment', function ($data) {
    if (empty($data['comment_post_ID']) || !econur_rv_is_product_review((int) $data['comment_post_ID'], empty($data['comment_parent']) ? 0 : (int) $data['comment_parent'])) return $data;
    if (isset($_POST['ecn_rv_hp']) && '' !== trim((string) wp_unslash($_POST['ecn_rv_hp']))) {
        wp_die(esc_html__('Sorry, your review could not be submitted.', 'econur'), esc_html__('Review not submitted', 'econur'), array('response' => 400, 'back_link' => true));
    }
    // a star rating is required (WooCommerce setting); checked here too because the form's star buttons send nothing when none is chosen
    if (!is_admin() && 'yes' === get_option('woocommerce_enable_review_rating') && 'yes' === get_option('woocommerce_review_rating_required')) {
        $r = isset($_POST['rating']) ? (int) $_POST['rating'] : 0;
        if ($r < 1 || $r > 5) wp_die(esc_html__('Please choose a star rating for your review.', 'econur'), esc_html__('Rating needed', 'econur'), array('response' => 400, 'back_link' => true));
    }
    $len = function_exists('mb_strlen') ? mb_strlen((string) $data['comment_content']) : strlen((string) $data['comment_content']);
    if ($len > ECONUR_RV_MAX_CHARS) {
        wp_die(sprintf(esc_html__('Please keep your review under %s characters.', 'econur'), number_format_i18n(ECONUR_RV_MAX_CHARS)), esc_html__('Review too long', 'econur'), array('response' => 413, 'back_link' => true));
    }
    return $data;
}, 5);

/* ---------- after the review is saved: photos, then tell the page what happened ---------- */
add_action('comment_post', function ($cid, $approved, $data) {
    if (!econur_rv_is_product_review(isset($data['comment_post_ID']) ? (int) $data['comment_post_ID'] : 0, empty($data['comment_parent']) ? 0 : (int) $data['comment_parent'])) return;
    $ok = 0; $bad = 0;
    if ('spam' !== $approved && 'trash' !== $approved && econur_rv_photos_enabled() && !empty($_FILES['ecn_review_photos']['name']) && is_array($_FILES['ecn_review_photos']['name'])) {
        list($ok, $bad) = econur_rv_take_photos((int) $cid, $_FILES['ecn_review_photos']);
    }
    if (1 === $approved || '1' === $approved) econur_rv_publish_photos((int) $cid);
    // read once by the product page script: status (1 live, 0 waiting), photos kept, photos refused
    if (!headers_sent()) {
        setcookie('ecn_rv_done', ((1 === $approved || '1' === $approved) ? '1' : '0') . '.' . $ok . '.' . $bad, array('expires' => time() + 300, 'path' => COOKIEPATH ? COOKIEPATH : '/', 'secure' => is_ssl(), 'httponly' => false, 'samesite' => 'Lax'));
    }
}, 20, 3);

// Back to the review section of the product page (no query string, so the cached page can be served).
add_filter('comment_post_redirect', function ($location, $comment) {
    if ($comment && econur_rv_is_product_review((int) $comment->comment_post_ID, (int) $comment->comment_parent)) return get_permalink($comment->comment_post_ID) . '#ecn-reviews';
    return $location;
}, 20, 2);

// Check, re-encode and keep the uploaded photos privately until the review is approved. Returns [kept, refused].
function econur_rv_take_photos($cid, $files) {
    $dir = econur_rv_pending_dir(); $kept = array(); $bad = 0;
    $n = count($files['name']);
    for ($i = 0; $i < $n; $i++) {
        if (empty($files['name'][$i]) && UPLOAD_ERR_NO_FILE === (int) $files['error'][$i]) continue;
        if (count($kept) >= ECONUR_RV_MAX_PHOTOS) { $bad++; continue; }
        $tmp = $files['tmp_name'][$i];
        if (UPLOAD_ERR_OK !== (int) $files['error'][$i] || !is_uploaded_file($tmp) || (int) $files['size'][$i] > ECONUR_RV_MAX_BYTES || (int) $files['size'][$i] < 1) { $bad++; continue; }
        $out = econur_rv_reencode($tmp, $files['name'][$i], $dir);
        if ($out) $kept[] = $out; else $bad++;
    }
    if ($kept) update_comment_meta($cid, 'ecn_review_photos_pending', $kept);
    return array(count($kept), $bad);
}

// A new JPEG from the pixels only (GD), upright, at most 1600px. Returns the saved file name or ''.
function econur_rv_reencode($tmp, $name, $dir) {
    $chk = wp_check_filetype_and_ext($tmp, $name, array('jpg|jpeg|jpe' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'));
    if (empty($chk['type']) || !in_array($chk['type'], array('image/jpeg', 'image/png', 'image/webp'), true)) return '';
    $info = @getimagesize($tmp);
    if (!$info || $info[0] < 1 || $info[1] < 1 || $info[0] > 12000 || $info[1] > 12000 || !in_array($info['mime'], array('image/jpeg', 'image/png', 'image/webp'), true)) return '';
    if (!function_exists('imagecreatefromstring')) return '';
    $src = @imagecreatefromstring((string) file_get_contents($tmp));
    if (!$src) return '';
    if ('image/jpeg' === $info['mime'] && function_exists('exif_read_data')) {
        $ex = @exif_read_data($tmp);
        $o = isset($ex['Orientation']) ? (int) $ex['Orientation'] : 1;
        if (3 === $o) $src = imagerotate($src, 180, 0); elseif (6 === $o) $src = imagerotate($src, -90, 0); elseif (8 === $o) $src = imagerotate($src, 90, 0);
    }
    $w = imagesx($src); $h = imagesy($src); $s = min(1, 1600 / max($w, $h));
    $nw = max(1, (int) round($w * $s)); $nh = max(1, (int) round($h * $s));
    $dst = imagecreatetruecolor($nw, $nh);
    imagefill($dst, 0, 0, imagecolorallocate($dst, 255, 255, 255)); // transparent PNG/WebP areas become white
    imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);
    $file = wp_generate_password(24, false, false) . '.jpg';
    $ok = imagejpeg($dst, trailingslashit($dir) . $file, 84);
    imagedestroy($src); imagedestroy($dst);
    return $ok ? $file : '';
}

// Approved: move the review's photos into the Media Library (attached to the product) and show them on the review.
function econur_rv_publish_photos($cid) {
    $pending = get_comment_meta($cid, 'ecn_review_photos_pending', true);
    if (!$pending || !is_array($pending)) return;
    $c = get_comment($cid);
    if (!$c) return;
    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/media.php';
    require_once ABSPATH . 'wp-admin/includes/image.php';
    $dir = econur_rv_pending_dir(); $ids = (array) get_comment_meta($cid, 'ecn_review_photos', true); $ids = array_filter(array_map('intval', $ids));
    $product = get_the_title($c->comment_post_ID);
    foreach ($pending as $k => $f) {
        $f = basename((string) $f); $path = trailingslashit($dir) . $f;
        if (!preg_match('/^[A-Za-z0-9]{24}\.jpg$/', $f) || !file_exists($path)) continue;
        $tmp = wp_tempnam($f); copy($path, $tmp);
        $id = media_handle_sideload(array('name' => 'review-photo-' . $cid . '-' . ($k + 1) . '.jpg', 'tmp_name' => $tmp), (int) $c->comment_post_ID, 'Review photo: ' . $product);
        if (is_wp_error($id)) { @unlink($tmp); continue; }
        update_post_meta($id, '_wp_attachment_image_alt', 'Customer photo of ' . $product);
        update_post_meta($id, '_ecn_review_photo', (int) $cid);
        $ids[] = (int) $id;
        @unlink($path);
    }
    update_comment_meta($cid, 'ecn_review_photos', array_values(array_unique($ids)));
    delete_comment_meta($cid, 'ecn_review_photos_pending');
}
add_action('transition_comment_status', function ($new, $old, $comment) {
    if ('approved' === $new && $comment && econur_rv_is_product_review((int) $comment->comment_post_ID, (int) $comment->comment_parent)) econur_rv_publish_photos((int) $comment->comment_ID);
}, 10, 3);
// A review deleted for good takes its private photos with it.
add_action('delete_comment', function ($cid) {
    $pending = get_comment_meta($cid, 'ecn_review_photos_pending', true);
    if ($pending && is_array($pending)) foreach ($pending as $f) { $f = basename((string) $f); if (preg_match('/^[A-Za-z0-9]{24}\.jpg$/', $f)) @unlink(trailingslashit(econur_rv_pending_dir()) . $f); }
});

/* ---------- moderators: see the photos on the Comments screen ---------- */
add_filter('comment_text', function ($text, $comment = null) {
    if (!is_admin() || !$comment || !current_user_can('moderate_comments')) return $text;
    $pending = get_comment_meta($comment->comment_ID, 'ecn_review_photos_pending', true);
    $live = get_comment_meta($comment->comment_ID, 'ecn_review_photos', true);
    $out = '';
    if ($pending && is_array($pending)) foreach ($pending as $i => $f) {
        $u = wp_nonce_url(admin_url('admin-post.php?action=ecn_rv_photo&c=' . (int) $comment->comment_ID . '&i=' . (int) $i), 'ecn_rv_photo_' . (int) $comment->comment_ID);
        $out .= '<a href="' . esc_url($u) . '" target="_blank" rel="noopener"><img src="' . esc_url($u) . '" alt="" style="width:72px;height:72px;object-fit:cover;border-radius:6px;margin:6px 6px 0 0"></a>';
    }
    if ($live && is_array($live)) foreach ($live as $id) $out .= '<a href="' . esc_url(wp_get_attachment_url($id)) . '" target="_blank" rel="noopener">' . wp_get_attachment_image($id, array(72, 72), false, array('style' => 'width:72px;height:72px;object-fit:cover;border-radius:6px;margin:6px 6px 0 0')) . '</a>';
    if ($out) $text .= '<p style="margin:8px 0 0"><strong>' . ($pending ? 'Customer photos (shown on the product page after approval):' : 'Customer photos:') . '</strong><br>' . $out . '</p>';
    return $text;
}, 20, 2);
add_action('admin_post_ecn_rv_photo', function () {
    $cid = isset($_GET['c']) ? (int) $_GET['c'] : 0; $i = isset($_GET['i']) ? (int) $_GET['i'] : -1;
    if (!$cid || !current_user_can('moderate_comments') || !wp_verify_nonce(isset($_GET['_wpnonce']) ? sanitize_text_field(wp_unslash($_GET['_wpnonce'])) : '', 'ecn_rv_photo_' . $cid)) wp_die('Not allowed', 403);
    $pending = get_comment_meta($cid, 'ecn_review_photos_pending', true);
    $f = is_array($pending) && isset($pending[$i]) ? basename((string) $pending[$i]) : '';
    $path = trailingslashit(econur_rv_pending_dir()) . $f;
    if (!preg_match('/^[A-Za-z0-9]{24}\.jpg$/', $f) || !file_exists($path)) wp_die('Not found', 404);
    nocache_headers();
    header('Content-Type: image/jpeg'); header('X-Content-Type-Options: nosniff'); header('Content-Length: ' . filesize($path));
    readfile($path);
    exit;
});
