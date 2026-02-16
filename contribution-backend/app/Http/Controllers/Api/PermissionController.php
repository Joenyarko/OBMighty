<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;
use App\Models\User;

class PermissionController extends Controller
{
    /**
     * Get all available permissions.
     */
    public function index()
    {
        $permissions = Permission::all()->pluck('name');
        return response()->json($permissions);
    }

    /**
     * Sync permissions for a specific user.
     */
    public function syncUserPermissions(Request $request, $userId)
    {
        // Use a validator instance to get detailed error info if it fails
        $validator = \Validator::make($request->all(), [
            'permissions' => 'present|array',
            'permissions.*' => 'exists:permissions,name',
        ]);

        if ($validator->fails()) {
            \Log::error('Permission Sync Validation Failed', [
                'user_id' => $userId,
                'errors' => $validator->errors()->toArray(),
                'input' => $request->all()
            ]);
            
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::findOrFail($userId);
        
        // Ensure only CEO can manage permissions
        if (!auth()->user()->hasRole('ceo')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $user->syncPermissions($request->permissions);

        return response()->json([
            'message' => 'Permissions updated successfully',
            'user' => $user->load('permissions', 'roles'),
        ]);
    }
}
