<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        // Add 'closed' to customers table status enum
        // We use native SQL because Laravel's change() method has issues with ENUM types
        DB::statement("ALTER TABLE customers MODIFY COLUMN status ENUM('in_progress', 'completed', 'defaulting', 'closed') DEFAULT 'in_progress'");
        
        // Add 'closed' to customer_cards table status enum
        DB::statement("ALTER TABLE customer_cards MODIFY COLUMN status ENUM('active', 'completed', 'cancelled', 'closed') DEFAULT 'active'");
    }

    public function down()
    {
        // Revert enums and handle existing 'closed' records if necessary
        // WARNING: This will fail if there are records marked as 'closed'
        DB::statement("ALTER TABLE customers MODIFY COLUMN status ENUM('in_progress', 'completed', 'defaulting') DEFAULT 'in_progress'");
        DB::statement("ALTER TABLE customer_cards MODIFY COLUMN status ENUM('active', 'completed', 'cancelled') DEFAULT 'active'");
    }
};
