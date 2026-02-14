<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for performance optimization indexes
     */
    public function up(): void
    {
        // Index for payment queries by date range
        Schema::table('payments', function (Blueprint $table) {
            $table->index(['company_id', 'payment_date'], 'idx_payments_company_date');
            $table->index(['customer_id', 'payment_date'], 'idx_payments_customer_date');
            $table->index(['worker_id', 'payment_date'], 'idx_payments_worker_date');
            $table->index(['branch_id', 'payment_date'], 'idx_payments_branch_date');
            $table->index('payment_method', 'idx_payments_method');
        });

        // Indexes for customer queries
        Schema::table('customers', function (Blueprint $table) {
            $table->index(['company_id', 'status'], 'idx_customers_company_status');
            $table->index(['worker_id', 'status'], 'idx_customers_worker_status');
            $table->index('status', 'idx_customers_status');
        });

        // Indexes for branch queries
        Schema::table('branches', function (Blueprint $table) {
            $table->index('company_id', 'idx_branches_company');
        });

        // Indexes for user queries
        Schema::table('users', function (Blueprint $table) {
            $table->index('company_id', 'idx_users_company');
        });

        // Indexes for stock items
        Schema::table('stock_items', function (Blueprint $table) {
            $table->index('company_id', 'idx_stock_company');
        });

        // Indexes for ledger entries
        Schema::table('ledger_entries', function (Blueprint $table) {
            $table->index(['company_id', 'created_at'], 'idx_ledger_company_date');
        });

        // Indexes for audit logs
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->index(['company_id', 'created_at'], 'idx_audit_company_created');
            $table->index(['user_id', 'created_at'], 'idx_audit_user_created');
        });
    }

    /**
     * Reverse the migrations
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex('idx_payments_company_date');
            $table->dropIndex('idx_payments_customer_date');
            $table->dropIndex('idx_payments_worker_date');
            $table->dropIndex('idx_payments_branch_date');
            $table->dropIndex('idx_payments_method');
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->dropIndex('idx_customers_company_status');
            $table->dropIndex('idx_customers_worker_status');
            $table->dropIndex('idx_customers_status');
        });

        Schema::table('branches', function (Blueprint $table) {
            $table->dropIndex('idx_branches_company');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('idx_users_company');
        });

        Schema::table('stock_items', function (Blueprint $table) {
            $table->dropIndex('idx_stock_company');
        });

        Schema::table('ledger_entries', function (Blueprint $table) {
            $table->dropIndex('idx_ledger_company_date');
        });

        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropIndex('idx_audit_company_created');
            $table->dropIndex('idx_audit_user_created');
        });
    }
};
