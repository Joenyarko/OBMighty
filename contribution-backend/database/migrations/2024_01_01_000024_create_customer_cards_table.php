<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('customer_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->onDelete('cascade');
            $table->foreignId('card_id')->constrained()->onDelete('cascade');
            $table->date('assigned_date');
            $table->integer('total_boxes'); // From card
            $table->integer('boxes_checked')->default(0); // Count of paid boxes
            $table->decimal('total_amount', 12, 2); // Card amount
            $table->decimal('amount_paid', 12, 2)->default(0); // Calculated
            $table->decimal('amount_remaining', 12, 2); // Calculated
            $table->enum('status', ['active', 'completed', 'cancelled'])->default('active');
            $table->foreignId('assigned_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            
            $table->index(['customer_id', 'status']);
            $table->index('assigned_date');
        });
    }

    public function down()
    {
        Schema::dropIfExists('customer_cards');
    }
};
