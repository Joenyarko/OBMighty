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
        Schema::table('box_payments', function (Blueprint $table) {
            $table->decimal('adjusted_from', 10, 2)->nullable()->after('amount_paid');
            $table->unsignedBigInteger('adjusted_by')->nullable()->after('adjusted_from');
            $table->timestamp('adjusted_at')->nullable()->after('adjusted_by');
            $table->text('adjustment_notes')->nullable()->after('adjusted_at');
            
            $table->foreign('adjusted_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('box_payments', function (Blueprint $table) {
            $table->dropForeign(['adjusted_by']);
            $table->dropColumn(['adjusted_from', 'adjusted_by', 'adjusted_at', 'adjustment_notes']);
        });
    }
};
