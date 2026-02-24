<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkerDailyTotal;
use App\Models\User;
use App\Models\Payment;
use Illuminate\Http\Request;
use Carbon\Carbon;

class CloseOfDayController extends Controller
{
    /**
     * Get close of day data for all workers on a given date.
     * CEO sees all workers; Manager sees own branch workers only.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $date = $request->input('date', Carbon::today()->toDateString());

        // Get workers based on role
        $workersQuery = User::whereHas('roles', function ($q) {
            $q->where('name', 'worker');
        })->with('branch');

        if ($user->hasRole('manager') || $user->hasRole('secretary')) {
            $workersQuery->where('branch_id', $user->branch_id);
        }

        $workers = $workersQuery->get();

        $results = $workers->map(function ($worker) use ($date) {
            // Get the worker daily total for this date
            $dailyTotal = WorkerDailyTotal::where('worker_id', $worker->id)
                ->where('date', $date)
                ->first();

            // Calculate actual sales from payments for this day
            $actualSales = Payment::where('worker_id', $worker->id)
                ->whereDate('payment_date', $date)
                ->sum('payment_amount');

            $paymentsCount = Payment::where('worker_id', $worker->id)
                ->whereDate('payment_date', $date)
                ->count();

            return [
                'id' => $dailyTotal?->id,
                'worker_id' => $worker->id,
                'worker_name' => $worker->name,
                'branch_name' => $worker->branch?->name ?? '-',
                'date' => $date,
                'actual_sales' => round($actualSales, 2),
                'total_collections' => round($dailyTotal?->total_collections ?? 0, 2),
                'total_customers_paid' => $dailyTotal?->total_customers_paid ?? 0,
                'adjusted_amount' => $dailyTotal?->adjusted_amount,
                'adjustment_note' => $dailyTotal?->adjustment_note,
                'final_amount' => round($dailyTotal?->adjusted_amount ?? $actualSales, 2),
                'payments_count' => $paymentsCount,
            ];
        });

        return response()->json([
            'date' => $date,
            'workers' => $results->values(),
            'total_sales' => $results->sum('actual_sales'),
            'total_adjusted' => $results->sum('final_amount'),
        ]);
    }

    /**
     * CEO adjusts a worker's close of day amount for a specific date.
     */
    public function update(Request $request, $workerId)
    {
        $user = $request->user();

        if (!$user->hasRole('ceo')) {
            return response()->json(['message' => 'Only CEO can adjust close of day amounts'], 403);
        }

        $validated = $request->validate([
            'date' => 'required|date',
            'adjusted_amount' => 'required|numeric|min:0',
            'adjustment_note' => 'nullable|string|max:500',
        ]);

        $worker = User::findOrFail($workerId);

        // Find or create the daily total record
        $dailyTotal = WorkerDailyTotal::firstOrCreate(
            [
                'worker_id' => $worker->id,
                'date' => $validated['date'],
            ],
            [
                'branch_id' => $worker->branch_id,
                'total_collections' => 0,
                'total_customers_paid' => 0,
                'company_id' => config('app.company_id'),
            ]
        );

        $dailyTotal->update([
            'adjusted_amount' => $validated['adjusted_amount'],
            'adjustment_note' => $validated['adjustment_note'] ?? null,
        ]);

        return response()->json([
            'message' => 'Close of day amount adjusted successfully',
            'data' => $dailyTotal->fresh(),
        ]);
    }
}
