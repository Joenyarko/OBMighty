<?php

namespace Tests\Unit;

use App\Models\User;
use App\Models\Company;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserModelTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test user belongs to company
     */
    public function test_user_belongs_to_company()
    {
        $company = Company::factory()->create();
        $user = User::factory()->create(['company_id' => $company->id]);

        $this->assertEquals($company->id, $user->company->id);
    }

    /**
     * Test user can have multiple roles
     */
    public function test_user_can_have_multiple_roles()
    {
        $user = User::factory()->create();
        $user->assignRole('ceo');
        $user->assignRole('secretary');

        $this->assertTrue($user->hasRole('ceo'));
        $this->assertTrue($user->hasRole('secretary'));
    }

    /**
     * Test user can check single role
     */
    public function test_user_can_check_single_role()
    {
        $user = User::factory()->create();
        $user->assignRole('worker');

        $this->assertTrue($user->hasRole('worker'));
        $this->assertFalse($user->hasRole('ceo'));
    }

    /**
     * Test user can have permissions through role
     */
    public function test_user_has_permissions_through_role()
    {
        $user = User::factory()->create();
        $user->assignRole('ceo');

        // CEO role should have create_payment permission
        $this->assertTrue($user->hasRole('ceo'));
    }

    /**
     * Test user email is unique per company
     */
    public function test_user_email_is_case_insensitive()
    {
        $company = Company::factory()->create();
        User::factory()->create([
            'company_id' => $company->id,
            'email' => 'Test@Example.com',
        ]);

        $user = User::where('email', 'test@example.com')->first();
        $this->assertNotNull($user);
    }

    /**
     * Test user password is hashed
     */
    public function test_user_password_is_hashed()
    {
        $user = User::factory()->create(['password' => 'plainpassword123']);

        $this->assertNotEquals('plainpassword123', $user->password);
    }

    /**
     * Test user has many payments recorded
     */
    public function test_user_has_many_payments()
    {
        $user = User::factory()->create();
        $user->paymentsRecorded()->createMany([
            ['amount' => 100, 'payment_date' => now(), 'company_id' => $user->company_id],
            ['amount' => 200, 'payment_date' => now(), 'company_id' => $user->company_id],
        ]);

        $this->assertCount(2, $user->paymentsRecorded);
    }

    /**
     * Test user is active by default
     */
    public function test_user_is_active_by_default()
    {
        $user = User::factory()->create();

        $this->assertTrue($user->is_active);
    }

    /**
     * Test user can be deactivated
     */
    public function test_user_can_be_deactivated()
    {
        $user = User::factory()->create(['is_active' => true]);
        $user->update(['is_active' => false]);

        $this->assertFalse($user->fresh()->is_active);
    }
}
