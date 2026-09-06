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
        } elseif ($user->hasRole('secretary') || $user->hasRole('manager') || $user->hasRole('branch_manager')) {
            if ($user->branch_id) {
                $query->forBranch($user->branch_id);
            }
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
            'due' => (clone $statsQuery)->due()->count(),
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
            } elseif ($status === 'due' || $status === 'overdue') {
                $query->due();
            } else {
                $query->where('customers.status', $status);
            }
        }

        // Apply due date filter (e.g. 'overdue', 'due', 'due_this_week', 'due_this_month')
        if ($request->has('due_filter') && $request->due_filter !== '') {
            $dueFilter = $request->due_filter;
            if ($dueFilter === 'overdue' || $dueFilter === 'due') {
                $query->due();
            } elseif ($dueFilter === 'due_this_week') {
                $query->dueThisWeek();
            } elseif ($dueFilter === 'due_this_month') {
                $query->dueThisMonth();
            }
        }

        // Apply completion percentage filter (e.g. '60_plus', '70_plus', '80_plus', '90_plus', '100', '60', '70', '80', '90')
        if ($request->has('percentage') && $request->percentage !== '') {
            $val = (string) $request->percentage;
            if ($val === '60_plus') {
                $query->whereRaw('(boxes_filled / total_boxes * 100) >= 60');
            } elseif ($val === '70_plus') {
                $query->whereRaw('(boxes_filled / total_boxes * 100) >= 70');
            } elseif ($val === '80_plus') {
                $query->whereRaw('(boxes_filled / total_boxes * 100) >= 80');
            } elseif ($val === '90_plus') {
                $query->whereRaw('(boxes_filled / total_boxes * 100) >= 90');
            } elseif ($val === '100') {
                $query->whereRaw('(boxes_filled / total_boxes * 100) >= 100');
            } elseif ($val === '60') {
                $query->whereRaw('(boxes_filled / total_boxes * 100) >= 60 AND (boxes_filled / total_boxes * 100) < 70');
            } elseif ($val === '70') {
                $query->whereRaw('(boxes_filled / total_boxes * 100) >= 70 AND (boxes_filled / total_boxes * 100) < 80');
            } elseif ($val === '80') {
                $query->whereRaw('(boxes_filled / total_boxes * 100) >= 80 AND (boxes_filled / total_boxes * 100) < 90');
            } elseif ($val === '90') {
                $query->whereRaw('(boxes_filled / total_boxes * 100) >= 90 AND (boxes_filled / total_boxes * 100) < 100');
            }
        }

        // Apply sorting
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Limit per_page to max 500 to prevent DoS
        $perPage = min((int)$request->input('per_page', 15), 500);
        $customers = $query->paginate($perPage);

        // Attach global stats to the paginated response
        $response = $customers->toArray();
        $response['stats'] = $stats;

        return response()->json($response);
    }

    /**
     * Store a newly created customer
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                \Illuminate\Validation\Rule::unique('customers', 'name')->where(function ($query) use ($request) {
                    return $query->where('worker_id', $request->worker_id);
                }),
            ],
            'phone' => 'required|string|regex:/^[0-9]{10}$/',
            'location' => 'required|string',
            'card_id' => 'required|exists:cards,id',
            'branch_id' => 'nullable|exists:branches,id',
            'worker_id' => 'nullable|exists:users,id',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date',
            'total_boxes' => 'nullable|integer|min:1',
            'price_per_box' => 'nullable|numeric|min:0',
            'total_amount' => 'nullable|numeric|min:0',
        ], [
            'phone.regex' => 'The phone number must be exactly 10 digits.',
            'name.unique' => 'A customer with this name already exists for the selected worker.',
        ]);

        $isManager = $user->hasRole('secretary') || $user->hasRole('manager') || $user->hasRole('branch_manager');

        // Auto-assign worker and branch for non-CEO users
        if ($user->hasRole('worker')) {
            $validated['worker_id'] = $user->id;
            $validated['branch_id'] = $user->branch_id;
        } elseif ($isManager) {
            if (!empty($validated['worker_id'])) {
                $worker = \App\Models\User::find($validated['worker_id']);
                if ($worker) {
                    $validated['branch_id'] = $worker->branch_id ?: ($validated['branch_id'] ?? $user->branch_id);
                } else {
                    $validated['branch_id'] = $validated['branch_id'] ?? $user->branch_id;
                }
            } else {
                $validated['worker_id'] = $user->id;
                $validated['branch_id'] = $validated['branch_id'] ?? $user->branch_id;
            }

            if (empty($validated['branch_id'])) {
                $validated['branch_id'] = $user->branch_id;
            }
        } elseif ($user->hasRole('ceo') || $user->hasRole('super_admin')) {
            // CEO can assign to any worker
            if (!empty($validated['worker_id'])) {
                $worker = \App\Models\User::find($validated['worker_id']);
                if ($worker) {
                    $validated['branch_id'] = $worker->branch_id ?: ($validated['branch_id'] ?? $user->branch_id);
                } elseif (empty($validated['branch_id'])) {
                    return response()->json([
                        'message' => 'Selected worker belongs to no branch, and no branch was selected.',
                    ], 422);
                }
            } else {
                $validated['worker_id'] = $user->id;
                if ($user->branch_id) {
                    $validated['branch_id'] = $user->branch_id;
                } elseif (empty($validated['branch_id'])) {
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

        // Always ensure company_id is populated from current company
        $validated['company_id'] = $user->company_id ?: config('app.company_id');

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

            // Auto-calculate due_date if start_date is provided and due_date is not set
            if (!empty($validated['start_date']) && empty($validated['due_date'])) {
                $duration = $card->duration_months ?? 6;
                $validated['due_date'] = \Carbon\Carbon::parse($validated['start_date'])->addMonths($duration)->toDateString();
            }

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
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date',
        ], [
            'phone.regex' => 'The phone number must be exactly 10 digits.',
        ]);

        // Auto-calculate due_date if start_date is provided and due_date is empty
        if (!empty($validated['start_date']) && empty($validated['due_date'])) {
            $card = $customer->card;
            $duration = $card ? ($card->duration_months ?? 6) : 6;
            $validated['due_date'] = \Carbon\Carbon::parse($validated['start_date'])->addMonths($duration)->toDateString();
        }

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
     * Transfer customer to another worker (CEO, Manager, Secretary, Super Admin)
     */
    public function transfer(Request $request, $id)
    {
        $user = $request->user();
        $validated = $request->validate([
            'new_worker_id' => 'required|exists:users,id',
        ]);

        $customer = Customer::findOrFail($id);
        $newWorker = \App\Models\User::with('roles')->findOrFail($validated['new_worker_id']);

        $isManager = $user->hasRole('secretary') || $user->hasRole('manager') || $user->hasRole('branch_manager');
        if ($isManager && $user->branch_id && $newWorker->branch_id && $user->branch_id !== $newWorker->branch_id && !$user->hasRole('ceo') && !$user->hasRole('super_admin')) {
            return response()->json([
                'message' => 'You can only transfer customers to workers within your branch.',
            ], 403);
        }
        
        $oldWorkerId = $customer->worker_id;
        $customer->worker_id = $newWorker->id;
        
        // Also update branch if the new worker is in a branch
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
     * Mark a customer as served (CEO, Manager, Secretary, Super Admin)
     */
    public function markAsServed(Request $request, $id)
    {
        $user = $request->user();
        $customer = Customer::findOrFail($id);

        // Authorization check
        if ($user->hasRole('worker')) {
            return response()->json(['message' => 'Unauthorized. Workers cannot perform this action.'], 403);
        }

        $isManager = $user->hasRole('secretary') || $user->hasRole('manager') || $user->hasRole('branch_manager');
        if ($isManager && $user->branch_id && $customer->branch_id && $customer->branch_id !== $user->branch_id && !$user->hasRole('ceo') && !$user->hasRole('super_admin')) {
            return response()->json(['message' => 'Unauthorized. Customer is not in your branch.'], 403);
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
