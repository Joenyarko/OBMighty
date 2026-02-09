<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('box_states', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_card_id')->constrained()->onDelete('cascade');
            $table->integer('box_number'); // 1-300
            $table->boolean('is_checked')->default(false);
            $table->date('checked_date')->nullable();
            $table->foreignId('payment_id')->nullable()->constrained('box_payments')->onDelete('set null');
            $table->timestamps();
            
            $table->unique(['customer_card_id', 'box_number']);
            $table->index(['customer_card_id', 'is_checked']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('box_states');
    }
};
