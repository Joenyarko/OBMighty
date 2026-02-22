<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$data = [];

$rules = [
    'new_ceo_phone' => 'string|regex:/^[0-9]{10}$/',
];

$validator = \Illuminate\Support\Facades\Validator::make($data, $rules);

if ($validator->fails()) {
    echo "FAILED:\n";
    print_r($validator->errors()->all());
} else {
    echo "PASSED\n";
}
