<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\Company;

class BackfillCompanyId extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tenant:backfill {company_id?}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Backfill company_id for historical data that was created before multi-tenancy';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $companyId = $this->argument('company_id');

        if (!$companyId) {
            $company = Company::first();
            if (!$company) {
                $this->error('No companies found in database. Create a company first.');
                return 1;
            }
            $companyId = $company->id;
            $this->info("No company_id provided. Using first company: {$company->name} (ID: {$companyId})");
        } else {
            $company = Company::find($companyId);
            if (!$company) {
                $this->error("Company with ID {$companyId} not found.");
                return 1;
            }
            $this->info("Backfilling for company: {$company->name} (ID: {$companyId})");
        }

        $tables = [
            'users',
            'branches',
            'cards',
            'customers',
            'payments',
            'worker_daily_totals',
            'branch_daily_totals',
            'stock_items',
            'stock_movements',
            'expenses',
            'ledger_entries',
            'audit_logs',
            'surplus_entries',
            'employee_salaries',
            'payroll_records',
            'customer_cards',
            'box_payments',
            'box_states'
        ];

        $totalUpdated = 0;
        $summary = [];

        foreach ($tables as $table) {
            if (\Illuminate\Support\Facades\Schema::hasTable($table) && \Illuminate\Support\Facades\Schema::hasColumn($table, 'company_id')) {
                // Count how many need update
                $orphans = DB::table($table)->whereNull('company_id')->count();
                
                if ($orphans > 0) {
                    $count = DB::table($table)
                        ->whereNull('company_id')
                        ->update(['company_id' => $companyId]);
                    
                    $this->line("Updated {$count} orphaned records in: {$table}");
                    $totalUpdated += $count;
                    $summary[$table] = $count;
                } else {
                    $this->line("No orphans found in: {$table}");
                }
            }
        }

        if ($totalUpdated === 0) {
            $this->warn("No orphaned records were found. Either the data is already linked, or there is no data to link.");
        } else {
            $this->info("Success! Backfill completed. Total records updated: {$totalUpdated}");
        }
        
        return 0;
    }
}
