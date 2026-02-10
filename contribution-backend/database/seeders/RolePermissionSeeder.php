<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // 1. Define all permissions
        $permissions = [
            // Dashboard
            'view_dashboard',
            
            // Customers
            'view_customers',
            'create_customers',
            'edit_customers',
            'delete_customers',
            
            // Payments
            'record_payments',
            'view_payments',
            'reverse_payments', // CEO/Secretary only
            
            // Sales
            'view_sales',
             
            // Cards & Box Tracking
            'view_cards',
            'manage_cards', // CEO only
            'track_boxes',
            
            // Inventory
            'view_inventory',
            'manage_inventory', // Add/Edit stock
            'adjust_stock',     // CEO/Secretary
            
            // Branches
            'view_branches',
            'manage_branches', // CEO
            
            // Users
            'view_users',
            'manage_users', // CEO/Secretary
            'manage_permissions', // CEO only
            
            // Accounting
            'view_accounting',
            'manage_expenses',
            
            // Payroll
            'view_payroll',
            'manage_payroll', // CEO
            
            // Surplus
            'view_surplus',
            'manage_surplus', // CEO/Secretary

            // Reports
            'view_reports',
            
            // Settings
            'view_settings',
            'manage_settings',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // 2. Create Roles
        $ceo = Role::firstOrCreate(['name' => 'ceo']);
        $secretary = Role::firstOrCreate(['name' => 'secretary']);
        $worker = Role::firstOrCreate(['name' => 'worker']);

        // 3. Assign Permissions to Roles

        // CEO: All permissions
        $ceo->givePermissionTo(Permission::all());

        // Secretary: Branch management, users (limited), all operational
        $secretary->givePermissionTo([
            'view_dashboard',
            'view_customers', 'create_customers', 'edit_customers',
            'record_payments', 'view_payments', 'reverse_payments',
            'view_sales',
            'view_cards', 'track_boxes',
            'view_inventory', 'manage_inventory', 'adjust_stock',
            'view_users', 'manage_users', // Can create workers
            'view_surplus', 'manage_surplus',
            'view_reports',
            'view_branches', // View own branch details
        ]);

        // Worker: Basic operations
        $worker->givePermissionTo([
            'view_dashboard',
            'view_customers', 'create_customers', // Can add customers
            'record_payments',
            'track_boxes',
            'view_inventory', // View only
        ]);
    }
}
