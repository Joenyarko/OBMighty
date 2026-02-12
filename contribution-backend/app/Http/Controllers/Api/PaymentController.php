<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Payment;
use App\Services\PaymentService;
use Illuminate\Http\Request;
use Exception;

class PaymentController extends Controller
{
    protected $paymentService;

    public function __construct(PaymentService $paymentService)
    {
        $this->paymentService = $paymentService;
    }

    /**
     * Get payment history with filters
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Payment::with(['customer', 'worker', 'branch']);

        // Apply role-based filtering
        if ($user->hasRole('worker')) {
            $query->forWorker($user->id);
        } elseif ($user->hasRole('secretary')) {
            $query->forBranch($user->branch_id);
        }
        // CEO sees all

        // Apply date filters if provided
        if ($request->has('date')) {
            $query->forDate($request->date);
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->dateRange($request->start_date, $request->end_date);
        }

        // Apply customer filter
        if ($request->has('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        // Apply worker filter
        if ($request->has('worker_id')) {
            $query->where('worker_id', $request->worker_id);
        }

        // Apply branch filter
        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        $payments = $query->orderBy('payment_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json($payments);
    }

    /**
     * Record a new payment
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'payment_amount' => 'required|numeric|min:0.01',
            'payment_date' => 'nullable|date',
            'payment_method' => 'nullable|in:cash,mobile_money,bank_transfer',
            'reference_number' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        try {
            $customer = Customer::findOrFail($validated['customer_id']);
            
            // Authorization check: Worker can only record for own customers
            $user = $request->user();
            if ($user->hasRole('worker') && $customer->worker_id !== $user->id) {
                return response()->json([
                    'message' => 'Unauthorized. You can only record payments for your own customers.',
                ], 403);
            }

            // Secretary can only record for customers in their branch
            if ($user->hasRole('secretary') && $customer->branch_id !== $user->branch_id) {
                return response()->json([
                    'message' => 'Unauthorized. You can only record payments for customers in your branch.',
                ], 403);
            }

            // Record payment using service
            $payment = $this->paymentService->recordPayment($customer, $validated);

            // Reload customer to get updated values
            $customer->refresh();

            return response()->json([
                'message' => 'Payment recorded successfully',
                'payment' => $payment->load(['customer', 'worker', 'branch']),
                'customer' => [
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'boxes_filled' => $customer->boxes_filled,
                    'total_boxes' => $customer->total_boxes,
                    'amount_paid' => $customer->amount_paid,
                    'balance' => $customer->balance,
                    'status' => $customer->status,
                    'completion_percentage' => $customer->completion_percentage,
                ],
            ], 201);

        } catch (Exception $e) {
            return response()->json([
                'message' => 'Payment recording failed',
                'error' => $e->getMessage(),
            ], 422);
        }
    }
    /**
     * Record multiple payments
     */
    public function bulkStore(Request $request)
    {
        $validated = $request->validate([
            'payments' => 'required|array|min:1',
            'payments.*.customer_id' => 'required|exists:customers,id',
            'payments.*.payment_amount' => 'required|numeric|min:0.01',
            'payments.*.payment_date' => 'nullable|date',
            'payments.*.payment_method' => 'nullable|in:cash,mobile_money,bank_transfer',
            'payments.*.reference_number' => 'nullable|string|max:255',
            'payments.*.notes' => 'nullable|string',
        ]);

        $results = [
            'successful' => [],
            'failed' => [],
        ];

        $user = $request->user();

        foreach ($validated['payments'] as $index => $paymentData) {
            try {
                $customer = Customer::findOrFail($paymentData['customer_id']);

                // Authorization Check
                if ($user->hasRole('worker') && $customer->worker_id !== $user->id) {
                    throw new Exception("Unauthorized: Not your customer.");
                }

                if ($user->hasRole('secretary') && $customer->branch_id !== $user->branch_id) {
                    throw new Exception("Unauthorized: Customer not in your branch.");
                }

                // Call service
                $payment = $this->paymentService->recordPayment($customer, $paymentData);

                $results['successful'][] = [
                    'customer_id' => $customer->id,
                    'customer_name' => $customer->name,
                    'amount' => $payment->payment_amount,
                    'payment_id' => $payment->id,
                ];

            } catch (Exception $e) {
                $results['failed'][] = [
                    'customer_id' => $paymentData['customer_id'] ?? null,
                    'error' => $e->getMessage(),
                    'index' => $index,
                ];
            }
        }

        return response()->json([
            'message' => 'Bulk processing completed',
            'results' => $results,
        ], 200);
    }
}
