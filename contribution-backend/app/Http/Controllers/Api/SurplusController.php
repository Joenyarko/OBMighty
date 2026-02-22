<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SurplusEntry;
use App\Models\CustomerCard;
use App\Models\Payment;
use App\Models\AuditLog;
use App\Models\User;
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
            
            // Base query for the ledger
            $query = SurplusEntry::with([
                'branch' => fn($q) => $q->withTrashed(),
                'worker' => fn($q) => $q->withTrashed(),
                'creator' => fn($q) => $q->withTrashed(),
                'allocatedPayment'
            ]);
            
            // Apply branch filtering for non-CEO users
            if ($user->hasRole(['secretary', 'manager', 'worker'])) {
                $query->forBranch($user->branch_id);
            }
            
            // Group by worker to calculate pooled balances
            $workerBalances = $query->get()->groupBy('worker_id')->map(function ($entries) {
                $totalAvailable = $entries->where('status', 'available')->sum('amount');
                $totalAllocated = $entries->where('status', 'allocated')->sum('amount');
                $totalWithdrawn = $entries->where('status', 'withdrawn')->sum('amount');
                $currentBalance = $totalAvailable - ($totalAllocated + $totalWithdrawn);
                
                $worker = $entries->first()->worker;
                $branch = $entries->first()->branch;
                
                return [
                    'worker_id' => $worker ? $worker->id : null,
                    'worker_name' => $worker ? $worker->name : 'Unknown Worker',
                    'worker_role' => $worker ? $worker->roles->first()?->name : 'N/A',
                    'branch_name' => $branch ? $branch->name : 'N/A',
                    'total_added' => (float)$totalAvailable,
                    'total_allocated' => (float)$totalAllocated,
                    'total_withdrawn' => (float)$totalWithdrawn,
                    'current_balance' => (float)$currentBalance,
                    'raw_entries' => $entries->toArray() // Keeping raw entries in case frontend wants it
                ];
            })->values(); // Reset keys to make it a clean array
            
            // Calculate system-wide totals for the summary cards
            $totals = [
                'total_available' => $workerBalances->sum('current_balance'),
                'total_allocated' => $workerBalances->sum('total_allocated'),
                'total_withdrawn' => $workerBalances->sum('total_withdrawn'),
            ];
            
            return response()->json([
                'worker_balances' => $workerBalances,
                'entries' => ['data' => []], // legacy format support just in case
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
        
        // Enforce CEO explicitly as requested by user
        if (!$user->hasRole('ceo')) {
            return response()->json([
                'message' => 'Unauthorized - Only CEOs can create surplus entries'
            ], 403);
        }
        
        $companyId = config('app.company_id');
        if (!$companyId && $user->hasRole('super_admin')) {
            return response()->json([
                'message' => 'Super Admins cannot create surplus entries on the central dashboard. Please log in to a specific company\'s domain.'
            ], 422);
        }

        $validated = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'worker_id' => 'required|exists:users,id', // Mandate worker assignment
            'amount' => 'required|numeric|min:0.01',
            'entry_date' => 'required|date',
            'description' => 'required|string',
            'notes' => 'nullable|string',
        ]);
        
        // Derive branch from worker if not explicitly provided
        $worker = \App\Models\User::find($validated['worker_id']);
        if ($worker && empty($validated['branch_id'])) {
            $validated['branch_id'] = $worker->branch_id;
        }
        
        // If branch_id is still empty, derive from CEO's own branch or fallback
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
        
        // Only CEO can update
        if (!$user->hasRole('ceo')) {
            return response()->json(['message' => 'Unauthorized - only CEO can update surplus entries'], 403);
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
    public function allocate(Request $request) // Removed $id dependency
    {
        $user = $request->user();
        
        // Only CEO can allocate
        if (!$user->hasRole('ceo')) {
            return response()->json(['message' => 'Unauthorized - only CEO can allocate surplus'], 403);
        }
        
        $validated = $request->validate([
            'worker_id' => 'required|exists:users,id',
            'amount' => 'required|numeric|min:0.01',
            'customer_card_id' => 'required|exists:customer_cards,id',
            'notes' => 'nullable|string',
        ]);
        
        // Calculate the worker's current balance
        $entries = SurplusEntry::where('worker_id', $validated['worker_id'])->get();
        $totalAvailable = $entries->where('status', 'available')->sum('amount');
        $totalAllocated = $entries->where('status', 'allocated')->sum('amount');
        $totalWithdrawn = $entries->where('status', 'withdrawn')->sum('amount');
        $currentBalance = $totalAvailable - ($totalAllocated + $totalWithdrawn);
        
        if ($validated['amount'] > $currentBalance) {
            return response()->json([
                'message' => 'Insufficient Surplus Balance. Request: GHS ' . $validated['amount'] . ', Available: GHS ' . $currentBalance
            ], 422);
        }
        
        // Validate customer card
        $customerCard = CustomerCard::with('customer')->findOrFail($validated['customer_card_id']);

        if ($customerCard->status !== 'active') {
            return response()->json([
                'message' => 'Cannot record payment on a ' . $customerCard->status . ' card.'
            ], 400);
        }

        // Calculate boxes from the requested allocation amount
        $customerCard->append('box_price');
        if ($customerCard->box_price <= 0) {
             return response()->json(['message' => 'Invalid box price calculation on chosen card.'], 400);
        }
        
        $boxesToCheck = floor($validated['amount'] / $customerCard->box_price);
        if ($boxesToCheck <= 0) {
            return response()->json([
                'message' => 'Requested allocation amount (GHS ' . $validated['amount'] . ') is too small to cover even one box for this card.',
                'box_price' => $customerCard->box_price
            ], 400);
        }

        if ($boxesToCheck > $customerCard->boxes_remaining) {
            return response()->json([
                'message' => 'Cannot check more boxes than remaining',
                'boxes_remaining' => $customerCard->boxes_remaining,
                'calculated_boxes' => $boxesToCheck
            ], 400);
        }
        
        $newPaymentId = null;

        DB::beginTransaction();
        try {
            // Use PaymentService to handle the complexities of box checking, analytics, and history
            $paymentService = app(\App\Services\PaymentService::class);
            
            $paymentData = [
                'customer_id' => $customerCard->customer_id,
                'payment_amount' => $validated['amount'],
                'payment_date' => now()->toDateString(),
                'payment_method' => 'cash', // Use supported enum value
                'notes' => $validated['notes'] ?? 'Allocated from Pooled Surplus Ledger (Surplus Allocation)',
                'worker_id' => $validated['worker_id'], // Explicitly set the worker responsible
            ];

            // recordPayment handles: Locked Card check, Box checking, BoxState updates, 
            // general Payment record, AuditLog, and Analytics (Daily Totals)
            $generalPayment = $paymentService->recordPayment($customerCard->customer, $paymentData);

            // Record the ledger deduction entry
            $deductionEntry = SurplusEntry::create([
                'company_id' => $customerCard->company_id,
                'branch_id' => $customerCard->customer->branch_id,
                'worker_id' => $validated['worker_id'],
                'amount' => $validated['amount'], 
                'entry_date' => now()->toDateString(),
                'status' => 'allocated',
                'description' => 'Allocated to Customer: ' . $customerCard->customer->name,
                'notes' => $validated['notes'] ?? 'Ledger deduction via Allocation',
                'created_by' => $user->id,
                'allocated_to_payment_id' => $generalPayment->id,
                'allocated_at' => now(),
            ]);

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Surplus Allocation Failed', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Allocation failed. ' . $e->getMessage()], 500);
        }
        
        return response()->json([
            'message' => 'Surplus allocated successfully and boxes updated',
            'entry' => $deductionEntry->load(['branch', 'worker', 'creator', 'allocatedPayment']),
        ]);
    }

    /**
     * Withdraw surplus (mark as withdrawn from ledger)
     */
    public function withdraw(Request $request) // Removed $id dependency
    {
        $user = $request->user();
        
        // Only CEO can withdraw
        if (!$user->hasRole('ceo')) {
            return response()->json(['message' => 'Unauthorized - only CEO can withdraw surplus'], 403);
        }
        
        $validated = $request->validate([
            'worker_id' => 'required|exists:users,id',
            'amount' => 'required|numeric|min:0.01',
            'notes' => 'required|string',
        ]);
        
        // Calculate the worker's current balance
        $entries = SurplusEntry::where('worker_id', $validated['worker_id'])->get();
        $totalAvailable = $entries->where('status', 'available')->sum('amount');
        $totalAllocated = $entries->where('status', 'allocated')->sum('amount');
        $totalWithdrawn = $entries->where('status', 'withdrawn')->sum('amount');
        $currentBalance = $totalAvailable - ($totalAllocated + $totalWithdrawn);
        
        if ($validated['amount'] > $currentBalance) {
            return response()->json([
                'message' => 'Insufficient Surplus Balance. Request: GHS ' . $validated['amount'] . ', Available: GHS ' . $currentBalance
            ], 422);
        }
        
        // Record the ledger withdrawal entry
        $withdrawalEntry = SurplusEntry::create([
            'company_id' => config('app.company_id'),
            'branch_id' => \App\Models\User::find($validated['worker_id'])->branch_id ?? \App\Models\Branch::first()->id ?? 1,
            'worker_id' => $validated['worker_id'],
            'amount' => $validated['amount'], 
            'entry_date' => now()->toDateString(),
            'status' => 'withdrawn',
            'description' => 'Manual Cash Withdrawal by CEO',
            'notes' => $validated['notes'],
            'created_by' => $user->id,
        ]);
        
        return response()->json([
            'message' => 'Surplus withdrawn successfully from ledger',
            'entry' => $withdrawalEntry->load(['branch', 'worker', 'creator']),
        ]);
    }

    /**
     * Adjust a worker's surplus balance (Correction)
     */
    public function adjust(Request $request)
    {
        $user = $request->user();
        
        // Only CEO can adjust
        if (!$user->hasRole('ceo')) {
            return response()->json(['message' => 'Unauthorized - only CEO can adjust surplus'], 403);
        }
        
        $validated = $request->validate([
            'worker_id' => 'required|exists:users,id',
            'amount' => 'required|numeric', // Can be negative
            'notes' => 'required|string',
        ]);
        
        $worker = User::findOrFail($validated['worker_id']);
        $date = now()->toDateString();
        
        // Create an adjustment entry
        // If amount is negative, it's effectively a withdrawal/deduction
        // If positive, it's an addition
        $entry = SurplusEntry::create([
            'company_id' => $worker->company_id,
            'branch_id' => $worker->branch_id,
            'worker_id' => $worker->id,
            'amount' => abs($validated['amount']),
            'entry_date' => $date,
            // If negative, mark as withdrawn (since it was removed from available)
            // If positive, mark as available
            'status' => $validated['amount'] < 0 ? 'withdrawn' : 'available',
            'description' => 'Manual Adjustment: ' . $validated['notes'],
            'notes' => $validated['notes'],
            'created_by' => $user->id,
        ]);
        
        return response()->json([
            'message' => 'Balance adjusted successfully',
            'entry' => $entry
        ]);
    }
}
