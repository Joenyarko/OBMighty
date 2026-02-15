<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Company;
use App\Models\User;
use App\Models\Branch;
use App\Models\Customer;
use App\Models\Payment;
use App\Models\Card;
use App\Models\Expense;
use Carbon\Carbon;
use Illuminate\Support\Facades\Hash;

class SampleDataSeeder extends Seeder
{
    /**
     * Run the database seeds to create sample data for testing
     */
    public function run(): void
    {
        // Get the Neziz company
        $company = Company::where('name', 'Neziz')->first();

        if (!$company) {
            $this->command->error("Company 'Neziz' not found. Please run DatabaseSeeder first.");
            return;
        }

        $this->command->info("Seeding sample data for company: {$company->name}");

        // 1. Create CEO user if not exists
        $ceo = User::firstOrCreate(
            ['email' => 'ceo@neziz.com'],
            [
                'name' => 'CEO User',
                'password' => Hash::make('password123'),
                'company_id' => $company->id,
                'status' => 'active',
            ]
        );
        $ceo->assignRole('ceo');
        $this->command->info("✓ CEO user created: {$ceo->email}");

        // 2. Create workers
        $workers = [];
        for ($i = 1; $i <= 3; $i++) {
            $worker = User::firstOrCreate(
                ['email' => "worker{$i}@neziz.com"],
                [
                    'name' => "Worker {$i}",
                    'password' => Hash::make('password123'),
                    'company_id' => $company->id,
                    'status' => 'active',
                ]
            );
            $worker->assignRole('worker');
            $workers[] = $worker;
        }
        $this->command->info("✓ Created " . count($workers) . " workers");

        // 3. Create branches
        $branches = [];
        $branchNames = ['Main Branch', 'Downtown Branch', 'Shopping Mall Branch'];
        foreach ($branchNames as $name) {
            $branch = Branch::firstOrCreate(
                ['name' => $name, 'company_id' => $company->id],
                [
                    'company_id' => $company->id,
                    'code' => strtoupper(str_replace(' ', '', $name)),
                    'address' => '123 Sample Street, City',
                    'phone' => '08000000000',
                    'status' => 'active',
                ]
            );
            $branches[] = $branch;
        }
        $this->command->info("✓ Created " . count($branches) . " branches");

        // 4. Create card templates
        $cards = [];
        $cardNames = ['Premium Card', 'Standard Card', 'Basic Card'];
        foreach ($cardNames as $name) {
            $card = Card::firstOrCreate(
                ['card_name' => $name, 'company_id' => $company->id],
                [
                    'company_id' => $company->id,
                    'card_name' => $name,
                    'amount' => rand(5000, 50000),
                    'number_of_boxes' => rand(10, 100),
                    'status' => 'active',
                ]
            );
            $cards[] = $card;
        }
        $this->command->info("✓ Created " . count($cards) . " card templates");

        // 5. Create customers
        $customers = [];
        $firstNames = ['John', 'Jane', 'Chioma', 'Emeka', 'Ayesha', 'Mohammed', 'Blessing'];
        $lastNames = ['Smith', 'Johnson', 'Okafor', 'Eze', 'Ibrahim', 'Adeyemi', 'Nwankwo'];

        for ($i = 0; $i < 15; $i++) {
            $firstName = $firstNames[array_rand($firstNames)];
            $lastName = $lastNames[array_rand($lastNames)];
            $branch = $branches[array_rand($branches)];
            $worker = $workers[array_rand($workers)];
            $card = $cards[array_rand($cards)];
            $statuses = ['in_progress', 'completed', 'completed', 'completed']; // More completed than in progress

            $customer = Customer::create([
                'company_id' => $company->id,
                'branch_id' => $branch->id,
                'worker_id' => $worker->id,
                'card_id' => $card->id,
                'name' => "$firstName $lastName " . uniqid(),
                'phone' => '080' . rand(10000000, 99999999),
                'location' => 'Sample Location',
                'total_boxes' => rand(10, 100),
                'boxes_filled' => rand(0, 100),
                'price_per_box' => rand(1000, 10000),
                'total_amount' => rand(100000, 1000000),
                'amount_paid' => rand(50000, 900000),
                'status' => $statuses[array_rand($statuses)],
                'is_served' => false,
            ]);
            $customers[] = $customer;
        }
        $this->command->info("✓ Created " . count($customers) . " customers");

        // 6. Create payments (transactions with revenue data)
        $paymentMethods = ['cash', 'bank_transfer', 'card', 'mobile_money'];
        $paymentCount = 0;

        for ($i = 0; $i < 20; $i++) {
            $customer = $customers[array_rand($customers)];
            $worker = $workers[array_rand($workers)];
            $daysAgo = rand(0, 29);
            $paymentDate = Carbon::now()->subDays($daysAgo);

            try {
                $payment = Payment::create([
                    'company_id' => $company->id,
                    'customer_id' => $customer->id,
                    'worker_id' => $worker->id,
                    'branch_id' => $customer->branch_id,
                    'payment_amount' => rand(5000, 100000),
                    'boxes_filled' => rand(0, 100),
                    'payment_method' => $paymentMethods[array_rand($paymentMethods)],
                    'payment_date' => $paymentDate,
                    'reference_number' => 'REF-' . uniqid(),
                    'notes' => 'Sample payment for testing',
                    'created_by' => $worker->id,
                ]);
                $paymentCount++;
            } catch (\Exception $e) {
                // Skip payment if there are issues
            }
        }
        $this->command->info("✓ Created {$paymentCount} payments");

        $this->command->info("\n✓ Sample data seeding complete!");
        $this->command->info("CEO Login: ceo@neziz.com / password123");
    }
}
