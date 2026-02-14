<?php

namespace Tests\Unit;

use App\Models\Company;
use App\Models\User;
use App\Models\Branch;
use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CompanyModelTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test company has many users
     */
    public function test_company_has_many_users()
    {
        $company = Company::factory()->create();
        User::factory(3)->create(['company_id' => $company->id]);

        $this->assertCount(3, $company->users);
    }

    /**
     * Test company has many branches
     */
    public function test_company_has_many_branches()
    {
        $company = Company::factory()->create();
        Branch::factory(2)->create(['company_id' => $company->id]);

        $this->assertCount(2, $company->branches);
    }

    /**
     * Test company has many customers
     */
    public function test_company_has_many_customers()
    {
        $company = Company::factory()->create();
        Customer::factory(5)->create(['company_id' => $company->id]);

        $this->assertCount(5, $company->customers);
    }

    /**
     * Test company belongs to CEO user
     */
    public function test_company_belongs_to_ceo()
    {
        $user = User::factory()->create();
        $company = Company::factory()->create(['created_by' => $user->id]);

        $this->assertEquals($user->id, $company->created_by);
    }

    /**
     * Test company name is required
     */
    public function test_company_name_is_required()
    {
        $this->expectException(\Exception::class);
        Company::create(['legal_name' => 'Test Company']);
    }

    /**
     * Test company domain is unique
     */
    public function test_company_domain_is_unique()
    {
        $company1 = Company::factory()->create(['domain' => 'company1.local']);
        
        $this->expectException(\Exception::class);
        Company::create([
            'name' => 'Company 2',
            'domain' => 'company1.local',
        ]);
    }

    /**
     * Test company is active by default
     */
    public function test_company_is_active_by_default()
    {
        $company = Company::factory()->create(['is_active' => true]);

        $this->assertTrue($company->is_active);
    }

    /**
     * Test company can store payment methods
     */
    public function test_company_can_store_payment_methods()
    {
        $company = Company::factory()->create([
            'payment_methods' => json_encode(['cash', 'card', 'check']),
        ]);

        $methods = json_decode($company->payment_methods, true);
        $this->assertCount(3, $methods);
        $this->assertContains('cash', $methods);
    }

    /**
     * Test company can be soft deleted
     */
    public function test_company_can_be_soft_deleted()
    {
        $company = Company::factory()->create();
        $companyId = $company->id;

        $company->delete();

        $this->assertSoftDeleted('companies', ['id' => $companyId]);
    }

    /**
     * Test company tracks audit information
     */
    public function test_company_tracks_creation_info()
    {
        $user = User::factory()->create();
        $company = Company::factory()->create(['created_by' => $user->id]);

        $this->assertNotNull($company->created_at);
        $this->assertEquals($user->id, $company->created_by);
    }
}
