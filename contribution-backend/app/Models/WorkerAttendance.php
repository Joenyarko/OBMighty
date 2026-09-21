<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WorkerAttendance extends Model
{
    use \App\Traits\BelongsToCompany;

    protected $table = 'worker_attendance';

    protected $fillable = [
        'company_id',
        'worker_id',
        'branch_id',
        'date',
        'status',
        'source',
        'notes',
        'marked_by',
    ];

    protected $casts = [
        'date' => 'date',
    ];

    public function worker()
    {
        return $this->belongsTo(User::class, 'worker_id');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function markedBy()
    {
        return $this->belongsTo(User::class, 'marked_by');
    }
}
