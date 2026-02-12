<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use App\Models\Company;

class SuperAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Ensure default company exists
        $company = Company::find(1);
        if (!$company) {
            $company = Company::create([
                'id' => 1,
                'name' => 'O.B.Mighty',
                'domain' => 'localhost',
                'is_active' => true
            ]);
        }

        // Create Super Admin User
        $user = User::withoutGlobalScopes()->where('email', 'joenyarko2001@gmail.com')->first();

        if (!$user) {
            $user = User::create([
                'name' => 'Super Admin',
                'email' => 'joenyarko2001@gmail.com',
                'password' => Hash::make('joe@nyarko1234'),
                'company_id' => $company->id,
                'status' => 'active',
                'phone' => '0555555555', // Placeholder
                // 'branch_id' => 1, // Optional, might be required depending on validation, but table allows null typically? Let's assume nullable or ID 1 exists.
            ]);
        } else {
            // Update password if exists
            $user->password = Hash::make('joe@nyarko1234');
            $user->save();
        }

        // Assign Role
        $user->assignRole('super_admin');
        
        $this->command->info('Super Admin user created: joenyarko2001@gmail.com');
    }
}
