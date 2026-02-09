<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('box_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_card_id')->constrained()->onDelete('cascade');
            $table->foreignId('worker_id')->constrained('users')->onDelete('cascade');
            $table->date('payment_date');
            $table->integer('boxes_checked'); // Number of boxes checked in this payment
            $table->decimal('amount_paid', 12, 2); // boxes_checked × box_price
            $table->enum('payment_method', ['cash', 'mobile_money', 'bank_transfer', 'cheque'])->default('cash');
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->index(['customer_card_id', 'payment_date']);
            $table->index(['worker_id', 'payment_date']);
            $table->index('payment_date');
        });
    }

    public function down()
    {
        Schema::dropIfExists('box_payments');
    }
};
