<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PayrollRecord extends Model
{
    use HasFactory, \App\Traits\BelongsToCompany;

    protected $fillable = [
        'company_id',
        'user_id',
        'branch_id',
        'salary_amount',
        'allowances',
        'deductions',
        'net_amount',
        'payment_month',
        'payment_date',
        'payment_method',
        'reference_number',
        'notes',
        'status',
        'paid_by',
    ];

    protected $casts = [
        'salary_amount' => 'decimal:2',
        'allowances' => 'decimal:2',
        'deductions' => 'decimal:2',
        'net_amount' => 'decimal:2',
        'payment_month' => 'date',
        'payment_date' => 'date',
    ];

    /**
     * Get the employee (user) this payment is for
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the branch
     */
    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get the user who made the payment
     */
    public function paidBy()
    {
        return $this->belongsTo(User::class, 'paid_by');
    }

    /**
     * Scope to filter by month
     */
    public function scopeForMonth($query, $month)
    {
        return $query->whereYear('payment_month', '=', date('Y', strtotime($month)))
            ->whereMonth('payment_month', '=', date('m', strtotime($month)));
    }

    /**
     * Scope to filter by user
     */
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope to filter by status
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Calculate net amount
     */
    public function calculateNetAmount()
    {
        $this->net_amount = $this->salary_amount + $this->allowances - $this->deductions;
        return $this->net_amount;
    }

    /**
     * Boot method to auto-calculate net amount
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($record) {
            $record->calculateNetAmount();
        });

        static::updating(function ($record) {
            $record->calculateNetAmount();
        });
    }
}
