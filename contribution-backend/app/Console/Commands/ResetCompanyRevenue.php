<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Company;
use App\Models\Payment;
use App\Models\Expense;
use App\Models\WorkerDailyTotal;
use App\Models\CompanyDailyTotal;

class ResetCompanyRevenue extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'company:reset-revenue {company_id? : The ID of the company}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Wipes all payments, expenses, and daily totals for a specific company to reset its revenue data.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $companyId = $this->argument('company_id');

        if (!$companyId) {
            $this->info('Available Companies:');
            foreach (Company::all() as $c) {
                $this->info("ID: {$c->id} | Name: {$c->name}");
            }
            $companyId = $this->ask('Please enter the ID of the company you want to reset');
        }

        $company = Company::find($companyId);

        if (!$company) {
            $this->error("Company with ID {$companyId} not found.");
            return 1;
        }

        $this->warn("WARNING: This will permanently delete ALL payments, expenses, and daily totals for '{$company->name}'.");
        
        if (!$this->confirm('Are you absolutely sure you want to proceed?')) {
            $this->info('Operation cancelled.');
            return 0;
        }

        $this->info("Resetting revenue data for {$company->name}...");

        // Delete Payments
        $paymentsCount = Payment::where('company_id', $company->id)->count();
        Payment::where('company_id', $company->id)->delete();
        $this->info("- Deleted {$paymentsCount} payments.");

        // Delete Expenses
        $expensesCount = Expense::where('company_id', $company->id)->count();
        Expense::where('company_id', $company->id)->delete();
        $this->info("- Deleted {$expensesCount} expenses.");

        // Delete Worker Daily Totals
        $workerTotalsCount = WorkerDailyTotal::where('company_id', $company->id)->count();
        WorkerDailyTotal::where('company_id', $company->id)->delete();
        $this->info("- Deleted {$workerTotalsCount} worker daily totals.");

        // Delete Company Daily Totals
        $companyTotalsCount = CompanyDailyTotal::where('company_id', $company->id)->count();
        CompanyDailyTotal::where('company_id', $company->id)->delete();
        $this->info("- Deleted {$companyTotalsCount} company daily totals.");

        $this->info('Revenue data reset successfully!');
        return 0;
    }
}
