<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use Illuminate\Http\Request;

class BranchController extends Controller
{
    /**
     * Get all branches (CEO only)
     */
    public function index()
    {
        $branches = Branch::withCount('users', 'customers')
            ->orderBy('name')
            ->get();
        
        return response()->json($branches);
    }

    /**
     * Create a new branch (CEO only)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:branches',
            'code' => 'required|string|max:20|unique:branches',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'status' => 'nullable|in:active,inactive',
        ]);

        $branch = Branch::create($validated);

        return response()->json([
            'message' => 'Branch created successfully',
            'branch' => $branch,
        ], 201);
    }

    /**
     * Get a single branch (CEO only)
     */
    public function show($id)
    {
        $branch = Branch::withCount('users', 'customers')->findOrFail($id);
        return response()->json($branch);
    }

    /**
     * Update a branch (CEO only)
     */
    public function update(Request $request, $id)
    {
        $branch = Branch::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255|unique:branches,name,' . $id,
            'code' => 'sometimes|string|max:20|unique:branches,code,' . $id,
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'status' => 'sometimes|in:active,inactive',
        ]);

        $branch->update($validated);

        return response()->json([
            'message' => 'Branch updated successfully',
            'branch' => $branch,
        ]);
    }

    /**
     * Delete a branch (CEO only)
     */
    public function destroy($id)
    {
        $branch = Branch::findOrFail($id);
        
        // Check if branch has users or customers
        if ($branch->users()->count() > 0 || $branch->customers()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete branch with existing users or customers',
            ], 422);
        }

        $branch->delete();

        return response()->json([
            'message' => 'Branch deleted successfully',
        ]);
    }
}
