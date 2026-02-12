<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;

class Customer extends Model
{
    use HasFactory, SoftDeletes, \App\Traits\BelongsToCompany;

    protected $fillable = [
        'company_id',
        'name',
        'phone',
        'location',
        'branch_id',
        'worker_id',
        'card_id',
        'total_boxes',
        'boxes_filled',
        'price_per_box',
        'total_amount',
        'amount_paid',
        'status',
        'last_payment_date',
    ];

    protected $casts = [
        'total_boxes' => 'integer',
        'boxes_filled' => 'integer',
        'price_per_box' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'last_payment_date' => 'date',
    ];

    protected $appends = ['balance', 'completion_percentage'];

    /**
     * Get the branch this customer belongs to
     */
    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    /**
     * Get the worker assigned to this customer
     */
    public function worker()
    {
        return $this->belongsTo(User::class, 'worker_id');
    }

    /**
     * Get the card associated with this customer
     */
    public function card()
    {
        return $this->belongsTo(Card::class);
    }

    /**
     * Get all payments for this customer
     */
    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * Get the customer's active card assignment
     */
    public function customerCard()
    {
        return $this->hasOne(\App\Models\CustomerCard::class)->where('status', 'active');
    }

    /**
     * Get the balance (calculated)
     */
    public function getBalanceAttribute()
    {
        return $this->total_amount - $this->amount_paid;
    }

    /**
     * Get completion percentage
     */
    public function getCompletionPercentageAttribute()
    {
        if ($this->total_boxes == 0) {
            return 0;
        }
        return round(($this->boxes_filled / $this->total_boxes) * 100, 2);
    }

    /**
     * Update customer status based on business rules
     */
    public function updateStatus()
    {
        // Check if completed
        if ($this->boxes_filled >= $this->total_boxes) {
            $this->status = 'completed';
        }
        // Check if defaulting (no payment in last 7 days)
        elseif ($this->last_payment_date && 
                Carbon::parse($this->last_payment_date)->diffInDays(Carbon::now()) > 7) {
            $this->status = 'defaulting';
        }
        // Otherwise in progress
        else {
            $this->status = 'in_progress';
        }

        $this->save();
    }

    /**
     * Calculate and update balance
     */
    public function calculateBalance()
    {
        return $this->total_amount - $this->amount_paid;
    }

    /**
     * Scope to filter customers by branch
     */
    public function scopeForBranch($query, $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    /**
     * Scope to filter customers by worker
     */
    public function scopeForWorker($query, $workerId)
    {
        return $query->where('worker_id', $workerId);
    }

    /**
     * Scope to get only in-progress customers
     */
    public function scopeInProgress($query)
    {
        return $query->where('status', 'in_progress');
    }

    /**
     * Scope to get completed customers
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope to get defaulting customers (No payment in > 7 days AND not completed)
     */
    public function scopeDefaulting($query)
    {
        return $query->where('status', '!=', 'completed')
                     ->where(function($q) {
                         $q->where('last_payment_date', '<', Carbon::now()->subDays(7))
                           ->orWhereNull('last_payment_date'); // Optional: treat never paid as defaulting? let's stick to last_payment for now or maybe just those who started but stopped. 
                           // actually, if they never paid, last_payment_date is null. 
                           // Let's assume defaulting means they HAVE paid before but stopped.
                           // If we want "never paid" to be defaulting, we'd add orWhereNull.
                           // For now, let's stick to the user's definition: "not made a payment in 7 days".
                     });
    }
}
