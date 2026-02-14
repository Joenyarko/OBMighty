<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CompanySettingsController extends Controller
{
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
                'card_prefix' => 'sometimes|string|max:10|regex:/^[A-Z0-9]+$/',
                'primary_color' => 'sometimes|string|max:7|regex:/^#[0-9A-F]{6}$/i',
                'logo_url' => 'sometimes|nullable|url',
                'payment_methods' => 'sometimes|array',
                'currency' => 'sometimes|string|size:3',
                'timezone' => 'sometimes|string|timezone',
            ]);

            $company->update($validated);

            // Log this change
            \App\Models\AuditLog::create([
                'company_id' => $company->id,
                'user_id' => $user->id,
                'action' => 'Company settings updated',
                'details' => json_encode($validated),
                'ip_address' => $request->ip(),
            ]);

            return response()->json([
                'message' => 'Company settings updated successfully',
                'company' => $company
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
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
}
