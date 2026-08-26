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
        $isManager = $user->hasRole('secretary') || $user->hasRole('manager') || $user->hasRole('branch_manager');

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
        } elseif ($isManager) {
            // Manager / Secretary sees branch data
            $branchId = $user->branch_id;

            if ($branchId) {
                $branchTotal = BranchDailyTotal::where('branch_id', $branchId)
                    ->where('date', $date)
                    ->first();
                
                $totalCustomers = Customer::where('branch_id', $branchId)->count();
                $totalPayments = Payment::where('branch_id', $branchId)->whereDate('payment_date', $date)->count();
                $totalCollections = Payment::where('branch_id', $branchId)->whereDate('payment_date', $date)->sum('payment_amount');
                $activeWorkers = \App\Models\User::where('branch_id', $branchId)
                    ->whereHas('roles', fn($q) => $q->where('name', 'worker'))
                    ->count();

                if ($branchTotal) {
                    $branchTotal = $branchTotal->toArray();
                    $branchTotal['total_customers'] = $totalCustomers;
                    $branchTotal['total_payments'] = (float)($branchTotal['total_payments'] ?? $totalPayments);
                    $branchTotal['total_collections'] = (float)($branchTotal['total_collections'] ?? $totalCollections);
                    $branchTotal['total_workers_active'] = (int)($branchTotal['total_workers_active'] ?? $activeWorkers);
                } else {
                    $branchTotal = [
                        'total_customers' => $totalCustomers,
                        'total_payments' => $totalPayments,
                        'total_collections' => $totalCollections,
                        'total_workers_active' => $activeWorkers,
                    ];
                }
                
                $workerTotals = WorkerDailyTotal::with('worker')
                    ->where('branch_id', $branchId)
                    ->where('date', $date)
                    ->get();
            } else {
                // If manager has no specific branch_id, aggregate company-wide
                $totalCustomers = Customer::count();
                $totalPayments = Payment::whereDate('payment_date', $date)->count();
                $totalCollections = Payment::whereDate('payment_date', $date)->sum('payment_amount');
                $activeWorkers = \App\Models\User::whereHas('roles', fn($q) => $q->where('name', 'worker'))->count();

                $branchTotal = [
                    'total_customers' => $totalCustomers,
                    'total_payments' => $totalPayments,
                    'total_collections' => $totalCollections,
                    'total_workers_active' => $activeWorkers,
                ];

                $workerTotals = WorkerDailyTotal::with('worker')
                    ->where('date', $date)
                    ->get();
            }
            
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
                
            // Inject total customers count and fix customers_paid to distinct count
            if ($workerTotal) {
                $workerTotal = $workerTotal->toArray();
                $workerTotal['total_customers'] = Customer::where('worker_id', $user->id)->count();
                $workerTotal['total_customers_paid'] = Payment::where('worker_id', $user->id)
                    ->whereDate('payment_date', $date)
                    ->distinct('customer_id')
                    ->count('customer_id');
            } else {
                $workerTotal = [
                    'total_customers' => Customer::where('worker_id', $user->id)->count(),
                    'total_customers_paid' => Payment::where('worker_id', $user->id)
                        ->whereDate('payment_date', $date)
                        ->distinct('customer_id')
                        ->count('customer_id'),
                    'total_collections' => 0,
                ];
            }
            
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
                        'customer' => $boxPayment->customerCard?->customer ?? ['name' => 'Deleted Customer']
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
        $isManager = $user->hasRole('secretary') || $user->hasRole('manager') || $user->hasRole('branch_manager');

        if ($user->hasRole('worker')) {
            $totals = WorkerDailyTotal::where('worker_id', $user->id)
                ->whereBetween('date', [$startDate, $endDate])
                ->orderBy('date')
                ->get();
        } elseif ($isManager) {
            if ($user->branch_id) {
                $totals = BranchDailyTotal::where('branch_id', $user->branch_id)
                    ->whereBetween('date', [$startDate, $endDate])
                    ->orderBy('date')
                    ->get();
            } else {
                $totals = CompanyDailyTotal::whereBetween('date', [$startDate, $endDate])
                    ->orderBy('date')
                    ->get();
            }
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
        $isManager = $user->hasRole('secretary') || $user->hasRole('manager') || $user->hasRole('branch_manager');

        if ($user->hasRole('worker')) {
            $totals = WorkerDailyTotal::where('worker_id', $user->id)
                ->whereBetween('date', [$startDate, $endDate])
                ->get();
        } elseif ($isManager) {
            if ($user->branch_id) {
                $totals = BranchDailyTotal::where('branch_id', $user->branch_id)
                    ->whereBetween('date', [$startDate, $endDate])
                    ->get();
            } else {
                $totals = CompanyDailyTotal::whereBetween('date', [$startDate, $endDate])
                    ->get();
            }
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
     * Get yearly report — aggregates monthly totals for the current year
     */
    public function yearly(Request $request)
    {
        $user = $request->user();
        $year = $request->input('year', Carbon::now()->year);
        $startDate = Carbon::createFromDate($year, 1, 1)->startOfYear();
        $endDate = Carbon::createFromDate($year, 12, 31)->endOfYear();
        $isManager = $user->hasRole('secretary') || $user->hasRole('manager') || $user->hasRole('branch_manager');

        if ($user->hasRole('worker')) {
            $totals = WorkerDailyTotal::where('worker_id', $user->id)
                ->whereBetween('date', [$startDate, $endDate])
                ->get();
        } elseif ($isManager) {
            if ($user->branch_id) {
                $totals = BranchDailyTotal::where('branch_id', $user->branch_id)
                    ->whereBetween('date', [$startDate, $endDate])
                    ->get();
            } else {
                $totals = CompanyDailyTotal::whereBetween('date', [$startDate, $endDate])
                    ->get();
            }
        } else {
            $totals = CompanyDailyTotal::whereBetween('date', [$startDate, $endDate])
                ->get();
        }

        // Group by month
        $monthlyBreakdown = $totals->groupBy(function ($item) {
            return Carbon::parse($item->date)->format('Y-m');
        })->map(function ($monthData, $month) {
            return [
                'date' => $month,
                'total_collections' => $monthData->sum('total_collections'),
                'total_payments' => $monthData->sum('total_payments'),
            ];
        })->sortKeys()->values();

        return response()->json([
            'year' => $year,
            'total_collections' => $totals->sum('total_collections'),
            'total_payments' => $totals->sum('total_payments'),
            'monthly_breakdown' => $monthlyBreakdown,
        ]);
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
