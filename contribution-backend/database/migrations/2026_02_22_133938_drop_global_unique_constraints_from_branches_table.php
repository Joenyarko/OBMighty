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
        Schema::table('branches', function (Blueprint $table) {
            // Drop global unique constraints
            $table->dropUnique('branches_name_unique');
            $table->dropUnique('branches_code_unique');
            
            // Add company-scoped unique constraints
            $table->unique(['company_id', 'name'], 'branches_company_name_unique');
            $table->unique(['company_id', 'code'], 'branches_company_code_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            // Drop company-scoped unique constraints
            $table->dropUnique('branches_company_name_unique');
            $table->dropUnique('branches_company_code_unique');
            
            // Restore global unique constraints
            $table->unique('name', 'branches_name_unique');
            $table->unique('code', 'branches_code_unique');
        });
    }
};
