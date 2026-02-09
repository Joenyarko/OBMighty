<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeSalary;
use App\Models\PayrollRecord;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PayrollController extends Controller
{
    /**
     * Get all employees with their salary information
     */
    public function employees(Request $request)
    {
        $user = $request->user();
        
        // Only CEO can access payroll
        if (!$user->hasRole('ceo')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $employees = User::with(['branch', 'roles'])
            ->whereHas('roles', function ($q) {
                $q->whereIn('name', ['worker', 'secretary']);
            })
            ->get()
            ->map(function ($employee) {
                $currentSalary = EmployeeSalary::getCurrentSalary($employee->id);
                
                return [
                    'id' => $employee->id,
                    'name' => $employee->name,
                    'email' => $employee->email,
                    'role' => $employee->roles->first()->name ?? 'N/A',
                    'branch' => $employee->branch->name ?? 'N/A',
                    'branch_id' => $employee->branch_id,
                    'salary' => $currentSalary ? [
                        'monthly_salary' => $currentSalary->monthly_salary,
                        'allowances' => $currentSalary->allowances ?? 0,
                        'deductions' => $currentSalary->deductions ?? 0,
                        'total_compensation' => $currentSalary->total_compensation,
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
        
        if (!$user->hasRole('ceo')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $employee = User::with(['branch', 'roles'])->findOrFail($id);
        $currentSalary = EmployeeSalary::getCurrentSalary($id);
        $salaryHistory = EmployeeSalary::forUser($id)
            ->orderBy('effective_from', 'desc')
            ->get();
        
        return response()->json([
            'employee' => $employee,
            'current_salary' => $currentSalary,
            'salary_history' => $salaryHistory,
        ]);
    }

    /**
     * Set or update employee salary
     */
    public function setSalary(Request $request)
    {
        $user = $request->user();
        
        if (!$user->hasRole('ceo')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'monthly_salary' => 'required|numeric|min:0',
            'allowances' => 'nullable|numeric|min:0',
            'deductions' => 'nullable|numeric|min:0',
            'effective_from' => 'required|date',
        ]);
        
        DB::transaction(function () use ($validated, $user) {
            // Deactivate previous active salary
            EmployeeSalary::forUser($validated['user_id'])
                ->active()
                ->update([
                    'status' => 'inactive',
                    'effective_to' => Carbon::parse($validated['effective_from'])->subDay(),
                ]);
            
            // Create new salary configuration
            EmployeeSalary::create([
                'user_id' => $validated['user_id'],
                'monthly_salary' => $validated['monthly_salary'],
                'allowances' => $validated['allowances'] ?? 0,
                'deductions' => $validated['deductions'] ?? 0,
                'effective_from' => $validated['effective_from'],
                'status' => 'active',
                'created_by' => $user->id,
            ]);
        });
        
        return response()->json([
            'message' => 'Salary configuration updated successfully',
        ], 201);
    }

    /**
     * Get payroll records with filtering
     */
    public function records(Request $request)
    {
        $user = $request->user();
        
        if (!$user->hasRole('ceo')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $query = PayrollRecord::with(['user', 'branch', 'paidBy']);
        
        // Filter by month if provided
        if ($request->has('month')) {
            $query->forMonth($request->month);
        }
        
        // Filter by status if provided
        if ($request->has('status')) {
            $query->byStatus($request->status);
        }
        
        // Filter by user if provided
        if ($request->has('user_id')) {
            $query->forUser($request->user_id);
        }
        
        $records = $query->orderBy('payment_date', 'desc')
            ->paginate(20);
        
        return response()->json($records);
    }

    /**
     * Record a salary payment
     */
    public function recordPayment(Request $request)
    {
        $user = $request->user();
        
        if (!$user->hasRole('ceo')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'payment_month' => 'required|date',
            'payment_date' => 'required|date',
            'payment_method' => 'required|in:cash,bank_transfer,mobile_money,cheque',
            'reference_number' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);
        
        // Get employee's current salary
        $employee = User::findOrFail($validated['user_id']);
        $salary = EmployeeSalary::getCurrentSalary($validated['user_id']);
        
        if (!$salary) {
            return response()->json(['message' => 'No salary configuration found for this employee'], 422);
        }
        
        // Check if already paid for this month
        $existingPayment = PayrollRecord::forUser($validated['user_id'])
            ->forMonth($validated['payment_month'])
            ->byStatus('paid')
            ->first();
        
        if ($existingPayment) {
            return response()->json(['message' => 'Employee already paid for this month'], 422);
        }
        
        // Create payroll record
        $record = PayrollRecord::create([
            'user_id' => $validated['user_id'],
            'branch_id' => $employee->branch_id,
            'salary_amount' => $salary->monthly_salary,
            'allowances' => $salary->allowances ?? 0,
            'deductions' => $salary->deductions ?? 0,
            'payment_month' => Carbon::parse($validated['payment_month'])->startOfMonth(),
            'payment_date' => $validated['payment_date'],
            'payment_method' => $validated['payment_method'],
            'reference_number' => $validated['reference_number'],
            'notes' => $validated['notes'],
            'status' => 'paid',
            'paid_by' => $user->id,
        ]);
        
        return response()->json([
            'message' => 'Payment recorded successfully',
            'record' => $record->load(['user', 'branch', 'paidBy']),
        ], 201);
    }

    /**
     * Get payment record details
     */
    public function recordDetails(Request $request, $id)
    {
        $user = $request->user();
        
        if (!$user->hasRole('ceo')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $record = PayrollRecord::with(['user', 'branch', 'paidBy'])->findOrFail($id);
        
        return response()->json($record);
    }

    /**
     * Get monthly payroll summary
     */
    public function monthlySummary(Request $request, $month)
    {
        $user = $request->user();
        
        if (!$user->hasRole('ceo')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $monthDate = Carbon::parse($month)->startOfMonth();
        
        // Get all employees with salaries
        $employees = User::whereHas('roles', function ($q) {
            $q->whereIn('name', ['worker', 'secretary']);
        })->get();
        
        $totalEmployees = $employees->count();
        $expectedPayroll = 0;
        $paidEmployees = 0;
        $totalPaid = 0;
        
        foreach ($employees as $employee) {
            $salary = EmployeeSalary::getCurrentSalary($employee->id);
            if ($salary) {
                $expectedPayroll += $salary->total_compensation;
            }
            
            $payment = PayrollRecord::forUser($employee->id)
                ->forMonth($monthDate)
                ->byStatus('paid')
                ->first();
            
            if ($payment) {
                $paidEmployees++;
                $totalPaid += $payment->net_amount;
            }
        }
        
        return response()->json([
            'month' => $monthDate->format('Y-m'),
            'total_employees' => $totalEmployees,
            'expected_payroll' => number_format($expectedPayroll, 2, '.', ''),
            'paid_employees' => $paidEmployees,
            'unpaid_employees' => $totalEmployees - $paidEmployees,
            'total_paid' => number_format($totalPaid, 2, '.', ''),
            'remaining' => number_format($expectedPayroll - $totalPaid, 2, '.', ''),
        ]);
    }

    /**
     * Get unpaid employees for a month
     */
    public function unpaidEmployees(Request $request, $month)
    {
        $user = $request->user();
        
        if (!$user->hasRole('ceo')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $monthDate = Carbon::parse($month)->startOfMonth();
        
        $employees = User::with(['branch', 'roles'])
            ->whereHas('roles', function ($q) {
                $q->whereIn('name', ['worker', 'secretary']);
            })
            ->get()
            ->filter(function ($employee) use ($monthDate) {
                $payment = PayrollRecord::forUser($employee->id)
                    ->forMonth($monthDate)
                    ->byStatus('paid')
                    ->first();
                
                return !$payment;
            })
            ->map(function ($employee) {
                $salary = EmployeeSalary::getCurrentSalary($employee->id);
                
                return [
                    'id' => $employee->id,
                    'name' => $employee->name,
                    'role' => $employee->roles->first()->name ?? 'N/A',
                    'branch' => $employee->branch->name ?? 'N/A',
                    'expected_amount' => $salary ? $salary->total_compensation : 0,
                ];
            })
            ->values();
        
        return response()->json($employees);
    }
}
