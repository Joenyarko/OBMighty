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
        // Update existing records to default company (ID 1)
        DB::table('company_daily_totals')->whereNull('company_id')->update(['company_id' => 1]);
        DB::table('branch_daily_totals')->whereNull('company_id')->update(['company_id' => 1]);
        DB::table('worker_daily_totals')->whereNull('company_id')->update(['company_id' => 1]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No reverse operation needed as we don't want to nullify data on rollback
    }
};
