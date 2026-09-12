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
        $includeInactive = filter_var($request->query('include_inactive', true), FILTER_VALIDATE_BOOLEAN);
        
        $query = User::with('roles', 'branch', 'permissions')
            ->withCount(['customers', 'payments']);

        if ($user->hasRole('ceo') || $user->hasRole('super_admin')) {
            if ($request->has('branch_id') && $request->query('branch_id') !== 'all' && !empty($request->query('branch_id'))) {
                $query->where('branch_id', $request->query('branch_id'));
            }
        } else {
            // Secretary / Manager can only see workers in their branch
            $query->where('branch_id', $user->branch_id);
        }

        if ($request->has('status') && in_array($request->query('status'), ['active', 'inactive', 'suspended'])) {
            $query->where('status', $request->query('status'));
        } elseif (!$includeInactive) {
            $query->where('status', 'active');
        }

        $users = $query->orderBy('name')->get();

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
            'address' => 'nullable|string|max:500',
            'guarantor_name' => 'nullable|string|max:255',
            'guarantor_phone' => 'nullable|string|max:50',
            'national_id_number' => 'nullable|string|max:100',
            'national_id_image' => 'nullable|image|mimes:jpeg,png,jpg,webp,gif|max:5120',
            'profile_pic' => 'nullable|image|mimes:jpeg,png,jpg,webp,gif|max:5120',
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
            'role' => 'required|in:secretary,worker,manager,branch_manager',
            'status' => 'nullable|in:active,inactive,suspended'
        ], [
            'phone.regex' => 'The phone number must be exactly 10 digits.',
            'password.regex' => 'The password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
        ]);

        // Authorization check
        if (!auth()->user()->hasRole('ceo') && !auth()->user()->hasRole('super_admin') && !auth()->user()->can('create_workers')) {
            abort(403, 'Unauthorized. You do not have permission to create users.');
        }

        // Additional restrictions for non-CEOs (e.g. Secretaries)
        if (!auth()->user()->hasRole('ceo') && !auth()->user()->hasRole('super_admin')) {
            if ($validated['role'] !== 'worker') {
                abort(403, 'Unauthorized. You can only create Worker accounts.');
            }
            if ($validated['branch_id'] != auth()->user()->branch_id) {
                abort(403, 'Unauthorized. You can only assign users to your own branch.');
            }
        }

        $profilePicUrl = null;
        if ($request->hasFile('profile_pic')) {
            try {
                $imageService = app(\App\Services\ImageUploadService::class);
                $uploadRes = $imageService->upload($request->file('profile_pic'), 'profiles', 'user_' . time());
                $profilePicUrl = $uploadRes['url'];
            } catch (\Exception $e) {
                \Log::warning('Profile pic upload failed: ' . $e->getMessage());
            }
        }

        $nationalIdImageUrl = null;
        if ($request->hasFile('national_id_image')) {
            try {
                $imageService = app(\App\Services\ImageUploadService::class);
                $uploadRes = $imageService->upload($request->file('national_id_image'), 'documents', 'national_id_' . time());
                $nationalIdImageUrl = $uploadRes['url'];
            } catch (\Exception $e) {
                \Log::warning('National ID image upload failed: ' . $e->getMessage());
            }
        }

        $roleToAssign = $validated['role'];
        // Normalize role if manager or branch_manager
        if (in_array($roleToAssign, ['manager', 'branch_manager'])) {
            $roleToAssign = 'secretary';
        }

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            'guarantor_name' => $validated['guarantor_name'] ?? null,
            'guarantor_phone' => $validated['guarantor_phone'] ?? null,
            'national_id_number' => $validated['national_id_number'] ?? null,
            'national_id_image' => $nationalIdImageUrl,
            'profile_pic' => $profilePicUrl,
            'password' => $validated['password'],
            'branch_id' => $validated['branch_id'],
            'status' => $validated['status'] ?? 'active',
        ]);

        $user->assignRole($roleToAssign);

        // Create audit log
        \App\Models\AuditLog::log('user_created', $user, null, $user->toArray());

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user->load('roles', 'branch', 'permissions'),
        ], 201);
    }

    /**
     * Get single user with details and stats
     */
    public function show($id)
    {
        $user = User::with('roles', 'branch', 'permissions')
            ->withCount(['customers', 'payments'])
            ->findOrFail($id);
        return response()->json($user);
    }

    /**
     * Update user (CEO, Super Admin, or Secretary updating their worker)
     */
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $authUser = auth()->user();
        
        // Authorization: CEO, Super Admin, or Manager in the same branch
        $isCeoOrSuper = $authUser->hasRole('ceo') || $authUser->hasRole('super_admin');
        $isManagerOfBranch = ($authUser->hasRole('secretary') || $authUser->hasRole('manager')) && $authUser->branch_id === $user->branch_id;

        if (!$isCeoOrSuper && !$isManagerOfBranch) {
            abort(403, 'Unauthorized. You do not have permission to edit this user.');
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => ['sometimes', 'email', Rule::unique('users')->ignore($user->id)],
            'phone' => 'nullable|string|regex:/^[0-9]{10}$/',
            'address' => 'nullable|string|max:500',
            'guarantor_name' => 'nullable|string|max:255',
            'guarantor_phone' => 'nullable|string|max:50',
            'national_id_number' => 'nullable|string|max:100',
            'national_id_image' => 'nullable',
            'profile_pic' => 'nullable',
            'password' => [
                'nullable',
                'string',
                'min:8',
                'regex:/[a-z]/',
                'regex:/[A-Z]/',
                'regex:/[0-9]/',
                'regex:/[@$!%*#?&]/',
            ],
            'branch_id' => 'sometimes|exists:branches,id',
            'status' => 'sometimes|in:active,inactive,suspended',
            'role' => 'sometimes|in:secretary,worker,manager,branch_manager,ceo'
        ], [
            'phone.regex' => 'The phone number must be exactly 10 digits.',
            'password.regex' => 'The password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
        ]);

        // Handle profile picture file upload if provided
        if ($request->hasFile('profile_pic')) {
            try {
                $imageService = app(\App\Services\ImageUploadService::class);
                $uploadRes = $imageService->upload($request->file('profile_pic'), 'profiles', 'user_' . time());
                $validated['profile_pic'] = $uploadRes['url'];
            } catch (\Exception $e) {
                \Log::warning('Profile pic upload on update failed: ' . $e->getMessage());
            }
        } elseif ($request->has('profile_pic') && is_null($request->input('profile_pic'))) {
            $validated['profile_pic'] = null;
        } else {
            unset($validated['profile_pic']);
        }

        // Handle national ID file upload if provided
        if ($request->hasFile('national_id_image')) {
            try {
                $imageService = app(\App\Services\ImageUploadService::class);
                $uploadRes = $imageService->upload($request->file('national_id_image'), 'documents', 'national_id_' . time());
                $validated['national_id_image'] = $uploadRes['url'];
            } catch (\Exception $e) {
                \Log::warning('National ID upload on update failed: ' . $e->getMessage());
            }
        } elseif ($request->has('national_id_image') && is_null($request->input('national_id_image'))) {
            $validated['national_id_image'] = null;
        } else {
            unset($validated['national_id_image']);
        }

        // Only set password if provided
        if (empty($validated['password'])) {
            unset($validated['password']);
        }

        $oldValues = $user->toArray();
        $user->update($validated);

        // Update role if provided and permitted
        if (isset($validated['role']) && $isCeoOrSuper) {
            $roleToAssign = $validated['role'];
            if (in_array($roleToAssign, ['manager', 'branch_manager'])) {
                $roleToAssign = 'secretary';
            }
            $user->syncRoles([$roleToAssign]);
        }

        // Create audit log
        \App\Models\AuditLog::log('user_updated', $user, $oldValues, $user->getChanges());

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
        $authUser = auth()->user();
        
        // CEO or Super Admin can deactivate users
        if (!$authUser->hasRole('ceo') && !$authUser->hasRole('super_admin')) {
            abort(403, 'Unauthorized. Only CEO or Super Admin can deactivate users.');
        }
        
        // Prevent deactivating yourself
        if ($user->id === $authUser->id) {
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
            $authUser = auth()->user();
            
            // CEO or Super Admin can deactivate workers
            if (!$authUser->hasRole('ceo') && !$authUser->hasRole('super_admin')) {
                abort(403, 'Unauthorized. Only CEO or Super Admin can deactivate workers.');
            }

            // Check if worker has customers
            $customerCount = \App\Models\Customer::where('worker_id', $id)->count();

            if ($customerCount > 0) {
                if (empty($validated['transfer_to_worker_id'])) {
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
                \App\Models\AuditLog::log(
                    'customers_transferred',
                    $worker,
                    ['from_worker_id' => $id, 'customer_count' => $customerCount],
                    ['to_worker_id' => $validated['transfer_to_worker_id']]
                );
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
