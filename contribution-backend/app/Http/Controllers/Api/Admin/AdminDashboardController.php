<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\User;
use Illuminate\Http\Request;

class AdminDashboardController extends Controller
{
    /**
     * Get dashboard statistics for Super Admin.
     */
    public function stats()
    {
        // Counts
        $totalCompanies = Company::count();
        $totalUsers = User::count();
        
        // Active Users Today (Updated today)
        $activeToday = User::whereDate('updated_at', today())->count();

        return response()->json([
            'total_companies' => $totalCompanies,
            'total_users' => $totalUsers,
            'active_today' => $activeToday,
            'system_health' => 'Operational'
        ]);
    }
}
