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
        
        // Generic base manifest (No hardcoded branding)
        $manifest = [
            'name' => 'Management System',
            'short_name' => 'Management',
            'description' => 'Business management and finance system',
            'start_url' => '/',
            'scope' => '/',
            'display' => 'standalone',
            'orientation' => 'portrait-or-landscape',
            'theme_color' => '#4F46E5',
            'background_color' => '#ffffff',
            'icons' => [],
            'categories' => ['productivity', 'finance']
        ];

        // If user is authenticated, customize with company branding
        if ($user && $user->company) {
            $company = $user->company;
            
            $manifest['name'] = $company->name;
            $manifest['short_name'] = substr($company->name, 0, 12);
            $manifest['description'] = $company->name . ' management system';
            $manifest['theme_color'] = $company->primary_color ?? '#4F46E5';
            
            // Use company logo if available
            if ($company->logo_url) {
                $manifest['icons'] = [
                    [
                        'src' => $company->logo_url,
                        'sizes' => '192x192',
                        'type' => 'image/png',
                        'purpose' => 'any'
                    ],
                    [
                        'src' => $company->logo_url,
                        'sizes' => '512x512',
                        'type' => 'image/png',
                        'purpose' => 'any'
                    ]
                ];
            }
        }

        return response()->json($manifest)
            ->header('Content-Type', 'application/manifest+json')
            ->header('Cache-Control', 'no-cache');
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

        $manifest = [
            'name' => $company->name,
            'short_name' => substr($company->name, 0, 12),
            'description' => $company->name . ' management system',
            'start_url' => '/',
            'scope' => '/',
            'display' => 'standalone',
            'orientation' => 'portrait-or-landscape',
            'theme_color' => $company->primary_color ?? '#4F46E5',
            'background_color' => '#ffffff',
            'icons' => [
                [
                    'src' => $company->logo_url,
                    'sizes' => '192x192',
                    'type' => 'image/png',
                    'purpose' => 'any'
                ],
                [
                    'src' => $company->logo_url,
                    'sizes' => '512x512',
                    'type' => 'image/png',
                    'purpose' => 'any'
                ]
            ],
            'categories' => ['productivity', 'finance']
        ];

        return response()->json($manifest)
            ->header('Content-Type', 'application/manifest+json')
            ->header('Cache-Control', 'public, max-age=3600');
    }

    /**
     * Get public manifest (for unauthenticated users)
     * GET /manifest.json (fallback)
     */
    public function getPublicManifest(Request $request)
    {
        $manifest = [
            'name' => 'Management System',
            'short_name' => 'Management',
            'description' => 'Business management and finance system',
            'start_url' => '/',
            'scope' => '/',
            'display' => 'standalone',
            'orientation' => 'portrait-or-landscape',
            'theme_color' => '#4F46E5',
            'background_color' => '#ffffff',
            'icons' => [],
            'categories' => ['productivity', 'finance']
        ];

        return response()->json($manifest)
            ->header('Content-Type', 'application/manifest+json')
            ->header('Cache-Control', 'public, max-age=86400');
    }
}
