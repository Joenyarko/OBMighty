<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Company;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class CompanyController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $user = auth()->user();

        $query = Company::withCount(['users',
            'users as ceos_count' => function ($query) {
                $query->whereHas('roles', function ($q) { $q->where('name', 'ceo'); });
            },
            'users as managers_count' => function ($query) {
                $query->whereHas('roles', function ($q) { $q->where('name', 'secretary'); });
            },
            'users as workers_count' => function ($query) {
                $query->whereHas('roles', function ($q) { $q->where('name', 'worker'); });
            }
        ])->orderBy('created_at', 'desc');

        // Admin managers can only see companies assigned to them
        if ($user->hasRole('admin_manager')) {
            $assignedIds = $user->managedCompanies()->pluck('companies.id');
            $query->whereIn('id', $assignedIds);
        }

        return response()->json($query->get());
    }


    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'domain' => 'nullable|string|unique:companies,domain',
            'subdomain' => 'nullable|string|unique:companies,subdomain',
            'primary_color' => 'nullable|string',
            'logo' => 'nullable|image|max:2048',
            'is_active' => 'boolean',
            // CEO Details
            'ceo_name' => 'required|string|max:255',
            'ceo_email' => 'required|email|max:255',
            'ceo_password' => [
                'required',
                'string',
                'min:8',
                'regex:/[a-z]/',
                'regex:/[A-Z]/',
                'regex:/[0-9]/',
                'regex:/[@$!%*#?&]/',
            ],
            'ceo_phone' => 'nullable|string|regex:/^[0-9]{10}$/',
        ], [
            'ceo_phone.regex' => 'The CEO phone number must be exactly 10 digits.',
            'ceo_password.regex' => 'The CEO password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
        ]);

        return DB::transaction(function () use ($request, $validated) {
            
            // 1. Create Company
            // Handle File Upload
            if ($request->hasFile('logo')) {
                $imageService = new \App\Services\ImageUploadService();
                $result = $imageService->upload($request->file('logo'), 'logos', 'company_admin_');
                $validated['logo_url'] = $result['url'];
            }
            
            // Remove CEO fields from company data
            $companyData = collect($validated)->except(['ceo_name', 'ceo_email', 'ceo_password', 'logo'])->toArray();
            if(isset($validated['logo_url'])) $companyData['logo_url'] = $validated['logo_url'];

            $company = Company::create($companyData);

            // 2. Create CEO User
            $user = User::create([
                'name' => $request->ceo_name,
                'email' => $request->ceo_email,
                'password' => Hash::make($request->ceo_password),
                'company_id' => $company->id,
                'status' => 'active',
                'phone' => $request->ceo_phone ?? null, // Optional
            ]);

            // 3. Assign Role
            $user->assignRole('ceo');

            return response()->json($company, 201);
        });
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $company = Company::withTrashed()->findOrFail($id);
        return response()->json($company);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'domain' => 'nullable|string|unique:companies,domain,' . $id,
            'subdomain' => 'nullable|string|unique:companies,subdomain,' . $id,
            'primary_color' => 'nullable|string',
            'logo' => 'nullable|image|max:2048', // 2MB Max
            'is_active' => 'boolean',
            // Optional new CEO Details
            'new_ceo_name' => 'nullable|string|max:255',
            'new_ceo_email' => 'nullable|email|max:255',
            'new_ceo_password' => [
                'nullable',
                'string',
                'min:8',
                'regex:/[a-z]/',
                'regex:/[A-Z]/',
                'regex:/[0-9]/',
                'regex:/[@$!%*#?&]/',
            ],
            'new_ceo_phone' => 'nullable|string|regex:/^[0-9]{10}$/',
        ], [
            'new_ceo_phone.regex' => 'The CEO phone number must be exactly 10 digits.',
            'new_ceo_password.regex' => 'The CEO password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
        ]);

        return DB::transaction(function () use ($request, $validated, $id) {
            $company = Company::withTrashed()->findOrFail($id);

            // Handle File Upload
            if ($request->hasFile('logo')) {
                $imageService = new \App\Services\ImageUploadService();
                $result = $imageService->upload($request->file('logo'), 'logos', 'company_admin_');
                $validated['logo_url'] = $result['url'];
            }

            // Remove CEO fields from company data before update
            $companyData = collect($validated)->except(['new_ceo_name', 'new_ceo_email', 'new_ceo_password', 'new_ceo_phone', 'logo'])->toArray();
            $company->update($companyData);
            
            // If restoring
            if ($request->has('restore') && $request->restore) {
                $company->restore();
            }

            // Create Additional CEO if requested
            if (!empty($validated['new_ceo_name']) && !empty($validated['new_ceo_email']) && !empty($validated['new_ceo_password'])) {
                // Determine if this email already belongs to a user across the global system
                $existingUser = User::where('email', $validated['new_ceo_email'])->first();
                if ($existingUser) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'new_ceo_email' => ['A user with this email already exists.'],
                    ]);
                }

                $user = User::create([
                    'name' => $validated['new_ceo_name'],
                    'email' => $validated['new_ceo_email'],
                    'password' => Hash::make($validated['new_ceo_password']),
                    'company_id' => $company->id,
                    'status' => 'active',
                    'phone' => $validated['new_ceo_phone'] ?? null,
                ]);

                $user->assignRole('ceo');
            }

            return response()->json($company);
        });
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $user = auth()->user();
        $company = Company::findOrFail($id);

        // Admin managers can only deactivate companies assigned to them
        if ($user->hasRole('admin_manager')) {
            $assignedIds = $user->managedCompanies()->pluck('companies.id')->toArray();
            if (!in_array((int)$id, $assignedIds)) {
                return response()->json(['message' => 'Unauthorized. This company is not assigned to you.'], 403);
            }
        }

        $company->delete();

        return response()->json(['message' => 'Company deactivated successfully']);
    }
}
