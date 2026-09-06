<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SalesController extends Controller
{
    /**
     * Get sales summary for all workers (Branch Manager/Secretary view)
     * or individual worker sales (Worker view)
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $period = $request->input('period', 'today'); // today, week, month
        
        // Determine date range based on period
        $dateRange = $this->getDateRange($period);
        
        // Build base query - include workers AND any other user who has recorded sales
        $query = User::where('company_id', $user->company_id)
            ->where(function($q) {
                $q->role('worker')
                  ->orWhereExists(function ($sub) {
                      $sub->select(DB::raw(1))
                          ->from('payments')
                          ->whereColumn('payments.worker_id', 'users.id');
                  });
            })
            ->with('branch')
            ->select('users.*');
        
        // Apply branch filtering for non-CEO/Super Admin users
        if ($user->hasRole('secretary')) {
            $query->where('branch_id', $user->branch_id);
        } elseif ($user->hasRole('worker')) {
            $query->where('id', $user->id);
        }
        
        // Get workers with their sales data
        $workers = $query->get()->map(function ($worker) use ($dateRange) {
            $salesData = Payment::forWorker($worker->id)
                ->dateRange($dateRange['start'], $dateRange['end'])
                ->select(
                    DB::raw('SUM(payment_amount) as total_sales'),
                    DB::raw('COUNT(DISTINCT customer_id) as customers_paid'),
                    DB::raw('COUNT(*) as total_transactions')
                )
                ->first();
            
            return [
                'id' => $worker->id,
                'name' => $worker->name,
                'email' => $worker->email,
                'branch' => $worker->branch ? $worker->branch->name : null,
                'total_sales' => $salesData->total_sales ?? 0,
                'customers_paid' => $salesData->customers_paid ?? 0,
                'total_transactions' => $salesData->total_transactions ?? 0,
            ];
        })->filter(function ($worker) {
            return $worker['total_transactions'] > 0;
        })->values();
        
        return response()->json([
            'period' => $period,
            'date_range' => $dateRange,
            'workers' => $workers,
        ]);
    }
    
    /**
     * Get detailed sales history for a specific worker
     */
    public function show(Request $request, $workerId)
    {
        $user = $request->user();
        $worker = User::findOrFail($workerId);
        
        // Authorization check
        if ($user->hasRole('worker') && $worker->id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        if ($user->hasRole('secretary') && $worker->branch_id !== $user->branch_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $period = $request->input('period', 'today');
        $dateRange = $this->getDateRange($period);
        
        // Get payment history
        $payments = Payment::forWorker($workerId)
            ->dateRange($dateRange['start'], $dateRange['end'])
            ->with(['customer', 'branch'])
            ->orderBy('payment_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($payment) {
                return [
                    'id' => $payment->id,
                    'customer_name' => $payment->customer?->name ?? 'Unknown',
                    'customer_phone' => $payment->customer?->phone ?? '',
                    'amount' => $payment->payment_amount,
                    'boxes_filled' => $payment->boxes_filled,
                    'payment_method' => $payment->payment_method ?? 'cash',
                    'payment_date' => $payment->payment_date ? $payment->payment_date->format('Y-m-d') : now()->format('Y-m-d'),
                    'payment_time' => $payment->created_at ? $payment->created_at->format('H:i:s') : '',
                    'reference_number' => $payment->reference_number,
                    'notes' => $payment->notes,
                ];
            });
        
        // Calculate summary
        $summary = [
            'total_sales' => $payments->sum('amount'),
            'customers_paid' => $payments->unique('id')->pluck('customer_name')->unique()->count() > 0
                ? Payment::forWorker($workerId)
                    ->dateRange($dateRange['start'], $dateRange['end'])
                    ->distinct('customer_id')
                    ->count('customer_id')
                : 0,
            'total_transactions' => $payments->count(),
            'average_transaction' => $payments->count() > 0 ? $payments->avg('amount') : 0,
        ];
        
        return response()->json([
            'worker' => [
                'id' => $worker->id,
                'name' => $worker->name,
                'email' => $worker->email,
                'branch' => $worker->branch ? $worker->branch->name : null,
            ],
            'period' => $period,
            'date_range' => $dateRange,
            'summary' => $summary,
            'payments' => $payments,
        ]);
    }
    
    /**
     * Get sales statistics (daily breakdown for charts)
     */
    public function statistics(Request $request, $workerId)
    {
        $user = $request->user();
        $worker = User::findOrFail($workerId);
        
        // Authorization check
        if ($user->hasRole('worker') && $worker->id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        if ($user->hasRole('secretary') && $worker->branch_id !== $user->branch_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $period = $request->input('period', 'week');
        $dateRange = $this->getDateRange($period);
        
        // Get daily breakdown
        $dailyStats = Payment::forWorker($workerId)
            ->dateRange($dateRange['start'], $dateRange['end'])
            ->select(
                DB::raw('DATE(payment_date) as date'),
                DB::raw('SUM(payment_amount) as total_sales'),
                DB::raw('COUNT(DISTINCT customer_id) as customers_paid'),
                DB::raw('COUNT(*) as transactions')
            )
            ->groupBy('date')
            ->orderBy('date', 'asc')
            ->get();
        
        return response()->json([
            'worker_id' => $workerId,
            'period' => $period,
            'date_range' => $dateRange,
            'daily_stats' => $dailyStats,
        ]);
    }
    
    /**
     * Helper method to get date range based on period
     */
    private function getDateRange($period)
    {
        $now = Carbon::now();
        
        switch ($period) {
            case 'today':
                return [
                    'start' => $now->startOfDay()->toDateString(),
                    'end' => $now->endOfDay()->toDateString(),
                ];
            case 'week':
                return [
                    'start' => $now->startOfWeek()->toDateString(),
                    'end' => $now->endOfWeek()->toDateString(),
                ];
            case 'month':
                return [
                    'start' => $now->startOfMonth()->toDateString(),
                    'end' => $now->endOfMonth()->toDateString(),
                ];
            default:
                return [
                    'start' => $now->startOfDay()->toDateString(),
                    'end' => $now->endOfDay()->toDateString(),
                ];
        }
    }
    
    /**
     * Get comprehensive worker or manager performance metrics
     */
    public function performance(Request $request, $workerId)
    {
        $user = $request->user();
        $worker = User::with('branch')->findOrFail($workerId);
        
        // Authorization check
        if ($user->hasRole('worker') && $worker->id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        if ($user->hasRole(['secretary', 'manager', 'branch_manager']) && $worker->branch_id !== $user->branch_id && $worker->id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $companyId = config('app.company_id');
        $isManager = $worker->hasRole(['secretary', 'manager', 'branch_manager']);

        if ($isManager) {
            $branchId = $worker->branch_id;

            // 1. Get all workers in this branch / company
            $branchWorkersQuery = User::where('company_id', $companyId);
            if ($branchId) {
                $branchWorkersQuery->where('branch_id', $branchId);
            }
            $branchWorkers = $branchWorkersQuery->whereHas('roles', function($q) {
                $q->where('name', 'worker');
            })->get();

            $workerIds = $branchWorkers->pluck('id')->toArray();
            $allStaffIds = array_unique(array_merge($workerIds, [$worker->id]));

            // 2. Branch All-Time Sales
            $allTimeStats = DB::table('payments')
                ->where('payments.company_id', $companyId)
                ->where(function($q) use ($branchId, $allStaffIds) {
                    if ($branchId) {
                        $q->where('payments.branch_id', $branchId)
                          ->orWhereIn('payments.worker_id', $allStaffIds);
                    } else {
                        $q->whereIn('payments.worker_id', $allStaffIds);
                    }
                })
                ->select(
                    DB::raw('SUM(payments.payment_amount) as total_sales'),
                    DB::raw('COUNT(DISTINCT payments.customer_id) as total_customers'),
                    DB::raw('COUNT(payments.id) as total_transactions'),
                    DB::raw('AVG(payments.payment_amount) as avg_transaction')
                )
                ->first();

            // 3. Branch This Month Sales
            $thisMonthStats = DB::table('payments')
                ->where('payments.company_id', $companyId)
                ->where(function($q) use ($branchId, $allStaffIds) {
                    if ($branchId) {
                        $q->where('payments.branch_id', $branchId)
                          ->orWhereIn('payments.worker_id', $allStaffIds);
                    } else {
                        $q->whereIn('payments.worker_id', $allStaffIds);
                    }
                })
                ->whereMonth('payments.payment_date', Carbon::now()->month)
                ->whereYear('payments.payment_date', Carbon::now()->year)
                ->select(
                    DB::raw('SUM(payments.payment_amount) as total_sales'),
                    DB::raw('COUNT(DISTINCT payments.customer_id) as customers_paid'),
                    DB::raw('COUNT(payments.id) as transactions')
                )
                ->first();

            // 4. Branch This Week Sales
            $thisWeekStats = DB::table('payments')
                ->where('payments.company_id', $companyId)
                ->where(function($q) use ($branchId, $allStaffIds) {
                    if ($branchId) {
                        $q->where('payments.branch_id', $branchId)
                          ->orWhereIn('payments.worker_id', $allStaffIds);
                    } else {
                        $q->whereIn('payments.worker_id', $allStaffIds);
                    }
                })
                ->whereBetween('payments.payment_date', [
                    Carbon::now()->startOfWeek(),
                    Carbon::now()->endOfWeek()
                ])
                ->select(
                    DB::raw('SUM(payments.payment_amount) as total_sales'),
                    DB::raw('COUNT(payments.id) as transactions')
                )
                ->first();

            // 5. Branch Today Sales
            $todayStats = DB::table('payments')
                ->where('payments.company_id', $companyId)
                ->where(function($q) use ($branchId, $allStaffIds) {
                    if ($branchId) {
                        $q->where('payments.branch_id', $branchId)
                          ->orWhereIn('payments.worker_id', $allStaffIds);
                    } else {
                        $q->whereIn('payments.worker_id', $allStaffIds);
                    }
                })
                ->whereDate('payments.payment_date', Carbon::today())
                ->select(
                    DB::raw('SUM(payments.payment_amount) as total_sales'),
                    DB::raw('COUNT(payments.id) as transactions')
                )
                ->first();

            // 6. Branch Customer Metrics
            $customerMetrics = DB::table('customers')
                ->leftJoin('customer_cards', 'customers.id', '=', 'customer_cards.customer_id')
                ->where('customers.company_id', $companyId)
                ->where(function($q) use ($branchId, $allStaffIds) {
                    if ($branchId) {
                        $q->where('customers.branch_id', $branchId)
                          ->orWhereIn('customers.worker_id', $allStaffIds);
                    } else {
                        $q->whereIn('customers.worker_id', $allStaffIds);
                    }
                })
                ->select(
                    DB::raw('COUNT(DISTINCT customers.id) as total_customers'),
                    DB::raw('COUNT(DISTINCT CASE WHEN customer_cards.status = "active" THEN customers.id END) as active_customers'),
                    DB::raw('COUNT(DISTINCT CASE WHEN customer_cards.status = "completed" THEN customers.id END) as completed_customers')
                )
                ->first();

            // 7. Workers detailed performance list under this manager
            $workersPerformanceList = [];
            foreach ($branchWorkers as $bw) {
                $wCustomers = DB::table('customers')
                    ->leftJoin('customer_cards', 'customers.id', '=', 'customer_cards.customer_id')
                    ->where('customers.company_id', $companyId)
                    ->where('customers.worker_id', $bw->id)
                    ->select(
                        DB::raw('COUNT(DISTINCT customers.id) as total_customers'),
                        DB::raw('COUNT(DISTINCT CASE WHEN customer_cards.status = "active" THEN customers.id END) as active_customers'),
                        DB::raw('COUNT(DISTINCT CASE WHEN customer_cards.status = "completed" THEN customers.id END) as completed_customers')
                    )
                    ->first();

                $wAllTimeSales = DB::table('payments')
                    ->where('payments.company_id', $companyId)
                    ->where('payments.worker_id', $bw->id)
                    ->sum('payment_amount');

                $wMonthSales = DB::table('payments')
                    ->where('payments.company_id', $companyId)
                    ->where('payments.worker_id', $bw->id)
                    ->whereMonth('payment_date', Carbon::now()->month)
                    ->whereYear('payment_date', Carbon::now()->year)
                    ->sum('payment_amount');

                $wTodaySales = DB::table('payments')
                    ->where('payments.company_id', $companyId)
                    ->where('payments.worker_id', $bw->id)
                    ->whereDate('payment_date', Carbon::today())
                    ->sum('payment_amount');

                $wTransactions = DB::table('payments')
                    ->where('payments.company_id', $companyId)
                    ->where('payments.worker_id', $bw->id)
                    ->count();

                $workersPerformanceList[] = [
                    'id' => $bw->id,
                    'name' => $bw->name,
                    'email' => $bw->email,
                    'phone' => $bw->phone,
                    'status' => $bw->status ?? 'active',
                    'total_customers' => (int)($wCustomers->total_customers ?? 0),
                    'active_customers' => (int)($wCustomers->active_customers ?? 0),
                    'completed_customers' => (int)($wCustomers->completed_customers ?? 0),
                    'all_time_sales' => (float)($wAllTimeSales ?? 0),
                    'this_month_sales' => (float)($wMonthSales ?? 0),
                    'today_sales' => (float)($wTodaySales ?? 0),
                    'transactions' => (int)$wTransactions,
                ];
            }

            // 8. Performance Score for Manager (0-100)
            $totalCust = (int)($customerMetrics->total_customers ?? 0);
            $retentionRate = $totalCust > 0
                ? (($customerMetrics->active_customers ?? 0) / $totalCust) * 100
                : 0;
            $retentionScore = ($retentionRate / 100) * 25;

            $completionRate = $totalCust > 0
                ? (($customerMetrics->completed_customers ?? 0) / $totalCust) * 100
                : 0;
            $completionScore = ($completionRate / 100) * 25;

            $monthlySales = (float)($thisMonthStats->total_sales ?? 0);
            $salesScore = min(30, ($monthlySales / 5000) * 30);

            $activeWorkersCount = count(array_filter($workersPerformanceList, fn($w) => $w['this_month_sales'] > 0 || $w['total_customers'] > 0));
            $totalWorkersCount = count($branchWorkers);
            $teamScore = $totalWorkersCount > 0 ? ($activeWorkersCount / $totalWorkersCount) * 20 : 15;

            $performanceScore = min(100, round($salesScore + $retentionScore + $completionScore + $teamScore));

            // 9. Recent Branch Activity
            $recentActivity = DB::table('payments')
                ->join('customers', 'payments.customer_id', '=', 'customers.id')
                ->leftJoin('users as collector', 'payments.worker_id', '=', 'collector.id')
                ->where('payments.company_id', $companyId)
                ->where(function($q) use ($branchId, $allStaffIds) {
                    if ($branchId) {
                        $q->where('payments.branch_id', $branchId)
                          ->orWhereIn('payments.worker_id', $allStaffIds);
                    } else {
                        $q->whereIn('payments.worker_id', $allStaffIds);
                    }
                })
                ->orderBy('payments.payment_date', 'desc')
                ->orderBy('payments.created_at', 'desc')
                ->limit(15)
                ->select(
                    'payments.payment_date',
                    'customers.name as customer_name',
                    'collector.name as collector_name',
                    'payments.payment_amount as amount_paid',
                    'payments.boxes_filled as boxes_checked'
                )
                ->get();

            return response()->json([
                'is_manager' => true,
                'worker' => [
                    'id' => $worker->id,
                    'name' => $worker->name,
                    'email' => $worker->email,
                    'phone' => $worker->phone,
                    'role' => $worker->getRoleNames()->first() ?? 'manager',
                    'branch' => $worker->branch ? $worker->branch->name : 'All Branches',
                    'branch_id' => $worker->branch_id,
                    'total_workers' => count($branchWorkers),
                    'joined_date' => $worker->created_at ? $worker->created_at->format('Y-m-d') : null,
                ],
                'sales_metrics' => [
                    'all_time' => [
                        'total_sales' => (float)($allTimeStats->total_sales ?? 0),
                        'total_transactions' => (int)($allTimeStats->total_transactions ?? 0),
                        'avg_transaction' => (float)($allTimeStats->avg_transaction ?? 0),
                    ],
                    'this_month' => [
                        'total_sales' => (float)($thisMonthStats->total_sales ?? 0),
                        'customers_paid' => (int)($thisMonthStats->customers_paid ?? 0),
                        'transactions' => (int)($thisMonthStats->transactions ?? 0),
                    ],
                    'this_week' => [
                        'total_sales' => (float)($thisWeekStats->total_sales ?? 0),
                        'transactions' => (int)($thisWeekStats->transactions ?? 0),
                    ],
                    'today' => [
                        'total_sales' => (float)($todayStats->total_sales ?? 0),
                        'transactions' => (int)($todayStats->transactions ?? 0),
                    ],
                ],
                'customer_metrics' => [
                    'total_customers' => (int)($customerMetrics->total_customers ?? 0),
                    'active_customers' => (int)($customerMetrics->active_customers ?? 0),
                    'completed_customers' => (int)($customerMetrics->completed_customers ?? 0),
                    'retention_rate' => round($retentionRate, 2),
                    'completion_rate' => round($completionRate, 2),
                ],
                'workers' => $workersPerformanceList,
                'performance_score' => $performanceScore,
                'score_breakdown' => [
                    'sales_volume' => round($salesScore, 2),
                    'transaction_frequency' => round($teamScore, 2),
                    'customer_retention' => round($retentionScore, 2),
                    'completion_rate' => round($completionScore, 2),
                ],
                'recent_activity' => $recentActivity,
            ]);
        }
        
        // Individual Worker Performance
        $allTimeStats = DB::table('payments')
            ->where('payments.company_id', $companyId)
            ->where('payments.worker_id', $workerId)
            ->select(
                DB::raw('SUM(payments.payment_amount) as total_sales'),
                DB::raw('COUNT(DISTINCT payments.customer_id) as total_customers'),
                DB::raw('COUNT(payments.id) as total_transactions'),
                DB::raw('AVG(payments.payment_amount) as avg_transaction')
            )
            ->first();
        
        // Get this month stats
        $thisMonthStats = DB::table('payments')
            ->where('payments.company_id', $companyId)
            ->where('payments.worker_id', $workerId)
            ->whereMonth('payments.payment_date', Carbon::now()->month)
            ->whereYear('payments.payment_date', Carbon::now()->year)
            ->select(
                DB::raw('SUM(payments.payment_amount) as total_sales'),
                DB::raw('COUNT(DISTINCT payments.customer_id) as customers_paid'),
                DB::raw('COUNT(payments.id) as transactions')
            )
            ->first();
        
        // Get this week stats
        $thisWeekStats = DB::table('payments')
            ->where('payments.company_id', $companyId)
            ->where('payments.worker_id', $workerId)
            ->whereBetween('payments.payment_date', [
                Carbon::now()->startOfWeek(),
                Carbon::now()->endOfWeek()
            ])
            ->select(
                DB::raw('SUM(payments.payment_amount) as total_sales'),
                DB::raw('COUNT(payments.id) as transactions')
            )
            ->first();

        // Get today stats
        $todayStats = DB::table('payments')
            ->where('payments.company_id', $companyId)
            ->where('payments.worker_id', $workerId)
            ->whereDate('payments.payment_date', Carbon::today())
            ->select(
                DB::raw('SUM(payments.payment_amount) as total_sales'),
                DB::raw('COUNT(payments.id) as transactions')
            )
            ->first();
        
        // Get customer metrics
        $customerMetrics = DB::table('customers')
            ->leftJoin('customer_cards', 'customers.id', '=', 'customer_cards.customer_id')
            ->where('customers.company_id', $companyId)
            ->where('customers.worker_id', $workerId)
            ->select(
                DB::raw('COUNT(DISTINCT customers.id) as total_customers'),
                DB::raw('COUNT(DISTINCT CASE WHEN customer_cards.status = "active" THEN customers.id END) as active_customers'),
                DB::raw('COUNT(DISTINCT CASE WHEN customer_cards.status = "completed" THEN customers.id END) as completed_customers')
            )
            ->first();
        
        // Calculate performance score (0-100)
        $branchTotalSales = DB::table('payments')
            ->where('payments.company_id', $companyId)
            ->where('payments.branch_id', $worker->branch_id)
            ->whereMonth('payments.payment_date', Carbon::now()->month)
            ->whereYear('payments.payment_date', Carbon::now()->year)
            ->sum('payments.payment_amount');
            
        $workerCount = User::where('branch_id', $worker->branch_id)->count();
        $avgWorkerSales = $workerCount > 0 ? $branchTotalSales / $workerCount : 1;
        
        $salesScore = $avgWorkerSales > 0 
            ? min(40, (($thisMonthStats->total_sales ?? 0) / $avgWorkerSales) * 30)
            : 0;
        
        $retentionRate = ($customerMetrics->total_customers ?? 0) > 0
            ? (($customerMetrics->active_customers ?? 0) / $customerMetrics->total_customers) * 100
            : 0;
        
        $retentionScore = ($retentionRate / 100) * 20;
        
        $completionRate = ($customerMetrics->total_customers ?? 0) > 0
            ? (($customerMetrics->completed_customers ?? 0) / $customerMetrics->total_customers) * 100
            : 0;
        
        $completionScore = ($completionRate / 100) * 20;
        
        $transactionScore = min(20, (($thisMonthStats->transactions ?? 0) / 30) * 20);
        
        $performanceScore = round($salesScore + $retentionScore + $completionScore + $transactionScore);
        
        // Get recent activity (last 15 payments recorded by this user)
        $recentActivity = DB::table('payments')
            ->join('customers', 'payments.customer_id', '=', 'customers.id')
            ->where('payments.company_id', $companyId)
            ->where('payments.worker_id', $workerId)
            ->orderBy('payments.payment_date', 'desc')
            ->orderBy('payments.created_at', 'desc')
            ->limit(15)
            ->select(
                'payments.payment_date',
                'customers.name as customer_name',
                'payments.payment_amount as amount_paid',
                'payments.boxes_filled as boxes_checked'
            )
            ->get();
        
        return response()->json([
            'is_manager' => false,
            'worker' => [
                'id' => $worker->id,
                'name' => $worker->name,
                'email' => $worker->email,
                'phone' => $worker->phone,
                'role' => $worker->getRoleNames()->first() ?? 'worker',
                'branch' => $worker->branch ? $worker->branch->name : null,
                'joined_date' => $worker->created_at ? $worker->created_at->format('Y-m-d') : null,
            ],
            'sales_metrics' => [
                'all_time' => [
                    'total_sales' => (float)($allTimeStats->total_sales ?? 0),
                    'total_transactions' => (int)($allTimeStats->total_transactions ?? 0),
                    'avg_transaction' => (float)($allTimeStats->avg_transaction ?? 0),
                ],
                'this_month' => [
                    'total_sales' => (float)($thisMonthStats->total_sales ?? 0),
                    'customers_paid' => (int)($thisMonthStats->customers_paid ?? 0),
                    'transactions' => (int)($thisMonthStats->transactions ?? 0),
                ],
                'this_week' => [
                    'total_sales' => (float)($thisWeekStats->total_sales ?? 0),
                    'transactions' => (int)($thisWeekStats->transactions ?? 0),
                ],
                'today' => [
                    'total_sales' => (float)($todayStats->total_sales ?? 0),
                    'transactions' => (int)($todayStats->transactions ?? 0),
                ],
            ],
            'customer_metrics' => [
                'total_customers' => (int)($customerMetrics->total_customers ?? 0),
                'active_customers' => (int)($customerMetrics->active_customers ?? 0),
                'completed_customers' => (int)($customerMetrics->completed_customers ?? 0),
                'retention_rate' => round($retentionRate, 2),
                'completion_rate' => round($completionRate, 2),
            ],
            'performance_score' => $performanceScore,
            'score_breakdown' => [
                'sales_volume' => round($salesScore, 2),
                'transaction_frequency' => round($transactionScore, 2),
                'customer_retention' => round($retentionScore, 2),
                'completion_rate' => round($completionScore, 2),
            ],
            'recent_activity' => $recentActivity,
        ]);
    }
}
