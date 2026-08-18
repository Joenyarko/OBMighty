<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class AdminManagerController extends Controller
{
    /**
     * List all admin managers.
     */
    public function index()
    {
        $managers = User::role('admin_manager')
            ->with(['managedCompanies'])
            ->get()
            ->map(function ($user) {
                return [
                    'id'               => $user->id,
                    'name'             => $user->name,
                    'email'            => $user->email,
                    'phone'            => $user->phone,
                    'managed_companies'=> $user->managedCompanies->map(fn($c) => [
                        'id'   => $c->id,
                        'name' => $c->name,
                        'logo_url' => $c->logo_url,
                    ]),
                    'created_at' => $user->created_at,
                ];
            });

        return response()->json($managers);
    }

    /**
     * Create a new admin manager account.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'email'       => 'required|email|unique:users,email',
            'password'    => 'required|string|min:8',
            'phone'       => 'nullable|string|max:20',
            'company_ids' => 'nullable|array',
            'company_ids.*' => 'exists:companies,id',
        ]);

        // Create the user (no company_id — they belong to no single tenant)
        $user = User::create([
            'name'       => $validated['name'],
            'email'      => $validated['email'],
            'password'   => Hash::make($validated['password']),
            'phone'      => $validated['phone'] ?? null,
            'company_id' => null,
        ]);

        // Assign the admin_manager role
        $role = Role::firstOrCreate(['name' => 'admin_manager', 'guard_name' => 'sanctum']);
        $user->assignRole($role);

        // Assign companies
        if (!empty($validated['company_ids'])) {
            $user->managedCompanies()->sync($validated['company_ids']);
        }

        $user->load('managedCompanies');

        return response()->json([
            'message' => 'Admin Manager created successfully.',
            'user'    => $user,
        ], 201);
    }

    /**
     * Update an admin manager's details.
     */
    public function update(Request $request, $id)
    {
        $manager = User::role('admin_manager')->findOrFail($id);

        $validated = $request->validate([
            'name'     => 'sometimes|string|max:255',
            'email'    => 'sometimes|email|unique:users,email,' . $id,
            'password' => 'nullable|string|min:8',
            'phone'    => 'nullable|string|max:20',
        ]);

        if (isset($validated['name']))  $manager->name  = $validated['name'];
        if (isset($validated['email'])) $manager->email = $validated['email'];
        if (!empty($validated['password'])) $manager->password = Hash::make($validated['password']);
        if (array_key_exists('phone', $validated)) $manager->phone = $validated['phone'];

        $manager->save();

        return response()->json($manager);
    }

    /**
     * Delete an admin manager.
     */
    public function destroy($id)
    {
        $manager = User::role('admin_manager')->findOrFail($id);
        $manager->managedCompanies()->detach();
        $manager->delete();

        return response()->json(['message' => 'Admin Manager removed successfully.']);
    }

    /**
     * Assign (or replace) the companies a manager can access.
     */
    public function assignCompanies(Request $request, $id)
    {
        $manager = User::role('admin_manager')->findOrFail($id);

        $validated = $request->validate([
            'company_ids'   => 'required|array',
            'company_ids.*' => 'exists:companies,id',
        ]);

        $manager->managedCompanies()->sync($validated['company_ids']);

        return response()->json([
            'message'           => 'Companies assigned successfully.',
            'managed_companies' => $manager->managedCompanies,
        ]);
    }

    /**
     * Remove a single company assignment from a manager.
     */
    public function removeCompany($managerId, $companyId)
    {
        $manager = User::role('admin_manager')->findOrFail($managerId);
        $manager->managedCompanies()->detach($companyId);

        return response()->json(['message' => 'Company removed from manager.']);
    }
}
