<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\User;
use App\Models\Payment;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AdminDashboardController extends Controller
{
    /**
     * Get comprehensive dashboard statistics for Super Admin.
     */
    public function stats()
    {
        $authUser = auth()->user();
        $today = Carbon::today();
        $startOfMonth = Carbon::now()->startOfMonth();
        $endOfMonth = Carbon::now()->endOfMonth();

        // Scope to assigned companies for admin managers
        $isManager = $authUser->hasRole('admin_manager');
        $assignedIds = $isManager
            ? $authUser->managedCompanies()->pluck('companies.id')->toArray()
            : null;

        // Company Stats
        $companyQuery = Company::query();
        if ($isManager) $companyQuery->whereIn('id', $assignedIds);
        $totalCompanies  = $companyQuery->count();
        $activeCompanies = (clone $companyQuery)->where('is_active', true)->count();

        // User Stats
        $userQuery = User::query();
        if ($isManager) $userQuery->whereIn('company_id', $assignedIds);
        $totalUsers  = $userQuery->count();
        $activeToday = (clone $userQuery)->whereDate('last_login_at', '>=', Carbon::today()->subDays(7))->count();

        // User breakdown by role
        $usersByRole = (clone $userQuery)->with('roles')
            ->get()
            ->groupBy(fn($u) => $u->roles->first()?->name ?? 'unknown')
            ->map(fn($g) => $g->count());

        // Payment Stats
        $paymentQuery = Payment::query();
        if ($isManager) $paymentQuery->whereIn('company_id', $assignedIds);
        $todayPayments = (clone $paymentQuery)->whereDate('payment_date', $today)->sum('payment_amount') ?? 0;
        $monthPayments = (clone $paymentQuery)->whereBetween('payment_date', [$startOfMonth, $endOfMonth])->sum('payment_amount') ?? 0;
        $totalPayments = $paymentQuery->count();

        // System Health (scoped to assigned companies for manager)
        $auditQuery = AuditLog::where('action', 'like', '%failed%')
            ->whereDate('created_at', '>=', Carbon::today()->subDays(7));
        if ($isManager) $auditQuery->whereIn('company_id', $assignedIds);
        $failedLogins = $auditQuery->count();

        // Recent Activity
        $recentQuery = AuditLog::with(['user', 'company'])->orderByDesc('created_at');
        if ($isManager) $recentQuery->whereIn('company_id', $assignedIds);
        $recentAuditLogs = $recentQuery->limit(10)->get()->map(fn($log) => [
            'id'        => $log->id,
            'user'      => $log->user?->name ?? 'System',
            'company'   => $log->company?->name ?? 'N/A',
            'action'    => $log->action,
            'timestamp' => $log->created_at->diffForHumans(),
        ]);

        return response()->json([
            'overview' => [
                'total_companies'    => $totalCompanies,
                'active_companies'   => $activeCompanies,
                'total_users'        => $totalUsers,
                'active_users_week'  => $activeToday,
            ],
            'users' => [
                'by_role' => $usersByRole,
                'total'   => $totalUsers,
                'status'  => ['active' => $activeCompanies, 'inactive' => $totalCompanies - $activeCompanies],
            ],
            'payments' => [
                'today'              => $todayPayments,
                'month'              => $monthPayments,
                'total_transactions' => $totalPayments,
            ],
            'system_health' => [
                'status'                      => $failedLogins > 10 ? 'warning' : 'operational',
                'failed_login_attempts_week'  => $failedLogins,
            ],
            'recent_activity' => $recentAuditLogs,
        ]);
    }

    /**
     * Get all system metrics and KPIs
     */
    public function metrics()
    {
        $authUser = auth()->user();
        $isManager = $authUser->hasRole('admin_manager');

        $query = Company::withCount(['users', 'branches', 'customers', 'payments']);
        if ($isManager) {
            $assignedIds = $authUser->managedCompanies()->pluck('companies.id');
            $query->whereIn('id', $assignedIds);
        }
        $companies = $query->get();

        $metrics = [
            'companies'      => $companies->count(),
            'total_users'    => $companies->sum('users_count'),
            'total_branches' => $companies->sum('branches_count'),
            'total_customers'=> $companies->sum('customers_count'),
            'total_payments' => $companies->sum('payments_count'),
            'by_company'     => $companies->map(fn($c) => [
                'name'      => $c->name,
                'users'     => $c->users_count,
                'branches'  => $c->branches_count,
                'customers' => $c->customers_count,
                'payments'  => $c->payments_count,
            ]),
        ];

        return response()->json($metrics);
    }
}
