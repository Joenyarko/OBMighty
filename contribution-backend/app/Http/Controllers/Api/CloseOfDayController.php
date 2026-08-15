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
     * Get close of day data.
     * - Worker: sees own data only
     * - Manager/Secretary: sees branch workers
     * - CEO: sees all workers
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $date = $request->input('date', Carbon::today()->toDateString());

        // Get workers based on role
        if ($user->hasRole('worker')) {
            // Worker only sees themselves
            $workers = collect([$user->load('branch')]);
        } else {
            $workersQuery = User::whereHas('roles', function ($q) {
                $q->where('name', 'worker');
            })->with('branch');

            if ($user->hasRole('manager') || $user->hasRole('secretary')) {
                $workersQuery->where('branch_id', $user->branch_id);
            }

            $workers = $workersQuery->get();
        }

        $results = $workers->map(function ($worker) use ($date) {
            $dailyTotal = WorkerDailyTotal::withoutGlobalScopes()
                ->where('worker_id', $worker->id)
                ->whereDate('date', $date)
                ->first();

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
                'actual_cash_counted' => $dailyTotal?->actual_cash_counted,
                'discrepancy_amount' => $dailyTotal?->discrepancy_amount,
                'closing_notes' => $dailyTotal?->closing_notes,
                'final_amount' => round($dailyTotal?->adjusted_amount ?? $actualSales, 2),
                'payments_count' => $paymentsCount,
                'is_closed' => (bool) ($dailyTotal?->is_closed ?? false),
                'closed_at' => $dailyTotal?->closed_at,
                'closed_by' => $dailyTotal?->closed_by,
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
     * Close a worker's day.
     * - Worker can close ONLY themselves (one-way, can't undo)
     * - CEO can close any worker
     */
    public function close(Request $request, $workerId)
    {
        $user = $request->user();
        $date = $request->input('date', Carbon::today()->toDateString());

        // Authorization: worker can only close self
        if ($user->hasRole('worker') && (int) $workerId !== $user->id) {
            return response()->json(['message' => 'You can only close your own day'], 403);
        }

        // Only CEO and workers can close
        if (!$user->hasRole('ceo') && !$user->hasRole('worker')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $worker = User::findOrFail($workerId);
        $companyId = config('app.company_id');

        // Use updateOrCreate with whereDate for reliable date matching
        $dailyTotal = WorkerDailyTotal::withoutGlobalScopes()
            ->where('worker_id', $worker->id)
            ->where('company_id', $companyId)
            ->whereDate('date', $date)
            ->first();

        if (!$dailyTotal) {
            $dailyTotal = WorkerDailyTotal::create([
                'worker_id' => $worker->id,
                'branch_id' => $worker->branch_id,
                'date' => $date,
                'total_collections' => 0,
                'total_customers_paid' => 0,
                'company_id' => $companyId,
            ]);
        }

        if ($dailyTotal->is_closed) {
            return response()->json(['message' => 'Worker is already closed for this date'], 422);
        }

        $actualCashCounted = $request->input('actual_cash_counted');
        $closingNotes = $request->input('closing_notes');
        
        $discrepancyAmount = null;
        if ($actualCashCounted !== null && $actualCashCounted !== '') {
             $actualCashCounted = (float) $actualCashCounted;
             // System expected is total_collections (or adjusted_amount if set, but usually total_collections)
             $expectedAmount = (float) ($dailyTotal->adjusted_amount ?? $dailyTotal->total_collections);
             $discrepancyAmount = $actualCashCounted - $expectedAmount;
        } else {
             $actualCashCounted = null;
        }

        $dailyTotal->actual_cash_counted = $actualCashCounted;
        $dailyTotal->discrepancy_amount = $discrepancyAmount;
        $dailyTotal->closing_notes = $closingNotes;
        $dailyTotal->is_closed = true;
        $dailyTotal->closed_at = now();
        $dailyTotal->closed_by = $user->id;
        $dailyTotal->save();

        return response()->json([
            'message' => $worker->name . '\'s day has been closed',
            'data' => $dailyTotal->fresh(),
        ]);
    }

    /**
     * Open (re-open) a worker's day. CEO only.
     */
    public function open(Request $request, $workerId)
    {
        $user = $request->user();

        if (!$user->hasRole('ceo')) {
            return response()->json(['message' => 'Only CEO can reopen a worker\'s day'], 403);
        }

        $date = $request->input('date', Carbon::today()->toDateString());
        $worker = User::findOrFail($workerId);

        // Use withoutGlobalScopes + whereDate for reliable lookup
        $dailyTotal = WorkerDailyTotal::withoutGlobalScopes()
            ->where('worker_id', $worker->id)
            ->whereDate('date', $date)
            ->first();

        if (!$dailyTotal) {
            return response()->json(['message' => 'No record found for this worker on this date'], 422);
        }

        if (!$dailyTotal->is_closed) {
            return response()->json(['message' => 'Worker is already open for this date'], 422);
        }

        $dailyTotal->is_closed = false;
        $dailyTotal->closed_at = null;
        $dailyTotal->closed_by = null;
        $dailyTotal->save();

        return response()->json([
            'message' => $worker->name . '\'s day has been reopened',
            'data' => $dailyTotal->fresh(),
        ]);
    }

    /**
     * CEO adjusts a worker's close of day amount.
     */
    public function update(Request $request, $workerId)
    {
        $user = $request->user();

        if (!$user->hasRole('ceo')) {
            return response()->json(['message' => 'Only CEO can adjust amounts'], 403);
        }

        $validated = $request->validate([
            'date' => 'required|date',
            'adjusted_amount' => 'required|numeric|min:0',
            'adjustment_note' => 'nullable|string|max:500',
        ]);

        $worker = User::findOrFail($workerId);

        $dailyTotal = WorkerDailyTotal::firstOrCreate(
            ['worker_id' => $worker->id, 'date' => $validated['date']],
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
            'message' => 'Amount adjusted successfully',
            'data' => $dailyTotal->fresh(),
        ]);
    }

    /**
     * Get monthly summary of close of day data grouped by worker.
     */
    public function monthlySummary(Request $request)
    {
        $user = $request->user();
        // default to current month YYYY-MM
        $monthStr = $request->input('month', Carbon::today()->format('Y-m'));
        
        try {
            $startDate = Carbon::createFromFormat('Y-m', $monthStr)->startOfMonth();
            $endDate = Carbon::createFromFormat('Y-m', $monthStr)->endOfMonth();
        } catch (\Exception $e) {
            return response()->json(['message' => 'Invalid month format. Use YYYY-MM'], 400);
        }

        // Get workers based on role
        if ($user->hasRole('worker')) {
            $workers = collect([$user->load('branch')]);
        } else {
            $workersQuery = User::whereHas('roles', function ($q) {
                $q->where('name', 'worker');
            })->with('branch');

            if ($user->hasRole('manager') || $user->hasRole('secretary')) {
                $workersQuery->where('branch_id', $user->branch_id);
            }
            $workers = $workersQuery->get();
        }

        $results = $workers->map(function ($worker) use ($startDate, $endDate) {
            $totals = WorkerDailyTotal::withoutGlobalScopes()
                ->where('worker_id', $worker->id)
                ->whereBetween('date', [$startDate->toDateString(), $endDate->toDateString()])
                ->get();

            $paymentsCount = Payment::where('worker_id', $worker->id)
                ->whereBetween('payment_date', [$startDate->toDateString(), $endDate->toDateString()])
                ->count();
                
            $expectedSum = 0;
            $actualSum = 0;
            $discrepancySum = 0;
            $daysClosed = 0;
            
            foreach ($totals as $day) {
                $expected = (float) ($day->adjusted_amount ?? $day->total_collections);
                $expectedSum += $expected;
                
                if ($day->is_closed && $day->actual_cash_counted !== null) {
                    $actualSum += (float) $day->actual_cash_counted;
                    $discrepancySum += (float) $day->discrepancy_amount;
                    $daysClosed++;
                }
            }

            return [
                'worker_id' => $worker->id,
                'worker_name' => $worker->name,
                'branch_name' => $worker->branch?->name ?? '-',
                'payments_count' => $paymentsCount,
                'expected_cash' => round($expectedSum, 2),
                'actual_cash' => round($actualSum, 2),
                'net_discrepancy' => round($discrepancySum, 2),
                'days_closed' => $daysClosed,
                'total_days_worked' => $totals->count(),
            ];
        });

        return response()->json([
            'month' => $monthStr,
            'workers' => $results->values(),
            'total_expected' => $results->sum('expected_cash'),
            'total_actual' => $results->sum('actual_cash'),
            'net_discrepancy' => $results->sum('net_discrepancy'),
        ]);
    }
}
