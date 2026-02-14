<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test user can login with valid credentials
     */
    public function test_user_can_login_with_valid_credentials()
    {
        $company = Company::factory()->create();
        $user = User::factory()->create([
            'company_id' => $company->id,
            'email' => 'test@example.com',
            'password' => bcrypt('password123'),
        ]);
        $user->assignRole('worker');

        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'token',
            'user' => ['id', 'name', 'email', 'role']
        ]);
    }

    /**
     * Test user cannot login with invalid credentials
     */
    public function test_user_cannot_login_with_invalid_credentials()
    {
        $company = Company::factory()->create();
        User::factory()->create([
            'company_id' => $company->id,
            'email' => 'test@example.com',
            'password' => bcrypt('password123'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(401);
    }

    /**
     * Test authenticated user can logout
     */
    public function test_authenticated_user_can_logout()
    {
        $company = Company::factory()->create();
        $user = User::factory()->create([
            'company_id' => $company->id,
        ]);

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/logout');

        $response->assertStatus(200);
    }

    /**
     * Test user can get own profile
     */
    public function test_user_can_get_own_profile()
    {
        $company = Company::factory()->create();
        $user = User::factory()->create([
            'company_id' => $company->id,
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/me');

        $response->assertStatus(200);
        $response->assertJsonPath('user.id', $user->id);
        $response->assertJsonPath('user.email', $user->email);
    }
}
