<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        // Add new columns only if they don't exist
        Schema::table('cards', function (Blueprint $table) {
            if (!Schema::hasColumn('cards', 'card_name')) {
                $table->string('card_name')->after('id');
            }
            if (!Schema::hasColumn('cards', 'card_code')) {
                $table->string('card_code')->unique()->after('card_name');
            }
            if (!Schema::hasColumn('cards', 'number_of_boxes')) {
                $table->integer('number_of_boxes')->default(0)->after('card_code');
            }
            if (!Schema::hasColumn('cards', 'amount')) {
                $table->decimal('amount', 10, 2)->default(0)->after('number_of_boxes');
            }
            if (!Schema::hasColumn('cards', 'front_image')) {
                $table->string('front_image')->nullable()->after('amount');
            }
            if (!Schema::hasColumn('cards', 'back_image')) {
                $table->string('back_image')->nullable()->after('front_image');
            }
        });

        // Drop foreign key if it exists
        $foreignKeys = DB::select("SELECT CONSTRAINT_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'cards' 
            AND CONSTRAINT_NAME = 'cards_customer_id_foreign'");

        if (!empty($foreignKeys)) {
            Schema::table('cards', function (Blueprint $table) {
                $table->dropForeign(['customer_id']);
            });
        }

        // Drop old columns if they exist
        Schema::table('cards', function (Blueprint $table) {
            // Drop generated column first
            if (Schema::hasColumn('cards', 'total_amount')) {
                $table->dropColumn('total_amount');
            }
            
            if (Schema::hasColumn('cards', 'customer_id')) {
                $table->dropColumn('customer_id');
            }
            if (Schema::hasColumn('cards', 'card_number')) {
                $table->dropColumn('card_number');
            }
            // Drop old card structure columns
            if (Schema::hasColumn('cards', 'name')) {
                $table->dropColumn('name');
            }
            if (Schema::hasColumn('cards', 'description')) {
                $table->dropColumn('description');
            }
            if (Schema::hasColumn('cards', 'price_per_box')) {
                $table->dropColumn('price_per_box');
            }
            if (Schema::hasColumn('cards', 'total_boxes')) {
                $table->dropColumn('total_boxes');
            }
            if (Schema::hasColumn('cards', 'associated_item')) {
                $table->dropColumn('associated_item');
            }
        });
    }

    public function down()
    {
        Schema::table('cards', function (Blueprint $table) {
            // Restore old columns
            if (!Schema::hasColumn('cards', 'card_number')) {
                $table->string('card_number')->after('id');
            }
            if (!Schema::hasColumn('cards', 'customer_id')) {
                $table->foreignId('customer_id')->nullable()->constrained()->onDelete('set null');
            }
            
            // Drop new columns
            if (Schema::hasColumn('cards', 'card_name')) {
                $table->dropColumn('card_name');
            }
            if (Schema::hasColumn('cards', 'card_code')) {
                $table->dropColumn('card_code');
            }
            if (Schema::hasColumn('cards', 'number_of_boxes')) {
                $table->dropColumn('number_of_boxes');
            }
            if (Schema::hasColumn('cards', 'amount')) {
                $table->dropColumn('amount');
            }
            if (Schema::hasColumn('cards', 'front_image')) {
                $table->dropColumn('front_image');
            }
            if (Schema::hasColumn('cards', 'back_image')) {
                $table->dropColumn('back_image');
            }
        });
    }
};
