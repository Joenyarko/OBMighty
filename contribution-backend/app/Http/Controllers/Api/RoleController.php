<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RoleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        // Return all roles except maybe super-admin if you had one, 
        // but here we just return the main ones.
        // We load permissions with them so the UI knows current state.
        $roles = Role::with('permissions')->get();
        return response()->json($roles);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $role = Role::with('permissions')->findOrFail($id);
        return response()->json($role);
    }

    /**
     * Sync permissions for a specific role.
     */
    public function syncPermissions(Request $request, string $id)
    {
        $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'exists:permissions,name',
        ]);

        $role = Role::findOrFail($id);
        
        // Prevent modifying restricted roles if necessary, e.g., CEO should always gave all?
        // For now, allow modifying 'worker' and 'secretary'. 
        // Maybe block modifying 'ceo' to prevent lockout.
        if ($role->name === 'ceo') {
             return response()->json(['message' => 'Cannot modify CEO permissions.'], 403);
        }

        $role->syncPermissions($request->permissions);

        return response()->json([
            'message' => 'Role permissions updated successfully',
            'role' => $role->load('permissions'),
        ]);
    }
}
