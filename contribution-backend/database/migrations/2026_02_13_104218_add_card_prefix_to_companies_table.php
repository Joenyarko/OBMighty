<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
        Schema::table('companies', function (Blueprint $table) {
            $table->string('card_prefix')->default('NEZ')->after('subdomain');
        });
    }

    /**
     * Reverse the migrations.
     */
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn('card_prefix');
        });
    }
};
