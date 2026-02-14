<?php

namespace Tests\Unit;

use App\Models\Customer;
use App\Models\Company;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerModelTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test customer belongs to company
     */
    public function test_customer_belongs_to_company()
    {
        $company = Company::factory()->create();
        $customer = Customer::factory()->create(['company_id' => $company->id]);

        $this->assertEquals($company->id, $customer->company->id);
    }

    /**
     * Test customer has many payments relationship
     */
    public function test_customer_has_many_payments()
    {
        $customer = Customer::factory()->create();
        $customer->payments()->createMany([
            ['amount' => 100, 'payment_date' => now()],
            ['amount' => 200, 'payment_date' => now()],
        ]);

        $this->assertCount(2, $customer->payments);
    }

    /**
     * Test customer can calculate total paid
     */
    public function test_customer_total_paid_calculation()
    {
        $customer = Customer::factory()->create();
        $customer->payments()->createMany([
            ['amount' => 100, 'payment_date' => now()],
            ['amount' => 200, 'payment_date' => now()],
        ]);

        $this->assertEquals(300, $customer->payments->sum('amount'));
    }

    /**
     * Test customer remaining balance calculation
     */
    public function test_customer_remaining_balance_calculation()
    {
        $customer = Customer::factory()->create(['total_balance' => 1000]);
        $customer->payments()->createMany([
            ['amount' => 300, 'payment_date' => now()],
        ]);

        $totalPaid = $customer->payments->sum('amount');
        $remaining = $customer->total_balance - $totalPaid;

        $this->assertEquals(700, $remaining);
    }

    /**
     * Test customer status attribute
     */
    public function test_customer_status_attribute()
    {
        $customer = Customer::factory()->create(['status' => 'active']);

        $this->assertEquals('active', $customer->status);
    }

    /**
     * Test customer has payment cards relationship
     */
    public function test_customer_has_many_cards()
    {
        $customer = Customer::factory()->create();
        $customer->cards()->createMany([
            ['card_number' => '1234', 'card_type' => 'visa'],
            ['card_number' => '5678', 'card_type' => 'mastercard'],
        ]);

        $this->assertCount(2, $customer->cards);
    }

    /**
     * Test customer scoping by company
     */
    public function test_customer_scoped_by_company()
    {
        $company1 = Company::factory()->create();
        $company2 = Company::factory()->create();

        Customer::factory(3)->create(['company_id' => $company1->id]);
        Customer::factory(2)->create(['company_id' => $company2->id]);

        $this->assertCount(3, Customer::where('company_id', $company1->id)->get());
        $this->assertCount(2, Customer::where('company_id', $company2->id)->get());
    }
}
