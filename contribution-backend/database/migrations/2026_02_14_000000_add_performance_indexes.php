<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations for performance optimization indexes
     */
    public function up(): void
    {
        // Helper function to check if index exists
        $indexExists = function($table, $indexName) {
            try {
                $indexes = DB::select("SHOW INDEXES FROM `$table` WHERE Key_name = ?", [$indexName]);
                return count($indexes) > 0;
            } catch (\Exception $e) {
                return false;
            }
        };

        // Index for payment queries by date range
        if (!$indexExists('payments', 'idx_payments_company_date')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->index(['company_id', 'payment_date'], 'idx_payments_company_date');
            });
        }

        if (!$indexExists('payments', 'idx_payments_customer_date')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->index(['customer_id', 'payment_date'], 'idx_payments_customer_date');
            });
        }

        if (!$indexExists('payments', 'idx_payments_worker_date')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->index(['worker_id', 'payment_date'], 'idx_payments_worker_date');
            });
        }

        if (!$indexExists('payments', 'idx_payments_branch_date')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->index(['branch_id', 'payment_date'], 'idx_payments_branch_date');
            });
        }

        if (!$indexExists('payments', 'idx_payments_method')) {
            Schema::table('payments', function (Blueprint $table) {
                $table->index('payment_method', 'idx_payments_method');
            });
        }

        // Indexes for customer queries
        if (!$indexExists('customers', 'idx_customers_company_status')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->index(['company_id', 'status'], 'idx_customers_company_status');
            });
        }

        if (!$indexExists('customers', 'idx_customers_worker_status')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->index(['worker_id', 'status'], 'idx_customers_worker_status');
            });
        }

        if (!$indexExists('customers', 'idx_customers_status')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->index('status', 'idx_customers_status');
            });
        }

        // Indexes for branch queries
        if (!$indexExists('branches', 'idx_branches_company')) {
            Schema::table('branches', function (Blueprint $table) {
                $table->index('company_id', 'idx_branches_company');
            });
        }

        // Indexes for user queries
        if (!$indexExists('users', 'idx_users_company')) {
            Schema::table('users', function (Blueprint $table) {
                $table->index('company_id', 'idx_users_company');
            });
        }

        // Indexes for stock items
        if (!$indexExists('stock_items', 'idx_stock_company')) {
            Schema::table('stock_items', function (Blueprint $table) {
                $table->index('company_id', 'idx_stock_company');
            });
        }

        // Indexes for ledger entries
        if (!$indexExists('ledger_entries', 'idx_ledger_company_date')) {
            Schema::table('ledger_entries', function (Blueprint $table) {
                $table->index(['company_id', 'created_at'], 'idx_ledger_company_date');
            });
        }

        // Indexes for audit logs
        if (!$indexExists('audit_logs', 'idx_audit_company_created')) {
            Schema::table('audit_logs', function (Blueprint $table) {
                $table->index(['company_id', 'created_at'], 'idx_audit_company_created');
            });
        }

        if (!$indexExists('audit_logs', 'idx_audit_user_created')) {
            Schema::table('audit_logs', function (Blueprint $table) {
                $table->index(['user_id', 'created_at'], 'idx_audit_user_created');
            });
        }
    }

    /**
     * Reverse the migrations
     */
    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndexIfExists('idx_payments_company_date');
            $table->dropIndexIfExists('idx_payments_customer_date');
            $table->dropIndexIfExists('idx_payments_worker_date');
            $table->dropIndexIfExists('idx_payments_branch_date');
            $table->dropIndexIfExists('idx_payments_method');
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->dropIndexIfExists('idx_customers_company_status');
            $table->dropIndexIfExists('idx_customers_worker_status');
            $table->dropIndexIfExists('idx_customers_status');
        });

        Schema::table('branches', function (Blueprint $table) {
            $table->dropIndexIfExists('idx_branches_company');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndexIfExists('idx_users_company');
        });

        Schema::table('stock_items', function (Blueprint $table) {
            $table->dropIndexIfExists('idx_stock_company');
        });

        Schema::table('ledger_entries', function (Blueprint $table) {
            $table->dropIndexIfExists('idx_ledger_company_date');
        });

        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropIndexIfExists('idx_audit_company_created');
            $table->dropIndexIfExists('idx_audit_user_created');
        });
    }
};
