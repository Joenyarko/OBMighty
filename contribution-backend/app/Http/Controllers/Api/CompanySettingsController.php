<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CompanySettingsController extends Controller
{
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

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'card_prefix' => 'sometimes|string|max:10', // Short prefix
            'primary_color' => 'sometimes|string|max:7', // Hex color
        ]);

        $company->update($validated);

        return response()->json([
            'message' => 'Company settings updated successfully',
            'company' => $company
        ]);
    }
}
