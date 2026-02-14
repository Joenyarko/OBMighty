<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BranchApiTest extends TestCase
{
    use RefreshDatabase;

    private Company $company;
    private User $ceoUser;
    private User $workerUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->company = Company::factory()->create();
        
        $this->ceoUser = User::factory()->create([
            'company_id' => $this->company->id,
        ]);
        $this->ceoUser->assignRole('ceo');

        $this->workerUser = User::factory()->create([
            'company_id' => $this->company->id,
        ]);
        $this->workerUser->assignRole('worker');
    }

    /**
     * Test CEO can list all branches
     */
    public function test_ceo_can_list_all_branches()
    {
        Branch::factory(3)->create(['company_id' => $this->company->id]);

        Sanctum::actingAs($this->ceoUser);

        $response = $this->getJson('/api/branches');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                '*' => ['id', 'name', 'location', 'city', 'status']
            ]
        ]);
        $response->assertJsonCount(3, 'data');
    }

    /**
     * Test CEO can create a branch
     */
    public function test_ceo_can_create_branch()
    {
        Sanctum::actingAs($this->ceoUser);

        $response = $this->postJson('/api/branches', [
            'name' => 'Downtown Branch',
            'location' => '123 Main St',
            'city' => 'New York',
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('data.name', 'Downtown Branch');
        $this->assertDatabaseHas('branches', [
            'name' => 'Downtown Branch',
            'company_id' => $this->company->id,
        ]);
    }

    /**
     * Test worker cannot create branch
     */
    public function test_worker_cannot_create_branch()
    {
        Sanctum::actingAs($this->workerUser);

        $response = $this->postJson('/api/branches', [
            'name' => 'Downtown Branch',
            'location' => '123 Main St',
            'city' => 'New York',
        ]);

        $response->assertStatus(403);
    }

    /**
     * Test CEO can update branch
     */
    public function test_ceo_can_update_branch()
    {
        $branch = Branch::factory()->create(['company_id' => $this->company->id]);

        Sanctum::actingAs($this->ceoUser);

        $response = $this->putJson("/api/branches/{$branch->id}", [
            'name' => 'Uptown Branch',
            'city' => 'Boston',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('branches', [
            'id' => $branch->id,
            'name' => 'Uptown Branch',
        ]);
    }

    /**
     * Test branch validation on create
     */
    public function test_branch_validation_on_create()
    {
        Sanctum::actingAs($this->ceoUser);

        $response = $this->postJson('/api/branches', [
            'name' => '',
            'city' => '',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['name', 'city']);
    }

    /**
     * Test worker can view branch details
     */
    public function test_worker_can_view_branch_details()
    {
        $branch = Branch::factory()->create(['company_id' => $this->company->id]);

        Sanctum::actingAs($this->workerUser);

        $response = $this->getJson("/api/branches/{$branch->id}");

        $response->assertStatus(200);
        $response->assertJsonPath('data.id', $branch->id);
    }
}
