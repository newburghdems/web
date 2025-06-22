<?php
// Set CORS headers
// Allow requests from any origin. For better security, you could restrict this
// to your specific domain, e.g., header('Access-Control-Allow-Origin: https://www.yourwebsite.com');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS'); // Allow GET and OPTIONS (for preflight requests)
header('Access-Control-Allow-Headers: Content-Type'); // Specify allowed headers

// Handle preflight OPTIONS request (sent by browsers to check CORS permissions)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    // End script execution if it's a preflight request
    exit(0);
}

// The target Google Calendar ICS URL
$googleCalendarIcsUrl = 'https://calendar.google.com/calendar/ical/townofnewburghdems%40gmail.com/public/basic.ics';

// Initialize a cURL session
$curlSession = curl_init();

// Set cURL options
curl_setopt($curlSession, CURLOPT_URL, $googleCalendarIcsUrl);
curl_setopt($curlSession, CURLOPT_RETURNTRANSFER, true);
curl_setopt($curlSession, CURLOPT_HEADER, false);
curl_setopt($curlSession, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($curlSession, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($curlSession, CURLOPT_CONNECTTIMEOUT, 10);
curl_setopt($curlSession, CURLOPT_TIMEOUT, 15);
curl_setopt($curlSession, CURLOPT_USERAGENT, 'TownOfNewburghDemsCalendarProxy/1.0');

// Execute the cURL session
$icsData = curl_exec($curlSession);
$httpStatusCode = curl_getinfo($curlSession, CURLINFO_HTTP_CODE);

// Check for cURL errors
if (curl_errno($curlSession)) {
    $errorMessage = 'cURL error: ' . curl_error($curlSession);
    curl_close($curlSession);
    // Don't send a separate HTTP status code here if headers already sent by CORS section
    // but ensure the error message is clear.
    error_log("Calendar Proxy Error (cURL): " . $errorMessage);
    // Send a generic error to the client if CORS headers already sent.
    // If not, you could send a 500.
    if ($_SERVER['REQUEST_METHOD'] != 'OPTIONS') { // Check if not preflight
        header("HTTP/1.1 500 Internal Server Error", true, 500);
        echo "An error occurred while trying to fetch calendar data (cURL issue).";
    }
    exit;
}

// Close the cURL session
curl_close($curlSession);

// Check the HTTP status code received from Google Calendar
if ($httpStatusCode == 200) {
    // Set the correct Content-Type header for ICS files
    // This should come *after* CORS headers and *before* echoing data
    header('Content-Type: text/calendar; charset=utf-8');
    echo $icsData;
} else {
    error_log("Calendar Proxy Error: Google Calendar responded with HTTP code " . $httpStatusCode);
    if ($_SERVER['REQUEST_METHOD'] != 'OPTIONS') { // Check if not preflight
         // Try to send Google's status code if possible, but be mindful of "headers already sent"
        if (!headers_sent()) {
            header("HTTP/1.1 " . $httpStatusCode, true, $httpStatusCode);
        } else {
            // If headers already sent (e.g. by CORS), just echo the error
            header("HTTP/1.1 502 Bad Gateway", true, 502); // Generic error if we can't relay Google's
        }
        echo "Error: The calendar server responded with an unexpected status: " . $httpStatusCode;
    }
}

exit;
?>
