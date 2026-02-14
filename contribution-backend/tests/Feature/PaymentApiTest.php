<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PaymentApiTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $company;

    protected function setUp(): void
    {
        parent::setUp();

        // Create company and user
        $this->company = Company::factory()->create();
        $this->user = User::factory()->create([
            'company_id' => $this->company->id,
        ]);
        $this->user->assignRole('ceo');
    }

    /**
     * Test user can create a payment
     */
    public function test_authenticated_user_can_create_payment()
    {
        Sanctum::actingAs($this->user);

        $customer = Customer::factory()->create([
            'company_id' => $this->company->id,
            'worker_id' => $this->user->id,
        ]);

        $response = $this->postJson('/api/payments', [
            'customer_id' => $customer->id,
            'payment_amount' => 5000,
            'payment_method' => 'cash',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('payments', [
            'customer_id' => $customer->id,
            'payment_amount' => 5000,
        ]);
    }

    /**
     * Test user cannot create payment without authentication
     */
    public function test_unauthenticated_user_cannot_create_payment()
    {
        $response = $this->postJson('/api/payments', [
            'customer_id' => 1,
            'payment_amount' => 5000,
        ]);

        $response->assertStatus(401);
    }

    /**
     * Test CEO can view all payments
     */
    public function test_ceo_can_view_all_payments()
    {
        Sanctum::actingAs($this->user);

        $response = $this->getJson('/api/payments');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => []
        ]);
    }

    /**
     * Test payment validation
     */
    public function test_payment_validation()
    {
        Sanctum::actingAs($this->user);

        // Missing required fields
        $response = $this->postJson('/api/payments', [
            'payment_amount' => 5000,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['customer_id']);
    }
}
