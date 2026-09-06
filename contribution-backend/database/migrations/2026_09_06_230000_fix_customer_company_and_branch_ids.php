<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Fix company_id on customers table where it's NULL by copying from assigned worker
        try {
            DB::statement("
                UPDATE customers c
                JOIN users u ON c.worker_id = u.id
                SET c.company_id = u.company_id
                WHERE c.company_id IS NULL AND u.company_id IS NOT NULL
            ");
        } catch (\Exception $e) {}

        // Fix branch_id on customers table where it's NULL by copying from assigned worker
        try {
            DB::statement("
                UPDATE customers c
                JOIN users u ON c.worker_id = u.id
                SET c.branch_id = u.branch_id
                WHERE c.branch_id IS NULL AND u.branch_id IS NOT NULL
            ");
        } catch (\Exception $e) {}
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No reverse needed
    }
};
