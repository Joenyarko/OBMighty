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
        $today = Carbon::today();
        $startOfMonth = Carbon::now()->startOfMonth();
        $endOfMonth = Carbon::now()->endOfMonth();

        // Company Stats
        $totalCompanies = Company::count();
        $activeCompanies = Company::where('is_active', true)->count();

        // User Stats
        $totalUsers = User::count();
        $activeToday = User::whereDate('last_login_at', '>=', $today->subDays(7))->count();

        // User breakdown by role
        $usersByRole = User::with('roles')
            ->get()
            ->groupBy(function ($user) {
                return $user->roles->first()->name ?? 'unknown';
            })
            ->map(function ($group) {
                return $group->count();
            });

        // Payment Stats
        $todayPayments = Payment::whereDate('payment_date', $today)->sum('payment_amount') ?? 0;
        $monthPayments = Payment::whereBetween('payment_date', [$startOfMonth, $endOfMonth])->sum('payment_amount') ?? 0;
        $totalPayments = Payment::count();

        // System Health
        $failedLogins = AuditLog::where('action', 'like', '%failed%')
            ->whereDate('created_at', '>=', $today->subDays(7))
            ->count();

        // Recent Activity
        $recentAuditLogs = AuditLog::with(['user', 'company'])
            ->orderByDesc('created_at')
            ->limit(10)
            ->get()
            ->map(function ($log) {
                return [
                    'id' => $log->id,
                    'user' => $log->user?->name ?? 'System',
                    'company' => $log->company?->name ?? 'N/A',
                    'action' => $log->action,
                    'timestamp' => $log->created_at->diffForHumans(),
                ];
            });

        // Company Status
        $companiesByStatus = [
            'active' => $activeCompanies,
            'inactive' => $totalCompanies - $activeCompanies,
        ];

        return response()->json([
            'overview' => [
                'total_companies' => $totalCompanies,
                'active_companies' => $activeCompanies,
                'total_users' => $totalUsers,
                'active_users_week' => $activeToday,
            ],
            'users' => [
                'by_role' => $usersByRole,
                'total' => $totalUsers,
                'status' => $companiesByStatus,
            ],
            'payments' => [
                'today' => $todayPayments,
                'month' => $monthPayments,
                'total_transactions' => $totalPayments,
            ],
            'system_health' => [
                'status' => $failedLogins > 10 ? 'warning' : 'operational',
                'failed_login_attempts_week' => $failedLogins,
            ],
            'recent_activity' => $recentAuditLogs,
        ]);
    }

    /**
     * Get all system metrics and KPIs
     */
    public function metrics()
    {
        $companies = Company::withCount(['users', 'branches', 'customers', 'payments'])->get();

        $metrics = [
            'companies' => $companies->count(),
            'total_users' => $companies->sum('users_count'),
            'total_branches' => $companies->sum('branches_count'),
            'total_customers' => $companies->sum('customers_count'),
            'total_payments' => $companies->sum('payments_count'),
            'by_company' => $companies->map(function ($company) {
                return [
                    'name' => $company->name,
                    'users' => $company->users_count,
                    'branches' => $company->branches_count,
                    'customers' => $company->customers_count,
                    'payments' => $company->payments_count,
                ];
            }),
        ];

        return response()->json($metrics);
    }
}
