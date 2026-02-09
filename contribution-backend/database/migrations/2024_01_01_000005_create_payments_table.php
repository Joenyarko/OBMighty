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
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->onDelete('restrict');
            $table->foreignId('worker_id')->constrained('users')->onDelete('restrict');
            $table->foreignId('branch_id')->constrained('branches')->onDelete('restrict');
            $table->decimal('payment_amount', 10, 2);
            $table->decimal('boxes_filled', 8, 2);
            $table->date('payment_date');
            $table->enum('payment_method', ['cash', 'mobile_money', 'bank_transfer'])->default('cash');
            $table->string('reference_number')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('restrict');
            $table->timestamps();
            
            $table->index('customer_id');
            $table->index('worker_id');
            $table->index('branch_id');
            $table->index('payment_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
