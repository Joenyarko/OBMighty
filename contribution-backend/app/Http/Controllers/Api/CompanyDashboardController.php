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
        try {
            $user = $request->user();
            $company = $user->company;

            if (!$company) {
                return response()->json(['message' => 'Company not found'], 404);
            }

            // Ensure the global scope has the correct company_id
            // This is critical when middleware fallback paths skip setting it
            config(['app.company_id' => $company->id]);

            $today = Carbon::today();
            $startOfMonth = Carbon::now()->startOfMonth();
            $endOfMonth = Carbon::now()->endOfMonth();

            $companyTotal = \App\Models\CompanyDailyTotal::where('date', $today)->first();

            return response()->json([
                'overview' => $this->getOverview($company, $today, $startOfMonth, $endOfMonth),
                'company_total' => $companyTotal,
                'revenue' => $this->getRevenueMetrics($company, $today, $startOfMonth, $endOfMonth),
                'performance' => $this->getPerformanceMetrics($company, $startOfMonth, $endOfMonth),
                'topWorkers' => $this->getTopWorkers($company, $startOfMonth, $endOfMonth),
                'recentPayments' => $this->getRecentPayments($company),
                'alerts' => $this->getAlerts($company),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Dashboard error: ' . $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ], 500);
        }
    }

    /**
     * Get overview metrics
     */
    private function getOverview($company, $today, $startOfMonth, $endOfMonth)
    {
        // Use direct model queries — the BelongsToCompany global scope
        // already filters by company_id (set at the top of index()).
        // This avoids the hasMany + global scope double-filter that can
        // conflict and return zero results.
        $todayPayments = \App\Models\Payment::whereDate('payment_date', $today)
            ->sum('payment_amount');

        $monthPayments = \App\Models\Payment::whereBetween('payment_date', [$startOfMonth, $endOfMonth])
            ->sum('payment_amount');

        $totalCustomers = \App\Models\Customer::count();
        $activeCustomers = \App\Models\Customer::where('status', 'in_progress')->count();

        $totalBranches = \App\Models\Branch::count();
        $totalCardTemplates = \App\Models\Card::count();

        $overallRevenue = \App\Models\Payment::sum('payment_amount');
        $overallExpense = \App\Models\Expense::sum('amount');
        $totalCardsIssued = \App\Models\CustomerCard::count();
        
        // Total staff includes workers, managers, and secretaries
        $totalStaff = \App\Models\User::whereHas('roles', function($q) {
            $q->whereIn('name', ['worker', 'manager', 'secretary']);
        })->count();

        return [
            'today_revenue' => $todayPayments,
            'month_revenue' => $monthPayments,
            'total_customers' => $totalCustomers,
            'active_customers' => $activeCustomers,
            'completion_rate' => $totalCustomers > 0 
                ? round((($totalCustomers - $activeCustomers) / $totalCustomers) * 100, 2)
                : 0,
            'total_branches' => $totalBranches,
            'total_users' => \App\Models\User::count(),
            'total_staff' => $totalStaff,
            'total_cards_issued' => $totalCardsIssued,
            'total_card_templates' => $totalCardTemplates,
            'overall_revenue' => round($overallRevenue, 2),
            'overall_expense' => round($overallExpense, 2),
            'overall_profit' => round($overallRevenue - $overallExpense, 2),
        ];
    }

    /**
     * Get revenue metrics
     */
    private function getRevenueMetrics($company, $today, $startOfMonth, $endOfMonth)
    {
        $daily = \App\Models\Payment::whereDate('payment_date', $today)->count();

        $monthly = \App\Models\Payment::whereBetween('payment_date', [$startOfMonth, $endOfMonth])->count();

        $byMethod = \App\Models\Payment::whereBetween('payment_date', [$startOfMonth, $endOfMonth])
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
        $today = Carbon::today();
        $startOfWeek = Carbon::now()->startOfWeek();

        $branches = \App\Models\Branch::all()
            ->map(function ($branch) use ($startOfMonth, $endOfMonth, $today, $startOfWeek) {
                $monthRevenue = \App\Models\Payment::where('branch_id', $branch->id)
                    ->whereBetween('payment_date', [$startOfMonth, $endOfMonth])
                    ->sum('payment_amount');

                $todayRevenue = \App\Models\Payment::where('branch_id', $branch->id)
                    ->whereDate('payment_date', $today)
                    ->sum('payment_amount');

                $weekRevenue = \App\Models\Payment::where('branch_id', $branch->id)
                    ->whereBetween('payment_date', [$startOfWeek, $today])
                    ->sum('payment_amount');

                $todayPayments = \App\Models\Payment::where('branch_id', $branch->id)
                    ->whereDate('payment_date', $today)
                    ->count();

                $totalCustomers = \App\Models\Customer::where('branch_id', $branch->id)->count();

                // Active workers in this branch
                $activeWorkers = \App\Models\User::where('branch_id', $branch->id)
                    ->whereHas('roles', function ($q) {
                        $q->where('name', 'worker');
                    })
                    ->where('is_active', true)
                    ->count();

                // Active customers (in_progress status)
                $activeCustomers = \App\Models\Customer::where('branch_id', $branch->id)
                    ->where('status', 'in_progress')
                    ->count();

                $totalPayments = \App\Models\Payment::where('branch_id', $branch->id)->count();

                return [
                    'id' => $branch->id,
                    'name' => $branch->name,
                    'customers' => $totalCustomers,
                    'active_customers' => $activeCustomers,
                    'month_revenue' => round($monthRevenue, 2),
                    'today_revenue' => round($todayRevenue, 2),
                    'week_revenue' => round($weekRevenue, 2),
                    'payment_count' => $totalPayments,
                    'today_payments' => $todayPayments,
                    'active_workers' => $activeWorkers,
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
        return \App\Models\User::whereHas('roles', function ($q) {
                $q->where('name', 'worker');
            })
            ->get()
            ->map(function ($worker) use ($startOfMonth, $endOfMonth) {
                $monthRevenue = \App\Models\Payment::where('worker_id', $worker->id)
                    ->whereBetween('payment_date', [$startOfMonth, $endOfMonth])
                    ->sum('payment_amount');

                $customersCount = \App\Models\Customer::where('worker_id', $worker->id)->count();
                $paymentsCount = \App\Models\Payment::where('worker_id', $worker->id)->count();

                return [
                    'id' => $worker->id,
                    'name' => $worker->name,
                    'customers' => $customersCount,
                    'month_revenue' => $monthRevenue,
                    'payment_count' => $paymentsCount,
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
        return \App\Models\Payment::with(['customer', 'worker'])
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->map(function ($payment) {
                return [
                    'id' => $payment->id,
                    'customer_name' => $payment->customer?->name ?? 'Deleted Customer',
                    'worker_name' => $payment->worker?->name ?? 'Deleted Worker',
                    'amount' => $payment->payment_amount,
                    'date' => $payment->payment_date?->format('Y-m-d') ?? 'N/A',
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

        try {
            // Check for defaulting customers
            $defaulters = \App\Models\Customer::where('status', 'defaulting')->count();

            if ($defaulters > 0) {
                $alerts[] = [
                    'type' => 'warning',
                    'message' => "$defaulters customers are currently defaulting",
                    'action' => 'view_defaulters',
                ];
            }

            // Check for low inventory
            $lowStock = \App\Models\StockItem::whereRaw('quantity <= reorder_level')->count();

            if ($lowStock > 0) {
                $alerts[] = [
                    'type' => 'warning',
                    'message' => "$lowStock inventory items are below reorder level",
                    'action' => 'view_inventory',
                ];
            }
        } catch (\Exception $e) {
            // Don't let alerts crash the dashboard
        }

        return $alerts;
    }
}

