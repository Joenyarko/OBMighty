<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('worker_daily_totals', function (Blueprint $table) {
            $table->decimal('adjusted_amount', 10, 2)->nullable()->after('total_customers_paid');
            $table->text('adjustment_note')->nullable()->after('adjusted_amount');
        });
    }

    public function down(): void
    {
        Schema::table('worker_daily_totals', function (Blueprint $table) {
            $table->dropColumn(['adjusted_amount', 'adjustment_note']);
        });
    }
};
