<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanyDailyTotal extends Model
{
    protected $fillable = [
        'date',
        'total_collections',
        'total_payments',
        'total_branches_active',
    ];

    protected $casts = [
        'date' => 'date',
        'total_collections' => 'decimal:2',
        'total_payments' => 'integer',
        'total_branches_active' => 'integer',
    ];
}
