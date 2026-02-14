<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use App\Models\Payment;
use App\Models\Customer;
use App\Models\User;
use App\Models\StockItem;
use App\Models\LedgerEntry;
use App\Models\AuditLog;

class EnhancedReportControllerOptimized extends Controller
{
    protected $cacheDuration = 3600; // 1 hour cache for reports

    /**
     * Get profitability analysis with caching
     */
    public function profitabilityAnalysis(Request $request)
    {
        $user = $request->user();
        $companyId = $user->company_id;
        $startDate = $request->get('start_date', now()->startOfMonth());
        $endDate = $request->get('end_date', now()->endOfMonth());

        $cacheKey = "profitability:{$companyId}:{$startDate}:{$endDate}";

        return Cache::remember($cacheKey, $this->cacheDuration, function () use ($startDate, $endDate, $companyId) {
            // Single optimized query for revenue and expenses
            $financial = Payment::where('company_id', $companyId)
                ->whereBetween('payment_date', [$startDate, $endDate])
                ->selectRaw('
                    SUM(payment_amount) as total_revenue,
                    COUNT(*) as transaction_count
                ')
                ->first();

            $expenses = LedgerEntry::where('company_id', $companyId)
                ->where('type', 'expense')
                ->whereBetween('date', [$startDate, $endDate])
                ->selectRaw('
                    SUM(amount) as total_expenses,
                    entry_type,
                    COUNT(*) as count
                ')
                ->groupBy('entry_type')
                ->get();

            $totalRevenue = (float)($financial->total_revenue ?? 0);
            $totalExpenses = (float)($expenses->sum('total_expenses') ?? 0);
            $profit = $totalRevenue - $totalExpenses;
            $profitMargin = $totalRevenue > 0 ? round(($profit / $totalRevenue) * 100, 2) : 0;

            return [
                'total_revenue' => $totalRevenue,
                'total_expenses' => $totalExpenses,
                'profit' => $profit,
                'profit_margin' => $profitMargin,
                'transaction_count' => $financial->transaction_count ?? 0,
                'expense_breakdown' => $expenses->map(fn($e) => [
                    'category' => $e->entry_type,
                    'amount' => (float)$e->total_expenses,
                    'count' => $e->count,
                ])->values(),
            ];
        });
    }

    /**
     * Get customer performance report with eager loading
     */
    public function customerPerformance(Request $request)
    {
        $user = $request->user();
        $companyId = $user->company_id;
        $startDate = $request->get('start_date', now()->startOfMonth());
        $endDate = $request->get('end_date', now()->endOfMonth());

        $cacheKey = "customer_perf:{$companyId}:{$startDate}:{$endDate}";

        return Cache::remember($cacheKey, $this->cacheDuration, function () use ($startDate, $endDate, $companyId) {
            // Get status distribution with single query
            $statusDistribution = Customer::where('company_id', $companyId)
                ->selectRaw('status, COUNT(*) as count')
                ->groupBy('status')
                ->get();

            // Get top customers with payment totals
            $topCustomers = Customer::where('company_id', $companyId)
                ->selectRaw('
                    customers.id,
                    customers.name,
                    customers.status,
                    COALESCE(SUM(p.payment_amount), 0) as total_paid,
                    customers.total_balance as outstanding
                ')
                ->leftJoin('payments as p', function ($join) use ($startDate, $endDate) {
                    $join->on('customers.id', '=', 'p.customer_id')
                        ->whereBetween('p.payment_date', [$startDate, $endDate]);
                })
                ->groupBy('customers.id', 'customers.name', 'customers.status', 'customers.total_balance')
                ->orderByDesc('total_paid')
                ->limit(10)
                ->get();

            // Get customers by worker (optimized)
            $customersByWorker = User::where('company_id', $companyId)
                ->whereHas('roles', fn($q) => $q->where('name', 'worker'))
                ->selectRaw('
                    users.id,
                    users.name,
                    COUNT(DISTINCT c.id) as customer_count,
                    COUNT(DISTINCT p.id) as payment_count,
                    COALESCE(SUM(p.payment_amount), 0) as total_revenue
                ')
                ->leftJoin('customers as c', 'users.id', '=', 'c.worker_id')
                ->leftJoin('payments as p', function ($join) use ($startDate, $endDate) {
                    $join->on('users.id', '=', 'p.recorded_by')
                        ->whereBetween('p.payment_date', [$startDate, $endDate]);
                })
                ->groupBy('users.id', 'users.name')
                ->get();

            return [
                'status_distribution' => $statusDistribution->map(fn($s) => [
                    'status' => $s->status,
                    'count' => $s->count,
                ])->keyBy('status'),
                'top_customers' => $topCustomers->map(fn($c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'status' => $c->status,
                    'total_paid' => (float)$c->total_paid,
                    'outstanding' => (float)$c->outstanding,
                ]),
                'customers_by_worker' => $customersByWorker->map(fn($w) => [
                    'worker_id' => $w->id,
                    'worker' => $w->name,
                    'customer_count' => (int)$w->customer_count,
                    'payment_count' => (int)$w->payment_count,
                    'total_revenue' => (float)$w->total_revenue,
                ]),
            ];
        });
    }

    /**
     * Get worker productivity report (optimized aggregation)
     */
    public function workerProductivity(Request $request)
    {
        $user = $request->user();
        $companyId = $user->company_id;
        $startDate = $request->get('start_date', now()->startOfMonth());
        $endDate = $request->get('end_date', now()->endOfMonth());

        $cacheKey = "worker_prod:{$companyId}:{$startDate}:{$endDate}";

        return Cache::remember($cacheKey, $this->cacheDuration, function () use ($startDate, $endDate, $companyId) {
            return User::where('company_id', $companyId)
                ->whereHas('roles', fn($q) => $q->where('name', 'worker'))
                ->selectRaw('
                    users.id,
                    users.name,
                    COUNT(DISTINCT c.id) as customer_count,
                    COUNT(DISTINCT p.id) as payment_count,
                    COALESCE(SUM(p.payment_amount), 0) as total_revenue,
                    COUNT(DISTINCT CASE WHEN c.status = "completed" THEN c.id END) as completed_count,
                    COUNT(DISTINCT CASE WHEN c.status = "defaulting" THEN c.id END) as defaulting_count
                ')
                ->leftJoin('customers as c', 'users.id', '=', 'c.worker_id')
                ->leftJoin('payments as p', function ($join) use ($startDate, $endDate) {
                    $join->on('users.id', '=', 'p.recorded_by')
                        ->whereBetween('p.payment_date', [$startDate, $endDate]);
                })
                ->groupBy('users.id', 'users.name')
                ->orderByDesc('total_revenue')
                ->get()
                ->map(function ($worker) {
                    $completionRate = $worker->customer_count > 0
                        ? round(($worker->completed_count / $worker->customer_count) * 100, 2)
                        : 0;

                    return [
                        'worker_id' => $worker->id,
                        'worker_name' => $worker->name,
                        'customer_count' => (int)$worker->customer_count,
                        'payment_count' => (int)$worker->payment_count,
                        'total_revenue' => (float)$worker->total_revenue,
                        'completion_rate' => $completionRate,
                        'completed_count' => (int)$worker->completed_count,
                        'defaulting_count' => (int)$worker->defaulting_count,
                    ];
                });
        });
    }

    /**
     * Get inventory status report (optimized)
     */
    public function inventoryStatus(Request $request)
    {
        $user = $request->user();
        $companyId = $user->company_id;

        $cacheKey = "inventory:{$companyId}";

        return Cache::remember($cacheKey, 300, function () use ($companyId) {
            $items = StockItem::where('company_id', $companyId)
                ->select('id', 'name', 'sku', 'quantity', 'minimum_level', 'unit_price')
                ->get();

            $lowStockCount = $items->filter(fn($i) => $i->quantity < $i->minimum_level)->count();
            $totalValue = $items->sum(fn($i) => $i->quantity * $i->unit_price);

            return [
                'total_items' => $items->count(),
                'low_stock_count' => $lowStockCount,
                'total_value' => (float)$totalValue,
                'items' => $items->map(fn($item) => [
                    'id' => $item->id,
                    'name' => $item->name,
                    'sku' => $item->sku,
                    'quantity' => $item->quantity,
                    'status' => $item->quantity < $item->minimum_level ? 'low' : 'adequate',
                    'value' => (float)($item->quantity * $item->unit_price),
                ]),
            ];
        });
    }

    /**
     * Get ledger report (optimized)
     */
    public function ledgerReport(Request $request)
    {
        $user = $request->user();
        $companyId = $user->company_id;
        $startDate = $request->get('start_date', now()->startOfMonth());
        $endDate = $request->get('end_date', now()->endOfMonth());

        $cacheKey = "ledger:{$companyId}:{$startDate}:{$endDate}";

        return Cache::remember($cacheKey, $this->cacheDuration, function () use ($startDate, $endDate, $companyId) {
            $entries = LedgerEntry::where('company_id', $companyId)
                ->whereBetween('date', [$startDate, $endDate])
                ->select('id', 'date', 'description', 'type', 'amount', 'entry_type')
                ->orderBy('date')
                ->get();

            $totals = $entries->selectRaw('type')
                ->groupBy('type')
                ->sum('amount');

            return [
                'total_debit' => (float)($totals['debit'] ?? 0),
                'total_credit' => (float)($totals['credit'] ?? 0),
                'entries' => $entries->map(fn($e) => [
                    'id' => $e->id,
                    'date' => $e->date->format('Y-m-d'),
                    'description' => $e->description,
                    'type' => $e->type,
                    'amount' => (float)$e->amount,
                    'category' => $e->entry_type,
                ]),
            ];
        });
    }

    /**
     * Get audit trail (optimized with select)
     */
    public function auditTrail(Request $request)
    {
        $user = $request->user();
        $companyId = $user->company_id;
        $days = $request->get('days', 30);

        return AuditLog::where('company_id', $companyId)
            ->where('created_at', '>=', now()->subDays($days))
            ->with('user:id,name,email')
            ->select('id', 'user_id', 'action', 'model', 'model_id', 'description', 'ip_address', 'created_at')
            ->orderByDesc('created_at')
            ->paginate(50)
            ->map(fn($log) => [
                'id' => $log->id,
                'user_name' => $log->user->name ?? 'Unknown',
                'action' => $log->action,
                'model' => $log->model,
                'description' => $log->description,
                'ip_address' => $log->ip_address,
                'timestamp' => $log->created_at->format('Y-m-d H:i:s'),
            ]);
    }
}
