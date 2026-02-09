<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkerDailyTotal;
use App\Models\BranchDailyTotal;
use App\Models\CompanyDailyTotal;
use App\Models\Customer;
use App\Models\Payment;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ReportController extends Controller
{
    /**
     * Get daily report
     */
    public function daily(Request $request)
    {
        $user = $request->user();
        $date = $request->input('date', Carbon::today());
        
        $data = [];

        if ($user->hasRole('ceo')) {
            // CEO sees company-wide data
            $companyTotal = CompanyDailyTotal::where('date', $date)->first();
            $branchTotals = BranchDailyTotal::with('branch')
                ->where('date', $date)
                ->get();
            
            $data = [
                'date' => $date,
                'company_total' => $companyTotal,
                'branch_totals' => $branchTotals,
            ];
        } elseif ($user->hasRole('secretary')) {
            // Secretary sees branch data
            $branchTotal = BranchDailyTotal::where('branch_id', $user->branch_id)
                ->where('date', $date)
                ->first();
            
            $workerTotals = WorkerDailyTotal::with('worker')
                ->where('branch_id', $user->branch_id)
                ->where('date', $date)
                ->get();
            
            $data = [
                'date' => $date,
                'branch_total' => $branchTotal,
                'worker_totals' => $workerTotals,
            ];
        } else {
            // Worker sees own data
            $workerTotal = WorkerDailyTotal::where('worker_id', $user->id)
                ->where('date', $date)
                ->first();
            
            // Use BoxPayment for recent history (and map to expected format)
            $payments = \App\Models\BoxPayment::with('customerCard.customer')
                ->where('worker_id', $user->id)
                ->whereDate('payment_date', $date)
                ->latest()
                ->take(10)
                ->get()
                ->map(function ($boxPayment) {
                    return [
                        'id' => $boxPayment->id,
                        'payment_amount' => $boxPayment->amount_paid,
                        'boxes_filled' => $boxPayment->boxes_checked,
                        'created_at' => $boxPayment->created_at,
                        'customer' => $boxPayment->customerCard->customer ?? ['name' => 'Unknown']
                    ];
                });
            
            $data = [
                'date' => $date,
                'worker_total' => $workerTotal,
                'payments' => $payments,
            ];
        }

        return response()->json($data);
    }

    /**
     * Get weekly report
     */
    public function weekly(Request $request)
    {
        $user = $request->user();
        $endDate = $request->input('end_date', Carbon::today());
        $startDate = Carbon::parse($endDate)->subDays(6);

        if ($user->hasRole('worker')) {
            $totals = WorkerDailyTotal::where('worker_id', $user->id)
                ->whereBetween('date', [$startDate, $endDate])
                ->orderBy('date')
                ->get();
        } elseif ($user->hasRole('secretary')) {
            $totals = BranchDailyTotal::where('branch_id', $user->branch_id)
                ->whereBetween('date', [$startDate, $endDate])
                ->orderBy('date')
                ->get();
        } else {
            $totals = CompanyDailyTotal::whereBetween('date', [$startDate, $endDate])
                ->orderBy('date')
                ->get();
        }

        $summary = [
            'start_date' => $startDate,
            'end_date' => $endDate,
            'total_collections' => $totals->sum('total_collections'),
            'total_payments' => $totals->sum('total_payments'),
            'daily_breakdown' => $totals,
        ];

        return response()->json($summary);
    }

    /**
     * Get monthly report
     */
    public function monthly(Request $request)
    {
        $user = $request->user();
        $month = $request->input('month', Carbon::now()->format('Y-m'));
        $startDate = Carbon::parse($month)->startOfMonth();
        $endDate = Carbon::parse($month)->endOfMonth();

        if ($user->hasRole('worker')) {
            $totals = WorkerDailyTotal::where('worker_id', $user->id)
                ->whereBetween('date', [$startDate, $endDate])
                ->get();
        } elseif ($user->hasRole('secretary')) {
            $totals = BranchDailyTotal::where('branch_id', $user->branch_id)
                ->whereBetween('date', [$startDate, $endDate])
                ->get();
        } else {
            $totals = CompanyDailyTotal::whereBetween('date', [$startDate, $endDate])
                ->get();
        }

        $summary = [
            'month' => $month,
            'total_collections' => $totals->sum('total_collections'),
            'total_payments' => $totals->sum('total_payments'),
            'daily_breakdown' => $totals,
        ];

        return response()->json($summary);
    }

    /**
     * Get worker performance (CEO and Secretary only)
     */
    public function workerPerformance(Request $request)
    {
        $user = $request->user();
        
        if ($user->hasRole('worker')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $startDate = $request->input('start_date', Carbon::today()->subDays(30));
        $endDate = $request->input('end_date', Carbon::today());

        $query = WorkerDailyTotal::with('worker')
            ->whereBetween('date', [$startDate, $endDate]);

        if ($user->hasRole('secretary')) {
            $query->where('branch_id', $user->branch_id);
        }

        $performance = $query->get()
            ->groupBy('worker_id')
            ->map(function ($workerTotals) {
                return [
                    'worker' => $workerTotals->first()->worker,
                    'total_collections' => $workerTotals->sum('total_collections'),
                    'total_customers_paid' => $workerTotals->sum('total_customers_paid'),
                    'days_active' => $workerTotals->count(),
                ];
            })
            ->values();

        return response()->json($performance);
    }

    /**
     * Get defaulting customers
     */
    public function defaultingCustomers(Request $request)
    {
        $user = $request->user();
        $query = Customer::with(['worker', 'branch', 'card'])
            ->defaulting();

        if ($user->hasRole('worker')) {
            $query->forWorker($user->id);
        } elseif ($user->hasRole('secretary')) {
            $query->forBranch($user->branch_id);
        }

        $customers = $query->get();

        return response()->json($customers);
    }
}
