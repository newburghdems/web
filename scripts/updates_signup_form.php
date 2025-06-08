<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Get form data
    $page_lang = isset($_POST['lang']) ? $_POST['lang'] : 'en';
    $firstName = strip_tags(trim($_POST["first-name"]));
    $lastName = strip_tags(trim($_POST["last-name"]));
    $email = filter_var(trim($_POST["email"]), FILTER_SANITIZE_EMAIL);
    $recipient = "mail@newburghdems.org";
    $senderEmail = "mail@newburghdems.org";

    // Check if fields are empty
    if (empty($firstName) || empty($lastName) || empty($email)) {
        // Set a 400 (bad request) response code and exit.
        http_response_code(400);
        echo "Oops! There was a problem with your submission. Please complete all fields and try again.";
        exit;
    }

    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        // Set a 400 (bad request) response code and exit.
        http_response_code(400);
        echo "Oops! Please enter a valid email address.";
        exit;
    }

    // Email subject
    $subject = "New Update Signup from $firstName $lastName";

    // Email content
    $email_content = "You have received a new signup for updates:\n\n";
    $email_content .= "First Name: $firstName\n";
    $email_content .= "Last Name: $lastName\n";
    $email_content .= "Email: $email\n\n";
    $email_content .= "Please add this person to your mailing list.";

    // Email headers
    // The "From" address should be one hosted on your Namecheap server
    $headers = "From: $senderEmail\r\n";
    $headers .= "Reply-To: $email\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();

    // Send the email
    if (mail($recipient, $subject, $email_content, $headers)) {
        // Set a 200 (okay) response code.
        $base_url = ""; // Assuming the site is at the root of the domain.

        // If processing was successful, redirect to the appropriate "thank you" page.
        $lang_prefix = '';
        if ($page_lang === 'es') {
            $lang_prefix = '/es'; // Set language prefix for Spanish
        }
        // Construct the redirect URL using the language prefix and the thank-you page permalink.
        $redirect_url = $base_url . $lang_prefix . "/thank-you/";

        header("Location: " . $redirect_url);
        exit;
    } else {
        // Set a 500 (internal server error) response code.
        http_response_code(500);
        echo "Oops! Something went wrong and we couldn't send your message.";
    }

} else {
    // Not a POST request, set a 403 (forbidden) response code.
    http_response_code(403);
    echo "There was a problem with your submission, please try again.";
}
?>
