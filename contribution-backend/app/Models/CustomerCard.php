<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomerCard extends Model
{
    use HasFactory, \App\Traits\BelongsToCompany;

    protected $fillable = [
        'company_id',
        'customer_id',
        'card_id',
        'assigned_date',
        'total_boxes',
        'boxes_checked',
        'total_amount',
        'amount_paid',
        'amount_remaining',
        'status',
        'assigned_by',
    ];

    protected $casts = [
        'assigned_date' => 'date',
        'total_boxes' => 'integer',
        'boxes_checked' => 'integer',
        'total_amount' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'amount_remaining' => 'decimal:2',
    ];

    protected $appends = ['boxes_remaining', 'completion_percentage', 'box_price'];

    /**
     * Get the customer
     */
    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Get the card
     */
    public function card()
    {
        return $this->belongsTo(Card::class);
    }

    /**
     * Get the user who assigned this card
     */
    public function assignedBy()
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    /**
     * Get all box payments
     */
    public function boxPayments()
    {
        return $this->hasMany(BoxPayment::class);
    }

    /**
     * Get all box states
     */
    public function boxStates()
    {
        return $this->hasMany(BoxState::class);
    }

    /**
     * Get boxes remaining
     */
    public function getBoxesRemainingAttribute()
    {
        return $this->total_boxes - $this->boxes_checked;
    }

    /**
     * Get completion percentage
     */
    public function getCompletionPercentageAttribute()
    {
        if ($this->total_boxes == 0) return 0;
        return round(($this->boxes_checked / $this->total_boxes) * 100, 2);
    }

    /**
     * Get box price (amount per box)
     */
    public function getBoxPriceAttribute()
    {
        if ($this->total_boxes == 0) return 0;
        return round($this->total_amount / $this->total_boxes, 6);
    }

    /**
     * Check boxes and create payment
     */
    public function checkBoxes($boxesToCheck, $workerId, $paymentMethod = 'cash', $notes = null)
    {
        // Validate
        if ($boxesToCheck > $this->boxes_remaining) {
            throw new \Exception('Cannot check more boxes than remaining');
        }

        // Calculate amount
        $amountPaid = $boxesToCheck * $this->box_price;

        // Create payment record
        $payment = BoxPayment::create([
            'customer_card_id' => $this->id,
            'worker_id' => $workerId,
            'payment_date' => now()->toDateString(),
            'boxes_checked' => $boxesToCheck,
            'amount_paid' => $amountPaid,
            'payment_method' => $paymentMethod,
            'notes' => $notes,
        ]);

        // Get unchecked boxes
        $uncheckedBoxes = BoxState::where('customer_card_id', $this->id)
            ->where('is_checked', false)
            ->orderBy('box_number')
            ->limit($boxesToCheck)
            ->get();

        // Check the boxes
        foreach ($uncheckedBoxes as $box) {
            $box->update([
                'is_checked' => true,
                'checked_date' => now()->toDateString(),
                'payment_id' => $payment->id,
            ]);
        }

        // Update customer card totals
        $this->increment('boxes_checked', $boxesToCheck);
        $this->increment('amount_paid', $amountPaid);
        $this->decrement('amount_remaining', $amountPaid);

        // Check if completed
        if ($this->boxes_checked >= $this->total_boxes) {
            $this->update(['status' => 'completed']);
        }

        return $payment;
    }

    /**
     * Get recent payment
     */
    public function getRecentPayment()
    {
        return $this->boxPayments()->latest()->first();
    }

    /**
     * Get daily sales for a specific date
     */
    public function getDailySales($date = null)
    {
        $date = $date ?? now()->toDateString();
        
        return $this->boxPayments()
            ->whereDate('payment_date', $date)
            ->sum('amount_paid');
    }

    /**
     * Scope to filter active cards
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope to filter by customer
     */
    public function scopeForCustomer($query, $customerId)
    {
        return $query->where('customer_id', $customerId);
    }
}
