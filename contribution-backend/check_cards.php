<?php
// Script to check card database values and storage
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Card;
use Illuminate\Support\Facades\Storage;

echo "APP_URL: " . config('app.url') . PHP_EOL;
echo "---" . PHP_EOL;

$cards = Card::withTrashed()->get();
echo "Total cards in DB: " . $cards->count() . PHP_EOL . PHP_EOL;

$missingCount = 0;
foreach ($cards as $card) {
    $rawFront = $card->getAttributes()['front_image'] ?? 'NULL';
    $rawBack = $card->getAttributes()['back_image'] ?? 'NULL';
    
    $accessorFront = $card->front_image_url;
    $accessorBack = $card->back_image_url;
    
    echo "Card #{$card->id} ({$card->card_name}):" . PHP_EOL;
    echo "  Raw Front: {$rawFront}" . PHP_EOL;
    echo "  Accessor Front: {$accessorFront}" . PHP_EOL;
    echo "  Raw Back: {$rawBack}" . PHP_EOL;
    echo "  Accessor Back: {$accessorBack}" . PHP_EOL;
    
    // Check if files exist in storage/app/public/
    if ($rawFront && $rawFront !== 'NULL') {
        $cleanPath = str_starts_with($rawFront, '/') ? substr($rawFront, 1) : $rawFront;
        // If it starts with http, it is a full URL
        if (str_starts_with($cleanPath, 'http')) {
            echo "  Front: Full URL (Cannot check local file directly)" . PHP_EOL;
        } else {
            // Check in public disk
            $exists = Storage::disk('public')->exists($cleanPath);
            echo "  Front File Exists in public disk: " . ($exists ? 'YES' : 'NO') . PHP_EOL;
            if (!$exists) $missingCount++;
        }
    }
    
    if ($rawBack && $rawBack !== 'NULL') {
        $cleanPath = str_starts_with($rawBack, '/') ? substr($rawBack, 1) : $rawBack;
        if (str_starts_with($cleanPath, 'http')) {
            echo "  Back: Full URL" . PHP_EOL;
        } else {
            $exists = Storage::disk('public')->exists($cleanPath);
            echo "  Back File Exists in public disk: " . ($exists ? 'YES' : 'NO') . PHP_EOL;
        }
    }
    echo PHP_EOL;
}

echo "--- Summary ---" . PHP_EOL;
echo "Missing front files count: {$missingCount}" . PHP_EOL;
