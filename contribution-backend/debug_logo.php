<?php
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Company;

$company = Company::find(2);
if ($company) {
    echo "Raw logo_url from DB: " . $company->getRawOriginal('logo_url') . PHP_EOL;
    echo "Accessed logo_url (via accessor): " . $company->logo_url . PHP_EOL;
} else {
    echo "Company not found" . PHP_EOL;
}
