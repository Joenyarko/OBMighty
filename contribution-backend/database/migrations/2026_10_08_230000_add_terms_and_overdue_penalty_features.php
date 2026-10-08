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
        // 1. Companies Table: company-level default terms and overdue penalty configuration
        Schema::table('companies', function (Blueprint $table) {
            if (!Schema::hasColumn('companies', 'terms_and_conditions')) {
                $table->longText('terms_and_conditions')->nullable()->after('timezone');
            }
            if (!Schema::hasColumn('companies', 'enable_overdue_penalty')) {
                $table->boolean('enable_overdue_penalty')->default(false)->after('terms_and_conditions');
            }
            if (!Schema::hasColumn('companies', 'default_penalty_percentage')) {
                $table->decimal('default_penalty_percentage', 5, 2)->default(10.00)->after('enable_overdue_penalty');
            }
        });

        // 2. Cards Table: card-specific terms and conditions override
        Schema::table('cards', function (Blueprint $table) {
            if (!Schema::hasColumn('cards', 'terms_and_conditions')) {
                $table->longText('terms_and_conditions')->nullable()->after('duration_months');
            }
        });

        // 3. Customer Cards Table: penalty tracking fields
        Schema::table('customer_cards', function (Blueprint $table) {
            if (!Schema::hasColumn('customer_cards', 'penalty_boxes')) {
                $table->integer('penalty_boxes')->default(0)->after('amount_remaining');
            }
            if (!Schema::hasColumn('customer_cards', 'penalty_amount')) {
                $table->decimal('penalty_amount', 12, 2)->default(0.00)->after('penalty_boxes');
            }
            if (!Schema::hasColumn('customer_cards', 'penalty_percentage')) {
                $table->decimal('penalty_percentage', 5, 2)->nullable()->after('penalty_amount');
            }
            if (!Schema::hasColumn('customer_cards', 'penalty_applied_at')) {
                $table->timestamp('penalty_applied_at')->nullable()->after('penalty_percentage');
            }
            if (!Schema::hasColumn('customer_cards', 'penalty_notes')) {
                $table->text('penalty_notes')->nullable()->after('penalty_applied_at');
            }
        });

        // 4. Box States Table: flag for penalty / extension boxes
        Schema::table('box_states', function (Blueprint $table) {
            if (!Schema::hasColumn('box_states', 'is_penalty')) {
                $table->boolean('is_penalty')->default(false)->after('payment_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('box_states', function (Blueprint $table) {
            if (Schema::hasColumn('box_states', 'is_penalty')) {
                $table->dropColumn('is_penalty');
            }
        });

        Schema::table('customer_cards', function (Blueprint $table) {
            $cols = ['penalty_boxes', 'penalty_amount', 'penalty_percentage', 'penalty_applied_at', 'penalty_notes'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('customer_cards', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        Schema::table('cards', function (Blueprint $table) {
            if (Schema::hasColumn('cards', 'terms_and_conditions')) {
                $table->dropColumn('terms_and_conditions');
            }
        });

        Schema::table('companies', function (Blueprint $table) {
            $cols = ['terms_and_conditions', 'enable_overdue_penalty', 'default_penalty_percentage'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('companies', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
