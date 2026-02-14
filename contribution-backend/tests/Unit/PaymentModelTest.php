<?php

namespace Tests\Unit;

use App\Models\Payment;
use App\Models\Customer;
use App\Models\User;
use App\Models\Company;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentModelTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test payment belongs to customer
     */
    public function test_payment_belongs_to_customer()
    {
        $customer = Customer::factory()->create();
        $payment = Payment::factory()->create(['customer_id' => $customer->id]);

        $this->assertEquals($customer->id, $payment->customer->id);
    }

    /**
     * Test payment belongs to user
     */
    public function test_payment_belongs_to_user()
    {
        $company = Company::factory()->create();
        $user = User::factory()->create(['company_id' => $company->id]);
        $payment = Payment::factory()->create(['recorded_by' => $user->id]);

        $this->assertEquals($user->id, $payment->user->id);
    }

    /**
     * Test payment belongs to company
     */
    public function test_payment_belongs_to_company()
    {
        $company = Company::factory()->create();
        $payment = Payment::factory()->create(['company_id' => $company->id]);

        $this->assertEquals($company->id, $payment->company->id);
    }

    /**
     * Test payment amount is stored correctly
     */
    public function test_payment_amount_stored_correctly()
    {
        $payment = Payment::factory()->create(['amount' => 1500.50]);

        $this->assertEquals(1500.50, $payment->amount);
    }

    /**
     * Test payment date is stored correctly
     */
    public function test_payment_date_stored_correctly()
    {
        $paymentDate = now()->subDays(5);
        $payment = Payment::factory()->create(['payment_date' => $paymentDate]);

        $this->assertEquals($paymentDate->toDateString(), $payment->payment_date->toDateString());
    }

    /**
     * Test payment method attribute
     */
    public function test_payment_method_attribute()
    {
        $payment = Payment::factory()->create(['payment_method' => 'cash']);

        $this->assertEquals('cash', $payment->payment_method);
    }

    /**
     * Test payment status defaults to completed
     */
    public function test_payment_status_defaults_to_completed()
    {
        $payment = Payment::factory()->create(['status' => 'completed']);

        $this->assertEquals('completed', $payment->status);
    }

    /**
     * Test payment remarks field
     */
    public function test_payment_remarks_field()
    {
        $payment = Payment::factory()->create(['remarks' => 'Payment for invoice #123']);

        $this->assertEquals('Payment for invoice #123', $payment->remarks);
    }

    /**
     * Test payment scoping by company
     */
    public function test_payment_scoped_by_company()
    {
        $company1 = Company::factory()->create();
        $company2 = Company::factory()->create();

        Payment::factory(4)->create(['company_id' => $company1->id]);
        Payment::factory(3)->create(['company_id' => $company2->id]);

        $this->assertCount(4, Payment::where('company_id', $company1->id)->get());
        $this->assertCount(3, Payment::where('company_id', $company2->id)->get());
    }

    /**
     * Test payment soft delete
     */
    public function test_payment_soft_delete()
    {
        $payment = Payment::factory()->create();
        $paymentId = $payment->id;

        $payment->delete();

        $this->assertSoftDeleted('payments', ['id' => $paymentId]);
    }
}
