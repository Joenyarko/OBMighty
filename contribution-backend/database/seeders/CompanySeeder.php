<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class CompanySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Create Default Company
        $company = \App\Models\Company::create([
            'name' => 'O.B.Mighty',
            'domain' => 'localhost', // Default for local dev
            'subdomain' => 'obmighty',
            'is_active' => true,
        ]);

        $this->command->info("Default Company created: {$company->name}");

        // 2. Assign all existing data to this company
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

        foreach ($tables as $table) {
            if (\Illuminate\Support\Facades\Schema::hasTable($table)) {
                $count = \Illuminate\Support\Facades\DB::table($table)->whereNull('company_id')->update(['company_id' => $company->id]);
                $this->command->info("Updated {$count} records in {$table}");
            }
        }
    }
}
