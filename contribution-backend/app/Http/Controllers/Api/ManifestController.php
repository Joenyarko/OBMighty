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
            // Use the full absolute URL from the Company model
            $logoUrl = $company->logo_url ?: config('app.url') . '/logo.jpeg';
            
            // Detect image MIME type from file extension
            $ext = strtolower(pathinfo(parse_url($logoUrl, PHP_URL_PATH), PATHINFO_EXTENSION));
            $iconType = match($ext) {
                'png'  => 'image/png',
                'webp' => 'image/webp',
                'gif'  => 'image/gif',
                'svg'  => 'image/svg+xml',
                default => 'image/jpeg', // covers jpg, jpeg, and unknowns
            };

            $manifest = [
                'id'               => 'company_' . $company->id,
                'name'             => $company->name,
                'short_name'       => substr($company->name, 0, 25),
                'description'      => $company->name . ' – Contribution Manager',
                'start_url'        => '/',
                'scope'            => '/',
                'display'          => 'standalone',
                'orientation'      => 'any',
                'theme_color'      => $company->primary_color ?? '#4F46E5',
                'background_color' => '#000000', // Black background makes logos pop
                // IMPORTANT: Only use purpose "any" — NOT "maskable".
                // Maskable forces a circular crop on Android which distorts company logos
                // that are not designed with the required 20% safe-area padding.
                'icons' => [
                    [
                        'src'     => $logoUrl,
                        'sizes'   => '512x512',
                        'type'    => $iconType,
                        'purpose' => 'any'
                    ],
                    [
                        'src'     => $logoUrl,
                        'sizes'   => '192x192',
                        'type'    => $iconType,
                        'purpose' => 'any'
                    ]
                ],
                'categories' => ['productivity', 'finance']
            ];
        } else {
            // Generic fallback when no tenant is identified
            $manifest = [
                'id'               => 'default_system',
                'name'             => 'Contribution Manager',
                'short_name'       => 'Contrib',
                'description'      => 'Business management and finance system',
                'start_url'        => '/',
                'scope'            => '/',
                'display'          => 'standalone',
                'orientation'      => 'any',
                'theme_color'      => '#4F46E5',
                'background_color' => '#000000',
                'icons'            => [
                    [
                        'src'     => '/Neziz-logo2.png',
                        'sizes'   => '512x512',
                        'type'    => 'image/png',
                        'purpose' => 'any'
                    ],
                    [
                        'src'     => '/Neziz-logo2.png',
                        'sizes'   => '192x192',
                        'type'    => 'image/png',
                        'purpose' => 'any'
                    ]
                ],
                'categories' => ['productivity', 'finance']
            ];
        }

        return response()->json($manifest)
            ->header('Content-Type', 'application/manifest+json')
            ->header('Cache-Control', 'public, max-age=3600');
    }
}
