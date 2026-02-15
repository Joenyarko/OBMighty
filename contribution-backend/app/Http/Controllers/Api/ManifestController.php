<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ManifestController extends Controller
{
    /**
     * Get dynamic PWA manifest with company branding
     * GET /api/manifest
     */
    public function getManifest(Request $request)
    {
        $user = $request->user();
        $company = $user ? $user->company : null;
        
        return $this->generateManifestResponse($company);
    }

    /**
     * Get public branded manifest for a specific company (No auth required)
     * GET /api/pwa-manifest/{id}
     */
    public function getCompanyManifest($id)
    {
        $company = \App\Models\Company::find($id);
        
        if (!$company || !$company->is_active) {
            return $this->getPublicManifest(request());
        }

        return $this->generateManifestResponse($company);
    }

    /**
     * Get public manifest (for unauthenticated users)
     * GET /api/manifest.json (standard endpoint)
     */
    public function getPublicManifest(Request $request)
    {
        // Check if a company was identified by the middleware (IdentifyTenant)
        $companyId = config('app.company_id');
        $company = null;
        
        if ($companyId) {
            $company = \App\Models\Company::find($companyId);
        }

        return $this->generateManifestResponse($company);
    }

    /**
     * Help generates a standardized manifest response
     */
    protected function generateManifestResponse($company = null)
    {
        if ($company) {
            $logoUrl = $company->logo_url ? '/storage/logos/' . basename($company->logo_url) : null;

            $icons = [];
            if ($logoUrl) {
                $icons = [
                    [
                        'src' => $logoUrl,
                        'sizes' => '192x192',
                        'type' => (str_contains($logoUrl, '.png')) ? 'image/png' : 'image/jpeg',
                        'purpose' => 'any'
                    ],
                    [
                        'src' => $logoUrl,
                        'sizes' => '512x512',
                        'type' => (str_contains($logoUrl, '.png')) ? 'image/png' : 'image/jpeg',
                        'purpose' => 'any'
                    ]
                ];
            }

            $manifest = [
                'id' => 'company_' . $company->id,
                'name' => $company->name,
                'short_name' => substr($company->name, 0, 12),
                'description' => $company->name . ' management system',
                'start_url' => '/',
                'scope' => '/',
                'display' => 'standalone',
                'orientation' => 'any',
                'theme_color' => $company->primary_color ?? '#4F46E5',
                'background_color' => '#ffffff',
                'icons' => $icons,
                'categories' => ['productivity', 'finance']
            ];
        } else {
            $manifest = [
                'id' => 'default_system',
                'name' => 'Management System',
                'short_name' => 'Management',
                'description' => 'Business management and finance system',
                'start_url' => '/',
                'scope' => '/',
                'display' => 'standalone',
                'orientation' => 'any',
                'theme_color' => '#4F46E5',
                'background_color' => '#ffffff',
                'icons' => [],
                'categories' => ['productivity', 'finance']
            ];
        }

        return response()->json($manifest)
            ->header('Content-Type', 'application/manifest+json')
            ->header('Cache-Control', 'public, max-age=3600');
    }
}
