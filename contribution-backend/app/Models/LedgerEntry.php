<?php

namespace App\Models;

use App\Traits\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;

class LedgerEntry extends Model
{
    use BelongsToCompany;

    protected $fillable = [
        'company_id',
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
