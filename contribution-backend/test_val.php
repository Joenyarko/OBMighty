<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$request = \Illuminate\Http\Request::create('/api/admin/companies/1', 'PUT', []);
$controller = app(\App\Http\Controllers\Api\Admin\CompanyController::class);

try {
    $controller->update($request, 1);
    echo "SUCCESS\n";
} catch (\Illuminate\Validation\ValidationException $e) {
    echo "VALIDATION ERROR: \n";
    print_r($e->errors());
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
