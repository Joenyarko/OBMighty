<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Both box_states and box_payments use the BelongsToCompany trait
     * which adds a global scope filtering by company_id. However, these
     * tables were created without a company_id column, so the scope
     * filters out ALL existing records — making the box grid appear empty.
     *
     * This migration:
     * 1. Adds nullable company_id to both tables
     * 2. Backfills company_id from the parent customer_cards table
     * 3. Indexes the new column for performance
     */
    public function up(): void
    {
        // --- 1. Add company_id column to box_states ---
        if (!Schema::hasColumn('box_states', 'company_id')) {
            Schema::table('box_states', function (Blueprint $table) {
                $table->unsignedBigInteger('company_id')->nullable()->after('id');
                $table->index('company_id');
            });
        }

        // --- 2. Add company_id column to box_payments ---
        if (!Schema::hasColumn('box_payments', 'company_id')) {
            Schema::table('box_payments', function (Blueprint $table) {
                $table->unsignedBigInteger('company_id')->nullable()->after('id');
                $table->index('company_id');
            });
        }

        // --- 3. Backfill box_states.company_id from customer_cards ---
        DB::statement('
            UPDATE box_states
            INNER JOIN customer_cards ON box_states.customer_card_id = customer_cards.id
            SET box_states.company_id = customer_cards.company_id
            WHERE box_states.company_id IS NULL
        ');

        // --- 4. Backfill box_payments.company_id from customer_cards ---
        DB::statement('
            UPDATE box_payments
            INNER JOIN customer_cards ON box_payments.customer_card_id = customer_cards.id
            SET box_payments.company_id = customer_cards.company_id
            WHERE box_payments.company_id IS NULL
        ');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('box_states', function (Blueprint $table) {
            $table->dropColumn('company_id');
        });

        Schema::table('box_payments', function (Blueprint $table) {
            $table->dropColumn('company_id');
        });
    }
};
