<?php

namespace Tests\Unit;

use App\Models\Customer;
use App\Models\Payment;
use App\Models\User;
use App\Services\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Carbon\Carbon;

class PaymentServiceTest extends TestCase
{
    use RefreshDatabase;

    protected $paymentService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->paymentService = app(PaymentService::class);
    }

    /**
     * Test recording a payment successfully
     */
    public function test_record_payment_successfully()
    {
        // Create test data
        $customer = Customer::factory()->create([
            'total_boxes' => 100,
            'boxes_filled' => 0,
            'price_per_box' => 1000,
            'total_amount' => 100000,
            'amount_paid' => 0,
        ]);

        $paymentData = [
            'payment_amount' => 5000,
            'payment_date' => Carbon::today(),
            'payment_method' => 'cash',
        ];

        // Act
        $payment = $this->paymentService->recordPayment($customer, $paymentData);

        // Assert
        $this->assertInstanceOf(Payment::class, $payment);
        $this->assertEquals(5000, $payment->payment_amount);
        $this->assertEquals('cash', $payment->payment_method);
    }

    /**
     * Test payment prevents overpayment
     */
    public function test_payment_prevents_overpayment()
    {
        // Create customer with limited boxes
        $customer = Customer::factory()->create([
            'total_boxes' => 10,
            'boxes_filled' => 8,
            'price_per_box' => 1000,
        ]);

        // Try to overpay
        $paymentData = [
            'payment_amount' => 5000, // Exceeds remaining
            'payment_date' => Carbon::today(),
        ];

        // Assert exception is thrown
        $this->expectException(\Exception::class);
        $this->paymentService->recordPayment($customer, $paymentData);
    }

    /**
     * Test payment updates customer balance
     */
    public function test_payment_updates_customer_balance()
    {
        $customer = Customer::factory()->create([
            'total_boxes' => 100,
            'boxes_filled' => 0,
            'price_per_box' => 1000,
            'amount_paid' => 0,
        ]);

        $initialBalance = $customer->balance;

        $paymentData = [
            'payment_amount' => 10000,
            'payment_date' => Carbon::today(),
        ];

        $this->paymentService->recordPayment($customer, $paymentData);

        $customer->refresh();
        $this->assertLessThan($initialBalance, $customer->balance);
    }
}
