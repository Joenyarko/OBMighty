<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Backfill company_id on customer_cards, box_states, box_payments,
     * and worker_daily_totals that have NULL company_id.
     * Derives company_id from the related customer record.
     */
    public function up(): void
    {
        // Fix customer_cards via customers
        DB::statement("
            UPDATE customer_cards cc
            INNER JOIN customers c ON cc.customer_id = c.id
            SET cc.company_id = c.company_id
            WHERE cc.company_id IS NULL
        ");

        // Fix box_payments via customer_cards
        DB::statement("
            UPDATE box_payments bp
            INNER JOIN customer_cards cc ON bp.customer_card_id = cc.id
            SET bp.company_id = cc.company_id
            WHERE bp.company_id IS NULL
              AND cc.company_id IS NOT NULL
        ");

        // Fix worker_daily_totals via users
        DB::statement("
            UPDATE worker_daily_totals wdt
            INNER JOIN users u ON wdt.worker_id = u.id
            SET wdt.company_id = u.company_id
            WHERE wdt.company_id IS NULL
              AND u.company_id IS NOT NULL
        ");
    }

    public function down(): void
    {
        // Not reversible
    }
};
