<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $u = \App\Models\User::whereHas('roles', function($q){ $q->where('name', 'super_admin'); })->first();
    $r = new \Illuminate\Http\Request();
    $r->merge(['name' => 'T Branch', 'code' => 'TB']);
    $r->setUserResolver(function() use ($u) { return $u; });
    app()->instance('is_super_admin', true);
    $response = app(\App\Http\Controllers\Api\BranchController::class)->store($r);
    echo "SUCCESS: " . json_encode($response);
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n" . $e->getTraceAsString();
}
