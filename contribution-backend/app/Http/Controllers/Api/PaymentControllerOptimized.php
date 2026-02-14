<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class PaymentControllerOptimized extends Controller
{
    /**
     * Get payment history with optimized queries - no N+1
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        $query = Payment::with([
            'customer:id,name,email,status',
            'worker:id,name,email',
            'branch:id,name'
        ])->select(
            'payments.id',
            'payments.customer_id',
            'payments.recorded_by',
            'payments.branch_id',
            'payments.payment_amount',
            'payments.payment_date',
            'payments.payment_method',
            'payments.status',
            'payments.created_at'
        );

        // Apply role-based filtering
        if ($user->hasRole('worker')) {
            $query->where('recorded_by', $user->id);
        } elseif ($user->hasRole('secretary') && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        } else {
            // CEO sees all company payments - use company_id from branch relationships
            $query->whereHas('branch', fn($q) => $q->where('company_id', $user->company_id));
        }

        // Apply filters without N+1
        if ($request->has('date')) {
            $query->whereDate('payment_date', $request->date);
        }

        if ($request->has(['start_date', 'end_date'])) {
            $query->whereBetween('payment_date', [$request->start_date, $request->end_date]);
        }

        if ($request->has('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->has('worker_id')) {
            $query->where('recorded_by', $request->worker_id);
        }

        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Optimize pagination and ordering
        $payments = $query
            ->orderBy('payment_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json($payments);
    }

    /**
     * Get payment statistics with aggregations
     */
    public function getStats(Request $request)
    {
        $user = $request->user();
        $cacheKey = "payment_stats:{$user->company_id}:" . ($user->id ?? 'all');

        return Cache::remember($cacheKey, 60, function () use ($user) {
            $query = Payment::query();

            if ($user->hasRole('worker')) {
                $query->where('recorded_by', $user->id);
            } elseif ($user->hasRole('secretary') && $user->branch_id) {
                $query->where('branch_id', $user->branch_id);
            }

            // Use raw SQL for aggregations
            $stats = $query->selectRaw('
                COUNT(*) as total_payments,
                SUM(payment_amount) as total_amount,
                AVG(payment_amount) as average_amount,
                COUNT(DISTINCT customer_id) as unique_customers,
                COUNT(DISTINCT DATE(payment_date)) as days_with_payments
            ')->first();

            return [
                'total_payments' => $stats->total_payments,
                'total_amount' => (float)$stats->total_amount,
                'average_amount' => (float)$stats->average_amount,
                'unique_customers' => $stats->unique_customers,
                'days_with_payments' => $stats->days_with_payments,
            ];
        });
    }

    /**
     * Get payment method distribution (optimized aggregation)
     */
    public function getByMethod(Request $request)
    {
        $user = $request->user();
        
        $query = Payment::query();

        if ($user->hasRole('worker')) {
            $query->where('recorded_by', $user->id);
        } elseif ($user->hasRole('secretary') && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }

        return $query
            ->selectRaw('
                payment_method,
                COUNT(*) as count,
                SUM(payment_amount) as total,
                AVG(payment_amount) as average
            ')
            ->groupBy('payment_method')
            ->get()
            ->map(fn($method) => [
                'method' => $method->payment_method,
                'count' => $method->count,
                'total' => (float)$method->total,
                'average' => (float)$method->average,
            ]);
    }

    /**
     * Get daily payment totals (optimized)
     */
    public function getDailyTotals(Request $request)
    {
        $user = $request->user();
        $days = $request->get('days', 30);

        $query = Payment::where('payment_date', '>=', now()->subDays($days));

        if ($user->hasRole('worker')) {
            $query->where('recorded_by', $user->id);
        } elseif ($user->hasRole('secretary') && $user->branch_id) {
            $query->where('branch_id', $user->branch_id);
        }

        return $query
            ->selectRaw('
                DATE(payment_date) as date,
                COUNT(*) as count,
                SUM(payment_amount) as total
            ')
            ->groupBy('date')
            ->orderBy('date', 'desc')
            ->get()
            ->map(fn($day) => [
                'date' => $day->date,
                'count' => $day->count,
                'total' => (float)$day->total,
            ]);
    }
}
