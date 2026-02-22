<?php

use App\Models\CustomerCard;

// Ensure we are running from artisan tinker
if (php_sapi_name() === 'cli') {
    $cards = CustomerCard::with('customer')->get();
    $count = 0;
    
    foreach ($cards as $card) {
        if ($card->customer) {
            $customer = $card->customer;
            $customer->amount_paid = $card->amount_paid;
            $customer->boxes_filled = $card->boxes_checked;
            
            if ($customer->boxes_filled >= $customer->total_boxes) {
                $customer->status = 'completed';
            } elseif ($customer->amount_paid > 0) {
                $customer->status = 'in_progress';
            }
            
            $customer->save();
            $count++;
        }
    }
    
    echo "Successfully synced data from $count cards to their parent customers.\n";
} else {
    echo "This script must be run via artisan tinker.\n";
}
