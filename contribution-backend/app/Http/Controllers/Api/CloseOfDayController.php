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
}
