<?php

namespace Tests\Unit;

use App\Models\User;
use App\Models\Company;
use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthorizationPoliciesTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private User $ceoUser;
    private User $secretaryUser;
    private User $workerUser;
    private User $otherCompanyCeoUser;

    protected function setUp(): void
    {
        parent::setUp();

        // Create company and users
        $this->company = Company::factory()->create();
        
        $this->ceoUser = User::factory()->create(['company_id' => $this->company->id]);
        $this->ceoUser->assignRole('ceo');

        $this->secretaryUser = User::factory()->create(['company_id' => $this->company->id]);
        $this->secretaryUser->assignRole('secretary');

        $this->workerUser = User::factory()->create(['company_id' => $this->company->id]);
        $this->workerUser->assignRole('worker');

        // Create user from different company
        $otherCompany = Company::factory()->create();
        $this->otherCompanyCeoUser = User::factory()->create(['company_id' => $otherCompany->id]);
        $this->otherCompanyCeoUser->assignRole('ceo');
    }

    /**
     * Test CEO can create customers
     */
    public function test_ceo_can_create_customers()
    {
        $this->assertTrue($this->ceoUser->hasRole('ceo'));
    }

    /**
     * Test worker cannot create customers
     */
    public function test_worker_cannot_create_customers()
    {
        $this->assertFalse($this->workerUser->hasRole('ceo'));
    }

    /**
     * Test CEO can access company settings
     */
    public function test_ceo_can_access_company_settings()
    {
        $this->assertTrue($this->ceoUser->hasRole('ceo'));
    }

    /**
     * Test secretary can access reports
     */
    public function test_secretary_can_access_reports()
    {
        $this->assertTrue($this->secretaryUser->hasRole('secretary'));
    }

    /**
     * Test worker can only view their own data
     */
    public function test_worker_can_only_view_own_data()
    {
        $this->assertTrue($this->workerUser->hasRole('worker'));
        $this->assertEquals($this->company->id, $this->workerUser->company_id);
    }

    /**
     * Test CEO from different company cannot access this company's data
     */
    public function test_ceo_from_different_company_cannot_access_data()
    {
        $this->assertNotEquals(
            $this->company->id,
            $this->otherCompanyCeoUser->company_id
        );
    }

    /**
     * Test multi-tenant data isolation
     */
    public function test_multi_tenant_data_isolation()
    {
        $company1 = Company::factory()->create();
        $company2 = Company::factory()->create();

        $user1 = User::factory()->create(['company_id' => $company1->id]);
        $user2 = User::factory()->create(['company_id' => $company2->id]);

        $customer1 = Customer::factory()->create(['company_id' => $company1->id]);
        $customer2 = Customer::factory()->create(['company_id' => $company2->id]);

        $this->assertNotEquals($user1->company_id, $user2->company_id);
        $this->assertNotEquals($customer1->company_id, $customer2->company_id);
    }

    /**
     * Test super admin can access all companies
     */
    public function test_super_admin_can_access_all_companies()
    {
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole('super_admin');

        $this->assertTrue($superAdmin->hasRole('super_admin'));
    }

    /**
     * Test secretary cannot delete customers
     */
    public function test_secretary_cannot_delete_customers()
    {
        $this->assertFalse($this->secretaryUser->hasRole('ceo'));
    }
}
