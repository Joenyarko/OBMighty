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


        // Authorization / Scope
        if ($user->hasRole('secretary')) {
            // Secretary sees logs where:
            // 1. The ACTOR (user) is in their branch
            // 2. OR the TARGET (auditable) belongs to their branch (if applicable) -> complex, stick to actor for now.
            $branchId = $user->branch_id;
            
            $query->where(function($q) use ($branchId) {
                // Actor is in the branch
                $q->whereHas('user', function ($uq) use ($branchId) {
                    $uq->where('branch_id', $branchId);
                });
                // OR Actor is null (system) but context implies branch? No, safer to hide system logs from secretary.
            });
        } elseif (!$user->hasRole('ceo')) {
            // Workers shouldn't see logs? Or only their own? 
            // Usually logs are for admin. Let's restrict to own logs for workers if they ever access this.
            $query->where('user_id', $user->id);
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
