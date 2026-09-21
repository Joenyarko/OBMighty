<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('worker_attendance', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('company_id')->nullable();
            $table->foreignId('worker_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('branch_id')->nullable()->constrained('branches')->onDelete('set null');
            $table->date('date');
            $table->enum('status', ['present', 'absent'])->default('present');
            $table->enum('source', ['auto', 'manual'])->default('auto');
            $table->string('notes', 500)->nullable();
            $table->foreignId('marked_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            // Each worker can only have one attendance record per day
            $table->unique(['worker_id', 'date']);
            $table->index(['company_id', 'date']);
            $table->index(['worker_id', 'date']);
            $table->index('branch_id');
        });
    }

    public function down()
    {
        Schema::dropIfExists('worker_attendance');
    }
};
