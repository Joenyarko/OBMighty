<?php
// Quick script to check logo storage
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Company;
use Illuminate\Support\Facades\Storage;

echo "APP_URL: " . config('app.url') . PHP_EOL;
echo "---" . PHP_EOL;

$companies = Company::all();
foreach ($companies as $company) {
    $raw = $company->getAttributes()['logo_url'] ?? 'NULL';
    $accessor = $company->logo_url;
    echo "Company #{$company->id} ({$company->name}):" . PHP_EOL;
    echo "  Raw DB value: {$raw}" . PHP_EOL;
    echo "  Accessor value: {$accessor}" . PHP_EOL;
    
    // Check if file exists
    if ($raw && $raw !== 'NULL') {
        // Try to extract folder/filename from the URL
        if (preg_match('#/api/images/([^/]+)/(.+)$#', $raw, $matches)) {
            $folder = $matches[1];
            $filename = $matches[2];
            $storagePath = "public/images/{$folder}/{$filename}";
            $exists = Storage::exists($storagePath);
            echo "  Storage path: {$storagePath}" . PHP_EOL;
            echo "  File exists: " . ($exists ? 'YES' : 'NO') . PHP_EOL;
            echo "  Full disk path: " . storage_path("app/{$storagePath}") . PHP_EOL;
        } else {
            echo "  URL format doesn't match /api/images/ pattern" . PHP_EOL;
        }
    }
    echo PHP_EOL;
}

// Also list what files actually exist in storage/app/public/images/logos/
echo "--- Files in storage/app/public/images/logos/ ---" . PHP_EOL;
$files = Storage::files('public/images/logos');
foreach ($files as $file) {
    echo "  {$file}" . PHP_EOL;
}
if (empty($files)) {
    echo "  (no files found)" . PHP_EOL;
}

echo PHP_EOL . "--- Files in storage/app/public/logos/ ---" . PHP_EOL;
$files2 = Storage::files('public/logos');
foreach ($files2 as $file) {
    echo "  {$file}" . PHP_EOL;
}
if (empty($files2)) {
    echo "  (no files found)" . PHP_EOL;
}
