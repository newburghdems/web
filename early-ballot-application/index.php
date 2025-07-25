<?php
$destination_url = 'https://ballotapplication.elections.ny.gov/home/earlymail';
header("Location: " . $destination_url, true, 301);
exit();
?>
