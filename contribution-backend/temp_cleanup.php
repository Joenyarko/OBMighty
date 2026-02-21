<?php
$dupes = \App\Models\Customer::select('name', 'worker_id', \DB::raw('COUNT(*) as count'))->groupBy('name', 'worker_id')->having('count', '>', 1)->get();
foreach($dupes as $d) {
    if (!$d->worker_id) continue;
    
    // Find the first one (keep)
    $keep = \App\Models\Customer::where('name', $d->name)->where('worker_id', $d->worker_id)->orderBy('id', 'asc')->first();
    
    // Deactivate the rest
    \App\Models\Customer::where('name', $d->name)
        ->where('worker_id', $d->worker_id)
        ->where('id', '!=', $keep->id)
        ->update(['status' => 'inactive']);
        
    echo "Cleaned up duplicates for: " . $d->name . "\n";
}
echo "Cleanup complete.\n";
