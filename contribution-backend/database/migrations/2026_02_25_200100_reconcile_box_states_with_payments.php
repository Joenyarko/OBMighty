<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Reconcile box_states with actual box_payments.
     * Ensures boxes_checked on customer_cards matches actual BoxPayment totals,
     * and that the correct number of BoxState records are marked as checked.
     */
    public function up(): void
    {
        // Step 1: Reconcile customer_cards.boxes_checked with actual BoxPayment totals
        DB::statement("
            UPDATE customer_cards cc
            SET cc.boxes_checked = COALESCE((
                SELECT SUM(bp.boxes_checked)
                FROM box_payments bp
                WHERE bp.customer_card_id = cc.id
            ), 0)
        ");

        // Step 2: Reconcile customer_cards.amount_paid with actual BoxPayment totals
        DB::statement("
            UPDATE customer_cards cc
            SET cc.amount_paid = COALESCE((
                SELECT SUM(bp.amount_paid)
                FROM box_payments bp
                WHERE bp.customer_card_id = cc.id
            ), 0)
        ");

        // Step 3: Recalculate amount_remaining
        DB::statement("
            UPDATE customer_cards cc
            SET cc.amount_remaining = cc.total_amount - cc.amount_paid
        ");

        // Step 4: Fix box_states — uncheck all first, then re-check the correct number
        // First, uncheck all box_states
        DB::statement("
            UPDATE box_states SET is_checked = 0, checked_date = NULL, payment_id = NULL
        ");

        // Then, for each customer_card, check the correct number of boxes
        $cards = DB::table('customer_cards')->where('boxes_checked', '>', 0)->get();
        foreach ($cards as $card) {
            DB::table('box_states')
                ->where('customer_card_id', $card->id)
                ->where('is_checked', false)
                ->orderBy('box_number')
                ->limit($card->boxes_checked)
                ->update([
                    'is_checked' => true,
                    'checked_date' => now()->toDateString(),
                ]);
        }

        // Step 5: Sync customer records from customer_cards
        DB::statement("
            UPDATE customers c
            INNER JOIN customer_cards cc ON cc.customer_id = c.id AND cc.status IN ('active', 'completed')
            SET c.boxes_filled = cc.boxes_checked,
                c.amount_paid = cc.amount_paid
        ");

        // Step 6: Update customer_cards status
        DB::statement("
            UPDATE customer_cards
            SET status = CASE
                WHEN boxes_checked >= total_boxes THEN 'completed'
                ELSE 'active'
            END
        ");
    }

    public function down(): void
    {
        // Not reversible
    }
};
