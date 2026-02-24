<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * Backfill box_states from existing box_payments.
     *
     * For each customer_card that has box_payments, this migration:
     * 1. Resets ALL box_states for that card to unchecked (clean slate)
     * 2. Replays each box_payment in chronological order
     * 3. Marks the next N unchecked boxes as checked (matching the original checkBoxes logic)
     *
     * This ensures the visual box grid matches the payment history exactly.
     */
    public function up(): void
    {
        // Get all customer_card IDs that have at least one box_payment
        $cardIds = DB::table('box_payments')
            ->select('customer_card_id')
            ->distinct()
            ->pluck('customer_card_id');

        Log::info("Backfill: Found {$cardIds->count()} customer cards with payments to process.");

        foreach ($cardIds as $cardId) {
            // 1. Reset all box_states for this card to unchecked
            DB::table('box_states')
                ->where('customer_card_id', $cardId)
                ->update([
                    'is_checked' => false,
                    'checked_date' => null,
                    'payment_id' => null,
                ]);

            // 2. Get all payments for this card in chronological order
            $payments = DB::table('box_payments')
                ->where('customer_card_id', $cardId)
                ->orderBy('payment_date', 'asc')
                ->orderBy('id', 'asc')
                ->get();

            // 3. Replay each payment: mark the next N unchecked boxes
            foreach ($payments as $payment) {
                $boxesToCheck = (int) $payment->boxes_checked;

                if ($boxesToCheck <= 0) {
                    continue;
                }

                // Find the next N unchecked boxes ordered by box_number
                $uncheckedBoxIds = DB::table('box_states')
                    ->where('customer_card_id', $cardId)
                    ->where('is_checked', false)
                    ->orderBy('box_number', 'asc')
                    ->limit($boxesToCheck)
                    ->pluck('id');

                if ($uncheckedBoxIds->isEmpty()) {
                    Log::warning("Backfill: Card {$cardId} ran out of unchecked boxes for payment {$payment->id}");
                    continue;
                }

                // Mark them as checked
                DB::table('box_states')
                    ->whereIn('id', $uncheckedBoxIds->toArray())
                    ->update([
                        'is_checked' => true,
                        'checked_date' => $payment->payment_date,
                        'payment_id' => $payment->id,
                    ]);
            }

            Log::info("Backfill: Completed card {$cardId}");
        }

        Log::info('Backfill: Box states restoration complete.');
    }

    /**
     * Reverse the migrations (reset all boxes to unchecked).
     */
    public function down(): void
    {
        DB::table('box_states')->update([
            'is_checked' => false,
            'checked_date' => null,
            'payment_id' => null,
        ]);
    }
};
