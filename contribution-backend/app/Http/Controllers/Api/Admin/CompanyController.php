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
        // Return companies with detailed user counts
        return response()->json(
            Company::withCount(['users', 
                'users as ceos_count' => function ($query) {
                    $query->whereHas('roles', function ($q) {
                        $q->where('name', 'ceo');
                    });
                },
                'users as managers_count' => function ($query) {
                    $query->whereHas('roles', function ($q) {
                        $q->where('name', 'secretary');
                    });
                },
                'users as workers_count' => function ($query) {
                    $query->whereHas('roles', function ($q) {
                        $q->where('name', 'worker');
                    });
                }
            ])
            ->orderBy('created_at', 'desc')
            ->get()
        );
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
                $path = $request->file('logo')->store('companies', 'public');
                $validated['logo_url'] = url('storage/' . $path);
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
        $company = Company::withTrashed()->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'domain' => 'nullable|string|unique:companies,domain,' . $id,
            'subdomain' => 'nullable|string|unique:companies,subdomain,' . $id,
            'primary_color' => 'nullable|string',
            'logo' => 'nullable|image|max:2048', // 2MB Max
            'is_active' => 'boolean',
        ]);

        // Handle File Upload
        if ($request->hasFile('logo')) {
            $path = $request->file('logo')->store('companies', 'public');
            $validated['logo_url'] = url('storage/' . $path);
        }

        $company->update($validated);
        
        // If restoring
        if ($request->has('restore') && $request->restore) {
            $company->restore();
        }

        return response()->json($company);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $company = Company::findOrFail($id);
        $company->delete();

        return response()->json(['message' => 'Company deactivated successfully']);
    }
}
