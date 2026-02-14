<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CustomerApiTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private User $ceoUser;
    private User $secretaryUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::factory()->create();
        
        $this->ceoUser = User::factory()->create([
            'company_id' => $this->company->id,
        ]);
        $this->ceoUser->assignRole('ceo');

        $this->secretaryUser = User::factory()->create([
            'company_id' => $this->company->id,
        ]);
        $this->secretaryUser->assignRole('secretary');
    }

    /**
     * Test CEO can list all customers
     */
    public function test_ceo_can_list_all_customers()
    {
        Customer::factory(5)->create(['company_id' => $this->company->id]);

        Sanctum::actingAs($this->ceoUser);

        $response = $this->getJson('/api/customers');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                '*' => ['id', 'name', 'email', 'phone', 'total_balance', 'status']
            ],
            'meta' => ['total', 'per_page', 'current_page']
        ]);
        $response->assertJsonCount(5, 'data');
    }

    /**
     * Test CEO can create a new customer
     */
    public function test_ceo_can_create_customer()
    {
        Sanctum::actingAs($this->ceoUser);

        $response = $this->postJson('/api/customers', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'phone' => '1234567890',
            'total_balance' => 5000,
            'payment_method' => 'cash',
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('data.name', 'John Doe');
        $this->assertDatabaseHas('customers', [
            'email' => 'john@example.com',
            'company_id' => $this->company->id,
        ]);
    }

    /**
     * Test secretary cannot create customer (authorization)
     */
    public function test_secretary_cannot_create_customer()
    {
        Sanctum::actingAs($this->secretaryUser);

        $response = $this->postJson('/api/customers', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'phone' => '1234567890',
            'total_balance' => 5000,
        ]);

        $response->assertStatus(403);
    }

    /**
     * Test CEO can update customer
     */
    public function test_ceo_can_update_customer()
    {
        $customer = Customer::factory()->create(['company_id' => $this->company->id]);

        Sanctum::actingAs($this->ceoUser);

        $response = $this->putJson("/api/customers/{$customer->id}", [
            'name' => 'Updated Name',
            'email' => 'updated@example.com',
            'phone' => '9876543210',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('customers', [
            'id' => $customer->id,
            'name' => 'Updated Name',
        ]);
    }

    /**
     * Test CEO can delete customer
     */
    public function test_ceo_can_delete_customer()
    {
        $customer = Customer::factory()->create(['company_id' => $this->company->id]);

        Sanctum::actingAs($this->ceoUser);

        $response = $this->deleteJson("/api/customers/{$customer->id}");

        $response->assertStatus(200);
        $this->assertSoftDeleted('customers', ['id' => $customer->id]);
    }

    /**
     * Test customer validation on create
     */
    public function test_customer_validation_on_create()
    {
        Sanctum::actingAs($this->ceoUser);

        $response = $this->postJson('/api/customers', [
            'name' => '',
            'email' => 'invalid-email',
            'phone' => '',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['name', 'email', 'phone']);
    }

    /**
     * Test unauthenticated user cannot access customers
     */
    public function test_unauthenticated_user_cannot_access_customers()
    {
        $response = $this->getJson('/api/customers');

        $response->assertStatus(401);
    }
}
