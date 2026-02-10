<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Payment;
use App\Models\WorkerDailyTotal;
use App\Models\BranchDailyTotal;
use App\Models\CompanyDailyTotal;
use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Exception;

class PaymentService
{
    /**
     * Record a payment with full transaction integrity
     * 
     * @param Customer $customer
     * @param array $data
     * @return Payment
     * @throws Exception
     */
    public function recordPayment(Customer $customer, array $data)
    {
        return DB::transaction(function () use ($customer, $data) {
            $paymentAmount = $data['payment_amount'];
            $paymentDate = $data['payment_date'] ?? Carbon::today();
            
            
            // Find Active Card
            $customerCard = \App\Models\CustomerCard::where('customer_id', $customer->id)
                ->where('status', 'active')
                ->first();

            // Calculate boxes to mark
            $boxesToMark = 0;
            $boxPrice = $customer->price_per_box; 
            
            // If card exists, prioritize its pricing
            if ($customerCard) {
                // Ensure box price is available
                $customerCard->append('box_price');
                if ($customerCard->box_price > 0) {
                     $boxPrice = $customerCard->box_price;
                }
            } else {
                 // Fallback validation for price
                 if (!$boxPrice || $boxPrice <= 0) {
                     throw new Exception('Invalid card pricing. Please update the customer card information.');
                 }
            }

            // Calculate boxes
            if ($boxPrice > 0) {
                 $boxesToMark = floor($paymentAmount / $boxPrice);
            }

            // Validation: Prevent overpayment
            $newBoxesFilled = $customer->boxes_filled + $boxesToMark;
            if ($newBoxesFilled > $customer->total_boxes) {
                // Allow small overpayments or handle gracefully? For now, strict check.
                // Actually, if using Card, check card limit
                $maxBoxes = $customerCard ? $customerCard->total_boxes : $customer->total_boxes;
                $currentFilled = $customerCard ? $customerCard->boxes_checked : $customer->boxes_filled;
                
                if (($currentFilled + $boxesToMark) > $maxBoxes) {
                     throw new Exception('Payment amount exceeds remaining balance.');
                }
            }
            
            // --- 1. HANDLE BOX STATE UPDATES (Granular) ---
            if ($customerCard) {
                // This updates BoxState, BoxPayment, and CustomerCard totals
                $customerCard->checkBoxes(
                    $boxesToMark, 
                    auth()->id() ?? $customer->worker_id, 
                    $data['payment_method'] ?? 'cash',
                    $data['notes'] ?? null
                );
            }

            // --- 2. HANDLE CUSTOMER & LEDGER UPDATES (High Level) ---
            
            // Store old customer values for audit
            $oldCustomerValues = $customer->only(['boxes_filled', 'amount_paid', 'status', 'last_payment_date']);
            
            // Update customer
            $customer->boxes_filled += $boxesToMark;
            $customer->amount_paid += $paymentAmount;
            $customer->last_payment_date = $paymentDate;
            
            // Update customer status
            if ($customer->boxes_filled >= $customer->total_boxes) {
                $customer->status = 'completed';
            } else {
                $customer->status = 'in_progress';
            }
            
            $customer->save();
            
            // Create payment record (Ledger)
            // This is required for "Recent Payments" view and reporting
            $payment = Payment::create([
                'customer_id' => $customer->id,
                'worker_id' => $customer->worker_id,
                'branch_id' => $customer->branch_id,
                'payment_amount' => $paymentAmount,
                'boxes_filled' => $boxesToMark,
                'payment_date' => $paymentDate,
                'payment_method' => $data['payment_method'] ?? 'cash',
                'reference_number' => $data['reference_number'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => auth()->id(),
            ]);
            
            // Update worker daily total
            $this->updateWorkerDailyTotal(
                $customer->worker_id,
                $customer->branch_id,
                $paymentDate,
                $paymentAmount
            );
            
            // Update branch daily total
            $this->updateBranchDailyTotal(
                $customer->branch_id,
                $paymentDate,
                $paymentAmount
            );
            
            // Update company daily total
            $this->updateCompanyDailyTotal($paymentDate, $paymentAmount);
            
            // Create audit log
            AuditLog::log(
                'payment_recorded',
                $payment,
                null,
                [
                    'payment_amount' => $paymentAmount,
                    'boxes_filled' => $boxesToMark,
                    'customer_id' => $customer->id,
                    'customer_old_values' => $oldCustomerValues,
                    'customer_new_values' => $customer->only(['boxes_filled', 'amount_paid', 'status']),
                ]
            );
            
            return $payment;
        });
    }
    
    /**
     * Update worker daily total
     */
    protected function updateWorkerDailyTotal($workerId, $branchId, $date, $amount)
    {
        $workerTotal = WorkerDailyTotal::firstOrNew([
            'worker_id' => $workerId,
            'date' => $date,
        ]);
        
        $workerTotal->branch_id = $branchId;
        $workerTotal->total_collections += $amount;
        $workerTotal->total_customers_paid += 1;
        $workerTotal->save();
    }
    
    /**
     * Update branch daily total
     */
    protected function updateBranchDailyTotal($branchId, $date, $amount)
    {
        $branchTotal = BranchDailyTotal::firstOrNew([
            'branch_id' => $branchId,
            'date' => $date,
        ]);
        
        $branchTotal->total_collections += $amount;
        $branchTotal->total_payments += 1;
        
        // Count active workers for this branch on this date
        $activeWorkers = WorkerDailyTotal::where('branch_id', $branchId)
            ->where('date', $date)
            ->distinct('worker_id')
            ->count('worker_id');
        
        $branchTotal->total_workers_active = $activeWorkers;
        $branchTotal->save();
    }
    
    /**
     * Update company daily total
     */
    protected function updateCompanyDailyTotal($date, $amount)
    {
        $companyTotal = CompanyDailyTotal::firstOrNew([
            'date' => $date,
        ]);
        
        $companyTotal->total_collections += $amount;
        $companyTotal->total_payments += 1;
        
        // Count active branches for this date
        $activeBranches = BranchDailyTotal::where('date', $date)
            ->distinct('branch_id')
            ->count('branch_id');
        
        $companyTotal->total_branches_active = $activeBranches;
        $companyTotal->save();
    }
}
