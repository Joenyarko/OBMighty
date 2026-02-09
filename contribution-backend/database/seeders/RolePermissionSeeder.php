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

        // Create permissions
        $permissions = [
            'manage_branches',
            'manage_users',
            'manage_cards',
            'view_all_branches',
            'view_own_branch',
            'manage_customers',
            'record_payments',
            'view_reports',
            'manage_inventory',
            'manage_accounting',
        ];

        foreach ($permissions as $permission) {
            Permission::create(['name' => $permission]);
        }

        // Create roles and assign permissions
        $ceo = Role::create(['name' => 'ceo']);
        $ceo->givePermissionTo(Permission::all());

        $secretary = Role::create(['name' => 'secretary']);
        $secretary->givePermissionTo([
            'view_own_branch',
            'manage_customers',
            'record_payments',
            'view_reports',
        ]);

        $worker = Role::create(['name' => 'worker']);
        $worker->givePermissionTo([
            'manage_customers',
            'record_payments',
            'view_reports',
        ]);
    }
}
