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

// Public CORS routes for storage/logos
Route::middleware(['cors.storage'])->group(function () {
    Route::get('/storage/logos/{filename}', function ($filename) {
        $path = storage_path('app/public/logos/' . $filename);
        if (!file_exists($path)) {
            return response()->json(['message' => 'File not found'], 404);
        }
        return response()->file($path);
    });
});

// Public routes
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1'); // 5 attempts per minute
Route::get('/config', [App\Http\Controllers\Api\ConfigController::class, 'index']);



// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    
    // Super Admin Routes (Global Access)
    Route::prefix('admin')
        ->middleware(['role:super_admin', 'super_admin'])
        ->group(function () {
            Route::apiResource('companies', \App\Http\Controllers\Api\Admin\CompanyController::class);
            Route::get('/stats', [\App\Http\Controllers\Api\Admin\AdminDashboardController::class, 'stats']);
            Route::get('/metrics', [\App\Http\Controllers\Api\Admin\AdminDashboardController::class, 'metrics']);
            Route::apiResource('users', \App\Http\Controllers\Api\Admin\UserController::class)->only(['index', 'show', 'store', 'update', 'destroy']);
            Route::post('/users/{id}/roles', [\App\Http\Controllers\Api\Admin\UserController::class, 'assignRole']);
    });

    // Auth routes
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/company/info', [App\Http\Controllers\Api\CompanySettingsController::class, 'getCompanyInfo']);
    Route::post('/profile', [AuthController::class, 'updateProfile']);
    
    // Company Settings (CEO only)
    Route::middleware('role:ceo')->group(function () {
        Route::get('/company/settings', [App\Http\Controllers\Api\CompanySettingsController::class, 'show']);
        Route::post('/company/settings', [App\Http\Controllers\Api\CompanySettingsController::class, 'update']);
        Route::post('/company/upload-logo', [App\Http\Controllers\Api\CompanySettingsController::class, 'uploadLogo']);
        Route::get('/company/profile', [App\Http\Controllers\Api\CompanySettingsController::class, 'profile']);
        Route::get('/company/dashboard', [App\Http\Controllers\Api\CompanyDashboardController::class, 'index']);
    });

    // Common Admin Routes (CEO & Secretary & Super Admin)
    // ADDED super_admin here
    Route::middleware('role:ceo|secretary|super_admin')->group(function () {
        Route::get('/branches', [BranchController::class, 'index']);
        Route::get('/branches/{branch}', [BranchController::class, 'show']);
        Route::apiResource('users', UserController::class);
    });

    // Branches & System (CEO & Secretary & Super Admin)
    // ADDED super_admin here
    Route::middleware('role:ceo|secretary|super_admin')->group(function () {
        Route::apiResource('branches', BranchController::class)->except(['index', 'show']); // Create/Edit/Delete
        
        // Accounting & Expenses
        Route::get('/expenses', [AccountingController::class, 'index']);
        Route::post('/expenses', [AccountingController::class, 'store']);
        Route::get('/accounting/summary', [AccountingController::class, 'summary']);
        Route::get('/accounting/ledger', [AccountingController::class, 'ledger']);
        Route::get('/accounting/profit-loss', [AccountingController::class, 'profitLoss']);
    });

    // CEO Only Routes (AND Super Admin)
    // ADDED super_admin here
    Route::middleware('role:ceo|super_admin')->group(function () {
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
    // ADDED super_admin here
    Route::post('/customers/{id}/transfer', [CustomerController::class, 'transfer'])->middleware('role:ceo|super_admin');

    // Customer Served (CEO and Secretary)
    // ADDED super_admin here
    Route::post('/customers/{id}/serve', [CustomerController::class, 'markAsServed'])->middleware('role:ceo|secretary|super_admin');
    
    // Sales (All roles, scoped by controller logic)
    Route::prefix('sales')->group(function () {
        Route::get('/', [SalesController::class, 'index']);
        Route::get('/{worker}', [SalesController::class, 'show']);
        Route::get('/{worker}/statistics', [SalesController::class, 'statistics']);
        Route::get('/{worker}/performance', [SalesController::class, 'performance']);
    });
    
    // Surplus (CEO and Secretary only)
    // ADDED super_admin here
    Route::prefix('surplus')->middleware('role:ceo|secretary|super_admin')->group(function () {
        Route::get('/', [SurplusController::class, 'index']);
        Route::post('/', [SurplusController::class, 'store']);
        Route::get('/{id}', [SurplusController::class, 'show']);
        Route::put('/{id}', [SurplusController::class, 'update']);
        Route::delete('/{id}', [SurplusController::class, 'destroy']);
        Route::post('/{id}/allocate', [SurplusController::class, 'allocate']);
        Route::post('/{id}/withdraw', [SurplusController::class, 'withdraw']);
    });
    
    // Payroll (CEO only)
    // ADDED super_admin here
    Route::prefix('payroll')->middleware('role:ceo|super_admin')->group(function () {
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
            // ADDED super_admin here
            if ($user->hasRole(['ceo', 'secretary', 'super_admin'])) {
                return app(CustomerCardController::class)->reversePayment($id);
            }

            return response()->json([
                'message' => 'Unauthorized. Only CEO and Secretary can reverse payments.'
            ], 403);
        });

        Route::patch('/box-payments/{id}', function ($id, Request $request) {
             $user = $request->user();
             
             // Only allow CEO and Secretary roles
             // ADDED super_admin here
             if ($user->hasRole(['ceo', 'secretary', 'super_admin'])) {
                 return app(CustomerCardController::class)->adjustPayment($request, $id);
             }

             return response()->json([
                 'message' => 'Unauthorized. Only CEO and Secretary can adjust payments.'
             ], 403);
         });
    
    // Audit Logs
    Route::get('/audit-logs', [App\Http\Controllers\Api\AuditLogController::class, 'index']);

    // Reports
    Route::prefix('reports')->group(function () {
        Route::get('/daily', [ReportController::class, 'daily']);
        Route::get('/weekly', [ReportController::class, 'weekly']);
        Route::get('/monthly', [ReportController::class, 'monthly']);
        Route::get('/worker-performance', [ReportController::class, 'workerPerformance']);
        Route::get('/defaulting-customers', [ReportController::class, 'defaultingCustomers']);
        
        // Enhanced Reports
        Route::get('/profitability', [\App\Http\Controllers\Api\EnhancedReportController::class, 'profitabilityAnalysis']);
        Route::get('/customer-performance', [\App\Http\Controllers\Api\EnhancedReportController::class, 'customerPerformance']);
        Route::get('/worker-productivity', [\App\Http\Controllers\Api\EnhancedReportController::class, 'workerProductivity']);
        Route::get('/inventory-status', [\App\Http\Controllers\Api\EnhancedReportController::class, 'inventoryStatus']);
        Route::get('/ledger', [\App\Http\Controllers\Api\EnhancedReportController::class, 'ledgerReport']);
        Route::get('/audit-trail', [\App\Http\Controllers\Api\EnhancedReportController::class, 'auditTrail']);
    });
    // Permission Management (CEO & Super Admin)
    Route::middleware('role:ceo|super_admin')->group(function () {
        Route::get('/permissions', [App\Http\Controllers\Api\PermissionController::class, 'index']);
        Route::post('/users/{id}/permissions', [App\Http\Controllers\Api\PermissionController::class, 'syncUserPermissions']);
        
        // Role Management
        Route::get('/roles', [App\Http\Controllers\Api\RoleController::class, 'index']);
        Route::get('/roles/{id}', [App\Http\Controllers\Api\RoleController::class, 'show']);
        Route::post('/roles/{id}/permissions', [App\Http\Controllers\Api\RoleController::class, 'syncPermissions']);
    });
});
