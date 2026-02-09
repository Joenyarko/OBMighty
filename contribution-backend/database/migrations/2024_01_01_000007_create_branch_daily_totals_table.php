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
        Schema::create('branch_daily_totals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->date('date');
            $table->decimal('total_collections', 12, 2)->default(0);
            $table->integer('total_payments')->default(0);
            $table->integer('total_workers_active')->default(0);
            $table->timestamps();
            
            $table->unique(['branch_id', 'date']);
            $table->index('branch_id');
            $table->index('date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('branch_daily_totals');
    }
};
