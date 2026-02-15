<?php
require 'bootstrap/app.php';

// Get a company (find one that exists)
$company = \App\Models\Company::first();

if (!$company) {
    echo "No companies found\n";
    exit;
}

echo "=== Company Info ===\n";
echo "ID: " . $company->id . "\n";
echo "Name: " . $company->name . "\n\n";

echo "=== Data Associated with Company ===\n";
echo "Payments: " . $company->payments()->count() . "\n";
echo "Customers: " . $company->customers()->count() . "\n";
echo "Users: " . $company->users()->count() . "\n";
echo "Cards: " . $company->cards()->count() . "\n";
echo "Branches: " . $company->branches()->count() . "\n";
echo "Expenses: " . $company->expenses()->count() . "\n";
echo "Customer Cards: " . $company->customerCards()->count() . "\n\n";

echo "=== CEO User ===\n";
$ceoUser = $company->users()->whereHas('roles', function($q) {
    $q->where('name', 'ceo');
})->first();

if ($ceoUser) {
    echo "Found CEO: " . $ceoUser->name . " (ID: " . $ceoUser->id . ")\n";
    echo "Email: " . $ceoUser->email . "\n";
    echo "Company ID: " . $ceoUser->company_id . "\n";
} else {
    echo "No CEO user found for this company\n";
    echo "Creating test data for dashboard...\n";
}

echo "\n=== Revenue Data ===\n";
$today = \Carbon\Carbon::today();
$todayPayments = $company->payments()->whereDate('payment_date', $today)->sum('payment_amount');
$monthPayments = $company->payments()->whereBetween('payment_date', [\Carbon\Carbon::now()->startOfMonth(), \Carbon\Carbon::now()->endOfMonth()])->sum('payment_amount');

echo "Today's Payments: " . $todayPayments . "\n";
echo "Month's Payments: " . $monthPayments . "\n";
?>
