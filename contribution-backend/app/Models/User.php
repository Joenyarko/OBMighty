<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles, SoftDeletes, \App\Traits\BelongsToCompany;

    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'branch_id',
        'company_id',
        'status',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_login_at' => 'datetime',
        'password' => 'hashed',
    ];

    /**
     * Get the branch this user belongs to
     */
    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get customers assigned to this worker
     */
    public function customers()
    {
        return $this->hasMany(Customer::class, 'worker_id');
    }

    /**
     * Get payments recorded by this worker
     */
    public function payments()
    {
        return $this->hasMany(Payment::class, 'worker_id');
    }

    /**
     * Get daily totals for this worker
     */
    public function dailyTotals()
    {
        return $this->hasMany(WorkerDailyTotal::class, 'worker_id');
    }

    /**
     * Check if user is CEO
     */
    public function isCEO()
    {
        return $this->hasRole('ceo');
    }

    /**
     * Check if user is Secretary
     */
    public function isSecretary()
    {
        return $this->hasRole('secretary');
    }

    /**
     * Check if user is Worker
     */
    public function isWorker()
    {
        return $this->hasRole('worker');
    }

    /**
     * Scope to filter users by branch (for non-CEO users)
     */
    public function scopeForBranch($query, $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    /**
     * Scope to get only active users
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
}
