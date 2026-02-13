<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Check if permission exists first to avoid easier issues
        if (!\Spatie\Permission\Models\Permission::where('name', 'create_workers')->exists()) {
            \Spatie\Permission\Models\Permission::create(['name' => 'create_workers']);
        }

        // Assign to roles
        $roles = ['super_admin', 'ceo', 'secretary'];
        foreach ($roles as $roleName) {
            $role = \Spatie\Permission\Models\Role::where('name', $roleName)->first();
            if ($role) {
                $role->givePermissionTo('create_workers');
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Remove permission from roles and delete
        $permission = \Spatie\Permission\Models\Permission::where('name', 'create_workers')->first();
        if ($permission) {
            $permission->roles()->detach();
            $permission->delete();
        }
    }
};
