<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class BranchController extends Controller
{
    /**
     * Get all branches with performance metrics
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $companyId = config('app.company_id');
        $query = Branch::withCount('users', 'customers')->orderBy('name');

        $isManager = $user->hasRole(['secretary', 'manager', 'branch_manager']);
        if ($isManager && $user->branch_id && !$user->hasRole(['ceo', 'super_admin'])) {
            $query->where('id', $user->branch_id);
        }

        $today = Carbon::today();
        $startOfWeek = Carbon::now()->startOfWeek();
        $startOfMonth = Carbon::now()->startOfMonth();
        $endOfMonth = Carbon::now()->endOfMonth();

        $branches = $query->get()->map(function ($branch) use ($today, $startOfWeek, $startOfMonth, $endOfMonth, $companyId) {
            $branchId = $branch->id;

            $todayRevenue = (float)DB::table('payments')
                ->where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->whereDate('payment_date', $today)
                ->sum('payment_amount');

            $weekRevenue = (float)DB::table('payments')
                ->where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->whereBetween('payment_date', [$startOfWeek, $today])
                ->sum('payment_amount');

            $monthRevenue = (float)DB::table('payments')
                ->where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->whereBetween('payment_date', [$startOfMonth, $endOfMonth])
                ->sum('payment_amount');

            $allTimeRevenue = (float)DB::table('payments')
                ->where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->sum('payment_amount');

            $todayPaymentsCount = (int)DB::table('payments')
                ->where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->whereDate('payment_date', $today)
                ->count();

            $totalPaymentsCount = (int)DB::table('payments')
                ->where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->count();

            $activeCustomers = (int)DB::table('customers')
                ->where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('status', 'in_progress')
                ->count();

            $completedCustomers = (int)DB::table('customers')
                ->where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('status', 'completed')
                ->count();

            $servedCustomers = (int)DB::table('customers')
                ->where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('is_served', true)
                ->count();

            $activeWorkersCount = User::where('company_id', $companyId)
                ->where('branch_id', $branchId)
                ->where('status', 'active')
                ->whereHas('roles', function ($q) {
                    $q->where('name', 'worker');
                })
                ->count();

            return array_merge($branch->toArray(), [
                'today_revenue' => round($todayRevenue, 2),
                'today_payments_count' => $todayPaymentsCount,
                'week_revenue' => round($weekRevenue, 2),
                'month_revenue' => round($monthRevenue, 2),
                'all_time_revenue' => round($allTimeRevenue, 2),
                'total_payments_count' => $totalPaymentsCount,
                'active_customers' => $activeCustomers,
                'completed_customers' => $completedCustomers,
                'served_customers' => $servedCustomers,
                'active_workers_count' => $activeWorkersCount,
            ]);
        });
        
        return response()->json($branches);
    }

    /**
     * Create a new branch (CEO only)
     */
    public function store(Request $request)
    {
        $companyId = config('app.company_id');
        
        if (!$companyId && app()->has('is_super_admin')) {
            return response()->json([
                'message' => 'Super Admins cannot create branches on the central dashboard. Please log in to a specific company\'s domain to create branches.'
            ], 422);
        }

        $validated = $request->validate([
            'name' => [
                'required', 'string', 'max:255',
                \Illuminate\Validation\Rule::unique('branches')->where(function ($query) use ($companyId) {
                    return $query->where('company_id', $companyId);
                })
            ],
            'code' => [
                'required', 'string', 'max:20',
                \Illuminate\Validation\Rule::unique('branches')->where(function ($query) use ($companyId) {
                    return $query->where('company_id', $companyId);
                })
            ],
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'status' => 'nullable|in:active,inactive',
        ]);

        $branch = Branch::create($validated);

        return response()->json([
            'message' => 'Branch created successfully',
            'branch' => $branch,
        ], 201);
    }

    /**
     * Get a single branch (CEO only)
     */
    public function show($id, Request $request)
    {
        $user = $request->user();
        
        // Authorization check
        if ($user->hasRole('secretary') && $id != $user->branch_id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $branch = Branch::withCount('users', 'customers')->findOrFail($id);
        return response()->json($branch);
    }

    /**
     * Update a branch (CEO only)
     */
    public function update(Request $request, $id)
    {
        $branch = Branch::findOrFail($id);

        $companyId = config('app.company_id');

        $validated = $request->validate([
            'name' => [
                'sometimes', 'string', 'max:255',
                \Illuminate\Validation\Rule::unique('branches')->where(function ($query) use ($companyId) {
                    return $query->where('company_id', $companyId);
                })->ignore($id)
            ],
            'code' => [
                'sometimes', 'string', 'max:20',
                \Illuminate\Validation\Rule::unique('branches')->where(function ($query) use ($companyId) {
                    return $query->where('company_id', $companyId);
                })->ignore($id)
            ],
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:20',
            'status' => 'sometimes|in:active,inactive',
        ]);

        $branch->update($validated);

        return response()->json([
            'message' => 'Branch updated successfully',
            'branch' => $branch,
        ]);
    }

    /**
     * Delete a branch (CEO only)
     */
    public function destroy($id)
    {
        $branch = Branch::findOrFail($id);
        
        // Check if branch has users or customers
        if ($branch->users()->count() > 0 || $branch->customers()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete branch with existing users or customers',
            ], 422);
        }

        $branch->delete();

        return response()->json([
            'message' => 'Branch deleted successfully',
        ]);
    }

    /**
     * Get detailed branch performance intelligence (CEO, Manager, Secretary)
     */
    public function performance($id, Request $request)
    {
        $user = $request->user();
        $companyId = config('app.company_id');

        $isManager = $user->hasRole(['secretary', 'manager', 'branch_manager']);
        if ($isManager && $user->branch_id && $id != $user->branch_id && !$user->hasRole(['ceo', 'super_admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $branch = Branch::withCount('users', 'customers')->findOrFail($id);

        $today = Carbon::today();
        $startOfWeek = Carbon::now()->startOfWeek();
        $startOfMonth = Carbon::now()->startOfMonth();
        $endOfMonth = Carbon::now()->endOfMonth();

        // 1. Sales Metrics
        $todayStats = DB::table('payments')
            ->where('company_id', $companyId)
            ->where('branch_id', $id)
            ->whereDate('payment_date', $today)
            ->select(
                DB::raw('SUM(payment_amount) as total_sales'),
                DB::raw('COUNT(id) as transactions')
            )
            ->first();

        $weekStats = DB::table('payments')
            ->where('company_id', $companyId)
            ->where('branch_id', $id)
            ->whereBetween('payment_date', [$startOfWeek, $today])
            ->select(
                DB::raw('SUM(payment_amount) as total_sales'),
                DB::raw('COUNT(id) as transactions')
            )
            ->first();

        $monthStats = DB::table('payments')
            ->where('company_id', $companyId)
            ->where('branch_id', $id)
            ->whereBetween('payment_date', [$startOfMonth, $endOfMonth])
            ->select(
                DB::raw('SUM(payment_amount) as total_sales'),
                DB::raw('COUNT(DISTINCT customer_id) as customers_paid'),
                DB::raw('COUNT(id) as transactions')
            )
            ->first();

        $allTimeStats = DB::table('payments')
            ->where('company_id', $companyId)
            ->where('branch_id', $id)
            ->select(
                DB::raw('SUM(payment_amount) as total_sales'),
                DB::raw('COUNT(DISTINCT customer_id) as total_customers'),
                DB::raw('COUNT(id) as total_transactions'),
                DB::raw('AVG(payment_amount) as avg_transaction')
            )
            ->first();

        // 2. Customer Metrics
        $customerMetrics = DB::table('customers')
            ->leftJoin('customer_cards', 'customers.id', '=', 'customer_cards.customer_id')
            ->where('customers.company_id', $companyId)
            ->where('customers.branch_id', $id)
            ->select(
                DB::raw('COUNT(DISTINCT customers.id) as total_customers'),
                DB::raw('COUNT(DISTINCT CASE WHEN customer_cards.status = "active" THEN customers.id END) as active_customers'),
                DB::raw('COUNT(DISTINCT CASE WHEN customer_cards.status = "completed" THEN customers.id END) as completed_customers'),
                DB::raw('COUNT(DISTINCT CASE WHEN customers.is_served = 1 THEN customers.id END) as served_customers')
            )
            ->first();

        // 3. Workers in branch performance breakdown
        $branchWorkers = User::where('company_id', $companyId)
            ->where('branch_id', $id)
            ->whereHas('roles', function ($q) {
                $q->where('name', 'worker');
            })
            ->get();

        $workersList = [];
        foreach ($branchWorkers as $bw) {
            $wCustomers = DB::table('customers')
                ->where('company_id', $companyId)
                ->where('worker_id', $bw->id)
                ->count();

            $wMonthSales = DB::table('payments')
                ->where('company_id', $companyId)
                ->where('worker_id', $bw->id)
                ->whereMonth('payment_date', Carbon::now()->month)
                ->whereYear('payment_date', Carbon::now()->year)
                ->sum('payment_amount');

            $wAllTimeSales = DB::table('payments')
                ->where('company_id', $companyId)
                ->where('worker_id', $bw->id)
                ->sum('payment_amount');

            $workersList[] = [
                'id' => $bw->id,
                'name' => $bw->name,
                'email' => $bw->email,
                'phone' => $bw->phone,
                'status' => $bw->status ?? 'active',
                'customers_count' => (int)$wCustomers,
                'month_sales' => (float)($wMonthSales ?? 0),
                'all_time_sales' => (float)($wAllTimeSales ?? 0),
            ];
        }

        // 4. Recent payments in branch
        $recentPayments = DB::table('payments')
            ->join('customers', 'payments.customer_id', '=', 'customers.id')
            ->leftJoin('users as collector', 'payments.worker_id', '=', 'collector.id')
            ->where('payments.company_id', $companyId)
            ->where('payments.branch_id', $id)
            ->orderBy('payments.payment_date', 'desc')
            ->orderBy('payments.created_at', 'desc')
            ->limit(10)
            ->select(
                'payments.payment_date',
                'customers.name as customer_name',
                'collector.name as collector_name',
                'payments.payment_amount as amount_paid',
                'payments.boxes_filled as boxes_checked'
            )
            ->get();

        $totalCust = (int)($customerMetrics->total_customers ?? 0);
        $retentionRate = $totalCust > 0
            ? (($customerMetrics->active_customers ?? 0) / $totalCust) * 100
            : 0;

        return response()->json([
            'branch' => $branch,
            'sales_metrics' => [
                'today' => [
                    'total_sales' => (float)($todayStats->total_sales ?? 0),
                    'transactions' => (int)($todayStats->transactions ?? 0),
                ],
                'this_week' => [
                    'total_sales' => (float)($weekStats->total_sales ?? 0),
                    'transactions' => (int)($weekStats->transactions ?? 0),
                ],
                'this_month' => [
                    'total_sales' => (float)($monthStats->total_sales ?? 0),
                    'customers_paid' => (int)($monthStats->customers_paid ?? 0),
                    'transactions' => (int)($monthStats->transactions ?? 0),
                ],
                'all_time' => [
                    'total_sales' => (float)($allTimeStats->total_sales ?? 0),
                    'total_transactions' => (int)($allTimeStats->total_transactions ?? 0),
                    'avg_transaction' => (float)($allTimeStats->avg_transaction ?? 0),
                ],
            ],
            'customer_metrics' => [
                'total_customers' => (int)($customerMetrics->total_customers ?? 0),
                'active_customers' => (int)($customerMetrics->active_customers ?? 0),
                'completed_customers' => (int)($customerMetrics->completed_customers ?? 0),
                'served_customers' => (int)($customerMetrics->served_customers ?? 0),
                'retention_rate' => round($retentionRate, 2),
            ],
            'workers' => $workersList,
            'recent_payments' => $recentPayments,
        ]);
    }
}
