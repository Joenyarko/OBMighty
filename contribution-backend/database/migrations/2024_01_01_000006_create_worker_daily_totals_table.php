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
        Schema::create('worker_daily_totals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('worker_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('branch_id')->constrained('branches')->onDelete('cascade');
            $table->date('date');
            $table->decimal('total_collections', 12, 2)->default(0);
            $table->integer('total_customers_paid')->default(0);
            $table->timestamps();
            
            $table->unique(['worker_id', 'date']);
            $table->index('worker_id');
            $table->index('branch_id');
            $table->index('date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('worker_daily_totals');
    }
};
