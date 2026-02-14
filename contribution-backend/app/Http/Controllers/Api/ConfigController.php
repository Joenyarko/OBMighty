<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Company;

class ConfigController extends Controller
{
    /**
     * Get public configuration for the current tenant.
     * This endpoint is unenforced by auth middleware but enforced by IdentifyTenant middleware.
     */
    public function index(Request $request)
    {
        // Company ID is already set in config by IdentifyTenant middleware
        $companyId = config('app.company_id');

        \Illuminate\Support\Facades\Log::info('Config Endpoint Hit', [
            'host' => $request->getHost(),
            'company_id' => $companyId,
        ]);
        
        if (!$companyId) {
             return response()->json(['message' => 'Tenant not identified'], 404);
        }

        $company = Company::find($companyId);
        
        if (!$company) {
            return response()->json(['message' => 'Company not found'], 404);
        }

        $data = [
            'app_name' => $company->name,
            'logo_url' => $company->logo_url ? (str_starts_with($company->logo_url, 'http') ? $company->logo_url : url($company->logo_url)) : null,
            'primary_color' => $company->primary_color,
            'domain' => $company->domain,
            'subdomain' => $company->subdomain,
        ];

        \Illuminate\Support\Facades\Log::info('Config Response', $data);

        return response()->json($data);
    }
}
