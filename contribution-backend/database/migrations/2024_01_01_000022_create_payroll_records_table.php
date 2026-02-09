<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('payroll_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->decimal('salary_amount', 12, 2);
            $table->decimal('allowances', 12, 2)->default(0);
            $table->decimal('deductions', 12, 2)->default(0);
            $table->decimal('net_amount', 12, 2);
            $table->date('payment_month'); // First day of month (e.g., 2024-01-01)
            $table->date('payment_date');
            $table->enum('payment_method', ['cash', 'bank_transfer', 'mobile_money', 'cheque']);
            $table->string('reference_number')->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['pending', 'paid', 'cancelled'])->default('paid');
            $table->foreignId('paid_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            
            $table->index(['user_id', 'payment_month']);
            $table->index(['payment_month', 'status']);
            $table->index('payment_date');
        });
    }

    public function down()
    {
        Schema::dropIfExists('payroll_records');
    }
};
