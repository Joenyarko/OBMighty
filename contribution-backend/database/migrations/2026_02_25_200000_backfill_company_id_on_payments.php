<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Backfill company_id on payments that have NULL company_id.
     * Derives company_id from the customer record.
     */
    public function up(): void
    {
        DB::statement("
            UPDATE payments p
            INNER JOIN customers c ON p.customer_id = c.id
            SET p.company_id = c.company_id
            WHERE p.company_id IS NULL
        ");
    }

    public function down(): void
    {
        // Not reversible
    }
};
