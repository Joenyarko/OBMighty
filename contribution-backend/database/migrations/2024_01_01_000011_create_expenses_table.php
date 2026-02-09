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
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->onDelete('restrict');
            $table->string('category', 100);
            $table->text('description');
            $table->decimal('amount', 12, 2);
            $table->date('expense_date');
            $table->enum('payment_method', ['cash', 'bank_transfer', 'mobile_money'])->default('cash');
            $table->string('receipt_number')->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('restrict');
            $table->timestamps();
            $table->softDeletes();
            
            $table->index('branch_id');
            $table->index('category');
            $table->index('expense_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
