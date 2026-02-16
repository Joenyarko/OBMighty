<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
        ]);

        // 1. Create Neziz Company (Default Super Admin Company)
        $company = \App\Models\Company::firstOrCreate(
            ['domain' => 'neziz'], // Identifier
            [
                'name' => 'Neziz',
                'subdomain' => 'neziz',
                'is_active' => true,
                'logo_url' => '/Neziz-logo2.png', // Correct path relative to public/
            ]
        );

        // 2. Create Super Admin User
        $superAdmin = \App\Models\User::firstOrCreate(
            ['email' => 'neziz@gmail.com'],
            [
                'name' => 'Super Admin',
                'password' => \Illuminate\Support\Facades\Hash::make('Neziz@1234'),
                'status' => 'active',
                'company_id' => $company->id,
                'branch_id' => null,
            ]
        );

        $superAdmin->assignRole('super_admin');

        $this->command->info('Production Seeding Complete.');
        $this->command->info('Company: Neziz');
        $this->command->info('User: neziz@gmail.com / Neziz@1234');
    }
}
