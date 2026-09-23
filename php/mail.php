<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP;

require '../js/mailer/Exception.php';
require '../js/mailer/PHPMailer.php';
require '../js/mailer/SMTP.php';

header('Content-Type: application/json; charset=utf-8');

/**
 * Respond as JSON and stop. The front-end reads {ok, error}.
 */
function respond($status, $ok, $error = null) {
	http_response_code($status);
	echo json_encode($error === null ? array('ok' => $ok) : array('ok' => $ok, 'error' => $error));
	exit;
}

/**
 * Config resolution order:
 *   1. Environment variables (Apache SetEnv / systemd).
 *   2. An ini file OUTSIDE the web root — default /etc/iosdc/mail.ini.
 * Credentials are never stored in this file or anywhere under the web root.
 * See php/mail.ini.example for the template.
 */
function mail_config() {
	$keys = array('SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM', 'MAIL_TO');
	$cfg = array();
	foreach ($keys as $k) {
		$v = getenv($k);
		$cfg[$k] = ($v === false) ? '' : trim($v);
	}

	$path = getenv('IOSDC_MAIL_CONFIG');
	if (!$path) { $path = '/etc/iosdc/mail.ini'; }
	if (is_readable($path)) {
		$ini = parse_ini_file($path);
		if (is_array($ini)) {
			foreach ($keys as $k) {
				if ($cfg[$k] === '' && isset($ini[$k])) { $cfg[$k] = trim($ini[$k]); }
			}
		}
	}

	if ($cfg['SMTP_PORT'] === '') { $cfg['SMTP_PORT'] = '587'; }
	return $cfg;
}

// --- Only accept POST -------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
	respond(405, false, 'Method Not Allowed');
}

// --- Honeypot: real users never fill this hidden field ----------------------
if (trim((string) ($_POST['website'] ?? '')) !== '') {
	// Silently accept so bots don't learn they were caught.
	respond(200, true);
}

// --- Read + validate input --------------------------------------------------
$name    = trim((string) ($_POST['name'] ?? ''));
$email   = trim((string) ($_POST['email'] ?? ''));
$subject = trim((string) ($_POST['subject'] ?? ''));
$message = trim((string) ($_POST['message'] ?? ''));

// Strip CR/LF — prevents SMTP header injection via the name/email/subject fields.
$strip = array("\r", "\n");
$name    = str_replace($strip, ' ', $name);
$email   = str_replace($strip, ' ', $email);
$subject = str_replace($strip, ' ', $subject);

if ($email === '' || $message === '') {
	respond(400, false, 'Please fill in your email address and a message.');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
	respond(400, false, 'Please enter a valid email address.');
}
if (mb_strlen($name) > 100 || mb_strlen($email) > 254
	|| mb_strlen($subject) > 200 || mb_strlen($message) > 5000) {
	respond(400, false, 'That message is too long. Please shorten it and try again.');
}

// --- Escape before building the HTML body -----------------------------------
$safeName    = htmlspecialchars($name === '' ? 'Not provided' : $name, ENT_QUOTES, 'UTF-8');
$safeEmail   = htmlspecialchars($email, ENT_QUOTES, 'UTF-8');
$safeSubject = htmlspecialchars($subject === '' ? 'Not provided' : $subject, ENT_QUOTES, 'UTF-8');
$safeMessage = nl2br(htmlspecialchars($message, ENT_QUOTES, 'UTF-8'));

// --- Send -------------------------------------------------------------------
$cfg = mail_config();
foreach (array('SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM', 'MAIL_TO') as $k) {
	if ($cfg[$k] === '') {
		error_log('mail.php: ' . $k . ' is not configured; submission dropped. See php/mail.ini.example.');
		respond(503, false, 'The contact form is temporarily unavailable. Please email profsg.mba@geu.ac.in directly.');
	}
}

try {
	$mail = new PHPMailer(true);
	$mail->isSMTP();
	$mail->CharSet = 'UTF-8';
	$mail->SMTPAuth = true;

	$mail->Host     = $cfg['SMTP_HOST'];
	$mail->Username = $cfg['SMTP_USER'];
	$mail->Password = $cfg['SMTP_PASS'];
	$mail->Port     = (int) $cfg['SMTP_PORT'];
	// 465 is implicit TLS; everything else negotiates STARTTLS.
	$mail->SMTPSecure = ((int) $cfg['SMTP_PORT'] === 465)
		? PHPMailer::ENCRYPTION_SMTPS
		: PHPMailer::ENCRYPTION_STARTTLS;

	// Envelope sender must be a domain we control, or SPF/DMARC will reject us.
	// The visitor's address goes in Reply-To so "Reply" reaches them.
	$mail->setFrom($cfg['MAIL_FROM'], 'iOS Development Centre');
	$mail->addAddress($cfg['MAIL_TO']);
	$mail->addReplyTo($email, $name === '' ? $email : $name);

	$mail->isHTML(true);
	$mail->Subject = 'Website enquiry' . ($subject === '' ? '' : ': ' . $subject);
	$mail->Body =
		'<p><strong>Name:</strong> ' . $safeName . '</p>' .
		'<p><strong>Email:</strong> ' . $safeEmail . '</p>' .
		'<p><strong>Subject:</strong> ' . $safeSubject . '</p>' .
		'<p><strong>Message:</strong><br>' . $safeMessage . '</p>' .
		'<hr><p style="color:#888;font-size:12px">Sent from the contact form at iosdc.geu.ac.in</p>';
	$mail->AltBody =
		"Name: $name\nEmail: $email\nSubject: $subject\n\n$message";

	$mail->send();
	respond(200, true);
} catch (Exception $e) {
	// Log the detail; never echo PHPMailer internals to the browser.
	error_log('mail.php: ' . (isset($mail) ? $mail->ErrorInfo : $e->getMessage()));
	respond(500, false, 'Could not send your message. Please email profsg.mba@geu.ac.in directly.');
}
