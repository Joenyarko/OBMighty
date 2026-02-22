<?php
$file = __DIR__.'/storage/logs/laravel.log';
if (!file_exists($file)) { echo "Log file not found."; exit; }
$lines = file($file);
$last_lines = array_slice($lines, -200);
foreach($last_lines as $line) {
    echo $line;
}
