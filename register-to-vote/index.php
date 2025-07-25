<?php
$destination_url = 'https://dmv.ny.gov/more-info/electronic-voter-registration-application';
header("Location: " . $destination_url, true, 301);
exit();
?>
