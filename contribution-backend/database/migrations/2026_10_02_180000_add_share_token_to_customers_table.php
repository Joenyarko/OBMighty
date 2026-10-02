<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('customers', 'share_token')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->string('share_token', 64)->nullable()->unique()->after('status');
            });

            // Backfill existing customers with unique tokens
            $customers = DB::table('customers')->whereNull('share_token')->select('id')->get();
            foreach ($customers as $c) {
                DB::table('customers')
                    ->where('id', $c->id)
                    ->update(['share_token' => bin2hex(random_bytes(16))]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('customers', 'share_token')) {
            Schema::table('customers', function (Blueprint $table) {
                $table->dropColumn('share_token');
            });
        }
    }
};
