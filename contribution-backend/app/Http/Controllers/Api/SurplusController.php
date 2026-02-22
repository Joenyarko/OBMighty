<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SurplusEntry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SurplusController extends Controller
{
    /**
     * Get all surplus entries with filtering
     */
    public function index(Request $request)
    {
        try {
            $user = $request->user();
            $query = SurplusEntry::with(['branch', 'worker', 'creator', 'allocatedPayment']);
            
            // Apply branch filtering for non-CEO users
            if ($user->hasRole(['secretary', 'manager', 'worker'])) {
                $query->forBranch($user->branch_id);
            }
            
            // Apply status filter if provided
            if ($request->has('status')) {
                $query->byStatus($request->status);
            }
            
            // Apply date range filter if provided
            if ($request->has('start_date') && $request->has('end_date')) {
                $query->whereBetween('entry_date', [$request->start_date, $request->end_date]);
            }
            
            $entries = $query->orderBy('entry_date', 'desc')
                ->orderBy('created_at', 'desc')
                ->paginate($request->query('per_page', 20));
            
            // Calculate totals with defensive casting
            $totals = [
                'total_available' => (float) SurplusEntry::getTotalAvailable(
                    $user->hasRole(['secretary', 'manager', 'worker']) ? $user->branch_id : null
                ),
                'total_allocated' => (float) SurplusEntry::byStatus('allocated')
                    ->when($user->hasRole(['secretary', 'manager', 'worker']), function ($q) use ($user) {
                        $q->forBranch($user->branch_id);
                    })
                    ->sum('amount'),
                'total_withdrawn' => (float) SurplusEntry::byStatus('withdrawn')
                    ->when($user->hasRole(['secretary', 'manager', 'worker']), function ($q) use ($user) {
                        $q->forBranch($user->branch_id);
                    })
                    ->sum('amount'),
            ];
            
            return response()->json([
                'entries' => $entries,
                'totals' => $totals,
            ]);
        } catch (\Exception $e) {
            \Log::error('Surplus Index Error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'user_id' => $request->user()->id ?? null
            ]);
            return response()->json([
                'message' => 'Failed to load surplus entries: ' . $e->getMessage(),
                'entries' => ['data' => []],
                'totals' => ['total_available' => 0, 'total_allocated' => 0, 'total_withdrawn' => 0]
            ], 500);
        }
    }

    /**
     * Store a new surplus entry
     */
    public function store(Request $request)
    {
        $user = $request->user();
        
        // The frontend component allows all authorized roles to create entries.
        // We will dynamically determine branch_id and worker_id based on role.
        
        $validated = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'worker_id' => 'nullable|exists:users,id',
            'amount' => 'required|numeric|min:0.01',
            'entry_date' => 'required|date',
            'description' => 'required|string',
            'notes' => 'nullable|string',
        ]);
        
        // Auto-assign branch and worker based on role
        if ($user->hasRole(['worker', 'manager', 'secretary'])) {
            $validated['branch_id'] = $user->branch_id;
            
            if ($user->hasRole('worker')) {
                // Workers can only create surplus for themselves
                $validated['worker_id'] = $user->id;
            } elseif (!empty($validated['worker_id'])) {
                // Manager/Secretary might assign surplus to a specific worker under them
                $worker = \App\Models\User::find($validated['worker_id']);
                if (!$worker || $worker->branch_id !== $user->branch_id) {
                    return response()->json(['message' => 'Selected worker must belong to your branch'], 422);
                }
            }
        } elseif ($user->hasRole(['ceo', 'super_admin'])) {
            // For CEO/Super Admin
            if (!empty($validated['worker_id'])) {
                $worker = \App\Models\User::find($validated['worker_id']);
                if ($worker) {
                    // Try to inherit branch from worker if not explicitly provided
                    if (empty($validated['branch_id']) && $worker->branch_id) {
                        $validated['branch_id'] = $worker->branch_id;
                    }
                }
            }
            
            // If branch_id is still empty, try to derive from CEO's own branch or systemic default
            if (empty($validated['branch_id'])) {
                if ($user->branch_id) {
                    $validated['branch_id'] = $user->branch_id;
                } else {
                    $branch = \App\Models\Branch::first();
                    if (!$branch) {
                        return response()->json([
                            'message' => 'No branches available in the system. A branch ID is required.',
                        ], 422);
                    }
                    $validated['branch_id'] = $branch->id;
                }
            }
        }
        
        $validated['created_by'] = $user->id;
        $validated['status'] = 'available';
        
        $entry = SurplusEntry::create($validated);
        
        return response()->json([
            'message' => 'Surplus entry created successfully',
            'entry' => $entry->load(['branch', 'worker', 'creator']),
        ], 201);
    }

    /**
     * Get a single surplus entry
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        $entry = SurplusEntry::with(['branch', 'worker', 'creator', 'allocatedPayment'])->findOrFail($id);
        
        // Authorization check
        if ($user->hasRole('secretary') && $entry->branch_id !== $user->branch_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        return response()->json($entry);
    }

    /**
     * Update a surplus entry
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        $entry = SurplusEntry::findOrFail($id);
        
        // Only CEO and Secretary can update
        if ($user->hasRole('worker')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        // Authorization check
        if ($user->hasRole('secretary') && $entry->branch_id !== $user->branch_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        // Cannot update allocated or withdrawn entries
        if ($entry->status !== 'available') {
            return response()->json(['message' => 'Cannot update allocated or withdrawn entries'], 422);
        }
        
        $validated = $request->validate([
            'amount' => 'sometimes|numeric|min:0.01',
            'entry_date' => 'sometimes|date',
            'description' => 'sometimes|string',
            'notes' => 'nullable|string',
        ]);
        
        $entry->update($validated);
        
        return response()->json([
            'message' => 'Surplus entry updated successfully',
            'entry' => $entry->load(['branch', 'worker', 'creator']),
        ]);
    }

    /**
     * Delete a surplus entry (soft delete)
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        
        // Only CEO can delete
        if (!$user->hasRole('ceo')) {
            return response()->json(['message' => 'Unauthorized - only CEO can delete surplus entries'], 403);
        }
        
        $entry = SurplusEntry::findOrFail($id);
        
        // Cannot delete allocated entries
        if ($entry->status === 'allocated') {
            return response()->json(['message' => 'Cannot delete allocated entries'], 422);
        }
        
        $entry->delete();
        
        return response()->json([
            'message' => 'Surplus entry deleted successfully',
        ]);
    }

    /**
     * Allocate surplus to a payment
     */
    public function allocate(Request $request, $id)
    {
        $user = $request->user();
        
        // Only CEO can allocate
        if (!$user->hasRole('ceo')) {
            return response()->json(['message' => 'Unauthorized - only CEO can allocate surplus'], 403);
        }
        
        $entry = SurplusEntry::findOrFail($id);
        
        if ($entry->status !== 'available') {
            return response()->json(['message' => 'Surplus entry is not available'], 422);
        }
        
        $validated = $request->validate([
            'payment_id' => 'required|exists:payments,id',
            'notes' => 'nullable|string',
        ]);
        
        DB::transaction(function () use ($entry, $validated) {
            $entry->update([
                'status' => 'allocated',
                'allocated_to_payment_id' => $validated['payment_id'],
                'allocated_at' => now(),
                'notes' => $validated['notes'] ?? $entry->notes,
            ]);
        });
        
        return response()->json([
            'message' => 'Surplus allocated successfully',
            'entry' => $entry->load(['branch', 'worker', 'creator', 'allocatedPayment']),
        ]);
    }

    /**
     * Withdraw surplus (mark as withdrawn)
     */
    public function withdraw(Request $request, $id)
    {
        $user = $request->user();
        
        // Only CEO can withdraw
        if (!$user->hasRole('ceo')) {
            return response()->json(['message' => 'Unauthorized - only CEO can withdraw surplus'], 403);
        }
        
        $entry = SurplusEntry::findOrFail($id);
        
        if ($entry->status !== 'available') {
            return response()->json(['message' => 'Surplus entry is not available'], 422);
        }
        
        $validated = $request->validate([
            'notes' => 'required|string',
        ]);
        
        $entry->update([
            'status' => 'withdrawn',
            'notes' => $validated['notes'],
        ]);
        
        return response()->json([
            'message' => 'Surplus withdrawn successfully',
            'entry' => $entry->load(['branch', 'worker', 'creator']),
        ]);
    }
}
