<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('cards', function (Blueprint $table) {
            $table->integer('duration_months')->default(6)->after('amount');
        });

        // Set all existing cards to 6 months
        try {
            DB::table('cards')->whereNull('duration_months')->orWhere('duration_months', 0)->update(['duration_months' => 6]);
        } catch (\Exception $e) {}

        // For all customers who have a start_date and due_date is null, backfill due_date = start_date + 6 months
        try {
            DB::statement("
                UPDATE customers
                SET due_date = DATE_ADD(start_date, INTERVAL 6 MONTH)
                WHERE start_date IS NOT NULL AND due_date IS NULL
            ");
        } catch (\Exception $e) {}
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cards', function (Blueprint $table) {
            $table->dropColumn('duration_months');
        });
    }
};
