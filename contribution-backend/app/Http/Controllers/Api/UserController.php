<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Get all users (CEO/Secretary filtered)
     */
    public function index()
    {
        $user = auth()->user();
        
        if ($user->hasRole('ceo')) {
            $users = User::with('roles', 'branch')->get();
        } else {
            // Secretary can only see workers in their branch
            $users = User::where('branch_id', $user->branch_id)
                ->with('roles', 'branch')
                ->get();
        }

        return response()->json($users);
    }

    /**
     * Create a new user (CEO/Secretary)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'phone' => 'nullable|string|max:20',
            'password' => 'required|string|min:8|confirmed',
            'branch_id' => 'required|exists:branches,id',
            'role' => 'required|in:secretary,worker',
            'status' => 'nullable|in:active,inactive,suspended'
        ]);

        // Authorization logic could be moved to Policy
        // Only CEO can create Secretary
        // Only CEO can create new users
        // Check permission: CEO or 'create_workers'
        if (!auth()->user()->hasRole('ceo') && !auth()->user()->can('create_workers')) {
            abort(403, 'Unauthorized. You do not have permission to create users.');
        }

        // Additional restrictions for non-CEOs (e.g. Secretaries)
        if (!auth()->user()->hasRole('ceo')) {
            // Can only create 'worker' role
            if ($validated['role'] !== 'worker') {
                abort(403, 'Unauthorized. You can only create Worker accounts.');
            }
            // Can only assign to own branch
            if ($validated['branch_id'] != auth()->user()->branch_id) {
                abort(403, 'Unauthorized. You can only assign users to your own branch.');
            }
        }

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'password' => $validated['password'],
            'branch_id' => $validated['branch_id'],
            'status' => $validated['status'] ?? 'active',
        ]);

        $user->assignRole($validated['role']);

        // Create audit log
        \App\Models\AuditLog::log('user_created', $user, null, $user->toArray());

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user->load('roles', 'branch'),
        ], 201);
    }

    /**
     * Get single user
     */
    public function show($id)
    {
        $user = User::with('roles', 'branch')->findOrFail($id);
        return response()->json($user);
    }

    /**
     * Update user
     */
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);
        
        // Only CEO can update users
        if (!auth()->user()->hasRole('ceo')) {
            abort(403, 'Unauthorized. Only CEO can update users.');
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => ['sometimes', 'email', Rule::unique('users')->ignore($user->id)],
            'phone' => 'nullable|string|max:20',
            'password' => 'nullable|string|min:8|confirmed',
            'branch_id' => 'sometimes|exists:branches,id',
            'status' => 'sometimes|in:active,inactive,suspended',
            'role' => 'sometimes|in:secretary,worker' // Careful with role updates
        ]);

        if (isset($validated['password'])) {
            $validated['password'] = $validated['password'];
        }

        $oldValues = $user->toArray();
        $user->update($validated);

        // Create audit log
        \App\Models\AuditLog::log('user_updated', $user, $oldValues, $user->getChanges());

        if (isset($validated['role']) && auth()->user()->hasRole('ceo')) {
            $user->syncRoles([$validated['role']]);
        }

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $user->load('roles', 'branch'),
        ]);
    }

    /**
     * Delete user
     */
    public function destroy($id)
    {
        $user = User::findOrFail($id);
        
        // Only CEO can delete users
        if (!auth()->user()->hasRole('ceo')) {
            abort(403, 'Unauthorized. Only CEO can delete users.');
        }
        
        // Prevent deleting yourself
        if ($user->id === auth()->id()) {
            abort(403, 'Cannot delete yourself');
        }

        $oldValues = $user->toArray();
        $user->delete();

        // Create audit log
        \App\Models\AuditLog::log('user_deleted', $user, $oldValues, null);

        return response()->json([
            'message' => 'User deleted successfully',
        ]);
    }
}
