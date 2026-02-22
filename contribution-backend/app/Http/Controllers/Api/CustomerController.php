<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerController extends Controller
{
    /**
     * Get all customers with role-based filtering
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Customer::with(['branch', 'worker', 'card', 'customerCard']);

        // Apply role-based filtering
        if ($user->hasRole('worker')) {
            $query->forWorker($user->id);
        } elseif ($user->hasRole('secretary')) {
            $query->forBranch($user->branch_id);
        }
        // CEO sees all

        // Apply worker filter
        if ($request->has('worker_id')) {
            $query->where('worker_id', $request->worker_id);
        }

        // Apply branch filter
        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        // Apply search filter
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%");
            });
        }

        // Apply is_served filter (only relevant for completed customers usually, but can be general)
        if ($request->has('is_served')) {
            $isServed = filter_var($request->is_served, FILTER_VALIDATE_BOOLEAN);
            $query->where('is_served', $isServed);
        }

        // --- Calculate Global Stats (Using cloned query before status filter is applied) ---
        $statsQuery = clone $query;
        
        $stats = [
            'total' => (clone $statsQuery)->where('customers.status', '!=', 'inactive')->count(),
            'in_progress' => (clone $statsQuery)->where('customers.status', 'in_progress')->count(),
            'completed' => (clone $statsQuery)->where('customers.status', 'completed')->count(),
            'defaulting' => (clone $statsQuery)->defaulting()->count(),
        ];

        // Default to active customers only (unless status filter is explicitly provided)
        if (!$request->has('status') || $request->status === '') {
            $query->where('customers.status', '!=', 'inactive');
        }

        // Apply status filter
        if ($request->has('status') && $request->status !== '') {
            $status = $request->status;
            if ($status === 'defaulting') {
                $query->defaulting();
            } elseif ($status === 'completed') {
                $query->completed();
            } elseif ($status === 'in_progress') {
                $query->inProgress();
            } else {
                $query->where('customers.status', $status);
            }
        }


        $customers = $query->orderBy('created_at', 'desc')->paginate(12);

        return response()->json([
            'data' => $customers->items(),
            'current_page' => $customers->currentPage(),
            'last_page' => $customers->lastPage(),
            'total' => $customers->total(),
            'from' => $customers->firstItem(),
            'to' => $customers->lastItem(),
            'stats' => $stats
        ]);
    }

    /**
     * Create a new customer
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                \Illuminate\Validation\Rule::unique('customers', 'name')->where(function ($query) use ($request, $user) {
                    // Extract worker_id from request, or default to current user if worker
                    $workerId = $request->input('worker_id');
                    if (!$workerId && $user->hasRole('worker')) {
                        $workerId = $user->id;
                    }
                    if ($workerId) {
                        return $query->where('worker_id', $workerId);
                    }
                    return $query;
                }),
            ],
            'phone' => 'required|string|regex:/^[0-9]{10}$/',
            'location' => 'required|string',
            'card_id' => 'required|exists:cards,id',
            'branch_id' => 'nullable|exists:branches,id',
            'worker_id' => 'nullable|exists:users,id',
            'total_boxes' => 'nullable|integer|min:1',
            'price_per_box' => 'nullable|numeric|min:0.01',
            'total_amount' => 'nullable|numeric|min:0.01',
        ], [
            'phone.regex' => 'The phone number must be exactly 10 digits.',
        ]);

        // Auto-assign worker and branch for non-CEO users
        if ($user->hasRole('worker')) {
            $validated['worker_id'] = $user->id;
            $validated['branch_id'] = $user->branch_id;
        } elseif ($user->hasRole('secretary')) {
            // Secretary must provide worker_id, but verify it's in their branch
            if (!isset($validated['worker_id'])) {
                return response()->json([
                    'message' => 'Worker ID is required for secretaries',
                ], 422);
            }
            $worker = \App\Models\User::find($validated['worker_id']);
            if (!$worker || $worker->branch_id !== $user->branch_id) {
                return response()->json([
                    'message' => 'Worker must be in your branch',
                ], 422);
            }
            $validated['branch_id'] = $user->branch_id;
        } elseif ($user->hasRole('ceo')) {
            // CEO can assign to any worker
            if (isset($validated['worker_id'])) {
                $worker = \App\Models\User::find($validated['worker_id']);
                if ($worker) {
                    // Use worker's branch if they have one, otherwise use the selected branch
                    if ($worker->branch_id) {
                        $validated['branch_id'] = $worker->branch_id;
                    } elseif (empty($validated['branch_id'])) {
                         // If worker has no branch AND no branch was selected
                        return response()->json([
                            'message' => 'Selected worker belongs to no branch, and no branch was selected.',
                        ], 422);
                    }
                    // If worker has no branch but branch_id was submitted, keep the submitted branch_id
                } else {
                    return response()->json([
                        'message' => 'Invalid worker selected',
                    ], 422);
                }
            } else {
                // If CEO doesn't specify worker, assign to themselves
                $validated['worker_id'] = $user->id;
                // CEO might not have branch_id, use first available branch or create default
                if ($user->branch_id) {
                    $validated['branch_id'] = $user->branch_id;
                } elseif (empty($validated['branch_id'])) {
                    // Get first branch or create a default one
                    $branch = \App\Models\Branch::first();
                    if (!$branch) {
                        return response()->json([
                            'message' => 'No branch available. Please create a branch first.',
                        ], 422);
                    }
                    $validated['branch_id'] = $branch->id;
                }
            }
        }

        try {
            // Get card details
            $card = \App\Models\Card::findOrFail($validated['card_id']);
            
            // Use provided values or fallback to card defaults
            $totalBoxes = $validated['total_boxes'] ?? $card->number_of_boxes;
            $pricePerBox = $validated['price_per_box'] ?? ($card->number_of_boxes > 0 ? $card->amount / $card->number_of_boxes : 0);
            $totalAmount = $validated['total_amount'] ?? $card->amount;
            
            $validated['total_boxes'] = $totalBoxes;
            $validated['price_per_box'] = $pricePerBox;
            $validated['total_amount'] = $totalAmount;
            $validated['boxes_filled'] = 0;
            $validated['amount_paid'] = 0;
            $validated['status'] = 'in_progress';

            $customer = Customer::create($validated);

            // Create audit log
            \App\Models\AuditLog::log('customer_created', $customer, null, $customer->toArray());

            return response()->json([
                'message' => 'Customer created successfully',
                'customer' => $customer->load(['branch', 'worker', 'card']),
            ], 201);
        } catch (\Exception $e) {
            \Log::error('Customer creation failed: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to create customer',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a single customer with payment history
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        $customer = Customer::with(['branch', 'worker', 'card', 'payments'])->findOrFail($id);

        // Authorization check
        if ($user->hasRole('worker') && $customer->worker_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($user->hasRole('secretary') && $customer->branch_id !== $user->branch_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($customer);
    }

    /**
     * Update a customer
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        $customer = Customer::findOrFail($id);

        // Authorization check
        if ($user->hasRole('worker') && $customer->worker_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($user->hasRole('secretary') && $customer->branch_id !== $user->branch_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => [
                'sometimes',
                'string',
                'max:255',
                \Illuminate\Validation\Rule::unique('customers', 'name')->where(function ($query) use ($customer) {
                    return $query->where('worker_id', $customer->worker_id);
                })->ignore($customer->id),
            ],
            'phone' => 'sometimes|string|regex:/^[0-9]{10}$/',
            'location' => 'sometimes|string',
        ], [
            'phone.regex' => 'The phone number must be exactly 10 digits.',
        ]);

        $oldValues = $customer->toArray();
        $customer->update($validated);
        
        // Create audit log
        \App\Models\AuditLog::log('customer_updated', $customer, $oldValues, $customer->getChanges());

        return response()->json([
            'message' => 'Customer updated successfully',
            'customer' => $customer->load(['branch', 'worker', 'card']),
        ]);
    }

    /**
 * Deactivate a customer (soft delete)
 */
public function deactivate(Request $request, $id)
{
    $user = $request->user();
    $customer = Customer::findOrFail($id);

    // Only CEO and Secretary can deactivate
    if ($user->hasRole('worker')) {
        return response()->json(['message' => 'Unauthorized'], 403);
    }

    if ($user->hasRole('secretary') && $customer->branch_id !== $user->branch_id) {
        return response()->json(['message' => 'Unauthorized'], 403);
    }

    $oldValues = $customer->toArray();
    $customer->delete();

    // Create audit log
    \App\Models\AuditLog::log('customer_deactivated', $customer, $oldValues, ['deleted_at' => $customer->deleted_at]);

    return response()->json([
        'message' => 'Customer deactivated successfully',
    ]);
}    
    /**
     * Transfer customer to another worker (CEO only)
     */
    public function transfer(Request $request, $id)
    {
        // ... (transfer logic remains same)
        $validated = $request->validate([
            'new_worker_id' => 'required|exists:users,id',
        ]);

        $customer = Customer::findOrFail($id);
        $newWorker = \App\Models\User::with('roles')->findOrFail($validated['new_worker_id']);

        // Verify new worker has worker role or similar? Not strictly necessary if CEO decides.
        
        $oldWorkerId = $customer->worker_id;
        $customer->worker_id = $newWorker->id;
        
        // Also update branch if the new worker is in a different branch
        if ($newWorker->branch_id) {
            $customer->branch_id = $newWorker->branch_id;
        }

        $customer->save();

        // Create audit log
        \App\Models\AuditLog::log('customer_transferred', $customer, ['worker_id' => $oldWorkerId], ['worker_id' => $newWorker->id]);

        return response()->json([
            'message' => 'Customer transferred successfully',
            'customer' => $customer->load(['branch', 'worker', 'card']),
            'previous_worker_id' => $oldWorkerId,
            'new_worker_id' => $newWorker->id,
        ]);
    }

    /**
     * Mark a customer as served (Secretary and CEO only)
     */
    public function markAsServed(Request $request, $id)
    {
        $user = $request->user();
        $customer = Customer::findOrFail($id);

        // Authorization check
        if ($user->hasRole('worker')) {
            return response()->json(['message' => 'Unauthorized. Workers cannot perform this action.'], 403);
        }

        if ($user->hasRole('secretary') && $customer->branch_id !== $user->branch_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($customer->status !== 'completed') {
            return response()->json(['message' => 'Only completed customers can be marked as served.'], 422);
        }

        if ($customer->is_served) {
            return response()->json(['message' => 'Customer is already served.'], 422);
        }

        $customer->is_served = true;
        $customer->save();

        // Create audit log
        \App\Models\AuditLog::log('customer_served', $customer, ['is_served' => false], ['is_served' => true]);

        return response()->json([
            'message' => 'Customer marked as served successfully',
            'customer' => $customer->load(['branch', 'worker', 'card']),
        ]);
    }
}
