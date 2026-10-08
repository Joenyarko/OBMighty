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
        Schema::table('cards', function (Blueprint $table) {
            if (!Schema::hasColumn('cards', 'penalty_percentage')) {
                $table->decimal('penalty_percentage', 5, 2)->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cards', function (Blueprint $table) {
            if (Schema::hasColumn('cards', 'penalty_percentage')) {
                $table->dropColumn('penalty_percentage');
            }
        });
    }
};
