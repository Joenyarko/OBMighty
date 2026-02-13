<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SurplusEntry extends Model
{
    use HasFactory, \App\Traits\BelongsToCompany;

    protected $fillable = [
        'company_id',
        'branch_id',
        'worker_id',
        'amount',
        'entry_date',
        'status',
        'description',
        'notes',
        'created_by',
        'allocated_to_payment_id',
        'allocated_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'entry_date' => 'date',
        'allocated_at' => 'datetime',
    ];

    /**
     * Get the branch this surplus entry belongs to
     */
    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get the worker associated with this surplus entry
     */
    public function worker()
    {
        return $this->belongsTo(User::class, 'worker_id');
    }

    /**
     * Get the user who created this entry
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the payment this surplus was allocated to
     */
    public function allocatedPayment()
    {
        return $this->belongsTo(Payment::class, 'allocated_to_payment_id');
    }

    /**
     * Scope to filter by branch
     */
    public function scopeForBranch($query, $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    /**
     * Scope to filter by status
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to get available surplus
     */
    public function scopeAvailable($query)
    {
        return $query->where('status', 'available');
    }

    /**
     * Get total available surplus for a branch
     */
    public static function getTotalAvailable($branchId = null)
    {
        $query = self::where('status', 'available');
        
        if ($branchId) {
            $query->where('branch_id', $branchId);
        }
        
        return $query->sum('amount');
    }
}
