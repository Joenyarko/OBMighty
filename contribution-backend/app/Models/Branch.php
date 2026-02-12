<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Branch extends Model
{
    use HasFactory, SoftDeletes, \App\Traits\BelongsToCompany;

    protected $fillable = [
        'company_id',
        'name',
        'code',
        'address',
        'phone',
        'status',
    ];

    protected $casts = [
        'status' => 'string',
    ];

    /**
     * Get all users in this branch
     */
    public function users()
    {
        return $this->hasMany(User::class);
    }

    /**
     * Get all customers in this branch
     */
    public function customers()
    {
        return $this->hasMany(Customer::class);
    }

    /**
     * Get all payments in this branch
     */
    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * Get daily totals for this branch
     */
    public function dailyTotals()
    {
        return $this->hasMany(BranchDailyTotal::class);
    }

    /**
     * Get expenses for this branch
     */
    public function expenses()
    {
        return $this->hasMany(Expense::class);
    }

    /**
     * Scope to get only active branches
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
}
