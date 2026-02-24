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
        Schema::table('company_daily_totals', function (Blueprint $table) {
            // Drop the old global unique constraint on date
            $table->dropUnique('company_daily_totals_date_unique');
            
            // Add the new multi-tenant composite unique constraint
            $table->unique(['company_id', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('company_daily_totals', function (Blueprint $table) {
            $table->dropUnique(['company_id', 'date']);
            $table->unique('date');
        });
    }
};
