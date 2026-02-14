<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;

class CompanyDashboardControllerOptimized extends Controller
{
    /**
     * Get comprehensive company dashboard data with caching and optimized queries
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $company = $user->company;

        if (!$company) {
            return response()->json(['message' => 'Company not found'], 404);
        }

        // Cache dashboard for 5 minutes per company
        $cacheKey = "dashboard:{$company->id}";
        
        return response()->json(
            Cache::remember($cacheKey, 300, function () use ($company) {
                $today = Carbon::today();
                $startOfMonth = Carbon::now()->startOfMonth();
                $endOfMonth = Carbon::now()->endOfMonth();

                return [
                    'overview' => $this->getOverview($company, $today, $startOfMonth, $endOfMonth),
                    'revenue' => $this->getRevenueMetrics($company, $today, $startOfMonth, $endOfMonth),
                    'performance' => $this->getPerformanceMetrics($company, $startOfMonth, $endOfMonth),
                    'topWorkers' => $this->getTopWorkers($company, $startOfMonth, $endOfMonth),
                    'recentPayments' => $this->getRecentPayments($company),
                    'alerts' => $this->getAlerts($company),
                ];
            })
        );
    }

    /**
     * Get overview metrics with optimized queries
     */
    private function getOverview($company, $today, $startOfMonth, $endOfMonth)
    {
        // Single query using aggregates to avoid N+1
        $metrics = $company->payments()
            ->selectRaw('
                SUM(CASE WHEN DATE(payment_date) = ? THEN payment_amount ELSE 0 END) as today_revenue,
                SUM(CASE WHEN payment_date BETWEEN ? AND ? THEN payment_amount ELSE 0 END) as month_revenue,
                COUNT(DISTINCT customer_id) as total_customers,
                SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as completed_count
            ', [$today->toDateString(), $startOfMonth, $endOfMonth])
            ->first();

        // Use counter cache or separate queries for counts (more efficient than in SELECT)
        $activeCustomers = $company->customers()
            ->where('status', 'in_progress')
            ->count();

        $totalBranches = $company->branches()->count();
        $totalUsers = $company->users()->count();

        return [
            'today_revenue' => $metrics->today_revenue ?? 0,
            'month_revenue' => $metrics->month_revenue ?? 0,
            'total_customers' => $metrics->total_customers ?? 0,
            'active_customers' => $activeCustomers,
            'completion_rate' => ($metrics->total_customers ?? 0) > 0
                ? round((($metrics->total_customers - $activeCustomers) / $metrics->total_customers) * 100, 2)
                : 0,
            'total_branches' => $totalBranches,
            'total_users' => $totalUsers,
        ];
    }

    /**
     * Get revenue metrics with optimized aggregations
     */
    private function getRevenueMetrics($company, $today, $startOfMonth, $endOfMonth)
    {
        $daily = $company->payments()
            ->whereDate('payment_date', $today)
            ->count();

        $monthly = $company->payments()
            ->whereBetween('payment_date', [$startOfMonth, $endOfMonth])
            ->count();

        // Optimized: use raw SQL for aggregation
        $byMethod = $company->payments()
            ->whereBetween('payment_date', [$startOfMonth, $endOfMonth])
            ->selectRaw('payment_method, COUNT(*) as count, SUM(payment_amount) as total')
            ->groupBy('payment_method')
            ->get()
            ->map(fn($item) => [
                'method' => $item->payment_method,
                'count' => $item->count,
                'total' => $item->total,
            ]);

        return [
            'daily_transactions' => $daily,
            'monthly_transactions' => $monthly,
            'by_payment_method' => $byMethod,
        ];
    }

    /**
     * Get performance metrics with eager loading
     */
    private function getPerformanceMetrics($company, $startOfMonth, $endOfMonth)
    {
        // Eager load with withCount to avoid N+1
        $branches = $company->branches()
            ->withCount('customers')
            ->selectRaw('
                branches.*,
                COALESCE(SUM(p.payment_amount), 0) as month_revenue,
                COUNT(DISTINCT p.id) as payment_count
            ')
            ->leftJoin('payments as p', function ($join) use ($startOfMonth, $endOfMonth) {
                $join->on('branches.id', '=', 'p.branch_id')
                    ->whereBetween('p.payment_date', [$startOfMonth, $endOfMonth]);
            })
            ->groupBy('branches.id')
            ->get()
            ->map(fn($branch) => [
                'id' => $branch->id,
                'name' => $branch->name,
                'customers' => $branch->customers_count,
                'month_revenue' => (float)$branch->month_revenue,
                'payment_count' => (int)$branch->payment_count,
            ]);

        return [
            'by_branch' => $branches,
            'total_revenue_month' => $branches->sum('month_revenue'),
        ];
    }

    /**
     * Get top performing workers with optimized query
     */
    private function getTopWorkers($company, $startOfMonth, $endOfMonth)
    {
        return $company->users()
            ->whereHas('roles', fn($q) => $q->where('name', 'worker'))
            ->selectRaw('
                users.*,
                COUNT(DISTINCT c.id) as customers_count,
                COUNT(DISTINCT p.id) as payment_count,
                COALESCE(SUM(p.payment_amount), 0) as month_revenue
            ')
            ->leftJoin('customers as c', 'users.id', '=', 'c.worker_id')
            ->leftJoin('payments as p', function ($join) use ($startOfMonth, $endOfMonth) {
                $join->on('users.id', '=', 'p.recorded_by')
                    ->whereBetween('p.payment_date', [$startOfMonth, $endOfMonth]);
            })
            ->groupBy('users.id')
            ->orderByDesc('month_revenue')
            ->limit(5)
            ->get()
            ->map(fn($worker) => [
                'id' => $worker->id,
                'name' => $worker->name,
                'customers' => $worker->customers_count,
                'month_revenue' => (float)$worker->month_revenue,
                'payment_count' => (int)$worker->payment_count,
            ]);
    }

    /**
     * Get recent payments with eager loading (no N+1)
     */
    private function getRecentPayments($company, $limit = 10)
    {
        return $company->payments()
            ->with(['customer:id,name', 'worker:id,name'])
            ->select('id', 'customer_id', 'recorded_by', 'payment_amount', 'payment_date', 'payment_method')
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->map(fn($payment) => [
                'id' => $payment->id,
                'customer_name' => $payment->customer->name,
                'worker_name' => $payment->worker->name,
                'amount' => $payment->payment_amount,
                'date' => $payment->payment_date->format('Y-m-d'),
                'method' => $payment->payment_method,
            ]);
    }

    /**
     * Get system alerts with optimized queries
     */
    private function getAlerts($company)
    {
        $alerts = [];

        // Combine alert queries to minimize database hits
        $counts = $company->query()
            ->selectRaw('
                (SELECT COUNT(*) FROM customers WHERE company_id = ? AND status = "defaulting") as defaulters,
                (SELECT COUNT(*) FROM stock_items WHERE company_id = ? AND quantity < minimum_level) as low_stock
            ', [$company->id, $company->id])
            ->first();

        if ($counts->defaulters > 0) {
            $alerts[] = [
                'type' => 'warning',
                'message' => "{$counts->defaulters} customers are currently defaulting",
                'action' => 'view_defaulters',
            ];
        }

        if ($counts->low_stock > 0) {
            $alerts[] = [
                'type' => 'warning',
                'message' => "{$counts->low_stock} inventory items are below minimum level",
                'action' => 'view_inventory',
            ];
        }

        return $alerts;
    }
}
