<?php

namespace App\Traits;

use App\Models\Company;
use Illuminate\Database\Eloquent\Builder;

trait BelongsToCompany
{
    /**
     * Boot the trait.
     */
    protected static function bootBelongsToCompany()
    {
        // Add Global Scope to filter by company_id
        static::addGlobalScope('company', function (Builder $builder) {
            
            // Bypass if running in console (e.g., migrations/seeders) or explicitly disabled
            if (app()->runningInConsole() || app()->has('is_super_admin')) {
                return;
            }

            // If we have a company_id in the config (set by middleware), scope by it
            if ($companyId = config('app.company_id')) {
                $builder->where($builder->getModel()->getTable() . '.company_id', $companyId);
            }
        });

        // Auto-assign company_id when creating new records
        static::creating(function ($model) {
            if (!$model->company_id && !app()->runningInConsole()) {
                $model->company_id = config('app.company_id');
            }
        });
    }

    /**
     * Get the company that owns the model.
     */
    public function company()
    {
        return $this->belongsTo(Company::class);
    }
}
