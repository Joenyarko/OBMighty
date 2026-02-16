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
        DB::table('companies')->whereNotNull('logo_url')->get()->each(function ($company) {
            $url = $company->logo_url;

            // If it starts with http, it's an absolute URL that needs fixing
            if (str_starts_with($url, 'http')) {
                $parsedUrl = parse_url($url);
                $path = $parsedUrl['path'] ?? '';

                if (!empty($path)) {
                    // Normalize path (ensure it starts with /)
                    if (!str_starts_with($path, '/')) {
                        $path = '/' . $path;
                    }

                    DB::table('companies')
                        ->where('id', $company->id)
                        ->update(['logo_url' => $path]);
                    
                    echo "Updated logo for {$company->name}: {$url} -> {$path}\n";
                }
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No reversed needed for data cleanup
    }
};
