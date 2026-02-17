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
    public function index(Request $request)
    {
        $user = auth()->user();
        $includeInactive = $request->query('include_inactive', false);
        
        if ($user->hasRole('ceo')) {
            $query = User::with('roles', 'branch', 'permissions');
            
            if (!$includeInactive) {
                $query->where('status', 'active');
            }
            
            $users = $query->get();
        } else {
            // Secretary can only see workers in their branch
            $query = User::where('branch_id', $user->branch_id)
                ->with('roles', 'branch', 'permissions');
                
            if (!$includeInactive) {
                $query->where('status', 'active');
            }
            
            $users = $query->get();
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
            'phone' => 'nullable|string|regex:/^[0-9]{10}$/',
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
                'regex:/[a-z]/',
                'regex:/[A-Z]/',
                'regex:/[0-9]/',
                'regex:/[@$!%*#?&]/',
            ],
            'branch_id' => 'required|exists:branches,id',
            'role' => 'required|in:secretary,worker',
            'status' => 'nullable|in:active,inactive,suspended'
        ], [
            'phone.regex' => 'The phone number must be exactly 10 digits.',
            'password.regex' => 'The password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
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
            'user' => $user->load('roles', 'branch', 'permissions'),
        ], 201);
    }

    /**
     * Get single user
     */
    public function show($id)
    {
        $user = User::with('roles', 'branch', 'permissions')->findOrFail($id);
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
            'phone' => 'nullable|string|regex:/^[0-9]{10}$/',
            'password' => [
                'nullable',
                'string',
                'min:8',
                'confirmed',
                'regex:/[a-z]/',
                'regex:/[A-Z]/',
                'regex:/[0-9]/',
                'regex:/[@$!%*#?&]/',
            ],
            'branch_id' => 'sometimes|exists:branches,id',
            'status' => 'sometimes|in:active,inactive,suspended',
            'role' => 'sometimes|in:secretary,worker'
        ], [
            'phone.regex' => 'The phone number must be exactly 10 digits.',
            'password.regex' => 'The password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
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
            'user' => $user->load('roles', 'branch', 'permissions'),
        ]);
    }

    /**
     * Deactivate user (soft delete)
     */
    public function deactivate($id)
    {
        $user = User::findOrFail($id);
        
        // Only CEO can deactivate users
        if (!auth()->user()->hasRole('ceo')) {
            abort(403, 'Unauthorized. Only CEO can deactivate users.');
        }
        
        // Prevent deactivating yourself
        if ($user->id === auth()->id()) {
            abort(403, 'Cannot deactivate yourself');
        }

        $oldValues = $user->toArray();
        $user->update(['status' => 'inactive']);

        // Create audit log
        \App\Models\AuditLog::log('user_deactivated', $user, $oldValues, ['status' => 'inactive']);

        return response()->json([
            'message' => 'User deactivated successfully',
        ]);
    }

    /**
     * Deactivate worker with optional customer transfer
     */
    public function deactivateWorker(Request $request, $id)
    {
        $validated = $request->validate([
            'transfer_to_worker_id' => 'nullable|exists:users,id',
        ]);

        return \DB::transaction(function () use ($id, $validated) {
            $worker = User::findOrFail($id);
            
            // Only CEO can deactivate workers
            if (!auth()->user()->hasRole('ceo')) {
                abort(403, 'Unauthorized. Only CEO can deactivate workers.');
            }

            // Check if worker has customers
            $customerCount = \App\Models\Customer::where('worker_id', $id)->count();

            if ($customerCount > 0) {
                if (!isset($validated['transfer_to_worker_id'])) {
                    return response()->json([
                        'error' => 'Worker has customers',
                        'message' => 'This worker has ' . $customerCount . ' customer(s). Please select a worker to transfer them to.',
                        'customer_count' => $customerCount,
                    ], 422);
                }

                // Validate new worker is active
                $newWorker = User::findOrFail($validated['transfer_to_worker_id']);
                if ($newWorker->status !== 'active') {
                    return response()->json([
                        'error' => 'Invalid target worker',
                        'message' => 'Target worker must be active',
                    ], 422);
                }

                // Transfer customers ONLY (not payments)
                \App\Models\Customer::where('worker_id', $id)
                    ->update(['worker_id' => $validated['transfer_to_worker_id']]);

                // Log the transfer
                \App\Models\AuditLog::create([
                    'company_id' => auth()->user()->company_id,
                    'user_id' => auth()->id(),
                    'action' => 'customers_transferred',
                    'details' => json_encode([
                        'from_worker_id' => $id,
                        'to_worker_id' => $validated['transfer_to_worker_id'],
                        'customer_count' => $customerCount,
                    ]),
                    'ip_address' => request()->ip(),
                ]);
            }

            // Deactivate worker
            $oldValues = $worker->toArray();
            $worker->update(['status' => 'inactive']);

            // Audit log
            \App\Models\AuditLog::log('worker_deactivated', $worker, $oldValues, ['status' => 'inactive']);

            return response()->json([
                'message' => 'Worker deactivated successfully',
                'customers_transferred' => $customerCount,
            ]);
        });
    }
}
