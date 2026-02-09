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
        Schema::create('company_daily_totals', function (Blueprint $table) {
            $table->id();
            $table->date('date')->unique();
            $table->decimal('total_collections', 12, 2)->default(0);
            $table->integer('total_payments')->default(0);
            $table->integer('total_branches_active')->default(0);
            $table->timestamps();
            
            $table->index('date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('company_daily_totals');
    }
};
