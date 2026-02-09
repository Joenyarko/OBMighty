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
        Schema::create('surplus_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->onDelete('restrict');
            $table->foreignId('worker_id')->nullable()->constrained('users')->onDelete('set null');
            $table->decimal('amount', 12, 2);
            $table->date('entry_date');
            $table->enum('status', ['available', 'allocated', 'withdrawn'])->default('available');
            $table->text('description');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('restrict');
            $table->foreignId('allocated_to_payment_id')->nullable()->constrained('payments')->onDelete('set null');
            $table->timestamp('allocated_at')->nullable();
            $table->timestamps();
            
            $table->index('branch_id');
            $table->index('worker_id');
            $table->index('entry_date');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('surplus_entries');
    }
};
