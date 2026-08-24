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
        'name',
        'phone',
        'location',
        'branch_id',
        'worker_id',
        'card_id',
        'start_date',
        'due_date',
        'total_boxes',
        'boxes_filled',
        'price_per_box',
        'total_amount',
        'amount_paid',
        'status',
        'is_served',
        'last_payment_date',
    ];

    protected $casts = [
        'start_date' => 'date',
        'due_date' => 'date',
        'total_boxes' => 'integer',
        'boxes_filled' => 'integer',
        'price_per_box' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'last_payment_date' => 'date',
        'is_served' => 'boolean',
    ];

    protected $appends = ['balance', 'completion_percentage', 'active_card', 'is_due'];

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
     * Get all card history for this customer
     */
    public function customerCards()
    {
        return $this->hasMany(\App\Models\CustomerCard::class);
    }

    /**
     * Get the customer's active card assignment
     */
    public function customerCard()
    {
        return $this->hasOne(\App\Models\CustomerCard::class)->where('status', 'active');
    }

    /**
     * Get the active card (accessor)
     */
    public function getActiveCardAttribute()
    {
        return $this->customerCard;
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
     * Check if customer's due date has arrived/passed and card is not completed
     */
    public function getIsDueAttribute()
    {
        if (!$this->due_date || $this->status === 'completed') {
            return false;
        }
        return Carbon::parse($this->due_date)->isPast() || Carbon::parse($this->due_date)->isToday();
    }

    /**
     * Scope to get defaulting customers (No payment in > 7 days AND not completed)
     */
    public function scopeDefaulting($query)
    {
        return $query->where('status', '!=', 'completed')
                     ->where(function($q) {
                         $q->where('last_payment_date', '<', Carbon::now()->subDays(7))
                           ->orWhereNull('last_payment_date');
                     });
    }

    /**
     * Scope for customers who are due or overdue (due_date <= today and not completed)
     */
    public function scopeDue($query)
    {
        return $query->where('status', '!=', 'completed')
                     ->whereNotNull('due_date')
                     ->where('due_date', '<=', Carbon::today());
    }

    /**
     * Scope for customers due this week (not completed)
     */
    public function scopeDueThisWeek($query)
    {
        return $query->where('status', '!=', 'completed')
                     ->whereNotNull('due_date')
                     ->whereBetween('due_date', [Carbon::today(), Carbon::today()->endOfWeek()]);
    }

    /**
     * Scope for customers due this month (not completed)
     */
    public function scopeDueThisMonth($query)
    {
        return $query->where('status', '!=', 'completed')
                     ->whereNotNull('due_date')
                     ->whereBetween('due_date', [Carbon::today(), Carbon::today()->endOfMonth()]);
    }
}
