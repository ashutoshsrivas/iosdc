<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP;

require '../js/mailer/Exception.php';
require '../js/mailer/PHPMailer.php';
require '../js/mailer/SMTP.php';

// Only accept POST.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
	http_response_code(405);
	exit('Method Not Allowed');
}

// Read + validate input. Never trust $_POST straight into the mail body.
$name    = trim((string) ($_POST['name'] ?? ''));
$email   = trim((string) ($_POST['email'] ?? ''));
$message = trim((string) ($_POST['message'] ?? ''));

// Strip CR/LF — prevents SMTP header injection via the name/email fields.
$name  = str_replace(array("\r", "\n"), ' ', $name);
$email = str_replace(array("\r", "\n"), ' ', $email);

if ($name === '' || $email === '' || $message === '') {
	http_response_code(400);
	exit('All fields are required.');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
	http_response_code(400);
	exit('Please enter a valid email address.');
}
if (mb_strlen($name) > 100 || mb_strlen($email) > 254 || mb_strlen($message) > 5000) {
	http_response_code(400);
	exit('Input too long.');
}

// Escape before building the HTML body.
$safeName    = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
$safeEmail   = htmlspecialchars($email, ENT_QUOTES, 'UTF-8');
$safeMessage = nl2br(htmlspecialchars($message, ENT_QUOTES, 'UTF-8'));

// TODO: set these from the server environment — do not hardcode credentials here.
//   SMTP_HOST, SMTP_USER, SMTP_PASS, MAIL_FROM, MAIL_TO
$smtpHost = getenv('SMTP_HOST');
$smtpUser = getenv('SMTP_USER');
$smtpPass = getenv('SMTP_PASS');
$mailFrom = getenv('MAIL_FROM');
$mailTo   = getenv('MAIL_TO');

if (!$smtpHost || !$smtpUser || !$smtpPass || !$mailFrom || !$mailTo) {
	error_log('mail.php: SMTP is not configured; contact form submission dropped.');
	http_response_code(503);
	exit('The contact form is temporarily unavailable. Please email profsg.mba@geu.ac.in directly.');
}

try {
	$mail = new PHPMailer(true);
	$mail->isSMTP();
	$mail->CharSet = 'UTF-8';
	$mail->SMTPAuth = true;

	$mail->Host     = $smtpHost;
	$mail->Username = $smtpUser;
	$mail->Password = $smtpPass;
	$mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
	$mail->Port = 587;

	$mail->setFrom($mailFrom, 'iOS Development Centre');
	$mail->addAddress($mailTo);
	$mail->addReplyTo($email, $name);

	$mail->isHTML(true);
	$mail->Subject = 'Website enquiry — iOS Development Centre';
	$mail->Body = 'Name - ' . $safeName . '<br>' . 'Email - ' . $safeEmail . '<br>' . 'Message - ' . $safeMessage;
	$mail->send();
	http_response_code(200);
	echo 'OK';
} catch (Exception $e) {
	// Log the detail; never echo PHPMailer internals to the browser.
	error_log('mail.php: ' . $mail->ErrorInfo);
	http_response_code(500);
	echo 'Could not send your message. Please email profsg.mba@geu.ac.in directly.';
}
