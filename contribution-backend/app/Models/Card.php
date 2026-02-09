<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Card extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'card_name',
        'card_code',
        'number_of_boxes',
        'amount',
        'front_image',
        'back_image',
        'status',
    ];

    protected $casts = [
        'number_of_boxes' => 'integer',
        'amount' => 'decimal:2',
    ];

    protected $appends = ['front_image_url', 'back_image_url'];

    /**
     * Boot method to auto-generate card code
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($card) {
            if (empty($card->card_code)) {
                $card->card_code = self::generateCardCode();
            }
        });

        static::deleting(function ($card) {
            // Delete images when card is deleted
            if ($card->front_image) {
                Storage::disk('public')->delete($card->front_image);
            }
            if ($card->back_image) {
                Storage::disk('public')->delete($card->back_image);
            }
        });
    }

    /**
     * Generate unique card code
     */
    public static function generateCardCode()
    {
        $lastCard = self::withTrashed()->orderBy('id', 'desc')->first();
        $number = $lastCard ? $lastCard->id + 1 : 1;
        return 'OBM-' . str_pad($number, 3, '0', STR_PAD_LEFT);
    }

    /**
     * Get front image URL
     */
    public function getFrontImageUrlAttribute()
    {
        if ($this->front_image) {
            return Storage::disk('public')->url($this->front_image);
        }
        return null;
    }

    /**
     * Get back image URL
     */
    public function getBackImageUrlAttribute()
    {
        if ($this->back_image) {
            return Storage::disk('public')->url($this->back_image);
        }
        return null;
    }

    /**
     * Scope to get only active cards
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }
}
