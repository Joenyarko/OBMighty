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
        $query = Customer::with(['branch', 'worker', 'card']);

        // Apply role-based filtering
        if ($user->hasRole('worker')) {
            $query->forWorker($user->id);
        } elseif ($user->hasRole('secretary')) {
            $query->forBranch($user->branch_id);
        }
        // CEO sees all

        // Apply status filter
        if ($request->has('status')) {
            $query->where('status', $request->status);
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

        $customers = $query->orderBy('created_at', 'desc')->paginate(15);

        return response()->json($customers);
    }

    /**
     * Create a new customer
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20',
            'location' => 'required|string',
            'card_id' => 'required|exists:cards,id',
            'branch_id' => 'nullable|exists:branches,id',
            'worker_id' => 'nullable|exists:users,id',
            'total_boxes' => 'nullable|integer|min:1',
            'price_per_box' => 'nullable|numeric|min:0.01',
            'total_amount' => 'nullable|numeric|min:0.01',
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
            'name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|string|max:20',
            'location' => 'sometimes|string',
        ]);

        $customer->update($validated);

        return response()->json([
            'message' => 'Customer updated successfully',
            'customer' => $customer->load(['branch', 'worker', 'card']),
        ]);
    }

    /**
     * Delete a customer (soft delete)
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $customer = Customer::findOrFail($id);

        // Only CEO and Secretary can delete
        if ($user->hasRole('worker')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($user->hasRole('secretary') && $customer->branch_id !== $user->branch_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $customer->delete();

        return response()->json([
            'message' => 'Customer deleted successfully',
        ]);
    }
}
