<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\Company;

class IdentifyTenant
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Skip for central domains or specific routes if needed
        // For now, we assume every request must belong to a tenant unless it's the central admin panel (future)

        $host = $request->getHost();

        \Illuminate\Support\Facades\Log::info('IdentifyTenant Middleware', [
            'url' => $request->fullUrl(),
            'host' => $host,
            'method' => $request->method(),
        ]);
        
        // Find company by domain or subdomain
        $company = Company::where('domain', $host)
            ->orWhere('subdomain', $host)
            ->orWhere('subdomain', explode('.', $host)[0]) // Try matching "client" from "client.obmighty.com"
            ->first();

        // Local development fallback
        if (!$company && ($host === 'localhost' || $host === '127.0.0.1')) {
             \Illuminate\Support\Facades\Log::info('Entering Localhost Fallback');
             $company = Company::first(); // Default to first company for local dev
        }

        if ($company) {
             \Illuminate\Support\Facades\Log::info('Tenant Identified', ['id' => $company->id, 'name' => $company->name, 'db_active' => $company->is_active]);
        } else {
             \Illuminate\Support\Facades\Log::warning('Tenant NOT Found', ['host' => $host]);
        }

        if (!$company || !$company->is_active) {
            return response()->json([
                'message' => 'Tenant not found or inactive.'
            ], 404);
        }

        // Set company ID in config for the Global Scope to pick up
        config(['app.company_id' => $company->id]);
        config(['app.company_name' => $company->name]);
        config(['app.company_logo' => $company->logo_url]);
        config(['app.company_color' => $company->primary_color]);

        return $next($request);
    }
}
