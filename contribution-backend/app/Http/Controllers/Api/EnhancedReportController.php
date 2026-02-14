<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Customer;
use App\Models\User;
use App\Models\SurplusEntry;
use App\Models\Expense;
use App\Models\LedgerEntry;
use Illuminate\Http\Request;
use Carbon\Carbon;

class EnhancedReportController extends Controller
{
    /**
     * Get profitability analysis report
     */
    public function profitabilityAnalysis(Request $request)
    {
        $user = $request->user();
        $company = $user->company;
        
        $startDate = $request->input('start_date') ? Carbon::parse($request->input('start_date')) : Carbon::now()->startOfMonth();
        $endDate = $request->input('end_date') ? Carbon::parse($request->input('end_date')) : Carbon::now()->endOfMonth();

        // Revenue
        $revenue = Payment::whereCompanyId($company->id)
            ->whereBetween('payment_date', [$startDate, $endDate])
            ->sum('payment_amount');

        // Expenses
        $expenses = Expense::whereCompanyId($company->id)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('amount');

        // Surplus allocations
        $surplusAllocated = SurplusEntry::whereCompanyId($company->id)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->where('type', 'allocation')
            ->sum('amount');

        // Calculate profit
        $profit = $revenue - $expenses - $surplusAllocated;
        $profitMargin = $revenue > 0 ? round(($profit / $revenue) * 100, 2) : 0;

        // Expense breakdown
        $expenseBreakdown = Expense::whereCompanyId($company->id)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw('category, SUM(amount) as total')
            ->groupBy('category')
            ->get();

        return response()->json([
            'period' => [
                'start' => $startDate->format('Y-m-d'),
                'end' => $endDate->format('Y-m-d'),
            ],
            'revenue' => round($revenue, 2),
            'expenses' => round($expenses, 2),
            'surplus_allocated' => round($surplusAllocated, 2),
            'profit' => round($profit, 2),
            'profit_margin' => $profitMargin,
            'expense_breakdown' => $expenseBreakdown,
        ]);
    }

    /**
     * Get customer performance report
     */
    public function customerPerformance(Request $request)
    {
        $user = $request->user();
        $company = $user->company;

        $startDate = $request->input('start_date') ? Carbon::parse($request->input('start_date')) : Carbon::now()->startOfMonth();
        $endDate = $request->input('end_date') ? Carbon::parse($request->input('end_date')) : Carbon::now()->endOfMonth();

        // Customers by status
        $byStatus = Customer::whereCompanyId($company->id)
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get();

        // Top customers by payment
        $topCustomers = Customer::whereCompanyId($company->id)
            ->with(['payments' => function ($q) use ($startDate, $endDate) {
                $q->whereBetween('payment_date', [$startDate, $endDate]);
            }])
            ->get()
            ->map(function ($customer) use ($startDate, $endDate) {
                $totalPaid = $customer->payments
                    ->whereBetween('payment_date', [$startDate, $endDate])
                    ->sum('payment_amount');
                
                return [
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'status' => $customer->status,
                    'total_paid' => $totalPaid,
                    'balance' => $customer->balance,
                    'completion' => $customer->completion_percentage,
                ];
            })
            ->sortByDesc('total_paid')
            ->take(10)
            ->values();

        // Customers by worker
        $byWorker = Customer::whereCompanyId($company->id)
            ->with('worker')
            ->selectRaw('worker_id, COUNT(*) as count')
            ->groupBy('worker_id')
            ->get();

        return response()->json([
            'by_status' => $byStatus,
            'top_customers' => $topCustomers,
            'total_customers' => Customer::whereCompanyId($company->id)->count(),
            'customers_by_worker' => $byWorker,
        ]);
    }

    /**
     * Get worker productivity report
     */
    public function workerProductivity(Request $request)
    {
        $user = $request->user();
        $company = $user->company;

        $startDate = $request->input('start_date') ? Carbon::parse($request->input('start_date')) : Carbon::now()->startOfMonth();
        $endDate = $request->input('end_date') ? Carbon::parse($request->input('end_date')) : Carbon::now()->endOfMonth();

        $workers = User::whereCompanyId($company->id)
            ->whereHas('roles', function ($q) {
                $q->where('name', 'worker');
            })
            ->with(['customers' => function ($q) {
                $q->select('id', 'worker_id', 'status', 'balance');
            }, 'payments' => function ($q) use ($startDate, $endDate) {
                $q->whereBetween('payment_date', [$startDate, $endDate]);
            }])
            ->get()
            ->map(function ($worker) use ($startDate, $endDate) {
                $totalRevenue = $worker->payments
                    ->whereBetween('payment_date', [$startDate, $endDate])
                    ->sum('payment_amount');

                $completedCustomers = $worker->customers->where('status', 'completed')->count();
                $defaultingCustomers = $worker->customers->where('status', 'defaulting')->count();

                return [
                    'id' => $worker->id,
                    'name' => $worker->name,
                    'total_customers' => $worker->customers->count(),
                    'completed' => $completedCustomers,
                    'defaulting' => $defaultingCustomers,
                    'total_revenue' => round($totalRevenue, 2),
                    'payment_count' => $worker->payments->count(),
                    'avg_transaction' => $worker->payments->count() > 0 
                        ? round($totalRevenue / $worker->payments->count(), 2)
                        : 0,
                ];
            })
            ->sortByDesc('total_revenue')
            ->values();

        return response()->json([
            'workers' => $workers,
            'period' => [
                'start' => $startDate->format('Y-m-d'),
                'end' => $endDate->format('Y-m-d'),
            ],
        ]);
    }

    /**
     * Get inventory status report
     */
    public function inventoryStatus(Request $request)
    {
        $user = $request->user();
        $company = $user->company;

        $items = $company->stockItems()
            ->with('movements')
            ->get()
            ->map(function ($item) {
                $lastMovement = $item->movements()->latest()->first();

                return [
                    'id' => $item->id,
                    'name' => $item->name,
                    'quantity' => $item->quantity,
                    'minimum_level' => $item->minimum_level,
                    'unit_price' => $item->unit_price,
                    'total_value' => $item->quantity * $item->unit_price,
                    'status' => $item->quantity < $item->minimum_level ? 'low' : 'adequate',
                    'last_updated' => $lastMovement?->created_at?->diffForHumans(),
                ];
            });

        $lowStockCount = $items->where('status', 'low')->count();
        $totalInventoryValue = $items->sum('total_value');

        return response()->json([
            'items' => $items,
            'summary' => [
                'total_items' => $items->count(),
                'low_stock' => $lowStockCount,
                'total_value' => round($totalInventoryValue, 2),
            ],
        ]);
    }

    /**
     * Get ledger (accounting) report
     */
    public function ledgerReport(Request $request)
    {
        $user = $request->user();
        $company = $user->company;

        $startDate = $request->input('start_date') ? Carbon::parse($request->input('start_date')) : Carbon::now()->startOfMonth();
        $endDate = $request->input('end_date') ? Carbon::parse($request->input('end_date')) : Carbon::now()->endOfMonth();

        $entries = LedgerEntry::whereCompanyId($company->id)
            ->whereBetween('entry_date', [$startDate, $endDate])
            ->with('user')
            ->orderBy('entry_date')
            ->get()
            ->map(function ($entry) {
                return [
                    'id' => $entry->id,
                    'date' => $entry->entry_date->format('Y-m-d'),
                    'description' => $entry->description,
                    'debit' => $entry->debit,
                    'credit' => $entry->credit,
                    'balance' => $entry->balance,
                    'user' => $entry->user?->name,
                ];
            });

        $totalDebit = $entries->sum('debit');
        $totalCredit = $entries->sum('credit');

        return response()->json([
            'entries' => $entries,
            'summary' => [
                'total_debit' => round($totalDebit, 2),
                'total_credit' => round($totalCredit, 2),
                'balance' => round($totalDebit - $totalCredit, 2),
            ],
            'period' => [
                'start' => $startDate->format('Y-m-d'),
                'end' => $endDate->format('Y-m-d'),
            ],
        ]);
    }

    /**
     * Get audit trail report
     */
    public function auditTrail(Request $request)
    {
        $user = $request->user();
        $company = $user->company;

        $startDate = $request->input('start_date') ? Carbon::parse($request->input('start_date')) : Carbon::now()->startOfMonth();
        $endDate = $request->input('end_date') ? Carbon::parse($request->input('end_date')) : Carbon::now()->endOfMonth();

        $logs = \App\Models\AuditLog::whereCompanyId($company->id)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->with(['user'])
            ->orderByDesc('created_at')
            ->paginate(50)
            ->map(function ($log) {
                return [
                    'id' => $log->id,
                    'user' => $log->user?->name,
                    'action' => $log->action,
                    'details' => $log->details,
                    'ip_address' => $log->ip_address,
                    'timestamp' => $log->created_at->format('Y-m-d H:i:s'),
                ];
            });

        return response()->json([
            'logs' => $logs,
            'period' => [
                'start' => $startDate->format('Y-m-d'),
                'end' => $endDate->format('Y-m-d'),
            ],
        ]);
    }
}
