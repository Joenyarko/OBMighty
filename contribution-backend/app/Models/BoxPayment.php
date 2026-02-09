<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BoxPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_card_id',
        'worker_id',
        'payment_date',
        'boxes_checked',
        'amount_paid',
        'payment_method',
        'notes',
        'adjusted_from',
        'adjusted_by',
        'adjusted_at',
        'adjustment_notes',
    ];

    protected $casts = [
        'payment_date' => 'date',
        'boxes_checked' => 'integer',
        'amount_paid' => 'decimal:2',
        'adjusted_from' => 'decimal:2',
        'adjusted_at' => 'datetime',
    ];

    /**
     * Get the customer card
     */
    public function customerCard()
    {
        return $this->belongsTo(CustomerCard::class);
    }

    /**
     * Get the worker who recorded this payment
     */
    public function worker()
    {
        return $this->belongsTo(User::class, 'worker_id');
    }

    /**
     * Scope to filter by date
     */
    public function scopeForDate($query, $date)
    {
        return $query->whereDate('payment_date', $date);
    }

    /**
     * Scope to filter by worker
     */
    public function scopeForWorker($query, $workerId)
    {
        return $query->where('worker_id', $workerId);
    }

    /**
     * Scope to filter by customer card
     */
    public function scopeForCustomerCard($query, $customerCardId)
    {
        return $query->where('customer_card_id', $customerCardId);
    }
}
