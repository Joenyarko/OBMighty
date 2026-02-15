<?php
require 'vendor/autoload.php';

// Load Laravel app
$app = require 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);

try {
    // Get company 2
    $company = \App\Models\Company::find(2);
    if (!$company) {
        echo "Company 2 not found\n";
        exit;
    }
    
    echo "=== Company 2 Data ===\n";
    echo "Name: " . $company->name . "\n";
    echo "ID: " . $company->id . "\n\n";
    
    // Check Payments
    $paymentCount = $company->payments()->count();
    $paymentSum = $company->payments()->sum('payment_amount');
    echo "Payments: Count=" . $paymentCount . ", Total=" . $paymentSum . "\n";
    
    // Check Expenses
    $expenseCount = $company->expenses()->count();
    $expenseSum = $company->expenses()->sum('amount');
    echo "Expenses: Count=" . $expenseCount . ", Total=" . $expenseSum . "\n";
    
    // Check Customers
    $customerCount = $company->customers()->count();
    echo "Customers: " . $customerCount . "\n";
    
    // Check Cards
    $cardCount = $company->cards()->count();
    echo "Cards: " . $cardCount . "\n";
    
    // Check Users/Staff
    $staffCount = $company->users()
        ->whereHas('roles', function($q) {
            $q->whereIn('name', ['worker', 'manager', 'secretary']);
        })->count();
    echo "Staff: " . $staffCount . "\n";
    
    // Check for orphaned payments (no company_id)
    $orphanPayments = \App\Models\Payment::whereNull('company_id')->count();
    echo "\nOrphaned Payments (no company_id): " . $orphanPayments . "\n";
    
    // Check for orphaned expenses
    $orphanExpenses = \App\Models\Expense::whereNull('company_id')->count();
    echo "Orphaned Expenses (no company_id): " . $orphanExpenses . "\n";
    
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
?>
