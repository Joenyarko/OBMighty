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
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone', 20);
            $table->text('location');
            $table->foreignId('branch_id')->constrained('branches')->onDelete('restrict');
            $table->foreignId('worker_id')->constrained('users')->onDelete('restrict');
            $table->foreignId('card_id')->constrained('cards')->onDelete('restrict');
            $table->integer('total_boxes');
            $table->integer('boxes_filled')->default(0);
            $table->decimal('price_per_box', 10, 2);
            $table->decimal('total_amount', 12, 2);
            $table->decimal('amount_paid', 12, 2)->default(0);
            $table->decimal('balance', 12, 2)->storedAs('total_amount - amount_paid');
            $table->enum('status', ['in_progress', 'completed', 'defaulting'])->default('in_progress');
            $table->date('last_payment_date')->nullable();
            $table->timestamps();
            $table->softDeletes();
            
            $table->index('branch_id');
            $table->index('worker_id');
            $table->index('card_id');
            $table->index('status');
            $table->index('last_payment_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
