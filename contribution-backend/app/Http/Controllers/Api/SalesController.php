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
        
        // Build base query
        $query = User::role('worker')
            ->with('branch')
            ->select('users.*');
        
        // Apply branch filtering for non-CEO users
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
        });
        
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
                    'customer_name' => $payment->customer->name,
                    'customer_phone' => $payment->customer->phone,
                    'amount' => $payment->payment_amount,
                    'boxes_filled' => $payment->boxes_filled,
                    'payment_method' => $payment->payment_method,
                    'payment_date' => $payment->payment_date->format('Y-m-d'),
                    'payment_time' => $payment->created_at->format('H:i:s'),
                    'reference_number' => $payment->reference_number,
                    'notes' => $payment->notes,
                ];
            });
        
        // Calculate summary
        $summary = [
            'total_sales' => $payments->sum('amount'),
            'customers_paid' => $payments->unique('customer_name')->count(),
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
     * Get comprehensive worker performance metrics
     */
    public function performance(Request $request, $workerId)
    {
        $user = $request->user();
        $worker = User::with('branch')->findOrFail($workerId);
        
        // Authorization check
        if ($user->hasRole('worker') && $worker->id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        if ($user->hasRole('secretary') && $worker->branch_id !== $user->branch_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        // Get all-time stats
        $allTimeStats = DB::table('payments')
            ->join('customers', 'payments.customer_id', '=', 'customers.id')
            ->where('customers.worker_id', $workerId)
            ->select(
                DB::raw('SUM(payments.payment_amount) as total_sales'),
                DB::raw('COUNT(DISTINCT customers.id) as total_customers'),
                DB::raw('COUNT(payments.id) as total_transactions'),
                DB::raw('AVG(payments.payment_amount) as avg_transaction')
            )
            ->first();
        
        // Get this month stats
        $thisMonthStats = DB::table('payments')
            ->join('customers', 'payments.customer_id', '=', 'customers.id')
            ->where('customers.worker_id', $workerId)
            ->whereMonth('payments.payment_date', Carbon::now()->month)
            ->whereYear('payments.payment_date', Carbon::now()->year)
            ->select(
                DB::raw('SUM(payments.payment_amount) as total_sales'),
                DB::raw('COUNT(DISTINCT customers.id) as customers_paid'),
                DB::raw('COUNT(payments.id) as transactions')
            )
            ->first();
        
        // Get this week stats
        $thisWeekStats = DB::table('payments')
            ->join('customers', 'payments.customer_id', '=', 'customers.id')
            ->where('customers.worker_id', $workerId)
            ->whereBetween('payments.payment_date', [
                Carbon::now()->startOfWeek(),
                Carbon::now()->endOfWeek()
            ])
            ->select(
                DB::raw('SUM(payments.payment_amount) as total_sales'),
                DB::raw('COUNT(payments.id) as transactions')
            )
            ->first();
        
        // Get customer metrics
        $customerMetrics = DB::table('customers')
            ->leftJoin('customer_cards', 'customers.id', '=', 'customer_cards.customer_id')
            ->where('customers.worker_id', $workerId)
            ->select(
                DB::raw('COUNT(DISTINCT customers.id) as total_customers'),
                DB::raw('COUNT(DISTINCT CASE WHEN customer_cards.status = "active" THEN customers.id END) as active_customers'),
                DB::raw('COUNT(DISTINCT CASE WHEN customer_cards.status = "completed" THEN customers.id END) as completed_customers')
            )
            ->first();
        
        // Calculate performance score (0-100)
        
        // 1. Sales Score (40 points max)
        // Compare against branch average total sales per worker
        $branchTotalSales = DB::table('payments')
            ->join('customers', 'payments.customer_id', '=', 'customers.id')
            ->where('customers.branch_id', $worker->branch_id)
            ->whereMonth('payments.payment_date', Carbon::now()->month)
            ->whereYear('payments.payment_date', Carbon::now()->year)
            ->sum('payments.payment_amount');
            
        $workerCount = User::role('worker')->where('branch_id', $worker->branch_id)->count();
        $avgWorkerSales = $workerCount > 0 ? $branchTotalSales / $workerCount : 1;
        
        // If they match the average, they get 30/40 (75%). To get 40/40, they need ~1.3x average.
        $salesScore = $avgWorkerSales > 0 
            ? min(40, (($thisMonthStats->total_sales ?? 0) / $avgWorkerSales) * 30)
            : 0;
        
        $retentionRate = $customerMetrics->total_customers > 0
            ? ($customerMetrics->active_customers / $customerMetrics->total_customers) * 100
            : 0;
        
        $retentionScore = ($retentionRate / 100) * 20;
        
        $completionRate = $customerMetrics->total_customers > 0
            ? ($customerMetrics->completed_customers / $customerMetrics->total_customers) * 100
            : 0;
        
        $completionScore = ($completionRate / 100) * 20;
        
        $transactionScore = min(20, (($thisMonthStats->transactions ?? 0) / 30) * 20);
        
        $performanceScore = round($salesScore + $retentionScore + $completionScore + $transactionScore);
        
        // Get recent activity (last 10 payments)
        $recentActivity = DB::table('payments')
            ->join('customers', 'payments.customer_id', '=', 'customers.id')
            ->where('customers.worker_id', $workerId)
            ->orderBy('payments.payment_date', 'desc')
            ->orderBy('payments.created_at', 'desc')
            ->limit(10)
            ->select(
                'payments.payment_date',
                'customers.name as customer_name',
                'payments.payment_amount as amount_paid',
                'payments.boxes_filled as boxes_checked'
            )
            ->get();
        
        return response()->json([
            'worker' => [
                'id' => $worker->id,
                'name' => $worker->name,
                'email' => $worker->email,
                'role' => $worker->getRoleNames()->first(),
                'branch' => $worker->branch ? $worker->branch->name : null,
                'joined_date' => $worker->created_at->format('Y-m-d'),
            ],
            'sales_metrics' => [
                'all_time' => [
                    'total_sales' => $allTimeStats->total_sales ?? 0,
                    'total_transactions' => $allTimeStats->total_transactions ?? 0,
                    'avg_transaction' => $allTimeStats->avg_transaction ?? 0,
                ],
                'this_month' => [
                    'total_sales' => $thisMonthStats->total_sales ?? 0,
                    'customers_paid' => $thisMonthStats->customers_paid ?? 0,
                    'transactions' => $thisMonthStats->transactions ?? 0,
                ],
                'this_week' => [
                    'total_sales' => $thisWeekStats->total_sales ?? 0,
                    'transactions' => $thisWeekStats->transactions ?? 0,
                ],
            ],
            'customer_metrics' => [
                'total_customers' => $customerMetrics->total_customers ?? 0,
                'active_customers' => $customerMetrics->active_customers ?? 0,
                'completed_customers' => $customerMetrics->completed_customers ?? 0,
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
