<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BranchDailyTotal extends Model
{
    use \App\Traits\BelongsToCompany;

    protected $fillable = [
        'branch_id',
        'company_id',
        'date',
        'total_collections',
        'total_payments',
        'total_workers_active',
    ];

    protected $casts = [
        'date' => 'date',
        'total_collections' => 'decimal:2',
        'total_payments' => 'integer',
        'total_workers_active' => 'integer',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}
