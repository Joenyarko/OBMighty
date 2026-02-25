<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Fix company_id on customers that have NULL, then cascade to customer_cards.
     * Uses branch_id -> branches.company_id as the source of truth.
     */
    public function up(): void
    {
        // Step 1: Fix customers via branches
        DB::statement("
            UPDATE customers c
            INNER JOIN branches b ON c.branch_id = b.id
            SET c.company_id = b.company_id
            WHERE c.company_id IS NULL
              AND b.company_id IS NOT NULL
        ");

        // Step 2: Now fix customer_cards again (some were missed because customers had NULL)
        DB::statement("
            UPDATE customer_cards cc
            INNER JOIN customers c ON cc.customer_id = c.id
            SET cc.company_id = c.company_id
            WHERE cc.company_id IS NULL
              AND c.company_id IS NOT NULL
        ");

        // Step 3: Fix box_payments again
        DB::statement("
            UPDATE box_payments bp
            INNER JOIN customer_cards cc ON bp.customer_card_id = cc.id
            SET bp.company_id = cc.company_id
            WHERE bp.company_id IS NULL
              AND cc.company_id IS NOT NULL
        ");
    }

    public function down(): void
    {
        // Not reversible
    }
};
