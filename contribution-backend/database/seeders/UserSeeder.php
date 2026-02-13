<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create CEO User
        $ceo = User::create([
            'name' => 'CEO',
            'email' => 'admin@obmighty.com',
            'password' => Hash::make(env('DEFAULT_USER_PASSWORD', 'password')),
            'status' => 'active',
            'branch_id' => null, // CEO sees all
        ]);
        
        $ceo->assignRole('ceo');
        
        $this->command->info('CEO User created successfully.');
        $this->command->info('Email: admin@obmighty.com');
        $this->command->info('Password: password123');
    }
}
