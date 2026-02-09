<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LedgerEntry extends Model
{
    protected $fillable = [
        'entry_date',
        'account_type',
        'category',
        'description',
        'debit',
        'credit',
        'reference_type',
        'reference_id',
        'created_by',
    ];

    protected $casts = [
        'entry_date' => 'date',
        'debit' => 'decimal:2',
        'credit' => 'decimal:2',
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
