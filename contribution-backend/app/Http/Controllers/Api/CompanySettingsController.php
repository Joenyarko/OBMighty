<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CompanySettingsController extends Controller
{
    /**
     * Get company info (public for any authenticated user)
     */
    public function getCompanyInfo(Request $request)
    {
        $user = $request->user();
        
        if (!$user || !$user->company_id) {
            return response()->json(['message' => 'No company associated'], 404);
        }

        $company = $user->company;

        return response()->json([
            'company' => [
                'id' => $company->id,
                'name' => $company->name,
                'logo_url' => $company->logo_url,
                'primary_color' => $company->primary_color,
                'card_prefix' => $company->card_prefix,
                'currency' => $company->currency,
                'timezone' => $company->timezone,
            ]
        ]);
    }

    /**
     * Get company settings
     */
    public function show(Request $request)
    {
        $user = $request->user();
        $company = $user->company;

        if (!$company) {
            return response()->json(['message' => 'Company not found'], 404);
        }

        return response()->json([
            'company' => $company,
            'stats' => [
                'total_branches' => $company->branches()->count(),
                'total_users' => $company->users()->count(),
                'total_customers' => $company->customers()->count(),
                'active_subscriptions' => 1, // Placeholder
            ]
        ]);
    }

    /**
     * Update company settings (CEO only)
     */
    public function update(Request $request)
    {
        $user = $request->user();
        $company = $user->company;

        if (!$company) {
            return response()->json(['message' => 'Company not found'], 404);
        }

        try {
            $validated = $request->validate([
                'name' => 'sometimes|string|max:255',
                'domain' => 'sometimes|nullable|string|max:255|unique:companies,domain,' . $company->id,
                'subdomain' => 'sometimes|nullable|string|max:255|unique:companies,subdomain,' . $company->id,
                'card_prefix' => 'sometimes|string|max:10|regex:/^[A-Za-z0-9]+$/',
                'primary_color' => 'sometimes|string|max:7|regex:/^#[0-9A-F]{6}$/i',
                'logo_url' => 'sometimes|nullable|url',
                'payment_methods' => 'sometimes|array',
                'currency' => 'sometimes|string|size:3',
                'timezone' => 'sometimes|string|timezone',
            ]);

            // Convert card_prefix to uppercase
            if (isset($validated['card_prefix'])) {
                $validated['card_prefix'] = strtoupper($validated['card_prefix']);
            }

            // Only update fields that were provided
            $updateData = [];
            foreach ($validated as $key => $value) {
                if ($value !== null) {
                    $updateData[$key] = $value;
                }
            }

            if (!empty($updateData)) {
                $company->update($updateData);
            }

            // Log this change
            \App\Models\AuditLog::create([
                'company_id' => $company->id,
                'user_id' => $user->id,
                'action' => 'Company settings updated',
                'details' => json_encode($updateData),
                'ip_address' => $request->ip(),
            ]);

            $updatedCompany = $company->fresh();
            return response()->json([
                'message' => 'Company settings updated successfully',
                'company' => $updatedCompany,
                'logo_url' => $updatedCompany->logo_url
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Company settings update error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error updating settings',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get company profile
     */
    public function profile(Request $request)
    {
        $user = $request->user();
        $company = $user->company;

        if (!$company) {
            return response()->json(['message' => 'Company not found'], 404);
        }

        return response()->json([
            'company' => $company->load(['users', 'branches']),
            'metrics' => [
                'total_revenue' => $company->payments()->sum('payment_amount') ?? 0,
                'total_customers' => $company->customers()->count(),
                'monthly_target' => 0, // To be set
            ]
        ]);
    }

    /**
     * Upload company logo
     */
    public function uploadLogo(Request $request)
    {
        $user = $request->user();
        $company = $user->company;

        if (!$company) {
            return response()->json(['message' => 'Company not found'], 404);
        }

        try {
            $request->validate([
                'logo' => 'required|image|mimes:jpeg,png,svg,webp|max:5120'
            ]);

            if (!$request->hasFile('logo')) {
                return response()->json(['message' => 'No file provided'], 400);
            }

            $file = $request->file('logo');
            $filename = 'logos/' . $company->id . '_' . time() . '.' . $file->getClientOriginalExtension();
            
            // Store the file
            $path = $file->storeAs('public', $filename);
            
            // Generate the URL
            $logoUrl = '/storage/' . $filename;

            // Update company logo
            $company->update(['logo_url' => $logoUrl]);

            // Log this action
            \App\Models\AuditLog::create([
                'company_id' => $company->id,
                'user_id' => $user->id,
                'action' => 'Company logo updated',
                'details' => json_encode(['filename' => $filename]),
                'ip_address' => $request->ip(),
            ]);

            return response()->json([
                'message' => 'Logo uploaded successfully',
                'logo_url' => $logoUrl
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Logo upload error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error uploading logo',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}