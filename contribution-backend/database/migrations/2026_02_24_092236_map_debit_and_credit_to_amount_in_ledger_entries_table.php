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
        // 1. Add new columns
        Schema::table('ledger_entries', function (Blueprint $table) {
            if (!Schema::hasColumn('ledger_entries', 'amount')) {
                $table->decimal('amount', 12, 2)->default(0)->after('description');
            }
            if (!Schema::hasColumn('ledger_entries', 'type')) {
                $table->string('type')->default('credit')->after('entry_date');
            }
        });

        // 2. Backfill historical data
        DB::table('ledger_entries')->orderBy('id')->chunk(100, function ($entries) {
            foreach ($entries as $entry) {
                // If it had a debit value, it was a debit transaction.
                // Otherwise, assume credit.
                $isDebit = isset($entry->debit) && $entry->debit > 0;
                $amount = $isDebit ? $entry->debit : ($entry->credit ?? 0);
                $type = $isDebit ? 'debit' : 'credit';

                DB::table('ledger_entries')
                    ->where('id', $entry->id)
                    ->update([
                        'amount' => $amount,
                        'type' => $type,
                    ]);
            }
        });

        // 3. Drop obsolete columns
        Schema::table('ledger_entries', function (Blueprint $table) {
            if (Schema::hasColumn('ledger_entries', 'debit')) {
                $table->dropColumn('debit');
            }
            if (Schema::hasColumn('ledger_entries', 'credit')) {
                $table->dropColumn('credit');
            }
            if (Schema::hasColumn('ledger_entries', 'account_type')) {
                $table->dropColumn('account_type');
            }
            if (Schema::hasColumn('ledger_entries', 'reference_type')) {
                $table->dropColumn('reference_type'); // Replaced simply by reference_id / general type
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. Restore old columns
        Schema::table('ledger_entries', function (Blueprint $table) {
            if (!Schema::hasColumn('ledger_entries', 'debit')) {
                $table->decimal('debit', 12, 2)->default(0);
            }
            if (!Schema::hasColumn('ledger_entries', 'credit')) {
                $table->decimal('credit', 12, 2)->default(0);
            }
            if (!Schema::hasColumn('ledger_entries', 'account_type')) {
                $table->string('account_type')->nullable();
            }
            if (!Schema::hasColumn('ledger_entries', 'reference_type')) {
                $table->string('reference_type')->nullable();
            }
        });

        // 2. Reverse backfill
        DB::table('ledger_entries')->orderBy('id')->chunk(100, function ($entries) {
            foreach ($entries as $entry) {
                $isDebit = isset($entry->type) && $entry->type === 'debit';
                $debitAmount = $isDebit ? ($entry->amount ?? 0) : 0;
                $creditAmount = !$isDebit ? ($entry->amount ?? 0) : 0;

                DB::table('ledger_entries')
                    ->where('id', $entry->id)
                    ->update([
                        'debit' => $debitAmount,
                        'credit' => $creditAmount,
                        'account_type' => 'general',
                    ]);
            }
        });

        // 3. Drop new columns
        Schema::table('ledger_entries', function (Blueprint $table) {
            if (Schema::hasColumn('ledger_entries', 'amount')) {
                $table->dropColumn('amount');
            }
            if (Schema::hasColumn('ledger_entries', 'type')) {
                $table->dropColumn('type');
            }
        });
    }
};
