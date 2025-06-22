<?php
/**
 * Signup Form Processor
 *
 * This script handles two types of form submissions: 'updates' and 'volunteer'. 
 * It validates the incoming POST data, sanitizes it, sends an email notification
 * to the site administrator, adds the data to a Google Sheet, and redirects 
 * the user to the appropriate thank-you page. 
 */

// =============================================================================
// Include the Google API Client Library
// =============================================================================
require_once __DIR__ . '/vendor/autoload.php';

// 1. INITIAL SETUP
// -----------------------------------------------------------------------------

// Ensure the script is accessed via a POST request. 
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    header("Location: /");
    exit;
}

// 2. DATA COLLECTION & SANITIZATION
// -----------------------------------------------------------------------------

$first_name = isset($_POST['first-name']) ? filter_var(trim($_POST['first-name']), FILTER_SANITIZE_STRING) : '';
$last_name  = isset($_POST['last-name']) ? filter_var(trim($_POST['last-name']), FILTER_SANITIZE_STRING) : '';
$email      = isset($_POST['email']) ? filter_var(trim($_POST['email']), FILTER_SANITIZE_EMAIL) : '';
$lang = isset($_POST['lang']) && $_POST['lang'] === 'es' ? 'es' : 'en';
$signup_type = isset($_POST['signup-type']) ? trim($_POST['signup-type']) : '';

// 3. VALIDATION
// -----------------------------------------------------------------------------

// Basic validation: check for required fields and a valid email. 
if (empty($first_name) || empty($last_name) || !filter_var($email, FILTER_VALIDATE_EMAIL) || empty($signup_type)) {
    header("Location: /");
    exit;
}

// 4. GOOGLE SHEETS & EMAIL LOGIC
// -----------------------------------------------------------------------------

// --- Configuration ---
$recipient_email = "townofnewburghdems@gmail.com";
$email_from      = "no-reply@newburghdems.org";
$subject         = "";
$message_body    = "";
$redirect_path   = "/";
$interests       = 'N/A'; // Default value for interests

// --- Build email and redirect based on signup type ---
switch ($signup_type) {
    case 'updates':
        $subject       = "New Email List Signup";
        $redirect_path = ($lang === 'es') ? '/es/thank-you/' : '/thank-you/';
        $message_body .= "A new person has signed up for the email list.\n\n";
        break;

    case 'volunteer':
        $subject       = "New Volunteer Signup";
        $redirect_path = ($lang === 'es') ? '/es/volunteer-thank-you/' : '/volunteer-thank-you/';
        $interests = isset($_POST['interests']) ? filter_var(trim($_POST['interests']), FILTER_SANITIZE_STRING) : 'No specific interests listed.';
        if (empty($interests)) {
            $interests = "No specific interests listed.";
        }
        $message_body .= "A new person has signed up to volunteer!\n\n";
        break;

    default:
        // If the signup type is not recognized, exit and redirect to home. 
        header("Location: /");
        exit;
}

// Construct the common part of the email body
$message_body .= "----------------------------------------\n";
$message_body .= "First Name: " . $first_name . "\n";
$message_body .= "Last Name: " . $last_name . "\n";
$message_body .= "Email: " . $email . "\n";
if ($signup_type === 'volunteer') {
    $message_body .= "\nStated Interests/Comments:\n" . $interests . "\n";
}
$message_body .= "----------------------------------------\n";

// =============================================================================
// NEW: GOOGLE SHEETS INTEGRATION
// =============================================================================
try {
    $spreadsheetId = '1MJBpzB93WaOEcNpr3nW629ElKq4ptACR7qBgD_8Qb94';
    $range = 'Submissions';

    $googleAccountKeyFilePath = __DIR__ . '../../etc/newburghdems.org/google-api-credentials.json';
    putenv('GOOGLE_APPLICATION_CREDENTIALS=' . $googleAccountKeyFilePath);

    $client = new Google_Client();
    $client->useApplicationDefaultCredentials();
    $client->addScope('https://www.googleapis.com/auth/spreadsheets');

    $service = new Google_Service_Sheets($client);

    // Get current timestamp
    $timestamp = date("Y-m-d H:i:s");

    // Prepare the new row data
    $newRow = [
        $timestamp,
        $signup_type,
        $first_name,
        $last_name,
        $email,
        $interests
    ];

    $body = new Google_Service_Sheets_ValueRange([
        'values' => [$newRow]
    ]);

    $params = [
        'valueInputOption' => 'USER_ENTERED'
    ];

    $insert = [
        "insertDataOption" => "INSERT_ROWS"
    ];

    // Append the new row
    $service->spreadsheets_values->append($spreadsheetId, $range, $body, $params, $insert);

} catch (Exception $e) {
    // Log the error to your server's error log instead of showing it to the user.
    error_log('Google Sheets API Error: ' . $e->getMessage());
    // You might want to add logic here to notify yourself that the sheet write failed.
}

// 5. SEND EMAIL
// -----------------------------------------------------------------------------
$headers = "From: " . $email_from . "\r\n";
$headers .= "Reply-To: " . $email . "\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

// Attempt to send the email and then redirect.
if (mail($recipient_email, $subject, $message_body, $headers)) {
    header("Location: " . $redirect_path);
} else {
    // Fallback if mail fails. The sheet write may have still succeeded.
    header("Location: " . $redirect_path);
}

exit;
?>
