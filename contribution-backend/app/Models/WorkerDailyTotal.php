<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorkerDailyTotal extends Model
{
    use \App\Traits\BelongsToCompany;

    protected $fillable = [
        'worker_id',
        'branch_id',
        'date',
        'total_collections',
        'total_customers_paid',
        'adjusted_amount',
        'adjustment_note',
        'is_closed',
        'closed_at',
        'closed_by',
    ];

    protected $casts = [
        'date' => 'date',
        'total_collections' => 'decimal:2',
        'total_customers_paid' => 'integer',
        'adjusted_amount' => 'decimal:2',
        'is_closed' => 'boolean',
        'closed_at' => 'datetime',
    ];

    public function worker()
    {
        return $this->belongsTo(User::class, 'worker_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
