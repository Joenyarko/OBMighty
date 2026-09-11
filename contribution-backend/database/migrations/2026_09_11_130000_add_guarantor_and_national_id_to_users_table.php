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
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'guarantor_name')) {
                $table->string('guarantor_name', 255)->nullable()->after('address');
            }
            if (!Schema::hasColumn('users', 'guarantor_phone')) {
                $table->string('guarantor_phone', 50)->nullable()->after('guarantor_name');
            }
            if (!Schema::hasColumn('users', 'national_id_number')) {
                $table->string('national_id_number', 100)->nullable()->after('guarantor_phone');
            }
            if (!Schema::hasColumn('users', 'national_id_image')) {
                $table->string('national_id_image', 500)->nullable()->after('national_id_number');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'guarantor_name')) {
                $table->dropColumn('guarantor_name');
            }
            if (Schema::hasColumn('users', 'guarantor_phone')) {
                $table->dropColumn('guarantor_phone');
            }
            if (Schema::hasColumn('users', 'national_id_number')) {
                $table->dropColumn('national_id_number');
            }
            if (Schema::hasColumn('users', 'national_id_image')) {
                $table->dropColumn('national_id_image');
            }
        });
    }
};
