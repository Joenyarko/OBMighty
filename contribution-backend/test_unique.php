<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$company1 = \App\Models\Company::firstOrCreate(['name' => 'Test Company 1']);
$company2 = \App\Models\Company::firstOrCreate(['name' => 'Test Company 2']);

// Make sure company 1 has a branch
$branch1 = \App\Models\Branch::updateOrCreate(
    ['name' => 'Duplicate Branch', 'company_id' => $company1->id],
    ['code' => 'DUP', 'company_id' => $company1->id]
);

// Now try to validate for company 2
$companyId = $company2->id;

$data = [
    'name' => 'Duplicate Branch',
    'code' => 'DUP'
];

$rules = [
        'name' => [
            'required', 'string', 'max:255',
            \Illuminate\Validation\Rule::unique('branches')->where(function ($query) use ($companyId) {
                return $query->where('company_id', $companyId);
            })
        ],
        'code' => [
            'required', 'string', 'max:20',
            \Illuminate\Validation\Rule::unique('branches')->where(function ($query) use ($companyId) {
                return $query->where('company_id', $companyId);
            })
        ],
];

$validator = \Illuminate\Support\Facades\Validator::make($data, $rules);

if ($validator->fails()) {
    echo "FAILED:\n";
    print_r($validator->errors()->all());
} else {
    echo "PASSED - Unique validation allows duplicates across companies!\n";
}
