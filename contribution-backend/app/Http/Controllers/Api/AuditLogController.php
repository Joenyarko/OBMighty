<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /**
     * Get system activity logs
     */
    public function index(Request $request)
    {
        $user = $request->user();

        // Base query - scoped to current tenant
        $query = AuditLog::with('user')
            ->where('company_id', config('app.company_id') ?: 1); // Fallback to 1 for safety if config missing


        // Authorization - Only CEO can access activity logs
        if (!$user->hasRole('ceo')) {
            return response()->json(['message' => 'Unauthorized. Only CEO can view activity logs.'], 403);
        }

        // Filters
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('action')) {
            $query->where('action', $request->action);
        }

        if ($request->has('date')) {
            $query->whereDate('created_at', $request->date);
        }

        $logs = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($logs);
    }
}
