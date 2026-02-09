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
        $user = $request->user();
        $query = SurplusEntry::with(['branch', 'worker', 'creator', 'allocatedPayment']);
        
        // Apply branch filtering for non-CEO users
        if ($user->hasRole('secretary')) {
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
            ->paginate(20);
        
        // Calculate totals
        $totals = [
            'total_available' => SurplusEntry::getTotalAvailable(
                $user->hasRole('secretary') ? $user->branch_id : null
            ),
            'total_allocated' => SurplusEntry::byStatus('allocated')
                ->when($user->hasRole('secretary'), function ($q) use ($user) {
                    $q->forBranch($user->branch_id);
                })
                ->sum('amount'),
            'total_withdrawn' => SurplusEntry::byStatus('withdrawn')
                ->when($user->hasRole('secretary'), function ($q) use ($user) {
                    $q->forBranch($user->branch_id);
                })
                ->sum('amount'),
        ];
        
        return response()->json([
            'entries' => $entries,
            'totals' => $totals,
        ]);
    }

    /**
     * Store a new surplus entry
     */
    public function store(Request $request)
    {
        $user = $request->user();
        
        // Only CEO and Secretary can create surplus entries
        if ($user->hasRole('worker')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'worker_id' => 'nullable|exists:users,id',
            'amount' => 'required|numeric|min:0.01',
            'entry_date' => 'required|date',
            'description' => 'required|string',
            'notes' => 'nullable|string',
        ]);
        
        // Verify branch access for secretaries
        if ($user->hasRole('secretary') && $validated['branch_id'] != $user->branch_id) {
            return response()->json(['message' => 'Unauthorized - can only create entries for your branch'], 403);
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
