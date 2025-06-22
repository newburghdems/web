<?php
/**
 * Signup Form Processor
 *
 * This script handles two types of form submissions: 'updates' and 'volunteer'.
 * It validates the incoming POST data, sanitizes it, sends an email notification
 * to the site administrator, and redirects the user to the appropriate
 * thank-you page based on the form type and language preference.
 */

// 1. INITIAL SETUP
// -----------------------------------------------------------------------------

// Ensure the script is accessed via a POST request.
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    // If not, redirect to the homepage.
    header("Location: /");
    exit;
}

// 2. DATA COLLECTION & SANITIZATION
// -----------------------------------------------------------------------------

// Sanitize and retrieve common form fields.
$first_name = isset($_POST['first-name']) ? filter_var(trim($_POST['first-name']), FILTER_SANITIZE_STRING) : '';
$last_name  = isset($_POST['last-name']) ? filter_var(trim($_POST['last-name']), FILTER_SANITIZE_STRING) : '';
$email      = isset($_POST['email']) ? filter_var(trim($_POST['email']), FILTER_SANITIZE_EMAIL) : '';

// Determine language ('en' or 'es'). Defaults to 'en'.
$lang = isset($_POST['lang']) && $_POST['lang'] === 'es' ? 'es' : 'en';

// Get the type of signup ('updates' or 'volunteer').
$signup_type = isset($_POST['signup-type']) ? trim($_POST['signup-type']) : '';

// 3. VALIDATION
// -----------------------------------------------------------------------------

// Basic validation: check for required fields and a valid email.
// Redirect to homepage if validation fails.
if (empty($first_name) || empty($last_name) || !filter_var($email, FILTER_VALIDATE_EMAIL) || empty($signup_type)) {
    header("Location: /");
    exit;
}

// 4. EMAIL AND REDIRECT LOGIC
// -----------------------------------------------------------------------------

// --- Configuration ---
$recipient_email = "townofnewburghdems@gmail.com"; // The email address to receive notifications.
$email_from      = "no-reply@newburghdems.org";    // The 'From' address for the email.

// --- Initialize variables ---
$subject        = "";
$message_body   = "";
$redirect_path  = "/"; // Default redirect path.

// --- Build email and redirect based on signup type ---
switch ($signup_type) {
    case 'updates':
        // Set subject and redirect for email list signups.
        $subject       = "New Email List Signup";
        $redirect_path = ($lang === 'es') ? '/es/thank-you/' : '/thank-you/';

        // Construct the email body.
        $message_body .= "A new person has signed up for the email list.\n\n";
        $message_body .= "----------------------------------------\n";
        $message_body .= "First Name: " . $first_name . "\n";
        $message_body .= "Last Name: " . $last_name . "\n";
        $message_body .= "Email: " . $email . "\n";
        $message_body .= "----------------------------------------\n";
        break;

    case 'volunteer':
        // Set subject and redirect for volunteer signups.
        $subject       = "New Volunteer Signup";
        $redirect_path = ($lang === 'es') ? '/es/volunteer-thank-you/' : '/volunteer-thank-you/';

        // Sanitize the 'interests' field, which is specific to volunteers.
        $interests = isset($_POST['interests']) ? filter_var(trim($_POST['interests']), FILTER_SANITIZE_STRING) : 'No specific interests listed.';
        if (empty($interests)) {
            $interests = "No specific interests listed.";
        }

        // Construct the email body.
        $message_body .= "A new person has signed up to volunteer!\n\n";
        $message_body .= "----------------------------------------\n";
        $message_body .= "First Name: " . $first_name . "\n";
        $message_body .= "Last Name: " . $last_name . "\n";
        $message_body .= "Email: " . $email . "\n\n";
        $message_body .= "Stated Interests/Comments:\n" . $interests . "\n";
        $message_body .= "----------------------------------------\n";
        break;

    default:
        // If the signup type is not recognized, exit and redirect to home.
        header("Location: /");
        exit;
}

// 5. SEND EMAIL
// -----------------------------------------------------------------------------

// Set standard email headers.
$headers = "From: " . $email_from . "\r\n";
$headers .= "Reply-To: " . $email . "\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

// Attempt to send the email.
if (mail($recipient_email, $subject, $message_body, $headers)) {
    // If mail is sent successfully, redirect to the designated thank-you page.
    header("Location: " . $redirect_path);
} else {
    // If mail fails, redirect to the homepage as a fallback.
    // In a real-world scenario, you might add more robust error logging here.
    header("Location: /");
}

exit;
?>

