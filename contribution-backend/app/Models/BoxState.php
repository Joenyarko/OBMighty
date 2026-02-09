<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BoxState extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_card_id',
        'box_number',
        'is_checked',
        'checked_date',
        'payment_id',
    ];

    protected $casts = [
        'box_number' => 'integer',
        'is_checked' => 'boolean',
        'checked_date' => 'date',
    ];

    /**
     * Get the customer card
     */
    public function customerCard()
    {
        return $this->belongsTo(CustomerCard::class);
    }

    /**
     * Get the payment that checked this box
     */
    public function payment()
    {
        return $this->belongsTo(BoxPayment::class, 'payment_id');
    }

    /**
     * Scope to filter checked boxes
     */
    public function scopeChecked($query)
    {
        return $query->where('is_checked', true);
    }

    /**
     * Scope to filter unchecked boxes
     */
    public function scopeUnchecked($query)
    {
        return $query->where('is_checked', false);
    }

    /**
     * Scope to filter by customer card
     */
    public function scopeForCustomerCard($query, $customerCardId)
    {
        return $query->where('customer_card_id', $customerCardId);
    }
}
