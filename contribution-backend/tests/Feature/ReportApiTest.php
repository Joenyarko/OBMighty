<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Payment;
use App\Models\User;
use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReportApiTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private User $ceoUser;
    private User $secretaryUser;
    private User $workerUser;

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

        $this->workerUser = User::factory()->create([
            'company_id' => $this->company->id,
        ]);
        $this->workerUser->assignRole('worker');
    }

    /**
     * Test CEO can access profitability report
     */
    public function test_ceo_can_access_profitability_report()
    {
        Payment::factory(5)->create(['company_id' => $this->company->id]);

        Sanctum::actingAs($this->ceoUser);

        $response = $this->getJson('/api/reports/profitability');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                'total_revenue',
                'total_expenses',
                'profit',
                'profit_margin',
                'expense_breakdown'
            ]
        ]);
    }

    /**
     * Test secretary cannot access profitability report
     */
    public function test_secretary_cannot_access_profitability_report()
    {
        Sanctum::actingAs($this->secretaryUser);

        $response = $this->getJson('/api/reports/profitability');

        $response->assertStatus(403);
    }

    /**
     * Test CEO can access customer performance report
     */
    public function test_ceo_can_access_customer_performance_report()
    {
        Customer::factory(3)->create(['company_id' => $this->company->id]);

        Sanctum::actingAs($this->ceoUser);

        $response = $this->getJson('/api/reports/customer-performance');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                'status_distribution',
                'top_customers',
                'customers_by_worker'
            ]
        ]);
    }

    /**
     * Test CEO can access worker productivity report
     */
    public function test_ceo_can_access_worker_productivity_report()
    {
        Sanctum::actingAs($this->ceoUser);

        $response = $this->getJson('/api/reports/worker-productivity');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'worker_id',
                    'worker_name',
                    'total_revenue',
                    'customer_count',
                    'completion_rate'
                ]
            ]
        ]);
    }

    /**
     * Test CEO can access inventory status report
     */
    public function test_ceo_can_access_inventory_status_report()
    {
        Sanctum::actingAs($this->ceoUser);

        $response = $this->getJson('/api/reports/inventory-status');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                'total_items',
                'low_stock_count',
                'total_value',
                'items'
            ]
        ]);
    }

    /**
     * Test CEO can access ledger report
     */
    public function test_ceo_can_access_ledger_report()
    {
        Sanctum::actingAs($this->ceoUser);

        $response = $this->getJson('/api/reports/ledger');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                'total_debit',
                'total_credit',
                'entries'
            ]
        ]);
    }

    /**
     * Test CEO can access audit trail report
     */
    public function test_ceo_can_access_audit_trail_report()
    {
        Sanctum::actingAs($this->ceoUser);

        $response = $this->getJson('/api/reports/audit-trail');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'user_name',
                    'action',
                    'timestamp'
                ]
            ]
        ]);
    }

    /**
     * Test report filtering by date range
     */
    public function test_report_filtering_by_date_range()
    {
        Sanctum::actingAs($this->ceoUser);

        $response = $this->getJson('/api/reports/profitability?start_date=2024-01-01&end_date=2024-12-31');

        $response->assertStatus(200);
    }

    /**
     * Test worker cannot access reports
     */
    public function test_worker_cannot_access_reports()
    {
        Sanctum::actingAs($this->workerUser);

        $response = $this->getJson('/api/reports/profitability');

        $response->assertStatus(403);
    }
}
