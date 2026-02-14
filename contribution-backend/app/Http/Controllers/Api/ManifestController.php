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
        
        // Default manifest values
        $manifest = [
            'name' => 'Contribution Manager',
            'short_name' => 'Contribution',
            'description' => 'Manage contributions and finances',
            'start_url' => '/',
            'scope' => '/',
            'display' => 'standalone',
            'orientation' => 'portrait-or-landscape',
            'theme_color' => '#4F46E5',
            'background_color' => '#ffffff',
            'icons' => [
                [
                    'src' => '/logo.jpeg',
                    'sizes' => '192x192',
                    'type' => 'image/jpeg',
                    'purpose' => 'any'
                ],
                [
                    'src' => '/logo.jpeg',
                    'sizes' => '512x512',
                    'type' => 'image/jpeg',
                    'purpose' => 'any'
                ]
            ],
            'screenshots' => [
                [
                    'src' => '/logo.jpeg',
                    'type' => 'image/jpeg',
                    'sizes' => '540x720'
                ]
            ],
            'categories' => ['productivity', 'finance'],
            'shortcuts' => [
                [
                    'name' => 'Dashboard',
                    'short_name' => 'Dashboard',
                    'description' => 'View your dashboard',
                    'url' => '/dashboard',
                    'icons' => [
                        [
                            'src' => '/logo.jpeg',
                            'type' => 'image/jpeg',
                            'sizes' => '192x192'
                        ]
                    ]
                ]
            ]
        ];

        // If user is authenticated, customize with company branding
        if ($user && $user->company) {
            $company = $user->company;
            
            $manifest['name'] = $company->name . ' - Contribution Manager';
            $manifest['short_name'] = substr($company->name, 0, 12);
            $manifest['description'] = $company->name . ' contribution and finance management system';
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
                
                $manifest['screenshots'] = [
                    [
                        'src' => $company->logo_url,
                        'type' => 'image/png',
                        'sizes' => '540x720'
                    ]
                ];
            }
        }

        return response()->json($manifest)
            ->header('Content-Type', 'application/manifest+json')
            ->header('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
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
            'name' => $company->name . ' - Contribution Manager',
            'short_name' => substr($company->name, 0, 12),
            'description' => $company->name . ' contribution and finance management system',
            'start_url' => '/',
            'scope' => '/',
            'display' => 'standalone',
            'orientation' => 'portrait-or-landscape',
            'theme_color' => $company->primary_color ?? '#4F46E5',
            'background_color' => '#ffffff',
            'icons' => [
                [
                    'src' => $company->logo_url ?: '/logo.jpeg',
                    'sizes' => '192x192',
                    'type' => 'image/png',
                    'purpose' => 'any'
                ],
                [
                    'src' => $company->logo_url ?: '/logo.jpeg',
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
            'name' => 'Contribution Manager',
            'short_name' => 'Contribution',
            'description' => 'Manage contributions and finances',
            'start_url' => '/',
            'scope' => '/',
            'display' => 'standalone',
            'orientation' => 'portrait-or-landscape',
            'theme_color' => '#4F46E5',
            'background_color' => '#ffffff',
            'icons' => [
                [
                    'src' => '/logo.jpeg',
                    'sizes' => '192x192',
                    'type' => 'image/jpeg',
                    'purpose' => 'any'
                ],
                [
                    'src' => '/logo.jpeg',
                    'sizes' => '512x512',
                    'type' => 'image/jpeg',
                    'purpose' => 'any'
                ]
            ],
            'categories' => ['productivity', 'finance']
        ];

        return response()->json($manifest)
            ->header('Content-Type', 'application/manifest+json')
            ->header('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    }
}
