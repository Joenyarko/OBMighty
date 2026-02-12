<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
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

        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->foreignId('company_id')->nullable()->after('id')->index();
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
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

        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->dropColumn('company_id');
                });
            }
        }
    }
};
