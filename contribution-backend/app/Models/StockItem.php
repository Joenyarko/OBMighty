<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class StockItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'sku',
        'unit',
        'quantity',
        'unit_price',
        'reorder_level',
        'status',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'unit_price' => 'decimal:2',
        'reorder_level' => 'integer',
    ];

    public function movements()
    {
        return $this->hasMany(StockMovement::class);
    }

    public function scopeLowStock($query)
    {
        return $query->whereRaw('quantity <= reorder_level');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
}
