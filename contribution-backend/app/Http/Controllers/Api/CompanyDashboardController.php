<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Carbon\Carbon;

class CompanyDashboardController extends Controller
{
    /**
     * Get comprehensive company dashboard data
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $company = $user->company;

        if (!$company) {
            return response()->json(['message' => 'Company not found'], 404);
        }

        $today = Carbon::today();
        $startOfMonth = Carbon::now()->startOfMonth();
        $endOfMonth = Carbon::now()->endOfMonth();

        return response()->json([
            'overview' => $this->getOverview($company, $today, $startOfMonth, $endOfMonth),
            'revenue' => $this->getRevenueMetrics($company, $today, $startOfMonth, $endOfMonth),
            'performance' => $this->getPerformanceMetrics($company, $startOfMonth, $endOfMonth),
            'topWorkers' => $this->getTopWorkers($company, $startOfMonth, $endOfMonth),
            'recentPayments' => $this->getRecentPayments($company),
            'alerts' => $this->getAlerts($company),
        ]);
    }

    /**
     * Get overview metrics
     */
    private function getOverview($company, $today, $startOfMonth, $endOfMonth)
    {
        $todayPayments = $company->payments()
            ->whereDate('payment_date', $today)
            ->sum('payment_amount');

        $monthPayments = $company->payments()
            ->whereBetween('payment_date', [$startOfMonth, $endOfMonth])
            ->sum('payment_amount');

        $totalCustomers = $company->customers()->count();
        $activeCustomers = $company->customers()
            ->where('status', 'in_progress')
            ->count();

        $totalBranches = $company->branches()->count();

        return [
            'today_revenue' => $todayPayments,
            'month_revenue' => $monthPayments,
            'total_customers' => $totalCustomers,
            'active_customers' => $activeCustomers,
            'completion_rate' => $totalCustomers > 0 
                ? round((($totalCustomers - $activeCustomers) / $totalCustomers) * 100, 2)
                : 0,
            'total_branches' => $totalBranches,
            'total_users' => $company->users()->count(),
        ];
    }

    /**
     * Get revenue metrics
     */
    private function getRevenueMetrics($company, $today, $startOfMonth, $endOfMonth)
    {
        $daily = $company->payments()
            ->whereDate('payment_date', $today)
            ->count();

        $monthly = $company->payments()
            ->whereBetween('payment_date', [$startOfMonth, $endOfMonth])
            ->count();

        $byMethod = $company->payments()
            ->whereBetween('payment_date', [$startOfMonth, $endOfMonth])
            ->selectRaw('payment_method, COUNT(*) as count, SUM(payment_amount) as total')
            ->groupBy('payment_method')
            ->get();

        return [
            'daily_transactions' => $daily,
            'monthly_transactions' => $monthly,
            'by_payment_method' => $byMethod->map(function ($item) {
                return [
                    'method' => $item->payment_method,
                    'count' => $item->count,
                    'total' => $item->total,
                ];
            }),
        ];
    }

    /**
     * Get performance metrics
     */
    private function getPerformanceMetrics($company, $startOfMonth, $endOfMonth)
    {
        $branches = $company->branches()
            ->withCount(['customers', 'payments'])
            ->get()
            ->map(function ($branch) use ($startOfMonth, $endOfMonth) {
                $monthRevenue = $branch->payments()
                    ->whereBetween('payment_date', [$startOfMonth, $endOfMonth])
                    ->sum('payment_amount');

                return [
                    'id' => $branch->id,
                    'name' => $branch->name,
                    'customers' => $branch->customers_count,
                    'month_revenue' => $monthRevenue,
                    'payment_count' => $branch->payments_count,
                ];
            });

        return [
            'by_branch' => $branches,
            'total_revenue_month' => $branches->sum('month_revenue'),
        ];
    }

    /**
     * Get top performing workers
     */
    private function getTopWorkers($company, $startOfMonth, $endOfMonth)
    {
        return $company->users()
            ->whereHas('roles', function ($q) {
                $q->where('name', 'worker');
            })
            ->withCount(['customers', 'payments'])
            ->with(['payments' => function ($q) use ($startOfMonth, $endOfMonth) {
                $q->whereBetween('payment_date', [$startOfMonth, $endOfMonth]);
            }])
            ->get()
            ->map(function ($worker) {
                $monthRevenue = $worker->payments
                    ->whereBetween('payment_date', [Carbon::now()->startOfMonth(), Carbon::now()->endOfMonth()])
                    ->sum('payment_amount');

                return [
                    'id' => $worker->id,
                    'name' => $worker->name,
                    'customers' => $worker->customers_count,
                    'month_revenue' => $monthRevenue,
                    'payment_count' => $worker->payments_count,
                ];
            })
            ->sortByDesc('month_revenue')
            ->take(5)
            ->values();
    }

    /**
     * Get recent payments
     */
    private function getRecentPayments($company, $limit = 10)
    {
        return $company->payments()
            ->with(['customer', 'worker'])
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->map(function ($payment) {
                return [
                    'id' => $payment->id,
                    'customer_name' => $payment->customer->name,
                    'worker_name' => $payment->worker->name,
                    'amount' => $payment->payment_amount,
                    'date' => $payment->payment_date->format('Y-m-d'),
                    'method' => $payment->payment_method,
                ];
            });
    }

    /**
     * Get system alerts
     */
    private function getAlerts($company)
    {
        $alerts = [];

        // Check for defaulting customers
        $defaulters = $company->customers()
            ->where('status', 'defaulting')
            ->count();

        if ($defaulters > 0) {
            $alerts[] = [
                'type' => 'warning',
                'message' => "$defaulters customers are currently defaulting",
                'action' => 'view_defaulters',
            ];
        }

        // Check for low inventory
        $lowStock = $company->stockItems()
            ->whereRaw('quantity < minimum_level')
            ->count();

        if ($lowStock > 0) {
            $alerts[] = [
                'type' => 'warning',
                'message' => "$lowStock inventory items are below minimum level",
                'action' => 'view_inventory',
            ];
        }

        return $alerts;
    }
}
