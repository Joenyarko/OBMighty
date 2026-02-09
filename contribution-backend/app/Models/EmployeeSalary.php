<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeSalary extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'monthly_salary',
        'allowances',
        'deductions',
        'effective_from',
        'effective_to',
        'status',
        'created_by',
    ];

    protected $casts = [
        'monthly_salary' => 'decimal:2',
        'allowances' => 'decimal:2',
        'deductions' => 'decimal:2',
        'effective_from' => 'date',
        'effective_to' => 'date',
    ];

    /**
     * Get the employee (user) this salary belongs to
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the user who created this salary configuration
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Scope to filter active salaries
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active')
            ->where('effective_from', '<=', now())
            ->where(function ($q) {
                $q->whereNull('effective_to')
                  ->orWhere('effective_to', '>=', now());
            });
    }

    /**
     * Scope to filter by user
     */
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Get current active salary for a user
     */
    public static function getCurrentSalary($userId)
    {
        return self::forUser($userId)
            ->active()
            ->orderBy('effective_from', 'desc')
            ->first();
    }

    /**
     * Calculate total monthly compensation
     */
    public function getTotalCompensationAttribute()
    {
        return $this->monthly_salary + ($this->allowances ?? 0) - ($this->deductions ?? 0);
    }
}
