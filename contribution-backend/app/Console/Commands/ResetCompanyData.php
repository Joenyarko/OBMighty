<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class ResetCompanyData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:reset-company-data {company_id : The ID of the company to reset} {--force : Force the operation without confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Resets all transactional data for a specific company while preserving structural data like CEO accounts and company profile.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $companyId = $this->argument('company_id');
        $company = \App\Models\Company::find($companyId);

        if (!$company) {
            $this->error("Company with ID {$companyId} not found.");
            return 1;
        }

        if (!$this->option('force')) {
            if (!$this->confirm("Are you sure you want to PERMANENTLY RESET all data for '{$company->name}'? This cannot be undone.", false)) {
                $this->info('Operation cancelled.');
                return 0;
            }
        }

        $this->info("Resetting data for '{$company->name}' (ID: {$companyId})...");

        \Illuminate\Support\Facades\DB::beginTransaction();

        try {
            // Disable foreign key checks
            \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS = 0');

            $tables = [
                'box_states',
                'box_payments',
                'customer_cards',
                'payments',
                'customers',
                'worker_daily_totals',
                'branch_daily_totals',
                'company_daily_totals',
                'ledger_entries',
                'expenses',
                'surplus_entries',
                'stock_movements',
                'stock_items',
                'payroll_records',
                'employee_salaries',
                'audit_logs',
            ];

            foreach ($tables as $table) {
                if (\Illuminate\Support\Facades\Schema::hasTable($table)) {
                    $count = \Illuminate\Support\Facades\DB::table($table)->where('company_id', $companyId)->delete();
                    $this->line("- Deleted {$count} records from {$table}");
                }
            }

            // Handle Users separately: Keep CEO accounts
            $ceoRoleId = \Illuminate\Support\Facades\DB::table('roles')->where('name', 'ceo')->value('id');
            if ($ceoRoleId) {
                $count = \Illuminate\Support\Facades\DB::table('users')
                    ->where('company_id', $companyId)
                    ->whereNotExists(function ($query) use ($ceoRoleId) {
                        $query->select(\Illuminate\Support\Facades\DB::raw(1))
                            ->from('model_has_roles')
                            ->whereColumn('model_has_roles.model_id', 'users.id')
                            ->where('model_has_roles.role_id', $ceoRoleId);
                    })
                    ->delete();
                $this->line("- Deleted {$count} non-CEO user records");
            }

            \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS = 1');
            \Illuminate\Support\Facades\DB::commit();

            $this->info('Company data reset successfully.');
            return 0;

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            \Illuminate\Support\Facades\DB::statement('SET FOREIGN_KEY_CHECKS = 1');
            $this->error("An error occurred: " . $e->getMessage());
            return 1;
        }
    }
}
