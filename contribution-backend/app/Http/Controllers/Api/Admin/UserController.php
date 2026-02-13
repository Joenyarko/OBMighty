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
     * Display the specified user.
     */
    public function show($id)
    {
        $user = User::with(['company', 'roles', 'branch'])->findOrFail($id);
        return response()->json($user);
    }
}
