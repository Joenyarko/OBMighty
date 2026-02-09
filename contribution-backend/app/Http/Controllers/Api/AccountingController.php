<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\LedgerEntry;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AccountingController extends Controller
{
    /**
     * Get all expenses (CEO only)
     */
    public function index(Request $request)
    {
        $query = Expense::with('branch', 'creator')->orderBy('expense_date', 'desc');

        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('expense_date', [$request->start_date, $request->end_date]);
        }

        $expenses = $query->paginate(20);
        return response()->json($expenses);
    }

    /**
     * Record a new expense
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'category' => 'required|string|max:100',
            'description' => 'required|string',
            'amount' => 'required|numeric|min:0',
            'expense_date' => 'required|date',
            'payment_method' => 'required|in:cash,bank_transfer,mobile_money',
            'receipt_number' => 'nullable|string|max:50',
        ]);

        $expense = Expense::create([
            ...$validated,
            'created_by' => auth()->id(),
        ]);

        // Auto-create ledger entry
        LedgerEntry::create([
            'entry_date' => $validated['expense_date'],
            'account_type' => 'expense',
            'category' => $validated['category'],
            'description' => $validated['description'],
            'debit' => $validated['amount'],
            'reference_type' => 'expense',
            'reference_id' => $expense->id,
            'created_by' => auth()->id(),
        ]);

        return response()->json([
            'message' => 'Expense recorded successfully',
            'expense' => $expense,
        ], 201);
    }

    /**
     * Get financial summary (Profit & Loss)
     */
    public function summary(Request $request)
    {
        $startDate = $request->input('start_date', Carbon::now()->startOfMonth());
        $endDate = $request->input('end_date', Carbon::now()->endOfMonth());

        // Calculate Income from Payments via Ledger or creating aggregate query
        // For simplicity, we'll query Ledger for 'income' vs 'expense'
        
        $income = LedgerEntry::where('account_type', 'income')
            ->whereBetween('entry_date', [$startDate, $endDate])
            ->sum('credit');

        $expenses = LedgerEntry::where('account_type', 'expense')
            ->whereBetween('entry_date', [$startDate, $endDate])
            ->sum('debit');

        $netProfit = $income - $expenses;

        return response()->json([
            'period' => [
                'start' => $startDate,
                'end' => $endDate,
            ],
            'total_income' => $income,
            'total_expenses' => $expenses,
            'net_profit' => $netProfit,
        ]);
    }

    /**
     * Get Profit & Loss Report
     */
    public function profitLoss()
    {
        // Similar to summary but broken down by category
        // Implementation for detailed categorization would go here
        return $this->summary(request());
    }
}
