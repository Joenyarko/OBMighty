<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeSalary;
use App\Models\Payment;
use App\Models\PayrollRecord;
use App\Models\User;
use App\Models\WorkerAttendance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PayrollController extends Controller
{
    /**
     * Check if user can access payroll (CEO or Super Admin)
     */
    private function canAccessPayroll($user): bool
    {
        return $user->hasRole('ceo') || $user->hasRole('super_admin');
    }

    /**
     * Get all employees with their salary information
     */
    public function employees(Request $request)
    {
        $user = $request->user();

        if (!$this->canAccessPayroll($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $employees = User::with(['branch', 'roles'])
            ->where('status', 'active')
            ->whereHas('roles', function ($q) {
                $q->whereIn('name', ['worker', 'secretary']);
            })
            ->get()
            ->map(function ($employee) {
                $currentSalary = EmployeeSalary::getCurrentSalary($employee->id);

                return [
                    'id'          => $employee->id,
                    'name'        => $employee->name,
                    'email'       => $employee->email,
                    'profile_pic' => $employee->profile_pic,
                    'role'        => $employee->roles->first()->name ?? 'N/A',
                    'branch'      => $employee->branch->name ?? 'N/A',
                    'branch_id'   => $employee->branch_id,
                    'status'      => $employee->status ?? 'active',
                    'salary'      => $currentSalary ? [
                        'monthly_salary'    => $currentSalary->monthly_salary,
                        'allowances'        => $currentSalary->allowances ?? 0,
                        'deductions'        => $currentSalary->deductions ?? 0,
                        'total_compensation'=> $currentSalary->total_compensation,
                    ] : null,
                ];
            });

        return response()->json($employees);
    }

    /**
     * Get employee salary details
     */
    public function employeeDetails(Request $request, $id)
    {
        $user = $request->user();

        if (!$this->canAccessPayroll($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $employee     = User::with(['branch', 'roles'])->findOrFail($id);
        $currentSalary = EmployeeSalary::getCurrentSalary($id);
        $salaryHistory = EmployeeSalary::forUser($id)->orderBy('effective_from', 'desc')->get();

        return response()->json([
            'employee'      => $employee,
            'current_salary'=> $currentSalary,
            'salary_history'=> $salaryHistory,
        ]);
    }

    /**
     * Set or update employee salary
     */
    public function setSalary(Request $request)
    {
        $user = $request->user();

        if (!$this->canAccessPayroll($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'user_id'        => 'required|exists:users,id',
            'monthly_salary' => 'required|numeric|min:0',
            'allowances'     => 'nullable|numeric|min:0',
            'deductions'     => 'nullable|numeric|min:0',
            'effective_from' => 'required|date',
        ]);

        DB::transaction(function () use ($validated, $user) {
            EmployeeSalary::forUser($validated['user_id'])
                ->active()
                ->update([
                    'status'       => 'inactive',
                    'effective_to' => Carbon::parse($validated['effective_from'])->subDay(),
                ]);

            EmployeeSalary::create([
                'user_id'        => $validated['user_id'],
                'monthly_salary' => $validated['monthly_salary'],
                'allowances'     => $validated['allowances'] ?? 0,
                'deductions'     => $validated['deductions'] ?? 0,
                'effective_from' => $validated['effective_from'],
                'status'         => 'active',
                'created_by'     => $user->id,
            ]);
        });

        return response()->json(['message' => 'Salary configuration updated successfully'], 201);
    }

    /**
     * Get payroll records with filtering
     */
    public function records(Request $request)
    {
        $user = $request->user();

        if (!$this->canAccessPayroll($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = PayrollRecord::with(['user', 'branch', 'paidBy']);

        if ($request->has('month'))   $query->forMonth($request->month);
        if ($request->has('status'))  $query->byStatus($request->status);
        if ($request->has('user_id')) $query->forUser($request->user_id);

        return response()->json($query->orderBy('payment_date', 'desc')->paginate(20));
    }

    /**
     * Record a salary payment
     */
    public function recordPayment(Request $request)
    {
        $user = $request->user();

        if (!$this->canAccessPayroll($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'user_id'          => 'required|exists:users,id',
            'payment_month'    => 'required|date',
            'payment_date'     => 'required|date',
            'payment_method'   => 'required|in:cash,bank_transfer,mobile_money,cheque',
            'reference_number' => 'nullable|string',
            'notes'            => 'nullable|string',
        ]);

        $employee = User::findOrFail($validated['user_id']);
        $salary   = EmployeeSalary::getCurrentSalary($validated['user_id']);

        if (!$salary) {
            return response()->json(['message' => 'No salary configuration found for this employee'], 422);
        }

        $existing = PayrollRecord::forUser($validated['user_id'])
            ->forMonth($validated['payment_month'])
            ->byStatus('paid')
            ->first();

        if ($existing) {
            return response()->json(['message' => 'Employee already paid for this month'], 422);
        }

        $record = PayrollRecord::create([
            'user_id'          => $validated['user_id'],
            'branch_id'        => $employee->branch_id,
            'salary_amount'    => $salary->monthly_salary,
            'allowances'       => $salary->allowances ?? 0,
            'deductions'       => $salary->deductions ?? 0,
            'payment_month'    => Carbon::parse($validated['payment_month'])->startOfMonth(),
            'payment_date'     => $validated['payment_date'],
            'payment_method'   => $validated['payment_method'],
            'reference_number' => $validated['reference_number'],
            'notes'            => $validated['notes'],
            'status'           => 'paid',
            'paid_by'          => $user->id,
        ]);

        return response()->json([
            'message' => 'Payment recorded successfully',
            'record'  => $record->load(['user', 'branch', 'paidBy']),
        ], 201);
    }

    /**
     * Get payment record details
     */
    public function recordDetails(Request $request, $id)
    {
        $user = $request->user();

        if (!$this->canAccessPayroll($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json(PayrollRecord::with(['user', 'branch', 'paidBy'])->findOrFail($id));
    }

    /**
     * Get monthly payroll summary
     */
    public function monthlySummary(Request $request, $month)
    {
        $user = $request->user();

        if (!$this->canAccessPayroll($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $monthDate = Carbon::parse($month)->startOfMonth();

        $employees       = User::where('status', 'active')->whereHas('roles', fn($q) => $q->whereIn('name', ['worker', 'secretary']))->get();
        $totalEmployees  = $employees->count();
        $expectedPayroll = 0;
        $paidEmployees   = 0;
        $totalPaid       = 0;

        foreach ($employees as $employee) {
            $salary = EmployeeSalary::getCurrentSalary($employee->id);
            if ($salary) $expectedPayroll += $salary->total_compensation;

            $payment = PayrollRecord::forUser($employee->id)->forMonth($monthDate)->byStatus('paid')->first();
            if ($payment) {
                $paidEmployees++;
                $totalPaid += $payment->net_amount;
            }
        }

        return response()->json([
            'month'            => $monthDate->format('Y-m'),
            'total_employees'  => $totalEmployees,
            'expected_payroll' => number_format($expectedPayroll, 2, '.', ''),
            'paid_employees'   => $paidEmployees,
            'unpaid_employees' => $totalEmployees - $paidEmployees,
            'total_paid'       => number_format($totalPaid, 2, '.', ''),
            'remaining'        => number_format($expectedPayroll - $totalPaid, 2, '.', ''),
        ]);
    }

    /**
     * Get unpaid employees for a month
     */
    public function unpaidEmployees(Request $request, $month)
    {
        $user = $request->user();

        if (!$this->canAccessPayroll($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $monthDate = Carbon::parse($month)->startOfMonth();

        $employees = User::with(['branch', 'roles'])
            ->where('status', 'active')
            ->whereHas('roles', fn($q) => $q->whereIn('name', ['worker', 'secretary']))
            ->get()
            ->filter(function ($employee) use ($monthDate) {
                return !PayrollRecord::forUser($employee->id)->forMonth($monthDate)->byStatus('paid')->first();
            })
            ->map(function ($employee) {
                $salary = EmployeeSalary::getCurrentSalary($employee->id);
                return [
                    'id'              => $employee->id,
                    'name'            => $employee->name,
                    'role'            => $employee->roles->first()->name ?? 'N/A',
                    'branch'          => $employee->branch->name ?? 'N/A',
                    'expected_amount' => $salary ? $salary->total_compensation : 0,
                ];
            })
            ->values();

        return response()->json($employees);
    }

    /**
     * Get attendance data for a date range.
     * Auto-detects presence from the payments table; manual overrides take precedence.
     * Sundays are non-working days (status 'off') unless a sale was made or manually marked.
     *
     * Query params:
     *   month      YYYY-MM  (monthly view)
     *   week_start YYYY-MM-DD  (weekly – 7 days from this date)
     *   worker_id  optional filter
     *   branch_id  optional filter
     */
    public function getAttendance(Request $request)
    {
        $user = $request->user();

        if (!$this->canAccessPayroll($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // --- Resolve date range ---
        if ($request->has('month')) {
            $start = Carbon::parse($request->month . '-01')->startOfMonth();
            $end   = $start->copy()->endOfMonth();
        } elseif ($request->has('week_start')) {
            $start = Carbon::parse($request->week_start)->startOfDay();
            $end   = $start->copy()->addDays(6)->endOfDay();
        } else {
            $start = Carbon::now()->startOfMonth();
            $end   = Carbon::now()->endOfMonth();
        }

        // --- Active Workers Only ---
        $workersQuery = User::with(['branch', 'roles'])
            ->where('status', 'active')
            ->whereHas('roles', fn($q) => $q->whereIn('name', ['worker', 'secretary']));

        if ($request->has('worker_id')) $workersQuery->where('id', $request->worker_id);
        if ($request->has('branch_id')) $workersQuery->where('branch_id', $request->branch_id);

        $workers = $workersQuery->get();

        // --- Payment & Activity dates per worker (checks Payments, BoxPayments, Creator ID, and Daily Totals) ---
        $workerIds = $workers->pluck('id')->toArray();
        $startDateStr = $start->toDateString();
        $endDateStr   = $end->toDateString();

        $paymentWorkerDates = Payment::select('worker_id', 'payment_date')
            ->whereBetween('payment_date', [$startDateStr, $endDateStr])
            ->whereIn('worker_id', $workerIds)
            ->get();

        $paymentCreatorDates = Payment::select('created_by as worker_id', 'payment_date')
            ->whereBetween('payment_date', [$startDateStr, $endDateStr])
            ->whereIn('created_by', $workerIds)
            ->get();

        $boxPaymentDates = \App\Models\BoxPayment::select('worker_id', 'payment_date')
            ->whereBetween('payment_date', [$startDateStr, $endDateStr])
            ->whereIn('worker_id', $workerIds)
            ->get();

        $dailyTotalDates = \App\Models\WorkerDailyTotal::select('worker_id', 'date as payment_date')
            ->whereBetween('date', [$startDateStr, $endDateStr])
            ->whereIn('worker_id', $workerIds)
            ->where(function ($q) {
                $q->where('total_collections', '>', 0)
                  ->orWhere('total_customers_paid', '>', 0);
            })
            ->get();

        $allActivity = $paymentWorkerDates
            ->concat($paymentCreatorDates)
            ->concat($boxPaymentDates)
            ->concat($dailyTotalDates);

        $paymentDates = $allActivity
            ->groupBy('worker_id')
            ->map(fn($items) => $items
                ->pluck('payment_date')
                ->filter()
                ->map(fn($d) => Carbon::parse($d)->toDateString())
                ->unique()
                ->values()
                ->toArray()
            );

        // --- Manual overrides ---
        $manualOverrides = WorkerAttendance::whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->whereIn('worker_id', $workers->pluck('id'))
            ->get()
            ->groupBy('worker_id')
            ->map(fn($items) => $items->keyBy(fn($a) => Carbon::parse($a->date)->toDateString()));

        // --- Build day list ---
        $today  = Carbon::today()->toDateString();
        $days   = [];
        $cursor = $start->copy();
        while ($cursor->lte($end)) {
            $days[] = $cursor->toDateString();
            $cursor->addDay();
        }

        // --- Compile per worker ---
        $result = $workers->map(function ($worker) use ($days, $paymentDates, $manualOverrides, $today) {
            $payDays   = $paymentDates[$worker->id] ?? [];
            $overrides = $manualOverrides[$worker->id] ?? collect([]);

            $attendance   = [];
            $presentCount = 0;
            $absentCount  = 0;

            foreach ($days as $day) {
                $isSunday = Carbon::parse($day)->isSunday();

                if ($day > $today) {
                    $attendance[$day] = [
                        'status'    => 'future',
                        'is_sunday' => $isSunday,
                        'source'    => null,
                        'notes'     => null,
                    ];
                    continue;
                }

                if ($overrides->has($day)) {
                    $override = $overrides[$day];
                    $status   = $override->status;
                    $source   = 'manual';
                    $notes    = $override->notes;
                } elseif ($isSunday) {
                    // Sunday is non-working day ('off') unless worker recorded sales/payments
                    $hasActivity = in_array($day, $payDays);
                    $status      = $hasActivity ? 'present' : 'off';
                    $source      = $hasActivity ? 'auto' : 'sunday';
                    $notes       = null;
                } else {
                    $status = in_array($day, $payDays) ? 'present' : 'absent';
                    $source = 'auto';
                    $notes  = null;
                }

                $attendance[$day] = [
                    'status'    => $status,
                    'is_sunday' => $isSunday,
                    'source'    => $source,
                    'notes'     => $notes,
                ];

                if ($status === 'present') {
                    $presentCount++;
                } elseif ($status === 'absent') {
                    $absentCount++;
                }
            }

            return [
                'worker_id'   => $worker->id,
                'name'        => $worker->name,
                'profile_pic' => $worker->profile_pic,
                'role'        => $worker->roles->first()->name ?? 'worker',
                'branch'      => $worker->branch->name ?? 'N/A',
                'branch_id'   => $worker->branch_id,
                'attendance'  => $attendance,
                'summary'     => [
                    'present'      => $presentCount,
                    'absent'       => $absentCount,
                    'working_days' => $presentCount + $absentCount,
                ],
            ];
        })->values();

        return response()->json([
            'start_date' => $start->toDateString(),
            'end_date'   => $end->toDateString(),
            'days'       => $days,
            'workers'    => $result,
        ]);
    }

    /**
     * Manually mark a worker's attendance for a specific date.
     *
     * POST /payroll/attendance
     * Body: { worker_id, date, status: 'present'|'absent'|'off', notes? }
     */
    public function setAttendance(Request $request)
    {
        $user = $request->user();

        if (!$this->canAccessPayroll($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'worker_id' => 'required|exists:users,id',
            'date'      => 'required|date|before_or_equal:today',
            'status'    => 'required|in:present,absent,off',
            'notes'     => 'nullable|string|max:500',
        ]);

        $worker     = User::findOrFail($validated['worker_id']);
        $attendance = WorkerAttendance::updateOrCreate(
            ['worker_id' => $validated['worker_id'], 'date' => $validated['date']],
            [
                'branch_id' => $worker->branch_id,
                'status'    => $validated['status'],
                'source'    => 'manual',
                'notes'     => $validated['notes'] ?? null,
                'marked_by' => $user->id,
            ]
        );

        return response()->json([
            'message'    => 'Attendance updated successfully',
            'attendance' => $attendance,
        ]);
    }
}
