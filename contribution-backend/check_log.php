<?php
$logFile = __DIR__.'/storage/logs/laravel.log';
if (!file_exists($logFile)) { echo "No log found.\n"; exit; }
$cmd = 'grep -C 15 "phone" ' . escapeshellarg($logFile) . ' | tail -n 100';
echo shell_exec($cmd);
