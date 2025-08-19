<?php
// =============================================================================
// 1. CONFIGURATION
// =============================================================================
$cacheDir = __DIR__ . '/../cache';
$cacheFile = $cacheDir . '/calendar.ics';
$cacheLifetime = 24 * 60 * 60; // 24 hours in seconds
$googleCalendarIcsUrl = 'https://calendar.google.com/calendar/ical/townofnewburghdems%40gmail.com/public/basic.ics';

// =============================================================================
// 2. SET HEADERS
// =============================================================================
// Set CORS headers to allow requests from any origin.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// =============================================================================
// 3. CACHE HANDLING
// =============================================================================
$manualRefresh = isset($_GET['refresh']) && $_GET['refresh'] === 'true';

// If a manual refresh is requested, delete the old cache file
if ($manualRefresh && file_exists($cacheFile)) {
    unlink($cacheFile);
}

// Check if a valid, non-expired cache file exists
if (!$manualRefresh && file_exists($cacheFile) && (time() - filemtime($cacheFile) < $cacheLifetime)) {
    // Serve the cached file
    header('Content-Type: text/calendar; charset=utf-8');
    readfile($cacheFile);
    exit;
}

// =============================================================================
// 4. FETCH FROM GOOGLE (IF CACHE IS MISSING OR EXPIRED)
// =============================================================================
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
    error_log("Calendar Proxy Error (cURL): " . $errorMessage);
    if ($_SERVER['REQUEST_METHOD'] != 'OPTIONS') {
        header("HTTP/1.1 500 Internal Server Error", true, 500);
        echo "An error occurred while trying to fetch calendar data (cURL issue).";
    }
    exit;
}

// Close the cURL session
curl_close($curlSession);

// =============================================================================
// 5. PROCESS RESPONSE & UPDATE CACHE
// =============================================================================
if ($httpStatusCode == 200) {
    // Ensure the cache directory exists and is writable
    if (!is_dir($cacheDir)) {
        mkdir($cacheDir, 0755, true);
    }
    // Write the new data to the cache file
    file_put_contents($cacheFile, $icsData);

    // Serve the newly fetched data
    header('Content-Type: text/calendar; charset=utf-8');
    echo $icsData;
} else {
    error_log("Calendar Proxy Error: Google Calendar responded with HTTP code " . $httpStatusCode);
    if ($_SERVER['REQUEST_METHOD'] != 'OPTIONS') {
        if (!headers_sent()) {
            header("HTTP/1.1 " . $httpStatusCode, true, $httpStatusCode);
        } else {
            header("HTTP/1.1 502 Bad Gateway", true, 502);
        }
        echo "Error: The calendar server responded with an unexpected status: " . $httpStatusCode;
    }
}

exit;
?>
