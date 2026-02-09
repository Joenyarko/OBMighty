<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomerCard;
use App\Models\BoxState;
use App\Models\BoxPayment;
use App\Models\Card;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerCardController extends Controller
{
    /**
     * Assign a card to a customer
     */
    public function assign(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'card_id' => 'required|exists:cards,id',
            'assigned_date' => 'nullable|date',
        ]);

        // Check if customer already has an active card
        $existingCard = CustomerCard::where('customer_id', $validated['customer_id'])
            ->where('status', 'active')
            ->first();

        if ($existingCard) {
            return response()->json([
                'message' => 'Customer already has an active card'
            ], 400);
        }

        // Get card details
        $card = Card::findOrFail($validated['card_id']);

        DB::beginTransaction();
        try {
            // Create customer card
            $customerCard = CustomerCard::create([
                'customer_id' => $validated['customer_id'],
                'card_id' => $validated['card_id'],
                'assigned_date' => $validated['assigned_date'] ?? now()->toDateString(),
                'total_boxes' => $card->number_of_boxes,
                'boxes_checked' => 0,
                'total_amount' => $card->amount,
                'amount_paid' => 0,
                'amount_remaining' => $card->amount,
                'status' => 'active',
                'assigned_by' => $request->user()->id,
            ]);

            // Generate box states (all unchecked)
            $boxStates = [];
            for ($i = 1; $i <= $card->number_of_boxes; $i++) {
                $boxStates[] = [
                    'customer_card_id' => $customerCard->id,
                    'box_number' => $i,
                    'is_checked' => false,
                    'checked_date' => null,
                    'payment_id' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            BoxState::insert($boxStates);

            DB::commit();

            return response()->json([
                'message' => 'Card assigned successfully',
                'customer_card' => $customerCard->load(['customer', 'card']),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to assign card',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get customer's card details
     */
    public function getCustomerCard($customerId)
    {
        // \Log::info("Fetching card for customer ID: " . $customerId);

        $customerCard = CustomerCard::with(['customer', 'card'])
            ->where('customer_id', $customerId)
            ->where('status', 'active')
            ->first();

        if (!$customerCard) {
            // Check if ANY card exists to distinguish between "expired" and "missing"
            $anyCard = CustomerCard::where('customer_id', $customerId)->first();
            
            if (!$anyCard) {
                // SELF-HEALING: Customer exists but has no card record (likely from bad creation)
                $customer = \App\Models\Customer::find($customerId);
                
                if ($customer && $customer->card_id) {
                    \Log::info("Self-healing: Creating missing card for customer ID: " . $customerId);
                    
                    try {
                        DB::beginTransaction();
                        
                        // Get card details for price references if needed
                        $cardDefinition = \App\Models\Card::find($customer->card_id);
                        
                        // Create customer card
                        $customerCard = CustomerCard::create([
                            'customer_id' => $customer->id,
                            'card_id' => $customer->card_id,
                            'assigned_date' => $customer->created_at->toDateString(), // Use creation date
                            'total_boxes' => $customer->total_boxes ?? $cardDefinition->number_of_boxes,
                            'boxes_checked' => $customer->boxes_filled ?? 0,
                            'total_amount' => $customer->total_amount ?? $cardDefinition->amount,
                            'amount_paid' => $customer->amount_paid ?? 0,
                            'amount_remaining' => ($customer->total_amount ?? $cardDefinition->amount) - ($customer->amount_paid ?? 0),
                            'status' => 'active',
                            'assigned_by' => $customer->worker_id, // Assigned by their worker
                        ]);
            
                        // Generate box states
                        $boxStates = [];
                        $boxesFilled = $customer->boxes_filled ?? 0;
                        
                        for ($i = 1; $i <= $customerCard->total_boxes; $i++) {
                            $isChecked = $i <= $boxesFilled;
                            $boxStates[] = [
                                'customer_card_id' => $customerCard->id,
                                'box_number' => $i,
                                'is_checked' => $isChecked,
                                'checked_date' => $isChecked ? $customer->created_at : null,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ];
                        }
            
                        BoxState::insert($boxStates);
                        
                        DB::commit();
                        
                        // Reload with relations
                        return response()->json($customerCard->load(['customer', 'card']));
                        
                    } catch (\Exception $e) {
                        DB::rollBack();
                        \Log::error("Self-healing failed: " . $e->getMessage());
                    }
                }
            }

            return response()->json([
                'message' => 'No active card found for this customer'
            ], 404);
        }

        return response()->json($customerCard);
    }

    /**
     * Check boxes (record payment)
     */
    /**
     * Check boxes (record payment)
     */
    public function checkBoxes(Request $request, $id)
    {
        \Log::info('checkBoxes called', ['customer_card_id' => $id, 'request_data' => $request->all()]);
        
        try {
            $customerCard = CustomerCard::findOrFail($id);
            \Log::info('CustomerCard found', ['id' => $customerCard->id, 'total_amount' => $customerCard->total_amount, 'total_boxes' => $customerCard->total_boxes]);
        } catch (\Exception $e) {
            \Log::error('CustomerCard not found', ['id' => $id, 'error' => $e->getMessage()]);
            throw $e;
        }

        $validated = $request->validate([
            'boxes_to_check' => 'nullable|integer|min:1',
            'amount_paid' => 'nullable|numeric|min:0.01',
            'payment_method' => 'nullable|in:cash,mobile_money,bank_transfer,cheque',
            'notes' => 'nullable|string',
        ]);
        
        \Log::info('Validation passed', ['validated' => $validated]);

        // Calculate boxes from amount or use boxes directly
        if (isset($validated['amount_paid'])) {
            $customerCard->append('box_price'); // Ensure attribute is loaded
            \Log::info('Box price calculated', ['box_price' => $customerCard->box_price]);
            
            if ($customerCard->box_price <= 0) {
                 \Log::error('Invalid box price', ['box_price' => $customerCard->box_price]);
                 return response()->json(['message' => 'Invalid box price calculation'], 400);
            }
            $boxesToCheck = floor($validated['amount_paid'] / $customerCard->box_price);
            \Log::info('Boxes calculated from amount', ['amount' => $validated['amount_paid'], 'box_price' => $customerCard->box_price, 'boxes' => $boxesToCheck]);
        } else {
            $boxesToCheck = $validated['boxes_to_check'];
            \Log::info('Using boxes directly', ['boxes' => $boxesToCheck]);
        }

        if ($boxesToCheck <= 0) {
            return response()->json([
                'message' => 'Invalid number of boxes to check (Amount too small or zero boxes)'
            ], 400);
        }

        if ($boxesToCheck > $customerCard->boxes_remaining) {
            return response()->json([
                'message' => 'Cannot check more boxes than remaining',
                'boxes_remaining' => $customerCard->boxes_remaining
            ], 400);
        }

        DB::beginTransaction();
        try {
            $payment = $customerCard->checkBoxes(
                $boxesToCheck,
                $request->user()->id,
                $validated['payment_method'] ?? 'cash',
                $validated['notes'] ?? null
            );

            // --- Update Analytics (Daily Totals) ---
            $date = now()->toDateString();
            $amount = $payment->amount_paid;
            $workerId = $payment->worker_id;
            // Get branch from worker or customer? CustomerCard -> Customer -> Branch
            $customer = $customerCard->customer;
            $branchId = $customer->branch_id;
            
            \Log::info('Analytics update', ['branch_id' => $branchId, 'worker_id' => $workerId, 'amount' => $amount]);
            
            // Skip analytics if no branch (shouldn't happen, but safety check)
            if (!$branchId) {
                \Log::warning('Customer has no branch_id, skipping analytics', ['customer_id' => $customer->id]);
            } else {
                // 1. Worker Daily Total
                $workerTotal = \App\Models\WorkerDailyTotal::firstOrNew([
                    'worker_id' => $workerId,
                    'date' => $date,
                ]);
                $workerTotal->branch_id = $branchId;
                $workerTotal->total_collections += $amount;
                $workerTotal->total_customers_paid += 1;
                $workerTotal->save();
                \Log::info('Worker total updated');

            // 2. Branch Daily Total
            $branchTotal = \App\Models\BranchDailyTotal::firstOrNew([
                'branch_id' => $branchId,
                'date' => $date,
            ]);
            $branchTotal->total_collections += $amount;
            $branchTotal->total_payments += 1;
            // Recalculate active workers
            $activeWorkers = \App\Models\WorkerDailyTotal::where('branch_id', $branchId)
                ->where('date', $date)
                ->distinct('worker_id')
                ->count('worker_id');
            $branchTotal->total_workers_active = $activeWorkers;
            $branchTotal->save();
            \Log::info('Branch total updated');

            // 3. Company Daily Total
            $companyTotal = \App\Models\CompanyDailyTotal::firstOrNew([
                'date' => $date,
            ]);
            $companyTotal->total_collections += $amount;
            $companyTotal->total_payments += 1;
            // Recalculate active branches
            $activeBranches = \App\Models\BranchDailyTotal::where('date', $date)
                ->distinct('branch_id')
                ->count('branch_id');
            $companyTotal->total_branches_active = $activeBranches;
            $companyTotal->save();
            \Log::info('Company total updated');
            } // End of branch_id check
            
            \Log::info('Syncing to parent customer for list view');
            
            // --- SYNC TO PARENT CUSTOMER (Legacy Support & List View) ---
            $customer = $customerCard->customer;
            \Log::info('Customer loaded', ['customer_id' => $customer ? $customer->id : 'null']);
            
            if ($customer) {
                // Determine new status - force valid ENUM values
                $newStatus = 'in_progress'; 
                
                if ($customerCard->boxes_checked >= $customerCard->total_boxes) {
                    $newStatus = 'completed';
                }
                
                \Log::info('About to update customer', [
                    'new_status' => $newStatus,
                    'boxes_filled' => $customerCard->boxes_checked,
                    'amount_paid' => $customerCard->amount_paid,
                    'last_payment_date' => $date
                ]);

                try {
                    $updateData = [
                        'boxes_filled' => $customerCard->boxes_checked,
                        'amount_paid' => $customerCard->amount_paid,
                        'last_payment_date' => $date,
                        'status' => $newStatus
                    ];
                    
                    \Log::info('Update data prepared', $updateData);
                    
                    $result = $customer->update($updateData);
                    
                    \Log::info('Customer update result', ['result' => $result]);
                    \Log::info('Customer updated successfully');
                } catch (\Throwable $e) {
                    \Log::error('Customer update FAILED', [
                        'error' => $e->getMessage(),
                        'file' => $e->getFile(),
                        'line' => $e->getLine(),
                        'trace' => $e->getTraceAsString()
                    ]);
                    throw $e;
                }
            }
            
            \Log::info('About to commit transaction');
            DB::commit();
            \Log::info('Transaction committed successfully');
            
            // Reload the customer card with fresh data
            $customerCard->refresh();
            \Log::info('CustomerCard refreshed');

            return response()->json([
                'message' => 'Payment recorded successfully',
                'payment' => [
                    'id' => $payment->id,
                    'amount_paid' => $payment->amount_paid,
                    'boxes_checked' => $payment->boxes_checked,
                    'payment_date' => $payment->payment_date,
                ],
                'customer_card' => [
                    'id' => $customerCard->id,
                    'boxes_checked' => $customerCard->boxes_checked,
                    'amount_paid' => $customerCard->amount_paid,
                    'amount_remaining' => $customerCard->amount_remaining,
                    'status' => $customerCard->status,
                ],
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to record payment',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get box states for a customer card
     */
    public function getBoxStates($id)
    {
        $customerCard = CustomerCard::findOrFail($id);

        $boxStates = BoxState::where('customer_card_id', $id)
            ->orderBy('box_number')
            ->get();

        return response()->json([
            'customer_card' => $customerCard,
            'box_states' => $boxStates,
        ]);
    }

    /**
     * Get daily sales for a customer card
     */
    public function getDailySales($id, Request $request)
    {
        $customerCard = CustomerCard::findOrFail($id);
        $date = $request->input('date', now()->toDateString());

        $dailySales = $customerCard->getDailySales($date);

        return response()->json([
            'date' => $date,
            'daily_sales' => $dailySales,
        ]);
    }

    /**
     * Get payment history for a customer card
     */
    public function getPaymentHistory($id)
    {
        $customerCard = CustomerCard::findOrFail($id);

        $payments = BoxPayment::with('worker')
            ->where('customer_card_id', $id)
            ->orderBy('payment_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($payments);
    }

    /**
     * Get all customer cards (for listing)
     */
    public function index(Request $request)
    {
        $query = CustomerCard::with(['customer', 'card']);

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by worker (assigned_by)
        if ($request->has('worker_id')) {
            $query->where('assigned_by', $request->worker_id);
        }

        $customerCards = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($customerCards);
    }

    /**
     * Get worker's daily sales summary
     */
    public function getWorkerDailySales(Request $request)
    {
        $workerId = $request->user()->id;
        $date = $request->input('date', now()->toDateString());

        $dailySales = BoxPayment::where('worker_id', $workerId)
            ->whereDate('payment_date', $date)
            ->sum('amount_paid');

        $paymentsCount = BoxPayment::where('worker_id', $workerId)
            ->whereDate('payment_date', $date)
            ->count();

        return response()->json([
            'date' => $date,
            'total_sales' => $dailySales,
            'payments_count' => $paymentsCount,
        ]);
    }

    /**
     * Reverse a payment (undo)
     */
    public function reversePayment($paymentId)
    {
        \Log::info('reversePayment called', ['payment_id' => $paymentId]);
        
        $payment = BoxPayment::findOrFail($paymentId);
        $customerCard = $payment->customerCard;
        
        // Authorization check handled by route middleware/closure
        $user = request()->user();
        // Removed redundant check that was using incorrect $user->role property
        
        DB::beginTransaction();
        try {
            $amount = $payment->amount_paid;
            $boxes = $payment->boxes_checked;
            $date = $payment->payment_date;
            $workerId = $payment->worker_id;
            $customer = $customerCard->customer;
            $branchId = $customer->branch_id;
            
            \Log::info('Reversing payment', ['amount' => $amount, 'boxes' => $boxes]);
            
            // 1. Uncheck the boxes
            BoxState::where('payment_id', $payment->id)
                ->update([
                    'is_checked' => false,
                    'checked_date' => null,
                    'payment_id' => null,
                ]);
            
            // 2. Update customer card totals
            $customerCard->decrement('boxes_checked', $boxes);
            $customerCard->decrement('amount_paid', $amount);
            $customerCard->increment('amount_remaining', $amount);
            
            // Update status if needed
            if ($customerCard->status === 'completed') {
                $customerCard->update(['status' => 'active']);
            }
            
            // 3. Reverse analytics (if branch exists)
            if ($branchId) {
                // Worker Daily Total
                $workerTotal = \App\Models\WorkerDailyTotal::where('worker_id', $workerId)
                    ->where('date', $date)
                    ->first();
                if ($workerTotal) {
                    $workerTotal->total_collections = max(0, $workerTotal->total_collections - $amount);
                    $workerTotal->total_customers_paid = max(0, $workerTotal->total_customers_paid - 1);
                    $workerTotal->save();
                }
                
                // Branch Daily Total
                $branchTotal = \App\Models\BranchDailyTotal::where('branch_id', $branchId)
                    ->where('date', $date)
                    ->first();
                if ($branchTotal) {
                    $branchTotal->total_collections = max(0, $branchTotal->total_collections - $amount);
                    $branchTotal->total_payments = max(0, $branchTotal->total_payments - 1);
                    $branchTotal->save();
                }
                
                // Company Daily Total
                $companyTotal = \App\Models\CompanyDailyTotal::where('date', $date)->first();
                if ($companyTotal) {
                    $companyTotal->total_collections = max(0, $companyTotal->total_collections - $amount);
                    $companyTotal->total_payments = max(0, $companyTotal->total_payments - 1);
                    $companyTotal->save();
                }
            }
            
            // 4. Update parent customer
            if ($customer) {
                // Map card status 'active' to customer status 'in_progress'
                $customerStatus = ($customerCard->status === 'completed') ? 'completed' : 'in_progress';
                
                $customer->update([
                    'boxes_filled' => $customerCard->boxes_checked,
                    'amount_paid' => $customerCard->amount_paid,
                    'status' => $customerStatus,
                    // 'balance' => $customerCard->amount_remaining // RE MOVED: Computed column
                ]);
            }
            
            // 5. Delete payment record
            $payment->delete();
            
            DB::commit();
            \Log::info('Payment reversed successfully');
            
            return response()->json([
                'message' => 'Payment reversed successfully',
                'customer_card' => $customerCard->fresh(),
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Payment reversal failed', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Failed to reverse payment',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Adjust a payment amount
     */
    public function adjustPayment(Request $request, $paymentId)
    {
        \Log::info('adjustPayment called', ['payment_id' => $paymentId, 'request' => $request->all()]);
        
        $payment = BoxPayment::findOrFail($paymentId);
        $customerCard = $payment->customerCard;
        
        // Authorization check handled by route middleware/closure
        $user = $request->user();
        // Removed redundant check that was using incorrect $user->role property
        
        $validated = $request->validate([
            'new_amount' => 'required|numeric|min:0.01',
            'notes' => 'nullable|string',
        ]);
        
        $newAmount = $validated['new_amount'];
        $oldAmount = $payment->amount_paid;
        $difference = $newAmount - $oldAmount;
        
        if ($difference == 0) {
            return response()->json(['message' => 'New amount is the same as current amount'], 400);
        }
        
        // Calculate box difference
        $customerCard->append('box_price');
        $boxDifference = floor(abs($difference) / $customerCard->box_price);
        
        \Log::info('Adjustment calculation', [
            'old_amount' => $oldAmount,
            'new_amount' => $newAmount,
            'difference' => $difference,
            'box_difference' => $boxDifference,
            'box_price' => $customerCard->box_price
        ]);
        
        DB::beginTransaction();
        try {
            $date = $payment->payment_date;
            $workerId = $payment->worker_id;
            $customer = $customerCard->customer;
            $branchId = $customer->branch_id;
            
            if ($difference > 0) {
                // INCREASE: Check more boxes
                \Log::info('Increasing payment - checking more boxes', ['boxes' => $boxDifference]);
                
                // Check if enough boxes available
                if ($boxDifference > $customerCard->boxes_remaining) {
                    return response()->json([
                        'message' => 'Not enough boxes remaining',
                        'boxes_remaining' => $customerCard->boxes_remaining
                    ], 400);
                }
                
                // Get unchecked boxes
                $uncheckedBoxes = BoxState::where('customer_card_id', $customerCard->id)
                    ->where('is_checked', false)
                    ->orderBy('box_number')
                    ->limit($boxDifference)
                    ->get();
                
                // Check the boxes
                foreach ($uncheckedBoxes as $box) {
                    $box->update([
                        'is_checked' => true,
                        'checked_date' => $date,
                        'payment_id' => $payment->id,
                    ]);
                }
                
                // Update customer card
                $customerCard->increment('boxes_checked', $boxDifference);
                $customerCard->increment('amount_paid', $difference);
                $customerCard->decrement('amount_remaining', $difference);
                
            } else {
                // DECREASE: Uncheck boxes
                \Log::info('Decreasing payment - unchecking boxes', ['boxes' => $boxDifference]);
                
                // Get boxes to uncheck (last checked boxes for this payment)
                $boxesToUncheck = BoxState::where('payment_id', $payment->id)
                    ->where('is_checked', true)
                    ->orderBy('box_number', 'desc')
                    ->limit($boxDifference)
                    ->get();
                
                // Uncheck the boxes
                foreach ($boxesToUncheck as $box) {
                    $box->update([
                        'is_checked' => false,
                        'checked_date' => null,
                        'payment_id' => null,
                    ]);
                }
                
                // Update customer card
                $customerCard->decrement('boxes_checked', $boxDifference);
                $customerCard->decrement('amount_paid', abs($difference));
                $customerCard->increment('amount_remaining', abs($difference));
            }
            
            // Update analytics (if branch exists)
            if ($branchId) {
                $workerTotal = \App\Models\WorkerDailyTotal::where('worker_id', $workerId)
                    ->where('date', $date)
                    ->first();
                if ($workerTotal) {
                    $workerTotal->total_collections += $difference;
                    $workerTotal->save();
                }
                
                $branchTotal = \App\Models\BranchDailyTotal::where('branch_id', $branchId)
                    ->where('date', $date)
                    ->first();
                if ($branchTotal) {
                    $branchTotal->total_collections += $difference;
                    $branchTotal->save();
                }
                
                $companyTotal = \App\Models\CompanyDailyTotal::where('date', $date)->first();
                if ($companyTotal) {
                    $companyTotal->total_collections += $difference;
                    $companyTotal->save();
                }
            }
            
            // Update payment record
            $payment->update([
                'adjusted_from' => $oldAmount,
                'amount_paid' => $newAmount,
                'boxes_checked' => $payment->boxes_checked + ($difference > 0 ? $boxDifference : -$boxDifference),
                'adjusted_by' => $user->id,
                'adjusted_at' => now(),
                'adjustment_notes' => $validated['notes'] ?? null,
            ]);
            
            // Update parent customer
            if ($customer) {
                // Determine new status for Customer (in_progress) vs Card (active)
                $isCompleted = $customerCard->boxes_checked >= $customerCard->total_boxes;
                
                $customerStatus = $isCompleted ? 'completed' : 'in_progress';
                $cardStatus = $isCompleted ? 'completed' : 'active';
                
                $customer->update([
                    'boxes_filled' => $customerCard->boxes_checked,
                    'amount_paid' => $customerCard->amount_paid,
                    'status' => $customerStatus,
                    // 'balance' => $customerCard->amount_remaining // REMOVED: Computed column
                ]);
                
                // Update card status
                $customerCard->update(['status' => $cardStatus]);
            }
            
            DB::commit();
            \Log::info('Payment adjusted successfully');
            
            return response()->json([
                'message' => 'Payment adjusted successfully',
                'payment' => $payment->fresh(),
                'customer_card' => $customerCard->fresh(),
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Payment adjustment failed', ['error' => $e->getMessage()]);
            return response()->json([
                'message' => 'Failed to adjust payment',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
