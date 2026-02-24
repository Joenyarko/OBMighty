<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

class LedgerEntry extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'branch_id',
        'entry_date',
        'type',
        'category',
        'description',
        'amount',
        'reference_id',
        'created_by',
    ];

    protected $casts = [
        'entry_date' => 'date',
        'amount' => 'decimal:2',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function reference()
    {
        return $this->morphTo();
    }
}
