<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Backfill company_id on box_states and box_payments that have NULL company_id.
     * This fixes multi-tenant box tracking for companies whose records
     * were created via BoxState::insert() which bypasses Eloquent events.
     */
    public function up(): void
    {
        // Backfill box_states.company_id from customer_cards
        DB::statement("
            UPDATE box_states bs
            INNER JOIN customer_cards cc ON bs.customer_card_id = cc.id
            SET bs.company_id = cc.company_id
            WHERE bs.company_id IS NULL
        ");

        // Backfill box_payments.company_id from customer_cards
        DB::statement("
            UPDATE box_payments bp
            INNER JOIN customer_cards cc ON bp.customer_card_id = cc.id
            SET bp.company_id = cc.company_id
            WHERE bp.company_id IS NULL
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Not reversible - data was already NULL
    }
};
