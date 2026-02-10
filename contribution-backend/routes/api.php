<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BranchController;
use App\Http\Controllers\Api\CardController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\AccountingController;
use App\Http\Controllers\Api\SalesController;
use App\Http\Controllers\Api\SurplusController;
use App\Http\Controllers\Api\PayrollController;
use App\Http\Controllers\Api\CustomerCardController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1'); // 5 attempts per minute

// Debug Fix Route (Temporary) - Public
Route::get('/debug/fix-data', function () {
    $log = [];
    
    // 1. Fix Cards (Definitions)
    $cards = \App\Models\Card::all();
    foreach ($cards as $card) {
        if ($card->amount <= 50 && $card->number_of_boxes > 50) {
            $oldAmount = $card->amount;
            $newAmount = $oldAmount * $card->number_of_boxes;
            $card->amount = $newAmount;
            $card->save();
            $log[] = "Updated Card {$card->card_name}: Amount {$oldAmount} -> {$newAmount}";
        }
    }
    
    // 2. Fix Customers
    $customers = \App\Models\Customer::with('card')->get();
    foreach ($customers as $customer) {
        if (!$customer->card) continue;
        if ($customer->total_amount <= 50 && $customer->total_boxes > 50) {
            $correctAmount = $customer->card->amount;
            if ($correctAmount > 50) {
                $customer->total_amount = $correctAmount;
                $customer->balance = $correctAmount - $customer->amount_paid;
                $customer->save();
                $log[] = "Updated Customer {$customer->name}: Total {$customer->total_amount}";
            }
        }
    }
    
    // 3. Fix CustomerCards
    $customerCards = \App\Models\CustomerCard::all();
    foreach ($customerCards as $cc) {
        if ($cc->total_amount <= 50 && $cc->total_boxes > 50) {
            $card = \App\Models\Card::find($cc->card_id);
            if ($card && $card->amount > 50) {
                 $cc->total_amount = $card->amount;
                 $cc->amount_remaining = $card->amount - $cc->amount_paid;
                 $cc->save();
                 $log[] = "Updated CustomerCard #{$cc->id}: Total {$cc->total_amount}";
            }
        }
    }
    
    return response()->json(['status' => 'success', 'log' => $log]);
});

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth routes
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    
    // Common Admin Routes (CEO & Secretary)
    Route::middleware('role:ceo|secretary')->group(function () {
        Route::get('/branches', [BranchController::class, 'index']);
        Route::get('/branches/{branch}', [BranchController::class, 'show']);
        Route::apiResource('users', UserController::class);
    });

    // Branches & System (CEO & Secretary)
    Route::middleware('role:ceo|secretary')->group(function () {
        Route::apiResource('branches', BranchController::class)->except(['index', 'show']); // Create/Edit/Delete
        
        // Accounting & Expenses
        Route::get('/expenses', [AccountingController::class, 'index']);
        Route::post('/expenses', [AccountingController::class, 'store']);
        Route::get('/accounting/summary', [AccountingController::class, 'summary']);
        Route::get('/accounting/profit-loss', [AccountingController::class, 'profitLoss']);
    });

    // CEO Only Routes
    Route::middleware('role:ceo')->group(function () {
        // Card Management (Create/Update/Delete)
        Route::post('/cards', [CardController::class, 'store']);
        Route::put('/cards/{card}', [CardController::class, 'update']);
        Route::delete('/cards/{card}', [CardController::class, 'destroy']);
        
        // Inventory
        Route::apiResource('inventory', InventoryController::class);
        Route::post('/inventory/{id}/movement', [InventoryController::class, 'recordMovement']);
        Route::get('/inventory/low-stock', [InventoryController::class, 'lowStock']);
    });

    // Customers (All roles, scoped by policy)
    Route::apiResource('customers', CustomerController::class);

    // Cards (View All - Accessible to Workers/Secretary/CEO for selection)
    Route::get('/cards', [CardController::class, 'index']);
    Route::get('/cards/{card}', [CardController::class, 'show']);
    
    // Payments (All roles, scoped by policy)
    Route::post('/payments/bulk', [PaymentController::class, 'bulkStore']);
    Route::apiResource('payments', PaymentController::class)->only(['index', 'store']);
    
    // Customer Transfer (CEO only)
    Route::post('/customers/{id}/transfer', [CustomerController::class, 'transfer'])->middleware('role:ceo');
    
    // Sales (All roles, scoped by controller logic)
    Route::prefix('sales')->group(function () {
        Route::get('/', [SalesController::class, 'index']);
        Route::get('/{worker}', [SalesController::class, 'show']);
        Route::get('/{worker}/statistics', [SalesController::class, 'statistics']);
        Route::get('/{worker}/performance', [SalesController::class, 'performance']);
    });
    
    // Surplus (CEO and Secretary only)
    Route::prefix('surplus')->middleware('role:ceo|secretary')->group(function () {
        Route::get('/', [SurplusController::class, 'index']);
        Route::post('/', [SurplusController::class, 'store']);
        Route::get('/{id}', [SurplusController::class, 'show']);
        Route::put('/{id}', [SurplusController::class, 'update']);
        Route::delete('/{id}', [SurplusController::class, 'destroy']);
        Route::post('/{id}/allocate', [SurplusController::class, 'allocate']);
        Route::post('/{id}/withdraw', [SurplusController::class, 'withdraw']);
    });
    
    // Payroll (CEO only)
    Route::prefix('payroll')->middleware('role:ceo')->group(function () {
        Route::get('/employees', [PayrollController::class, 'employees']);
        Route::get('/employees/{id}', [PayrollController::class, 'employeeDetails']);
        Route::post('/salaries', [PayrollController::class, 'setSalary']);
        Route::get('/records', [PayrollController::class, 'records']);
        Route::post('/records', [PayrollController::class, 'recordPayment']);
        Route::get('/records/{id}', [PayrollController::class, 'recordDetails']);
        Route::get('/summary/{month}', [PayrollController::class, 'monthlySummary']);
        Route::get('/unpaid/{month}', [PayrollController::class, 'unpaidEmployees']);
    });
    
    // Customer Cards & Box Tracking (All roles, scoped by policy)
    Route::prefix('customer-cards')->group(function () {
        Route::post('/assign', [CustomerCardController::class, 'assign']);
        Route::get('/customer/{customerId}', [CustomerCardController::class, 'getCustomerCard']);
        Route::post('/{id}/check-boxes', [CustomerCardController::class, 'checkBoxes']);
        Route::get('/{id}/box-states', [CustomerCardController::class, 'getBoxStates']);
        Route::get('/{id}/daily-sales', [CustomerCardController::class, 'getDailySales']);
        Route::get('/{id}/payment-history', [CustomerCardController::class, 'getPaymentHistory']);
        Route::get('/', [CustomerCardController::class, 'index']);
        Route::get('/worker/daily-sales', [CustomerCardController::class, 'getWorkerDailySales']);
    });
    
        Route::delete('/box-payments/{id}', function ($id, Request $request) {
            $user = $request->user();
            
            // Only allow CEO and Secretary roles
            if ($user->hasRole(['ceo', 'secretary'])) {
                return app(CustomerCardController::class)->reversePayment($id);
            }

            return response()->json([
                'message' => 'Unauthorized. Only CEO and Secretary can reverse payments.'
            ], 403);
        });

        Route::patch('/box-payments/{id}', function ($id, Request $request) {
             $user = $request->user();
             
             // Only allow CEO and Secretary roles
             if ($user->hasRole(['ceo', 'secretary'])) {
                 return app(CustomerCardController::class)->adjustPayment($request, $id);
             }

             return response()->json([
                 'message' => 'Unauthorized. Only CEO and Secretary can adjust payments.'
             ], 403);
         });
    
    // Reports
    Route::prefix('reports')->group(function () {
        Route::get('/daily', [ReportController::class, 'daily']);
        Route::get('/weekly', [ReportController::class, 'weekly']);
        Route::get('/monthly', [ReportController::class, 'monthly']);
        Route::get('/worker-performance', [ReportController::class, 'workerPerformance']);
        Route::get('/defaulting-customers', [ReportController::class, 'defaultingCustomers']);
    });
    // Permission Management (CEO only)
    Route::middleware('role:ceo')->group(function () {
        Route::get('/permissions', [App\Http\Controllers\Api\PermissionController::class, 'index']);
        Route::post('/users/{id}/permissions', [App\Http\Controllers\Api\PermissionController::class, 'syncUserPermissions']);
        
        // Role Management
        Route::get('/roles', [App\Http\Controllers\Api\RoleController::class, 'index']);
        Route::get('/roles/{id}', [App\Http\Controllers\Api\RoleController::class, 'show']);
        Route::post('/roles/{id}/permissions', [App\Http\Controllers\Api\RoleController::class, 'syncPermissions']);
    });
});
