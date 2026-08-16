<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    /**
     * Display a listing of users globally.
     */
    public function index(Request $request)
    {
        // Eager load company and roles. 
        // Note: Global scope 'company' is bypassed by SetSuperAdminContext middleware for Super Admins.
        $query = User::with(['company', 'roles'])
            ->orderBy('created_at', 'desc');

        // Search by name or email
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Filter by specific company
        if ($request->has('company_id') && !empty($request->company_id)) {
            $query->where('company_id', $request->company_id);
        }
        
        // Filter by Role
        if ($request->has('role') && !empty($request->role)) {
             $role = $request->role;
             $query->whereHas('roles', function($q) use ($role) {
                 $q->where('name', $role);
             });
        }

        return response()->json($query->paginate(15));
    }

    /**
     * Store a newly created user.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => [
                'required',
                'string',
                'min:8',
                'regex:/[a-z]/',
                'regex:/[A-Z]/',
                'regex:/[0-9]/',
                'regex:/[@$!%*#?&]/',
            ],
            'company_id' => 'required|exists:companies,id',
            'role' => 'required|string|in:ceo,secretary,worker',
            'phone' => 'nullable|string|regex:/^[0-9]{10}$/',
        ], [
            'phone.regex' => 'The phone number must be exactly 10 digits.',
            'password.regex' => 'The password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => \Illuminate\Support\Facades\Hash::make($validated['password']),
            'company_id' => $validated['company_id'],
            'phone' => $validated['phone'] ?? null,
            'status' => 'active',
        ]);

        $user->assignRole($validated['role']);
        
        // Load relationships for response
        $user->load(['company', 'roles']);

        return response()->json($user, 201);
    }

    public function show($id)
    {
        $user = User::with(['company', 'roles', 'branch'])->findOrFail($id);
        return response()->json($user);
    }

    /**
     * Update the specified user.
     */
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $id,
            'password' => 'nullable|string|min:6',
            'role' => 'sometimes|string|exists:roles,name',
            'company_id' => 'nullable|exists:companies,id',
        ]);

        $updateData = [];
        if (isset($validated['name'])) $updateData['name'] = $validated['name'];
        if (isset($validated['email'])) $updateData['email'] = $validated['email'];
        if (!empty($validated['password'])) $updateData['password'] = Hash::make($validated['password']);
        
        // Only super admin can change company_id globally
        if (array_key_exists('company_id', $validated)) {
            $updateData['company_id'] = $validated['company_id'];
        }

        $user->update($updateData);

        if (isset($validated['role'])) {
            $user->syncRoles([$validated['role']]);
        }

        $user->load(['company', 'roles']);

        return response()->json($user);
    }

    /**
     * Remove the specified user.
     */
    public function destroy($id)
    {
        $user = User::findOrFail($id);
        
        // Ensure Super Admin doesn't accidentally delete themselves
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'You cannot delete your own account.'], 422);
        }

        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }
}
