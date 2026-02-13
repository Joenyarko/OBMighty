<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

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

    /**
     * Display the specified user.
     */
    public function show($id)
    {
        $user = User::with(['company', 'roles', 'branch'])->findOrFail($id);
        return response()->json($user);
    }
}
