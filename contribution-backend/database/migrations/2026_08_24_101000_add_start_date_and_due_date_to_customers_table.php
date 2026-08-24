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
        Schema::table('customers', function (Blueprint $table) {
            $table->date('start_date')->nullable()->after('card_id');
            $table->date('due_date')->nullable()->after('start_date');
            
            $table->index('start_date');
            $table->index('due_date');
        });

        // Backfill start_date for existing customers using earliest payment date
        try {
            DB::statement("
                UPDATE customers c
                SET c.start_date = (
                    SELECT MIN(p.payment_date) 
                    FROM payments p 
                    WHERE p.customer_id = c.id
                )
                WHERE EXISTS (
                    SELECT 1 FROM payments p WHERE p.customer_id = c.id
                )
            ");
        } catch (\Exception $e) {
            // Ignore if payments table is empty or driver difference
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropIndex(['start_date']);
            $table->dropIndex(['due_date']);
            $table->dropColumn(['start_date', 'due_date']);
        });
    }
};
