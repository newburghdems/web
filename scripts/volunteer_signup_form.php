<?php
// This script handles the submission of the volunteer signup form.

// --- Configuration ---
$recipient_email = "mail@newburghdems.org";
$email_subject = "New Volunteer Signup";

// --- Form Processing ---

// Only process POST requests.
if ($_SERVER["REQUEST_METHOD"] == "POST") {

    // Sanitize and retrieve form data.
    // The 'FILTER_SANITIZE_STRING' is deprecated in PHP 8. Use 'htmlspecialchars' instead for security.
    $first_name = isset($_POST['first-name']) ? htmlspecialchars(trim($_POST['first-name'])) : '';
    $last_name = isset($_POST['last-name']) ? htmlspecialchars(trim($_POST['last-name'])) : '';
    $email = isset($_POST['email']) ? filter_var(trim($_POST['email']), FILTER_SANITIZE_EMAIL) : '';
    $interests = isset($_POST['interests']) ? htmlspecialchars(trim($_POST['interests'])) : 'No interests specified.';
    $lang = isset($_POST['lang']) && $_POST['lang'] === 'es' ? 'es' : 'en';

    // Basic validation.
    if (empty($first_name) || empty($last_name) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        // If validation fails, redirect back to the form page or show an error.
        // For simplicity, we'll just exit. A more robust solution would show an error message.
        http_response_code(400);
        echo "Please fill out all required fields correctly.";
        exit;
    }

    // --- Email Composition ---

    // Construct the email body.
    $email_body = "A new volunteer has signed up through the website.\n\n";
    $email_body .= "Details:\n";
    $email_body .= "------------------------\n";
    $email_body .= "First Name: " . $first_name . "\n";
    $email_body .= "Last Name: " . $last_name . "\n";
    $email_body .= "Email: " . $email . "\n\n";
    $email_body .= "They are interested in helping with:\n";
    $email_body .= $interests . "\n";
    $email_body .= "------------------------\n\n";
    $email_body .= "You can reply directly to this email to contact them.";

    // Construct email headers.
    $headers = "From: TNDems Website <noreply@newburghdems.org>\r\n";
    $headers .= "Reply-To: " . $first_name . " " . $last_name . " <" . $email . ">\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();

    // --- Send Email ---

    // Use the mail() function to send the email.
    if (mail($recipient_email, $email_subject, $email_body, $headers)) {
        // --- Redirect to Thank You Page ---
        // Determine the correct thank you page based on the language.
        $thank_you_path = ($lang === 'es') ? '/es/thank-you/' : '/thank-you/';

        // Get the server protocol and host to build an absolute URL.
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https" : "http";
        $host = $_SERVER['HTTP_HOST'];
        $redirect_url = $protocol . "://" . $host . $thank_you_path;

        header("Location: " . $redirect_url);
        exit; // Ensure no further code is executed after redirection.
    } else {
        // If mail() fails, show an error.
        http_response_code(500);
        echo "There was a problem sending your message. Please try again later.";
        exit;
    }

} else {
    // If it's not a POST request, forbid access.
    http_response_code(403);
    echo "There was a problem with your submission, please try again.";
    exit;
}
?>
