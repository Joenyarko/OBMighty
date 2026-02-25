<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('worker_daily_totals', function (Blueprint $table) {
            $table->boolean('is_closed')->default(false)->after('adjustment_note');
            $table->timestamp('closed_at')->nullable()->after('is_closed');
            $table->unsignedBigInteger('closed_by')->nullable()->after('closed_at');
        });
    }

    public function down(): void
    {
        Schema::table('worker_daily_totals', function (Blueprint $table) {
            $table->dropColumn(['is_closed', 'closed_at', 'closed_by']);
        });
    }
};
