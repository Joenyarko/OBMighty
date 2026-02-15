<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Company;
use App\Models\User;
use Carbon\Carbon;

class TestDashboard extends Command
{
    protected $signature = 'test:dashboard {--company_id=1}';
    protected $description = 'Test the dashboard data retrieval';

    public function handle()
    {
        $companyId = $this->option('company_id');
        $company = Company::find($companyId);

        if (!$company) {
            $this->error("Company ID {$companyId} not found");
            return;
        }

        $this->info("=== Testing Dashboard for Company: {$company->name} ===\n");

        $today = Carbon::today();
        $startOfMonth = Carbon::now()->startOfMonth();
        $endOfMonth = Carbon::now()->endOfMonth();

        // Overview
        $this->info("OVERVIEW:");
        $this->line("  Today Revenue: " . $company->payments()->whereDate('payment_date', $today)->sum('payment_amount'));
        $this->line("  Month Revenue: " . $company->payments()->whereBetween('payment_date', [$startOfMonth, $endOfMonth])->sum('payment_amount'));
        $this->line("  Total Customers: " . $company->customers()->count());
        $this->line("  Active Customers: " . $company->customers()->where('status', 'in_progress')->count());
        $this->line("  Total Branches: " . $company->branches()->count());
        $this->line("  Total Staff: " . $company->users()->whereHas('roles', function($q) {
            $q->whereIn('name', ['worker', 'manager', 'secretary']);
        })->count());
        $this->line("  Total Cards Issued: " . $company->customerCards()->count());
        $this->line("  Total Card Templates: " . $company->cards()->count());
        $this->line("  Overall Revenue: " . $company->payments()->sum('payment_amount'));
        $this->line("  Overall Expense: " . $company->expenses()->sum('amount'));

        // Revenue
        $this->info("\nREVENUE:");
        $this->line("  Daily Transactions: " . $company->payments()->whereDate('payment_date', $today)->count());
        $this->line("  Monthly Transactions: " . $company->payments()->whereBetween('payment_date', [$startOfMonth, $endOfMonth])->count());

        // Performance
        $this->info("\nPERFORMANCE:");
        $this->line("  Branches: " . $company->branches()->count());

        // Workers
        $this->info("\nTOP WORKERS:");
        $workers = $company->users()->whereHas('roles', function ($q) {
            $q->where('name', 'worker');
        })->count();
        $this->line("  Total Workers: " . $workers);

        // Payments
        $this->info("\nRECENT PAYMENTS:");
        $recentPayments = $company->payments()->with(['customer', 'worker'])->orderByDesc('created_at')->limit(3)->get();
        $this->line("  Total Payments: " . $company->payments()->count());
        $this->line("  Sample Payments: " . $recentPayments->count());
        foreach ($recentPayments as $payment) {
            $this->line("    - {$payment->customer?->name} -> {$payment->worker?->name}: ₦{$payment->payment_amount}");
        }

        // Alerts
        $this->info("\nALERTS:");
        $defaulters = $company->customers()->where('status', 'defaulting')->count();
        $this->line("  Defaulters: " . $defaulters);
        $lowStock = $company->stockItems()->whereRaw('quantity <= reorder_level')->count();
        $this->line("  Low Stock Items: " . $lowStock);

        $this->info("\n✓ Dashboard test complete!");
    }
}
