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
        // Fix logo_urls that have full URLs stored (e.g., http://localhost:5173/storage/companies/...)
        // Convert them to relative paths that the accessor can properly transform
        DB::table('companies')->whereNotNull('logo_url')->get()->each(function ($company) {
            $logo_url = $company->logo_url;
            
            // If it's already a relative path or null, skip it
            if (!$logo_url || str_starts_with($logo_url, '/')) {
                return;
            }
            
            // Extract the relative path from full URL
            // e.g., "http://localhost:5173/storage/companies/filename.jpg" -> "/storage/companies/filename.jpg"
            if (str_contains($logo_url, '/storage/')) {
                $path = '/storage/' . explode('/storage/', $logo_url)[1];
                
                DB::table('companies')
                    ->where('id', $company->id)
                    ->update(['logo_url' => $path]);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No need to reverse - we're just fixing data format
    }
};
