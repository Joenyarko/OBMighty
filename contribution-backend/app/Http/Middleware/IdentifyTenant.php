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
        $subdomain = explode('.', $host)[0];
        $company = Company::where('domain', $host)
            ->orWhere('subdomain', $host)
            ->orWhere('subdomain', $subdomain)
            ->first();

        // Fallback for central API domain (e.g., api.neziz.cloud)
        if (!$company && $subdomain === 'api') {
             // Try to identify company from the Origin header (e.g., company1.neziz.cloud)
             $origin = $request->header('Origin');
             
             \Illuminate\Support\Facades\Log::info('Central API Fallback Attempt', [
                 'origin_header' => $origin,
             ]);

             if ($origin) {
                 $originHost = parse_url($origin, PHP_URL_HOST);
                 $originSubdomain = explode('.', $originHost)[0];
                 
                 \Illuminate\Support\Facades\Log::info('Central API Origin Parsed', [
                     'origin_host' => $originHost,
                     'origin_subdomain' => $originSubdomain
                 ]);

                 $company = Company::where('domain', $originHost)
                     ->orWhere('subdomain', $originHost)
                     ->orWhere('subdomain', $originSubdomain)
                     ->first();
             }

             // If still no company and we are on the central API domain, we don't set a company_id
             // This allows Super Admin routes to function without a tenant scope
             if (!$company) {
                 app()->instance('central_domain', true);
                 return $next($request);
             }
        }

        // Local development fallback
        if (!$company && ($host === 'localhost' || $host === '127.0.0.1')) {
             \Illuminate\Support\Facades\Log::info('Entering Localhost Fallback');
             $company = Company::first(); // Default to first company for local dev
        }

        // Final check: If we are on a central domain but no company identified, don't 404
        // Let the auth/middleware stack handle permissions
        $isCentral = ($subdomain === 'api' || $host === 'neziz.com' || str_ends_with($host, '.com')); // Add more as needed
        
        if (!$company && ($isCentral || app()->has('central_domain'))) {
             return $next($request);
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
