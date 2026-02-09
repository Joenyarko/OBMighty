<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('employee_salaries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->decimal('monthly_salary', 12, 2);
            $table->decimal('allowances', 12, 2)->nullable();
            $table->decimal('deductions', 12, 2)->nullable();
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            
            $table->index(['user_id', 'status']);
            $table->index('effective_from');
        });
    }

    public function down()
    {
        Schema::dropIfExists('employee_salaries');
    }
};
