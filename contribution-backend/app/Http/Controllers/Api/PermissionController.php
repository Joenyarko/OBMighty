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
        $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'exists:permissions,name',
        ]);

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
