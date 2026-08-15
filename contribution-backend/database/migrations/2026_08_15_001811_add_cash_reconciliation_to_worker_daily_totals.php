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
        Schema::table('worker_daily_totals', function (Blueprint $table) {
            $table->decimal('actual_cash_counted', 12, 2)->nullable()->after('total_collections');
            $table->decimal('discrepancy_amount', 12, 2)->nullable()->after('actual_cash_counted');
            $table->text('closing_notes')->nullable()->after('discrepancy_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('worker_daily_totals', function (Blueprint $table) {
            $table->dropColumn(['actual_cash_counted', 'discrepancy_amount', 'closing_notes']);
        });
    }
};
