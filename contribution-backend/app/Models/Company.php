<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Company extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'domain',
        'subdomain',
        'card_prefix',
        'logo_url',
        'primary_color',
        'payment_methods',
        'currency',
        'timezone',
        'is_active',
    ];
 
    /**
     * Get the absolute URL for the company logo.
     */
    public function getLogoUrlAttribute($value)
    {
        if (!$value) return null;
        
        // If it's already a full URL, return it
        if (str_starts_with($value, 'http')) {
            return $value;
        }
 
        // Ensure it starts with / if not already
        $path = str_starts_with($value, '/') ? $value : '/' . $value;
        
        return url($path);
    }

    protected $casts = [
        'is_active' => 'boolean',
        'payment_methods' => 'array',
    ];

    /**
     * Get all users in this company
     */
    public function users()
    {
        return $this->hasMany(User::class);
    }

    /**
     * Get all branches in this company
     */
    public function branches()
    {
        return $this->hasMany(Branch::class);
    }

    /**
     * Get all customers in this company
     */
    public function customers()
    {
        return $this->hasMany(Customer::class);
    }

    /**
     * Get all payments in this company
     */
    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * Get company daily totals
     */
    public function dailyTotals()
    {
        return $this->hasMany(CompanyDailyTotal::class);
    }

    /**
     * Get all audit logs for this company
     */
    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class);
    }

    /**
     * Get CEO of this company
     */
    public function ceo()
    {
        return $this->users()->whereHas('roles', function ($q) {
            $q->where('name', 'ceo');
        })->first();
    }
}
